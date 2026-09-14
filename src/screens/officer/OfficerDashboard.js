import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Animated, StatusBar, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, FocusAwareStatusBar, ProgressRing, StatSkeleton, CardSkeleton, EmptyState, StatusPill } from '../../components';
import { useAuth } from '../../context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services';
import { COLORS, GRADIENTS } from '../../utils/theme';
import useReducedMotion from '../../hooks/useReducedMotion';
import { useNotifications } from '../../context/NotificationContext';
import { officerJurisdictionFilters, sortOfficerQueue } from '../../utils/productExperience';
import { fetchPendingReports, fetchReviewedReports, subscribeToOfficerQueue } from '../../services/reports';

// ── Design Tokens (Civic Authority — Officer Side) ──
const C = {
    navy: COLORS.primaryDark,
    navyMid: COLORS.primary,
    navyLight: COLORS.primaryLight,
    amber: COLORS.secondary,
    amberDark: COLORS.secondaryDark,
    amberSurface: COLORS.secondarySurface,
    white: COLORS.surface,
    offWhite: COLORS.background,
    surface: COLORS.surface,
    surfaceLow: COLORS.surfaceContainerLow,
    textPrimary: COLORS.textPrimary,
    textSecondary: COLORS.textSecondary,
    textTertiary: COLORS.textTertiary,
    border: COLORS.surfaceContainerHighest,
    success: COLORS.success,
    successSurface: COLORS.successSurface,
    warning: COLORS.secondaryDark,
    warningSurface: COLORS.secondarySurface,
    error: COLORS.error,
    errorSurface: COLORS.errorSurface,
    critical: COLORS.primaryLight,
    primarySurface: COLORS.primarySurface,
};

