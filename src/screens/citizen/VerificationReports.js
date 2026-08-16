import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Animated, StatusBar, RefreshControl,
    Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, FocusAwareStatusBar } from '../../components';
import { supabase } from '../../services';
import { useAuth } from '../../context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const C = {
    navy: '#0A1E3F',
    navyMid: '#0F2C59',
    amber: '#F59E0B',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: '#E2E8F0',
    pending: '#F59E0B',
    pendingSurface: '#FEF3C7',
    processing: '#3B82F6',
    processingSurface: '#DBEAFE',
    completed: '#059669',
    completedSurface: '#D1FAE5',
    failed: '#EF4444',
    failedSurface: '#FEE2E2',
    surface: '#FFFFFF',
};

const STATUS_CONFIG = {
    pending: { color: C.pending, surface: C.pendingSurface, icon: 'time-outline', label: 'Pending' },
    processing: { color: C.processing, surface: C.processingSurface, icon: 'sync', label: 'Processing' },
    completed: { color: C.completed, surface: C.completedSurface, icon: 'checkmark-circle', label: 'Completed' },
    failed: { color: C.failed, surface: C.failedSurface, icon: 'close-circle', label: 'Failed' },
};

const TABS = ['Pending', 'Completed', 'Failed'];

// ── Animated pulsing dot for processing state ──
function PulsingDot({ color }) {
    const pulse = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return (
        <Animated.View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: color, opacity: pulse,
        }} />
    );
}

// ── Confidence score bar ──
function ConfidenceBar({ score }) {
    const widthAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(widthAnim, { toValue: score, duration: 900, delay: 200, useNativeDriver: false }).start();
    }, [score]);

    const color = score >= 0.75 ? C.completed : score >= 0.5 ? C.amber : C.failed;
    return (
        <View style={confStyles.container}>
            <View style={confStyles.track}>
                <Animated.View style={[
                    confStyles.fill,
                    {
                        width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        backgroundColor: color,
                    },
                ]} />
            </View>
            <Text style={[confStyles.pct, { color }]}>{Math.round(score * 100)}%</Text>
        </View>
    );
}
const confStyles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    track: { flex: 1, height: 6, backgroundColor: '#E2E8F0', borderRadius: 99, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 99 },
    pct: { fontSize: 12, fontFamily: 'Nunito-Bold', minWidth: 36, textAlign: 'right' },
});

