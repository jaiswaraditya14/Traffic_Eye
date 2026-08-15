/**
 * ImageReportStatus.js
 *
 * Citizen-facing transparency screen:
 *  • Shows exactly what data was stored & shared with officers
 *  • Live report status (pending / approved / rejected)
 *  • Officer review details + remarks when available
 *  • Real-time updates via Supabase channel
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Animated, StatusBar, Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, FocusAwareStatusBar } from '../../components';
import { useAuth } from '../../context';
import {
    fetchCitizenReports,
    subscribeToReportUpdates,
} from '../../services/reports';

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
    navy:            '#002452',
    navyMid:         '#1B3A6B',
    navyLight:       '#2D4F8E',
    amber:           '#F59E0B',
    white:           '#FFFFFF',
    offWhite:        '#F8F9FB',
    surface:         '#FFFFFF',
    textPrimary:     '#191C1E',
    textSecondary:   '#44474F',
    textTertiary:    '#747780',
    border:          '#E2E8F0',
    approved:        '#059669',
    approvedSurface: '#D1FAE5',
    rejected:        '#DC2626',
    rejectedSurface: '#FEE2E2',
    pending:         '#D97706',
    pendingSurface:  '#FEF3C7',
};

const SEVERITY_MAP = {
    critical: { color: '#2563EB', bg: '#DBEAFE', label: 'Critical' },
    high:     { color: '#EA580C', bg: '#FFEDD5', label: 'High' },
    medium:   { color: '#D97706', bg: '#FEF3C7', label: 'Medium' },
    low:      { color: '#059669', bg: '#D1FAE5', label: 'Low' },
};

function getStatusConfig(status) {
    switch (status) {
        case 'approved': return { color: C.approved, bg: C.approvedSurface, icon: 'checkmark-circle', label: 'Approved by Officer' };
        case 'rejected': return { color: C.rejected, bg: C.rejectedSurface, icon: 'close-circle', label: 'Rejected by Officer' };
        default:          return { color: C.pending,  bg: C.pendingSurface,  icon: 'time-outline',   label: 'Awaiting Review' };
    }
}

// ── Pulsing live indicator ─────────────────────────────────────────────────
function LiveDot({ color = C.approved }) {
    const pulse = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])).start();
    }, []);
    return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: pulse }} />;
}

// ── Confidence bar ────────────────────────────────────────────────────────
function ConfBar({ score }) {
    const w = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(w, { toValue: score ?? 0, duration: 900, delay: 300, useNativeDriver: false }).start();
    }, [score]);
    const pct   = Math.round((score ?? 0) * 100);
    const color = pct >= 75 ? C.approved : pct >= 50 ? C.amber : C.rejected;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <View style={{ flex: 1, height: 6, backgroundColor: C.border, borderRadius: 99, overflow: 'hidden' }}>
                <Animated.View style={{
                    height: '100%', borderRadius: 99, backgroundColor: color,
                    width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                }} />
            </View>
            <Text style={{ fontSize: 12, fontFamily: 'Nunito-Bold', color, minWidth: 36 }}>{pct}%</Text>
        </View>
    );
}

// ── Data disclosure row (what's shared with officers) ─────────────────────
function DataRow({ icon, label, value, sensitive }) {
    return (
        <View style={ds.row}>
            <View style={[ds.iconBox, sensitive && { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name={icon} size={14} color={sensitive ? C.amber : C.navyMid} />
            </View>
            <View style={ds.rowText}>
                <Text style={ds.rowLabel}>{label}</Text>
                <Text style={ds.rowValue} numberOfLines={2}>{value || '—'}</Text>
            </View>
        </View>
    );
}
const ds = StyleSheet.create({
    row:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    iconBox:  { width: 28, height: 28, borderRadius: 8, backgroundColor: '#EEF1F8', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
    rowText:  { flex: 1 },
    rowLabel: { fontSize: 10, fontFamily: 'Nunito-ExtraBold', color: C.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 1 },
    rowValue: { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, lineHeight: 18 },
});

// ── Single report card ────────────────────────────────────────────────────
function ReportCard({ report, navigation }) {
    const [expanded, setExpanded] = useState(false);
    const expandAnim = useRef(new Animated.Value(0)).current;
    const statusCfg  = getStatusConfig(report.status);
    const sevCfg     = SEVERITY_MAP[report.severity] || SEVERITY_MAP.medium;
    const review     = report.officer_review;

    useEffect(() => {
        Animated.timing(expandAnim, { toValue: expanded ? 1 : 0, duration: 250, useNativeDriver: false }).start();
    }, [expanded]);

    const shortId    = report.id?.slice(0, 8).toUpperCase();
    const submitted  = report.submitted_at
        ? new Date(report.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';

    return (
        <View style={rcs.wrapper}>
            {/* Status colour bar */}
            <View style={[rcs.statusBar, { backgroundColor: statusCfg.color }]} />

            <TouchableOpacity style={rcs.card} onPress={() => setExpanded(p => !p)} activeOpacity={0.87}>
                {/* Top row */}
                <View style={rcs.topRow}>
                    <View style={[rcs.statusBadge, { backgroundColor: statusCfg.bg }]}>
                        <Ionicons name={statusCfg.icon} size={13} color={statusCfg.color} />
                        <Text style={[rcs.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>
                    <View style={[rcs.sevBadge, { backgroundColor: sevCfg.bg }]}>
                        <Text style={[rcs.sevText, { color: sevCfg.color }]}>{sevCfg.label}</Text>
                    </View>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={C.textTertiary} />
                </View>

                {/* Report ID + time */}
                <View style={rcs.metaRow}>
                    <Ionicons name="receipt-outline" size={12} color={C.textTertiary} />
                    <Text style={rcs.metaText}>#{shortId}</Text>
                    <Ionicons name="time-outline" size={12} color={C.textTertiary} style={{ marginLeft: 8 }} />
                    <Text style={rcs.metaText}>{submitted}</Text>
                </View>

                {/* Violation type */}
                <Text style={rcs.violationType}>{report.violation_type || 'Traffic Violation'}</Text>

                {/* Image thumbnail + quick info */}
                <View style={rcs.previewRow}>
                    {report.image_url ? (
                        <Image source={{ uri: report.image_url }} style={rcs.thumb} resizeMode="cover" />
                    ) : (
                        <View style={[rcs.thumb, rcs.thumbPlaceholder]}>
                            <Ionicons name="image-outline" size={20} color={C.textTertiary} />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        {report.vehicle_number && (
                            <View style={rcs.infoChip}>
                                <Ionicons name="car-outline" size={12} color={C.navyMid} />
                                <Text style={rcs.infoChipText}>{report.vehicle_number}</Text>
                            </View>
                        )}
                        {report.location_address && (
                            <View style={[rcs.infoChip, { marginTop: 4 }]}>
                                <Ionicons name="location-outline" size={12} color={C.textTertiary} />
                                <Text style={[rcs.infoChipText, { color: C.textTertiary }]} numberOfLines={1}>
                                    {report.location_address}
                                </Text>
                            </View>
                        )}
                        <ConfBar score={report.ai_confidence} />
                    </View>
                </View>
            </TouchableOpacity>

            {/* Expanded detail */}
            {expanded && (
                <Animated.View style={[rcs.expanded, {
                    opacity: expandAnim,
                    maxHeight: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 700] }),
                }]}>
                    <View style={rcs.expandedInner}>
                        <View style={rcs.divider} />

                        {/* ── What data was stored & shared ── */}
                        <Text style={rcs.sectionTitle}>
                            <Ionicons name="eye-outline" size={13} color={C.navyMid} /> Data Shared With Officers
                        </Text>
                        <View style={rcs.disclosureBox}>
                            <DataRow icon="shield-checkmark-outline" label="Violation Type"   value={report.violation_type} />
                            <DataRow icon="document-text-outline"    label="AI Description"   value={report.violation_description} />
                            <DataRow icon="car-outline"              label="Vehicle Number"   value={report.vehicle_number} />
                            <DataRow icon="warning-outline"          label="Severity"          value={sevCfg.label} />
                            <DataRow icon="analytics-outline"        label="AI Confidence"    value={`${Math.round((report.ai_confidence ?? 0) * 100)}%`} />
                            <DataRow icon="location-outline"         label="Location"          value={report.location_address} />
                            <DataRow icon="time-outline"             label="Reported At"       value={submitted} />
                            <DataRow icon="image-outline"            label="Evidence Image"    value={report.image_url ? 'Submitted ✓' : 'Not provided'} />
                            <DataRow icon="person-outline"           label="Your Identity"     value="Shared with officer (required by law)" sensitive />
                        </View>

                        {/* ── Officer review ── */}
                        {review ? (
                            <View style={rcs.reviewBox}>
                                <Text style={rcs.sectionTitle}>
                                    <Ionicons name="person-circle-outline" size={13} color={statusCfg.color} /> Officer Decision
                                </Text>
                                <View style={[rcs.decisionBadge, { backgroundColor: statusCfg.bg }]}>
                                    <Ionicons name={statusCfg.icon} size={18} color={statusCfg.color} />
                                    <Text style={[rcs.decisionText, { color: statusCfg.color }]}>
                                        {review.decision === 'approved' ? 'Approved' : 'Rejected'}
                                    </Text>
                                </View>
                                {review.remarks && (
                                    <View style={rcs.remarksBox}>
                                        <Ionicons name="chatbubble-outline" size={14} color={C.navyMid} />
                                        <Text style={rcs.remarksText}>{review.remarks}</Text>
                                    </View>
                                )}
                                <View style={rcs.reviewMeta}>
                                    {review.officer?.full_name && (
                                        <Text style={rcs.reviewMetaText}>Officer: {review.officer.full_name}</Text>
                                    )}
                                    <Text style={rcs.reviewMetaText}>
                                        Reviewed: {new Date(review.review_timestamp).toLocaleString('en-IN', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                        })}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={rcs.pendingBox}>
                                <ActivityIndicator size="small" color={C.amber} />
                                <Text style={rcs.pendingText}>Awaiting officer review…</Text>
                            </View>
                        )}

                        {/* View full report */}
                        <TouchableOpacity
                            style={rcs.fullBtn}
                            onPress={() => navigation.navigate('ImageReportDetail', { reportId: report.id })}
                            activeOpacity={0.8}
                        >
                            <Text style={rcs.fullBtnText}>View Full Report</Text>
                            <Ionicons name="open-outline" size={15} color={C.white} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const rcs = StyleSheet.create({
    wrapper:     { marginHorizontal: 16, marginBottom: 14, borderRadius: 20, overflow: 'hidden', backgroundColor: C.surface, shadowColor: C.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
    statusBar:   { height: 4 },
    card:        { padding: 16 },
    topRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
    statusLabel: { fontSize: 11, fontFamily: 'Nunito-Bold' },
    sevBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    sevText:     { fontSize: 10, fontFamily: 'Nunito-Bold', letterSpacing: 0.4 },
    metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    metaText:    { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textTertiary },
    violationType: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginBottom: 10 },
    previewRow:  { flexDirection: 'row', gap: 12 },
    thumb:       { width: 80, height: 80, borderRadius: 14, backgroundColor: '#F2F4F6' },
    thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    infoChip:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoChipText: { fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.navyMid },

    // Expanded
    expanded:      { overflow: 'hidden' },
    expandedInner: { paddingHorizontal: 16, paddingBottom: 16 },
    divider:       { height: 1, backgroundColor: C.border, marginVertical: 12 },
    sectionTitle:  { fontSize: 12, fontFamily: 'Nunito-ExtraBold', color: C.navyMid, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
    disclosureBox: { backgroundColor: C.offWhite, borderRadius: 14, padding: 14, marginBottom: 16 },
    reviewBox:     { backgroundColor: C.offWhite, borderRadius: 14, padding: 14, marginBottom: 14 },
    decisionBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 10, marginBottom: 10 },
    decisionText:  { fontSize: 15, fontFamily: 'Nunito-Bold' },
    remarksBox:    { flexDirection: 'row', gap: 8, backgroundColor: C.white, borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: C.border },
    remarksText:   { flex: 1, fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, lineHeight: 18 },
    reviewMeta:    { gap: 2 },
    reviewMetaText: { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textTertiary },
    pendingBox:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 14 },
    pendingText:   { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.amber },
    fullBtn:       { backgroundColor: C.navy, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    fullBtnText:   { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.white },
});

// ── Main screen ─────────────────────────────────────────────────────────
export default function ImageReportStatus({ navigation }) {
    const { user }                   = useAuth();
    const [reports, setReports]      = useState([]);
    const [loading, setLoading]      = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const fadeAnim                   = useRef(new Animated.Value(0)).current;
    const slideAnim                  = useRef(new Animated.Value(24)).current;

    const load = useCallback(async (isRefresh = false) => {
        if (!user?.id) return;
        if (!isRefresh) setLoading(true);
        const { data, error } = await fetchCitizenReports(user.id);
        if (!error && data) setReports(data);
        setLoading(false);
        setRefreshing(false);
    }, [user?.id]);

    useEffect(() => {
        load();
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
    }, [load]);

    // Realtime subscription
    useEffect(() => {
        if (!user?.id) return;
        const ch = subscribeToReportUpdates(
            user.id,
            (payload) => setReports(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r)),
            (payload) => setReports(prev => [payload.new, ...prev]),
        );
        return () => { if (ch) ch.unsubscribe(); };
    }, [user?.id]);

    const counts = {
        pending:  reports.filter(r => r.status === 'pending').length,
        approved: reports.filter(r => r.status === 'approved').length,
        rejected: reports.filter(r => r.status === 'rejected').length,
    };

    return (
        <MobileContainer>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />

            {/* Header */}
            <LinearGradient colors={[C.navy, C.navyMid]} style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={20} color={C.white} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <View style={s.headerIcon}>
                        <Ionicons name="shield-checkmark" size={22} color={C.amber} />
                    </View>
                    <Text style={s.headerTitle}>My Image Reports</Text>
                    <Text style={s.headerSub}>Full transparency on stored & shared data</Text>
                </View>
            </LinearGradient>

            {/* Stats bar */}
            <View style={s.statsBar}>
                {[
                    { label: 'Pending', count: counts.pending,  color: C.pending  },
                    { label: 'Approved', count: counts.approved, color: C.approved },
                    { label: 'Rejected', count: counts.rejected, color: C.rejected },
                ].map(({ label, count, color }) => (
                    <View key={label} style={s.statItem}>
                        <Text style={[s.statCount, { color }]}>{count}</Text>
                        <Text style={s.statLabel}>{label}</Text>
                    </View>
                ))}
            </View>

            {/* Disclosure banner */}
            <View style={s.disclosureBanner}>
                <Ionicons name="information-circle-outline" size={16} color={C.navyMid} />
                <Text style={s.disclosureText}>
                    Each report below shows exactly what data is stored and which details officers can see.
                </Text>
            </View>

            {/* Content */}
            <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                {loading ? (
                    <View style={s.centered}>
                        <ActivityIndicator size="large" color={C.navyMid} />
                        <Text style={s.loadingText}>Loading reports…</Text>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={s.list}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                colors={[C.navyMid]}
                                tintColor={C.navyMid}
                                onRefresh={() => { setRefreshing(true); load(true); }}
                            />
                        }
                    >
                        {reports.length === 0 ? (
                            <View style={s.empty}>
                                <Ionicons name="document-outline" size={48} color={C.textTertiary} />
                                <Text style={s.emptyTitle}>No Reports Yet</Text>
                                <Text style={s.emptySub}>Your submitted image reports will appear here.</Text>
                            </View>
                        ) : (
                            reports.map(r => (
                                <ReportCard key={r.id} report={r} navigation={navigation} />
                            ))
                        )}

                        {/* Live badge */}
                        <View style={s.liveBadge}>
                            <LiveDot />
                            <Text style={s.liveText}>Live — updates automatically</Text>
                        </View>
                    </ScrollView>
                )}
            </Animated.View>
        </MobileContainer>
    );
}

const s = StyleSheet.create({
    header:       { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
    headerIcon:   { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    headerTitle:  { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.white },
    headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Nunito-Medium', marginTop: 2 },

    statsBar:     { flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
    statItem:     { flex: 1, alignItems: 'center', paddingVertical: 12 },
    statCount:    { fontSize: 20, fontFamily: 'Nunito-ExtraBold' },
    statLabel:    { fontSize: 11, fontFamily: 'Nunito-SemiBold', color: C.textTertiary, marginTop: 1 },

    disclosureBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, margin: 16, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BFDBFE' },
    disclosureText:   { flex: 1, fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.navyMid, lineHeight: 17 },

    list:     { paddingTop: 4, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    loadingText: { fontSize: 14, fontFamily: 'Nunito-Medium', color: C.textSecondary },

    empty:      { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 10 },
    emptyTitle:  { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    emptySub:    { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary, textAlign: 'center', lineHeight: 19 },

    liveBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 12 },
    liveText:  { fontSize: 12, fontFamily: 'Nunito-Medium', color: C.textTertiary },
});