export default function OfficerDashboard({ navigation }) {
    const { profile } = useAuth();
    const reduced = useReducedMotion();
    const { unreadCount } = useNotifications();
    const [totalPending, setTotalPending] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [live, setLive] = useState(false);
    const [focusKey, setFocusKey] = useState(0);
    const requestSequence = useRef(0);
    const officerName = profile?.full_name?.split(' ')[0] || 'Officer';
    const officerTitle = profile?.badge_title || 'Traffic Inspector';
    const officerZone = profile?.jurisdiction 
        ? `Station: ${profile.jurisdiction}` 
        : 'Traffic Authority';
    const insets = useSafeAreaInsets();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    const [pendingReports, setPendingReports] = useState([]);
    const [rejectedReports, setRejectedReports] = useState([]);
    const [approvedCount, setApprovedCount] = useState(0);
    const [rejectedCount, setRejectedCount] = useState(0);
    const [loadingData, setLoadingData] = useState(true);

    const fetchData = useCallback(async () => {
        const request = ++requestSequence.current;
        if (!profile?.id || profile.role !== 'officer') return;
        try {
            // Fetch routed pending reports & slice for dashboard top 10
            const { data: activePending, error: pendingError } = await fetchPendingReports(profile, true);
            if (pendingError) throw pendingError;
            const pending = sortOfficerQueue(activePending || []).slice(0, 5);

            // Build jurisdiction-scoped count filters (same as fetchPendingReports)
            let approvedQuery = supabase
                .from('image_reports')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'approved');
            let rejectedQuery = supabase
                .from('image_reports')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'rejected');

            // Apply same OR-based jurisdiction filter so counts match the officer's area
            const filters = officerJurisdictionFilters(profile);
            if (filters.length > 0) {
                const orStr = filters.join(',');
                approvedQuery = approvedQuery.or(orStr);
                rejectedQuery = rejectedQuery.or(orStr);
            }

            const [{ count: aCount, error: aError }, { count: rCount, error: rError }] = await Promise.all([
                approvedQuery,
                rejectedQuery,
            ]);

            if (aError || rError) throw aError || rError;
            // Fetch routed reviewed reports (filtered to rejected in UI logic)
            const { data: allReviewed, error: reviewedError } = await fetchReviewedReports(profile);
            const rejected = allReviewed ? allReviewed.filter(r => r.status === 'rejected').slice(0, 5) : [];

            if (reviewedError) throw reviewedError;
            if (request !== requestSequence.current) return;
            setLoadError(false); setTotalPending((activePending || []).length);
            setPendingReports(pending || []);
            setRejectedReports(rejected || []);
            setApprovedCount(aCount || 0);
            setRejectedCount(rCount || 0);
        } catch (e) {
            if (request === requestSequence.current) setLoadError(true);
        } finally {
            if (request === requestSequence.current) { setLoadingData(false); setRefreshing(false); }
        }
    }, [profile]);

    useFocusEffect(
        useCallback(() => {
            setFocusKey(key => key + 1);
            fetchData();
            return () => { requestSequence.current++; };
        }, [fetchData])
    );

    // Subscribe to realtime changes on image_reports
    useFocusEffect(
        useCallback(() => {
            if (!profile?.id) return;
            let active = true;
            const ch = subscribeToOfficerQueue(fetchData, fetchData, status => { if (active) setLive(status === 'SUBSCRIBED'); }, 'dashboard');
            return () => { active = false; supabase.removeChannel(ch); setLive(false); };
        }, [fetchData])
    );

    useEffect(() => {
        if (reduced) { fadeAnim.setValue(1); slideAnim.setValue(0); return; }
        const animation = Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
        ]);
        animation.start();
        return () => animation.stop();
    }, [reduced, fadeAnim, slideAnim]);

    const stats = [
        { label: 'Pending', value: totalPending, icon: 'time-outline', color: C.warning, bg: C.warningSurface, target: 'Pending' },
        { label: 'Verified', value: approvedCount.toString(), icon: 'checkmark-circle-outline', color: C.success, bg: C.successSurface, target: 'Verified', params: { status: 'approved' } },
        { label: 'Rejected', value: rejectedCount.toString(), icon: 'close-circle-outline', color: C.error, bg: C.errorSurface, target: 'Verified', params: { status: 'rejected' } },
    ];

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
            ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const getPriorityConfig = (severity) => ({
        critical: { color: C.error, bg: C.errorSurface, label: 'CRITICAL', barColor: C.error },
        high:     { color: C.warning, bg: C.warningSurface, label: 'HIGH', barColor: C.amber },
        medium:   { color: C.warning, bg: C.warningSurface, label: 'MEDIUM', barColor: C.amber },
        low:      { color: C.textTertiary, bg: C.surfaceLow, label: 'LOW', barColor: C.border },
    }[severity] || { color: C.warning, bg: C.warningSurface, label: 'MEDIUM', barColor: C.amber });

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={COLORS.secondary} colors={[COLORS.secondary]} progressBackgroundColor={COLORS.primaryDark} />}>

                    {/* ── Navy Officer Header ── */}
                    <LinearGradient
                        colors={GRADIENTS.heroDark}
                        style={[styles.header, { paddingTop: insets.top + 16 }]}
                    >
                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                            <View style={styles.headerTop}>
                                <View style={styles.headerLeft}>
                                    {/* Badge */}
                                    <View style={styles.officerBadge}>
                                        <Ionicons name="shield-checkmark" size={16} color={C.amber} />
                                    </View>
                                    <View>
                                        <Text style={styles.officerName}>{officerTitle} {officerName}</Text>
                                        <Text style={styles.officerZone}>Traffic Authority, {officerZone}</Text>
                                    </View>
                                </View>
                                <View style={styles.headerRight}>
                                    <TouchableOpacity
                                        style={styles.headerIconBtn}
                                        onPress={() => navigation.navigate('OfficerSettings')}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="settings-outline" size={20} color={C.white} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.headerIconBtn}
                                        onPress={() => navigation.navigate('OfficerNotifications')}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="notifications-outline" size={20} color={C.white} />
                                        {unreadCount > 0 && <View style={styles.notifDot} />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <StatusPill status={live ? 'approved' : 'pending'} label={live ? '● LIVE' : 'Connecting / offline'} />
                            {/* Priority Alert Banner */}
                            <TouchableOpacity
                                style={styles.alertBanner}
                                onPress={() => navigation.navigate('Pending')}
                                activeOpacity={0.85}
                            >
                                <View style={styles.alertIconBg}>
                                    <Ionicons name="warning" size={18} color={C.amberDark} />
                                </View>
                                <View style={styles.alertContent}>
                                    <Text style={styles.alertTitle}>{totalPending} Pending Report{totalPending !== 1 ? 's' : ''}</Text>
                                    <Text style={styles.alertSubtitle}>Require immediate review</Text>
                                </View>
                                <View style={styles.alertButton}>
                                    <Text style={styles.alertButtonText}>Review</Text>
                                    <Ionicons name="arrow-forward" size={14} color={C.navy} />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    </LinearGradient>

                    {/* ── Stats Row ── */}
                    <Animated.View
                        style={[
                            styles.statsRow,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                        ]}
                    >
                        {loadingData ? [0, 1, 2].map(key => <StatSkeleton key={key} style={{ flex: 1 }} />) : stats.map((stat, idx) => (
                            <TouchableOpacity 
                                key={idx} 
                                style={styles.statCard}
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate(stat.target, stat.params)}
                            >
                                <ProgressRing value={Number(stat.value) / Math.max(1, totalPending + approvedCount + rejectedCount)} count={Number(stat.value)} color={stat.color} label={stat.label} trigger={focusKey} />
                            </TouchableOpacity>
                        ))}
                    </Animated.View>

                    {loadError && <View accessibilityRole="alert" style={{ flexDirection: 'row', padding: 16, gap: 8, backgroundColor: COLORS.warningSurface }}>
                        <Ionicons name="cloud-offline-outline" size={20} color={COLORS.warning} /><Text style={{ color: COLORS.warning, flex: 1 }}>Could not refresh the queue. Pull down to retry.</Text>
                    </View>}
                    {/* ── Quick Actions ── */}
                    <Animated.View
                        style={[styles.section, { opacity: fadeAnim }]}
                    >
                        <Text style={styles.sectionTitle}>Quick Actions</Text>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('Pending')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIconCircle, { backgroundColor: C.warningSurface }]}>
                                <Ionicons name="time" size={22} color={C.warning} />
                            </View>
                            <View style={styles.actionCardContent}>
                                <Text style={styles.actionCardTitle}>Review Pending Reports</Text>
                                <Text style={styles.actionCardDesc}>{totalPending} report{totalPending !== 1 ? 's' : ''} waiting for verification</Text>
                            </View>
                            <View style={styles.amberCountBadge}>
                                <Text style={styles.amberCountText}>{totalPending}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('Verified')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIconCircle, { backgroundColor: C.successSurface }]}>
                                <Ionicons name="checkmark-circle" size={22} color={C.success} />
                            </View>
                            <View style={styles.actionCardContent}>
                                <Text style={styles.actionCardTitle}>Verified Reports</Text>
                                <Text style={styles.actionCardDesc}>View all verified violations history</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('OfficerReportExport')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIconCircle, { backgroundColor: '#E0F2FE' }]}>
                                <Ionicons name="document-text" size={22} color="#0284C7" />
                            </View>
                            <View style={styles.actionCardContent}>
                                <Text style={styles.actionCardTitle}>Export Reports</Text>
                                <Text style={styles.actionCardDesc}>Preview PDF or share Excel by date range</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
                        </TouchableOpacity>
                    </Animated.View>

                    {/* ── Recent Reports Queue ── */}
                    <Animated.View
                        style={[styles.section, { opacity: fadeAnim, marginBottom: 36 }]}
                    >
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Pending Queue</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Pending')}>
                                <Text style={styles.seeAll}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingData ? (
                            <><CardSkeleton /><CardSkeleton /></>
                        ) : pendingReports.length === 0 ? (
                            <EmptyState icon="checkmark-circle-outline" title="All caught up!" subtitle="No pending reports in your jurisdiction." />
                        ) : (
                            pendingReports.map((report) => {
                                const config = getPriorityConfig(report.severity);
                                return (
                                    <TouchableOpacity
                                        key={report.id}
                                        accessibilityRole="button" accessibilityLabel={'Review ' + report.violation_type + ', ' + report.severity + ' severity'}
                                        style={styles.reportCard}
                                        activeOpacity={0.8}
                                        onPress={() =>
                                            navigation.navigate('ImageReportReview', { reportId: report.id })
                                        }
                                    >
                                        {/* Priority left bar */}
                                        <View style={[styles.reportBar, { backgroundColor: config.barColor }]} />

                                        {/* Thumbnail */}
                                        <View style={styles.thumbnailFrame}>
                                            {report.image_url ? (
                                                <Image
                                                    source={{ uri: report.image_url }}
                                                    style={styles.reportThumbnail}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View style={[styles.reportThumbnail, { justifyContent: 'center', alignItems: 'center', backgroundColor: C.surfaceLow }]}>
                                                    <Ionicons name="videocam-outline" size={22} color={C.textTertiary} />
                                                </View>
                                            )}
                                            <View style={styles.thumbnailOverlay}>
                                                <Ionicons name="scan" size={14} color={C.white} />
                                            </View>
                                        </View>

                                        {/* Content */}
                                        <View style={styles.reportContent}>
                                            <View style={styles.reportTopRow}>
                                                <Text style={styles.reportType} numberOfLines={1}>
                                                    {report.violation_type || 'Traffic Violation'}
                                                </Text>
                                                <View style={[styles.priorityChip, { backgroundColor: config.bg }]}>
                                                    <Text style={[styles.priorityChipText, { color: config.color }]}>
                                                        {config.label}
                                                    </Text>
                                                </View>
                                            </View>

                                            {!!report.vehicle_number && (
                                                <Text style={styles.reportVehicle}>{report.vehicle_number}</Text>
                                            )}

                                            <View style={styles.metaRow}>
                                                {!!report.location_address && (
                                                    <View style={styles.reportMeta}>
                                                        <Ionicons name="location" size={11} color={C.textTertiary} />
                                                        <Text style={styles.reportMetaText} numberOfLines={1}>{report.location_address}</Text>
                                                    </View>
                                                )}
                                                <View style={styles.reportMeta}>
                                                    <Ionicons name="time" size={11} color={C.textTertiary} />
                                                    <Text style={styles.reportMetaText}>{formatDate(report.submitted_at)}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Review Action */}
                                        <View style={styles.actionArrow}>
                                            <Ionicons name="chevron-forward" size={18} color={C.navyMid} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </Animated.View>

                    {/* ── Rejected Reports Queue ── */}
                    <Animated.View style={[styles.section, { opacity: fadeAnim, marginBottom: 36 }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recently Rejected</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Verified', { status: 'rejected' })}>
                                <Text style={[styles.seeAll, { color: C.error }]}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingData ? (
                            <ActivityIndicator size="small" color={C.navyMid} style={{ marginTop: 20 }} />
                        ) : rejectedReports.length === 0 ? (
                            <View style={{alignItems: 'center', marginTop: 20, marginBottom: 20}}>
                                <Ionicons name="document-text-outline" size={40} color={C.textTertiary} />
                                <Text style={{color: C.textSecondary, marginTop: 8, fontFamily: 'Nunito-Medium'}}>No rejected reports recently.</Text>
                            </View>
                        ) : (
                            rejectedReports.map((report) => {
                                const config = getPriorityConfig(report.severity);
                                return (
                                    <TouchableOpacity
                                        key={report.id}
                                        style={styles.reportCard}
                                        activeOpacity={0.8}
                                        onPress={() => navigation.navigate('ImageReportReview', { reportId: report.id })}
                                    >
                                        <View style={[styles.reportBar, { backgroundColor: C.error }]} />
                                        <View style={styles.thumbnailFrame}>
                                            {report.image_url ? (
                                                <Image source={{ uri: report.image_url }} style={styles.reportThumbnail} resizeMode="cover" />
                                            ) : (
                                                <View style={[styles.reportThumbnail, { justifyContent: 'center', alignItems: 'center', backgroundColor: C.surfaceLow }]}>
                                                    <Ionicons name="videocam-outline" size={22} color={C.textTertiary} />
                                                </View>
                                            )}
                                            <View style={styles.thumbnailOverlay}>
                                                <Ionicons name="scan" size={14} color={C.white} />
                                            </View>
                                        </View>
                                        <View style={styles.reportContent}>
                                            <View style={styles.reportTopRow}>
                                                <Text style={styles.reportType} numberOfLines={1}>{report.violation_type || 'Traffic Violation'}</Text>
                                                <View style={[styles.priorityChip, { backgroundColor: C.errorSurface }]}>
                                                    <Text style={[styles.priorityChipText, { color: C.error }]}>REJECTED</Text>
                                                </View>
                                            </View>
                                            {!!report.vehicle_number && <Text style={styles.reportVehicle}>{report.vehicle_number}</Text>}
                                            <View style={styles.metaRow}>
                                                {!!report.location_address && (
                                                    <View style={styles.reportMeta}>
                                                        <Ionicons name="location" size={11} color={C.textTertiary} />
                                                        <Text style={styles.reportMetaText} numberOfLines={1}>{report.location_address}</Text>
                                                    </View>
                                                )}
                                                <View style={styles.reportMeta}>
                                                    <Ionicons name="time" size={11} color={C.textTertiary} />
                                                    <Text style={styles.reportMetaText}>{formatDate(report.submitted_at)}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={styles.actionArrow}>
                                            <Ionicons name="chevron-forward" size={18} color={C.navyMid} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.offWhite,
    },
    safeArea: {
        flex: 1,
    },

    // ── Header ──
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    officerBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    officerName: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.3,
    },
    officerZone: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Nunito-Medium',
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    headerIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notifDot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: C.amber,
        borderWidth: 1,
        borderColor: C.navyMid,
    },

    // Alert banner
    alertBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.amberSurface,
        borderRadius: 14,
        padding: 12,
        gap: 10,
    },
    alertIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(217,119,6,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContent: {
        flex: 1,
    },
    alertTitle: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: C.amberDark,
    },
    alertSubtitle: {
        fontSize: 11,
        color: C.textSecondary,
        marginTop: 2,
    },
    alertButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: C.amber,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    alertButtonText: {
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
    },

    // ── Stats Row ──
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 2,
    },

    // ── Section ──
    section: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 17,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        letterSpacing: -0.2,
        marginBottom: 14,
    },
    seeAll: {
        fontSize: 13,
        color: C.amber,
        fontFamily: 'Nunito-SemiBold',
    },

    // Action cards
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        gap: 14,
    },
    actionIconCircle: {
        width: 46,
        height: 46,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionCardContent: {
        flex: 1,
    },
    actionCardTitle: {
        fontSize: 15,
        fontFamily: 'Nunito-SemiBold',
        color: C.textPrimary,
        letterSpacing: -0.2,
    },
    actionCardDesc: {
        fontSize: 12,
        color: C.textSecondary,
        marginTop: 2,
    },
    amberCountBadge: {
        backgroundColor: C.amberSurface,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    amberCountText: {
        fontSize: 13,
        fontFamily: 'Nunito-Bold',
        color: C.amberDark,
    },

    // ── Report Cards ──
    reportCard: {
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderRadius: 20,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        alignItems: 'center',
        paddingRight: 12,
    },
    reportBar: {
        width: 4,
        alignSelf: 'stretch',
    },
    thumbnailFrame: {
        width: 82,
        height: 82,
        borderRadius: 14,
        margin: 12,
        overflow: 'hidden',
        backgroundColor: C.surfaceLow,
        position: 'relative',
    },
    reportThumbnail: {
        width: '100%',
        height: '100%',
    },
    thumbnailOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,36,82,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reportContent: {
        flex: 1,
        paddingVertical: 12,
    },
    reportTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    reportType: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
    },
    priorityChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    priorityChipText: {
        fontSize: 9,
        fontFamily: 'Nunito-ExtraBold',
        letterSpacing: 0.5,
    },
    reportVehicle: {
        fontSize: 14,
        color: C.navyMid,
        fontFamily: 'Nunito-Bold',
        letterSpacing: 0.8,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    reportMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reportMetaText: {
        fontSize: 11,
        color: C.textSecondary,
        fontFamily: 'Nunito-Medium',
    },
    actionArrow: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: C.primarySurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