// ── Report Card Component ──
function ReportCard({ report, expanded, onToggle, onViewFull }) {
    const status = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
    const expandAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(expandAnim, {
            toValue: expanded ? 1 : 0,
            duration: 250,
            useNativeDriver: false,
        }).start();
    }, [expanded]);

    const shortId = report.id?.slice(0, 8).toUpperCase() ?? '--------';
    const submittedAt = report.submitted_at
        ? new Date(report.submitted_at).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
        : 'Unknown';

    return (
        <View style={cardStyles.wrapper}>
            <TouchableOpacity
                style={cardStyles.card}
                onPress={onToggle}
                activeOpacity={0.85}
            >
                {/* Top row */}
                <View style={cardStyles.topRow}>
                    <View style={[cardStyles.statusBadge, { backgroundColor: status.surface }]}>
                        {report.status === 'processing' ? (
                            <PulsingDot color={status.color} />
                        ) : (
                            <Ionicons name={status.icon} size={12} color={status.color} />
                        )}
                        <Text style={[cardStyles.statusText, { color: status.color }]}>
                            {status.label}
                        </Text>
                    </View>
                    <Text style={cardStyles.reportId}>#{shortId}</Text>
                    <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={C.textTertiary}
                    />
                </View>

                {/* Time */}
                <View style={cardStyles.metaRow}>
                    <Ionicons name="time-outline" size={12} color={C.textTertiary} />
                    <Text style={cardStyles.metaText}>Submitted {submittedAt}</Text>
                </View>

                {/* Images thumbnails */}
                {report.images && report.images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cardStyles.thumbsRow}>
                        {report.images.map((img, i) => (
                            <View key={i} style={cardStyles.thumbWrapper}>
                                {img.public_url ? (
                                    <Image
                                        source={{ uri: img.public_url }}
                                        style={cardStyles.thumb}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={[cardStyles.thumb, cardStyles.thumbPlaceholder]}>
                                        <Ionicons name="image-outline" size={20} color={C.textTertiary} />
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                )}

                {/* Processing indicator */}
                {report.status === 'processing' && (
                    <View style={cardStyles.processingBanner}>
                        <ActivityIndicator size="small" color={C.processing} />
                        <Text style={cardStyles.processingText}>AI is analysing your submission…</Text>
                    </View>
                )}

                {/* Completed: show verdict + confidence inline */}
                {report.status === 'completed' && report.ai_verdict && !expanded && (
                    <View style={cardStyles.verdictPreview}>
                        <Text style={cardStyles.verdictLabel}>Verdict: </Text>
                        <Text style={[cardStyles.verdictValue, {
                            color: report.ai_verdict?.toLowerCase().includes('violation') ? C.failed
                                : report.ai_verdict?.toLowerCase().includes('clear') ? C.completed
                                : C.amber,
                        }]}>{report.ai_verdict}</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Expanded full report */}
            {expanded && (
                <Animated.View style={[cardStyles.expandedSection, {
                    opacity: expandAnim,
                    maxHeight: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 500] }),
                }]}>
                    <View style={cardStyles.separator} />

                    {/* Verdict */}
                    {report.ai_verdict && (
                        <View style={cardStyles.detailRow}>
                            <Text style={cardStyles.detailLabel}>Verification Info</Text>
                            <Text style={[cardStyles.detailVerdictValue, {
                                color: report.ai_verdict?.toLowerCase().includes('violation') ? C.failed
                                    : report.ai_verdict?.toLowerCase().includes('clear') ? C.completed
                                    : C.amber,
                            }]}>{report.ai_verdict}</Text>
                        </View>
                    )}

                    {/* Confidence */}
                    {report.status === 'completed' && typeof report.ai_confidence_score === 'number' && (
                        <View style={cardStyles.detailRow}>
                            <Text style={cardStyles.detailLabel}>Confidence Score</Text>
                            <ConfidenceBar score={report.ai_confidence_score} />
                        </View>
                    )}

                    {/* Processed at */}
                    {report.processed_at && (
                        <View style={cardStyles.detailRow}>
                            <Text style={cardStyles.detailLabel}>Processed At</Text>
                            <Text style={cardStyles.detailValue}>
                                {new Date(report.processed_at).toLocaleString('en-IN', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                })}
                            </Text>
                        </View>
                    )}

                    {/* Raw AI result */}
                    {report.status === 'completed' && report.ai_result && (
                        <View style={cardStyles.rawResult}>
                            <Text style={cardStyles.detailLabel}>Full Analysis</Text>
                            <Text style={cardStyles.rawResultText}>
                                {typeof report.ai_result === 'string'
                                    ? report.ai_result
                                    : JSON.stringify(report.ai_result, null, 2)}
                            </Text>
                        </View>
                    )}

                    {/* Failed Banner */}
                    {report.status === 'failed' && (
                        <View style={[cardStyles.failedBanner, { marginTop: 10 }]}>
                            <Ionicons name="warning" size={16} color={C.failed} />
                            <Text style={cardStyles.failedText}>
                                {report.ai_result?.reason || 'Processing failed. Please resubmit or contact support.'}
                            </Text>
                        </View>
                    )}

                    {/* View Full Report Button */}
                    <TouchableOpacity 
                        style={{ marginTop: 16, backgroundColor: C.navy, paddingVertical: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }} 
                        onPress={onViewFull}
                        activeOpacity={0.8}
                    >
                        <Text style={{ color: C.white, fontFamily: 'Nunito-Bold', fontSize: 14 }}>View Full Report Details</Text>
                        <Ionicons name="open-outline" size={16} color={C.white} />
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
}

const cardStyles = StyleSheet.create({
    wrapper: { marginHorizontal: 16, marginBottom: 12 },
    card: {
        backgroundColor: C.white, borderRadius: 20, padding: 16,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4,
    },
    statusText: { fontSize: 11, fontFamily: 'Nunito-Bold' },
    reportId: { flex: 1, fontSize: 12, color: C.textTertiary, fontFamily: 'Nunito-SemiBold' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
    metaText: { fontSize: 12, color: C.textTertiary, fontFamily: 'Nunito-Medium' },
    thumbsRow: { marginBottom: 10 },
    thumbWrapper: { marginRight: 8 },
    thumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#F2F4F6' },
    thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    processingBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#DBEAFE', borderRadius: 10, padding: 10, marginTop: 4,
    },
    processingText: { fontSize: 12, color: C.processing, fontFamily: 'Nunito-SemiBold' },
    verdictPreview: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    verdictLabel: { fontSize: 13, color: C.textSecondary, fontFamily: 'Nunito-Medium' },
    verdictValue: { fontSize: 13, fontFamily: 'Nunito-Bold' },

    // Expanded
    expandedSection: { paddingHorizontal: 16, paddingBottom: 16, overflow: 'hidden' },
    separator: { height: 1, backgroundColor: C.border, marginVertical: 12 },
    detailRow: { marginBottom: 12 },
    detailLabel: { fontSize: 11, color: C.textTertiary, fontFamily: 'Nunito-ExtraBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
    detailValue: { fontSize: 14, color: C.textPrimary, fontFamily: 'Nunito-SemiBold' },
    detailVerdictValue: { fontSize: 16, fontFamily: 'Nunito-Bold' },
    rawResult: { marginTop: 4 },
    rawResultText: {
        fontSize: 12, fontFamily: 'Nunito-Medium', color: C.textSecondary,
        backgroundColor: '#F4F6F9', borderRadius: 10, padding: 10, lineHeight: 18,
        marginTop: 4,
    },
    failedBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12,
    },
    failedText: { flex: 1, fontSize: 13, color: C.failed, fontFamily: 'Nunito-SemiBold', lineHeight: 18 },
});

// ── Main Screen ──
export default function VerificationReports({ navigation }) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(0);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const tabIndicator = useRef(new Animated.Value(0)).current;

    const fetchReports = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data: reportsData, error } = await supabase
                .from('verification_reports')
                .select(`
                    *,
                    images:verification_images(*)
                `)
                .eq('user_id', user.id)
                .order('submitted_at', { ascending: false });

            if (!error && reportsData) {
                setReports(reportsData);
            }
        } catch (err) {
            console.error('Failed to fetch reports:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchReports();
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
    }, [fetchReports]);

    // ── Realtime subscription ──
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('verification_reports_realtime')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'verification_reports',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    setReports(prev =>
                        prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r)
                    );
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'verification_reports',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    setReports(prev => [payload.new, ...prev]);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id]);

    const handleTabChange = (index) => {
        setActiveTab(index);
        setExpandedId(null);
        Animated.timing(tabIndicator, {
            toValue: index * ((SCREEN_WIDTH - 32) / 3),
            duration: 200,
            useNativeDriver: true,
        }).start();
    };

    const filteredReports = reports.filter(r => {
        if (activeTab === 0) return r.status === 'pending' || r.status === 'processing';
        if (activeTab === 1) return r.status === 'completed';
        if (activeTab === 2) return r.status === 'failed';
        return false;
    });

    const countByStatus = (tab) => {
        if (tab === 0) return reports.filter(r => r.status === 'pending' || r.status === 'processing').length;
        if (tab === 1) return reports.filter(r => r.status === 'completed').length;
        if (tab === 2) return reports.filter(r => r.status === 'failed').length;
        return 0;
    };

    return (
        <MobileContainer>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />

            {/* Header */}
            <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                <TouchableOpacity onPress={() => {
                    if (navigation.canGoBack()) {
                        navigation.goBack();
                    } else {
                        navigation.navigate('Home');
                    }
                }} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={20} color={C.white} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <View style={styles.headerIcon}>
                        <Ionicons name="shield-checkmark" size={24} color={C.amber} />
                    </View>
                    <Text style={styles.headerTitle}>AI Verification Reports</Text>
                    <Text style={styles.headerSubtitle}>{reports.length} total submissions</Text>
                </View>
            </LinearGradient>

            {/* Tab Bar */}
            <View style={styles.tabContainer}>
                <View style={styles.tabBar}>
                    <Animated.View
                        style={[
                            styles.tabIndicator,
                            { width: (SCREEN_WIDTH - 32) / 3, transform: [{ translateX: tabIndicator }] },
                        ]}
                    />
                    {TABS.map((tab, i) => {
                        const count = countByStatus(i);
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={styles.tab}
                                onPress={() => handleTabChange(i)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>
                                    {tab}
                                </Text>
                                {count > 0 && (
                                    <View style={[styles.tabBadge, activeTab === i && styles.tabBadgeActive]}>
                                        <Text style={[styles.tabBadgeText, activeTab === i && styles.tabBadgeTextActive]}>
                                            {count}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Content */}
            <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={C.navyMid} />
                        <Text style={styles.loadingText}>Loading reports…</Text>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => { setRefreshing(true); fetchReports(); }}
                                colors={[C.navyMid]}
                                tintColor={C.navyMid}
                            />
                        }
                    >
                        {filteredReports.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIcon}>
                                    <Ionicons
                                        name={activeTab === 0 ? 'time-outline' : activeTab === 1 ? 'checkmark-done-circle-outline' : 'close-circle-outline'}
                                        size={40}
                                        color={C.textTertiary}
                                    />
                                </View>
                                <Text style={styles.emptyTitle}>
                                    No {TABS[activeTab]} Reports
                                </Text>
                                <Text style={styles.emptySubtitle}>
                                    {activeTab === 0
                                        ? 'Reports awaiting or being processed will appear here.'
                                        : activeTab === 1
                                        ? 'Completed AI verifications will appear here.'
                                        : 'Reports that could not be processed will appear here.'}
                                </Text>
                            </View>
                        ) : (
                            filteredReports.map(report => (
                                <ReportCard
                                    key={report.id}
                                    report={report}
                                    expanded={expandedId === report.id}
                                    onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
                                    onViewFull={() => navigation.navigate('ReportDetail', { report: report })}
                                />
                            ))
                        )}

                        {/* Realtime indicator */}
                        <View style={styles.realtimeBadge}>
                            <PulsingDot color={C.completed} />
                            <Text style={styles.realtimeText}>Live — updates sync automatically</Text>
                        </View>
                    </ScrollView>
                )}
            </Animated.View>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingTop: 52,
        paddingBottom: 20,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        width: 36, height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerCenter: { flex: 1 },
    headerIcon: {
        width: 40, height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 6,
    },
    headerTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.white },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Nunito-Medium' },

    // Tab bar
    tabContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#F2F4F6',
        borderRadius: 14,
        padding: 4,
        position: 'relative',
    },
    tabIndicator: {
        position: 'absolute',
        top: 4, left: 4,
        height: '100%',
        backgroundColor: C.white,
        borderRadius: 10,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6,
        paddingVertical: 8, borderRadius: 10, zIndex: 1,
    },
    tabText: { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textTertiary },
    tabTextActive: { color: C.navy, fontFamily: 'Nunito-Bold' },
    tabBadge: {
        backgroundColor: '#E2E8F0', borderRadius: 99,
        minWidth: 18, height: 18,
        justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 4,
    },
    tabBadgeActive: { backgroundColor: C.navy },
    tabBadgeText: { fontSize: 10, fontFamily: 'Nunito-Bold', color: C.textTertiary },
    tabBadgeTextActive: { color: C.white },

    listContent: { paddingTop: 16, paddingBottom: 40 },

    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: C.textSecondary, fontFamily: 'Nunito-Medium' },

    emptyState: {
        alignItems: 'center', paddingTop: 80, paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 80, height: 80, borderRadius: 22,
        backgroundColor: '#F2F4F6',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginBottom: 8, textAlign: 'center' },
    emptySubtitle: { fontSize: 13, color: C.textTertiary, fontFamily: 'Nunito-Medium', textAlign: 'center', lineHeight: 20 },

    realtimeBadge: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, marginTop: 8, paddingVertical: 12,
    },
    realtimeText: { fontSize: 12, color: C.textTertiary, fontFamily: 'Nunito-Medium' },
});
