/**
 * MyReports.js  –  Citizen's submitted reports with real-time data
 *
 * Shows all image_reports for the logged-in user with status badges
 * (Pending / Approved / Rejected), reward earned, and navigation
 * to the ReportDetail screen.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
    StatusBar, ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FocusAwareStatusBar } from '../../components';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context';
import { fetchCitizenReports, subscribeToReportUpdates } from '../../services/reports';
import { rewardService } from '../../services';

// ── Design Tokens ──
const C = {
    navy: '#0A1E3F',
    navyDeep: '#051329',
    navyMid: '#0F2C59',
    amber: '#D97706',
    amberDark: '#B45309',
    amberSurface: '#FEF3C7',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    surfaceLow: '#F8FAFC',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: '#CBD5E1',
    success: '#15803D',
    successSurface: '#DCFCE7',
    warning: '#B45309',
    warningSurface: '#FEF3C7',
    error: '#B91C1C',
    errorSurface: '#FEE2E2',
    primarySurface: '#EFF6FF',
};

const STATUS_CONFIG = {
    approved: { icon: 'checkmark-circle', color: C.success, bg: C.successSurface, label: 'Approved', barColor: C.success },
    pending:  { icon: 'time', color: C.warning, bg: C.warningSurface, label: 'Pending', barColor: C.amber },
    rejected: { icon: 'close-circle', color: C.error, bg: C.errorSurface, label: 'Rejected', barColor: C.error },
};

export default function MyReports({ navigation }) {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const hasLoadedRef = useRef(false);  // tracks first successful load

    const filters = ['All', 'Pending', 'Approved', 'Rejected'];

    const loadReports = useCallback(async (isRefresh = false) => {
        if (!user?.id) return;
        // Show full-screen spinner only on the very first load
        if (!hasLoadedRef.current && !isRefresh) setLoading(true);
        try {
            const { data, error } = await fetchCitizenReports(user.id);
            if (!error && data) {
                setReports(data);
                hasLoadedRef.current = true;
            }
        } catch (err) {
            console.error('Error fetching reports:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);  // stable — hasLoadedRef is a ref, not state

    useFocusEffect(
        useCallback(() => {
            loadReports();
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }, [loadReports])
    );

    // Realtime subscription — triggers a full reload so cards always have complete joined data
    useFocusEffect(
        useCallback(() => {
            if (!user?.id) return;
            const ch = subscribeToReportUpdates(
                user.id,
                () => loadReports(true),   // UPDATE: reload
                () => loadReports(true),   // INSERT: reload
            );
            return () => { if (ch) ch.unsubscribe(); };
        }, [user?.id, loadReports])
    );

    const filteredReports = activeFilter === 'All'
        ? reports
        : reports.filter(r => r.status === activeFilter.toLowerCase());

    const counts = {
        all: reports.length,
        pending: reports.filter(r => r.status === 'pending').length,
        approved: reports.filter(r => r.status === 'approved').length,
        rejected: reports.filter(r => r.status === 'rejected').length,
    };

    const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Just now';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
        });
    };

    const getRewardLabel = (report) => {
        if (report.reward_amount > 0) return `+${report.reward_amount} pts`;
        const pts = rewardService.getPointsForViolation(report.violation_type);
        return `+${pts} pts`;
    };

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navyDeep} />
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                {/* Navy Header */}
                <LinearGradient colors={[C.navyDeep, C.navy, C.navyMid]} style={[styles.header, { paddingTop: insets.top + 16 }]}>
                    <View style={styles.headerDecor1} />
                    <View style={styles.headerDecor2} />
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.headerLabel}>TRAFFIC EYE</Text>
                            <Text style={styles.headerTitle}>My Reports</Text>
                        </View>
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{reports.length}</Text>
                        </View>
                    </View>

                    {/* Stats row */}
                    <View style={styles.statsRow}>
                        {[
                            { label: 'Pending', count: counts.pending, color: C.amber },
                            { label: 'Approved', count: counts.approved, color: C.success },
                            { label: 'Rejected', count: counts.rejected, color: C.error },
                        ].map(({ label, count, color }) => (
                            <View key={label} style={styles.statItem}>
                                <Text style={[styles.statCount, { color }]}>{count}</Text>
                                <Text style={styles.statLabel}>{label}</Text>
                            </View>
                        ))}
                    </View>
                </LinearGradient>

                {/* Filter chips */}
                <View style={styles.filterRow}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterScroll}
                    >
                        {filters.map((f) => (
                            <TouchableOpacity
                                key={f}
                                style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
                                onPress={() => setActiveFilter(f)}
                            >
                                <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
                                    {f}
                                </Text>
                                {f !== 'All' && counts[f.toLowerCase()] > 0 && (
                                    <View style={[styles.filterBadge, activeFilter === f && styles.filterBadgeActive]}>
                                        <Text style={[styles.filterBadgeText, activeFilter === f && styles.filterBadgeTextActive]}>
                                            {counts[f.toLowerCase()]}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Report count */}
                <Text style={styles.showingText}>Showing {filteredReports.length} reports</Text>

                {/* Report list */}
                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={C.navyMid} />
                        <Text style={styles.loadingText}>Loading reports…</Text>
                    </View>
                ) : (
                    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                        <ScrollView
                            style={styles.list}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    colors={[C.navyMid]}
                                    tintColor={C.navyMid}
                                    onRefresh={() => { setRefreshing(true); loadReports(true); }}
                                />
                            }
                        >
                            {filteredReports.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIconCircle}>
                                        <Ionicons name="document-text-outline" size={44} color={C.textTertiary} />
                                    </View>
                                    <Text style={styles.emptyTitle}>No Reports Yet</Text>
                                    <Text style={styles.emptySub}>
                                        {activeFilter === 'All'
                                            ? 'Submit your first traffic violation report to get started.'
                                            : `No ${activeFilter.toLowerCase()} reports found.`}
                                    </Text>
                                </View>
                            ) : (
                                filteredReports.map((report) => {
                                    const config = getStatusConfig(report.status);
                                    const thumbnailUri = report.image_url || (report.media && report.media.length > 0 && report.media[0].file_type === 'image' ? report.media[0].file_url : null);

                                    return (
                                        <TouchableOpacity
                                            key={report.id}
                                            style={styles.reportCard}
                                            onPress={() =>
                                                navigation.getParent()?.navigate('ReportDetail', { reportId: report.id, report }) ??
                                                navigation.navigate('ReportDetail', { reportId: report.id, report })
                                            }
                                            activeOpacity={0.8}
                                        >
                                            {/* Colored left bar */}
                                            <View style={[styles.cardBar, { backgroundColor: config.barColor }]} />

                                            {/* Thumbnail */}
                                            <View style={styles.thumbnailFrame}>
                                                {thumbnailUri ? (
                                                    <Image
                                                        source={{ uri: thumbnailUri }}
                                                        style={styles.thumbnail}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                                                        <Ionicons name="image-outline" size={24} color={C.textTertiary} />
                                                    </View>
                                                )}
                                                <View style={styles.thumbnailOverlay}>
                                                    <Ionicons name="eye" size={12} color="rgba(255,255,255,0.8)" />
                                                </View>
                                            </View>

                                            {/* Content */}
                                            <View style={styles.cardBody}>
                                                <View style={styles.cardTopRow}>
                                                    <Text style={styles.reportType} numberOfLines={1}>
                                                        {report.violation_type || 'Traffic Violation'}
                                                    </Text>
                                                    <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
                                                        <Ionicons name={config.icon} size={10} color={config.color} />
                                                        <Text style={[styles.statusPillText, { color: config.color }]}>
                                                            {config.label}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {!!report.vehicle_number && (
                                                    <Text style={styles.vehicleText}>{report.vehicle_number}</Text>
                                                )}

                                                <View style={styles.rowMeta}>
                                                    {!!report.location_address && (
                                                        <View style={styles.metaRow}>
                                                            <Ionicons name="location" size={11} color={C.textTertiary} />
                                                            <Text style={styles.metaText} numberOfLines={1}>{report.location_address}</Text>
                                                        </View>
                                                    )}
                                                    <View style={styles.metaRow}>
                                                        <Ionicons name="time" size={11} color={C.textTertiary} />
                                                        <Text style={styles.metaText}>{formatDate(report.submitted_at)}</Text>
                                                    </View>
                                                </View>

                                                {/* Status badge footer message */}
                                                {report.status === 'pending' && (
                                                    <View style={[styles.pointsBadge, { backgroundColor: C.warningSurface }]}>
                                                        <Ionicons name="time" size={10} color={C.warning} />
                                                        <Text style={[styles.pointsText, { color: C.warning }]}>Awaiting Review</Text>
                                                    </View>
                                                )}
                                                {report.status === 'rejected' && (
                                                    <View style={[styles.pointsBadge, { backgroundColor: C.errorSurface }]}>
                                                        <Ionicons name="close-circle" size={10} color={C.error} />
                                                        <Text style={[styles.pointsText, { color: C.error }]}>Not Approved</Text>
                                                    </View>
                                                )}

                                            </View>

                                            <View style={styles.entryArrow}>
                                                <Ionicons name="chevron-forward" size={16} color={C.navyMid} />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                            <View style={{ height: 32 }} />
                        </ScrollView>
                    </Animated.View>
                )}

                {/* FAB */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() =>
                        navigation.getParent()?.navigate('NewReport') ??
                        navigation.navigate('NewReport')
                    }
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={[C.amberDark, C.amber]}
                        style={styles.fabGradient}
                    >
                        <Ionicons name="add" size={28} color={C.navy} />
                    </LinearGradient>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Header
    header: {
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    headerDecor1: {
        position: 'absolute', top: -40, right: -40,
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    headerDecor2: {
        position: 'absolute', bottom: 20, left: -30,
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: 'rgba(245,158,11,0.06)',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerLabel: { fontSize: 10, fontFamily: 'Nunito-ExtraBold', color: C.amber, letterSpacing: 2, marginBottom: 4 },
    headerTitle: { fontSize: 24, fontFamily: 'Nunito-Bold', color: '#FFF', letterSpacing: -0.4 },
    countBadge: {
        backgroundColor: C.amber,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 5,
    },
    countBadgeText: {
        fontSize: 16,
        fontFamily: 'Nunito-ExtraBold',
        color: C.navy,
    },

    // Stats Row
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        paddingVertical: 10,
    },
    statItem: { flex: 1, alignItems: 'center', gap: 2 },
    statCount: { fontSize: 18, fontFamily: 'Nunito-ExtraBold' },
    statLabel: { fontSize: 10, fontFamily: 'Nunito-SemiBold', color: 'rgba(255,255,255,0.55)' },

    // Filters
    filterRow: { paddingTop: 14 },
    filterScroll: { paddingHorizontal: 20, gap: 8 },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: C.surfaceLow,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: C.primarySurface,
        borderColor: C.navyMid,
    },
    filterChipText: {
        fontSize: 13,
        fontFamily: 'Nunito-Medium',
        color: C.textTertiary,
    },
    filterChipTextActive: {
        color: C.navyMid,
        fontFamily: 'Nunito-Bold',
    },
    filterBadge: {
        backgroundColor: '#E2E8F0',
        borderRadius: 99,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    filterBadgeActive: { backgroundColor: C.navyMid },
    filterBadgeText: { fontSize: 10, fontFamily: 'Nunito-Bold', color: C.textTertiary },
    filterBadgeTextActive: { color: C.white },
    showingText: {
        fontSize: 12,
        color: C.textTertiary,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 6,
        fontFamily: 'Nunito-Medium',
    },

    // Loading & empty
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    loadingText: { fontSize: 14, fontFamily: 'Nunito-Medium', color: C.textSecondary },
    emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
    emptyIconCircle: {
        width: 80, height: 80, borderRadius: 22,
        backgroundColor: C.surfaceLow,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginBottom: 8 },
    emptySub: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary, textAlign: 'center', lineHeight: 20 },

    // Report list
    list: { flex: 1 },
    listContent: { paddingHorizontal: 20, paddingTop: 10 },
    reportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderRadius: 20,
        marginBottom: 14,
        overflow: 'hidden',
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    cardBar: { width: 4, alignSelf: 'stretch' },
    thumbnailFrame: {
        width: 76, height: 76, borderRadius: 12,
        margin: 12, backgroundColor: C.surfaceLow,
        overflow: 'hidden', position: 'relative',
    },
    thumbnail: { width: '100%', height: '100%' },
    thumbnailPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    thumbnailOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,36,82,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },
    cardBody: { flex: 1, paddingVertical: 12, paddingRight: 8 },
    cardTopRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 4,
    },
    reportType: {
        fontSize: 14, fontFamily: 'Nunito-Bold',
        color: C.textPrimary, flex: 1, marginRight: 6,
    },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)',
    },
    statusPillText: {
        fontSize: 10, fontFamily: 'Nunito-ExtraBold',
        textTransform: 'uppercase', letterSpacing: 0.3,
    },
    vehicleText: {
        fontSize: 13, color: C.navyMid, fontFamily: 'Nunito-Bold',
        letterSpacing: 0.5, marginBottom: 4,
    },
    rowMeta: {
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11, color: C.textSecondary, fontFamily: 'Nunito-Medium' },
    pointsBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 8, alignSelf: 'flex-start',
    },
    pointsText: { fontSize: 11, color: C.amberDark, fontFamily: 'Nunito-Bold' },
    entryArrow: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: C.primarySurface,
        justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },

    // FAB
    fab: {
        position: 'absolute', bottom: 24, right: 20,
        borderRadius: 20, overflow: 'hidden',
        shadowColor: C.amber, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
    },
    fabGradient: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
});
