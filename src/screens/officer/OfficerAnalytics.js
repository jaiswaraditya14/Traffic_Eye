import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { FocusAwareStatusBar } from '../../components';
import ProgressRing from '../../components/common/ProgressRing';
import { useAuth } from '../../context';
import { supabase } from '../../services';
import { buildReportCsv } from '../../utils/reportCsv';

const { width } = Dimensions.get('window');

const C = {
    navy: '#0A1E3F',
    navyDeep: '#00102B',
    navyMid: '#0F2C59',
    amber: '#F59E0B',
    amberDark: '#D97706',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    surfaceLow: '#F8FAFC',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: '#E2E8F0',
    success: '#059669',
    successSurface: '#D1FAE5',
    error: '#DC2626',
    errorSurface: '#FEE2E2',
    chartBlue: '#2563EB',
};

const RANGES = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
];

export default function OfficerAnalytics({ navigation }) {
    const { user, profile } = useAuth();
    const [range, setRange] = useState('month');
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [exporting, setExporting] = useState(false);

    // Compute start date based on range
    const startDate = useMemo(() => {
        const now = new Date();
        if (range === 'week') {
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            d.setHours(0, 0, 0, 0);
            return d;
        } else if (range === 'month') {
            return new Date(now.getFullYear(), now.getMonth(), 1);
        }
        return null; // All time
    }, [range]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            let reportsQuery = supabase
                .from('image_reports')
                .select('id, status, violation_type, severity, location_address, submitted_at, reviewed_at')
                .order('submitted_at', { ascending: false });

            if (startDate) {
                reportsQuery = reportsQuery.gte('submitted_at', startDate.toISOString());
            }

            let reviewsQuery = supabase
                .from('officer_reviews')
                .select('review_timestamp, created_at, decision, report_id');

            if (user?.id) {
                reviewsQuery = reviewsQuery.eq('officer_id', user.id);
            }

            const [{ data: repData, error: repError }, { data: revData, error: revError }] = await Promise.all([
                reportsQuery,
                reviewsQuery,
            ]);

            if (repError) throw repError;
            setReports(repData || []);
            setReviews(revData || []);
        } catch (err) {
            if (__DEV__) console.warn('[OfficerAnalytics] Failed to fetch analytics data:', err);
        } finally {
            setLoading(false);
        }
    }, [startDate, user?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Computed Metrics
    const totalReports = reports.length;
    const approvedCount = useMemo(() => reports.filter(r => r.status === 'approved').length, [reports]);
    const rejectedCount = useMemo(() => reports.filter(r => r.status === 'rejected').length, [reports]);
    const pendingCount = useMemo(() => reports.filter(r => r.status === 'pending').length, [reports]);

    const approvalRate = useMemo(() => {
        const evaluated = approvedCount + rejectedCount;
        return evaluated > 0 ? approvedCount / evaluated : 0;
    }, [approvedCount, rejectedCount]);

    // Average review time calculation
    const avgReviewTimeMinutes = useMemo(() => {
        if (!reports.length) return null;
        const reviewed = reports.filter(r => r.submitted_at && r.reviewed_at);
        if (!reviewed.length) return null;
        const totalMinutes = reviewed.reduce((sum, r) => {
            const sub = new Date(r.submitted_at).getTime();
            const rev = new Date(r.reviewed_at).getTime();
            const diff = (rev - sub) / (1000 * 60);
            return diff > 0 ? sum + diff : sum;
        }, 0);
        return Math.round(totalMinutes / reviewed.length);
    }, [reports]);

    const formatReviewTime = (minutes) => {
        if (minutes == null) return '—';
        if (minutes < 60) return `${minutes}m`;
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    };

    // Reports over time (Daily grouping)
    const dailyChartData = useMemo(() => {
        const counts = {};
        const days = range === 'week' ? 7 : range === 'month' ? 14 : 10;
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = `${d.getDate()}/${d.getMonth() + 1}`;
            counts[key] = { label: key, count: 0 };
        }

        reports.forEach(r => {
            if (!r.submitted_at) return;
            const d = new Date(r.submitted_at);
            const key = `${d.getDate()}/${d.getMonth() + 1}`;
            if (counts[key]) {
                counts[key].count++;
            }
        });

        const list = Object.values(counts);
        const max = Math.max(...list.map(item => item.count), 1);
        return { list, max };
    }, [reports, range]);

    // Top violations breakdown
    const topViolations = useMemo(() => {
        const counts = {};
        reports.forEach(r => {
            const type = r.violation_type || 'Unspecified';
            counts[type] = (counts[type] || 0) + 1;
        });
        const sorted = Object.entries(counts)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        const max = Math.max(...sorted.map(s => s.count), 1);
        return { list: sorted, max };
    }, [reports]);

    // Top 5 locations
    const topLocations = useMemo(() => {
        const counts = {};
        reports.forEach(r => {
            const loc = r.location_address ? r.location_address.trim() : 'Unknown Area';
            counts[loc] = (counts[loc] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([location, count]) => ({ location, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [reports]);

    // CSV Export Handler
    const handleExport = async () => {
        if (!reports.length) {
            Alert.alert('No Data', 'There are no reports to export in the selected period.');
            return;
        }
        setExporting(true);
        try {
            const rows = reports.map(r => ({
                date: r.submitted_at ? new Date(r.submitted_at).toLocaleString('en-IN') : 'N/A',
                violation: r.violation_type || 'N/A',
                vehiclePlateNumber: r.vehicle_number || 'N/A',
                address: r.location_address || 'N/A',
                status: r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1)) : 'N/A',
            }));
            const csv = buildReportCsv(rows);
            const fileName = `TrafficEye_Analytics_${range}_${Date.now()}.csv`;
            const fileUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType?.UTF8 || 'utf8' });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/csv',
                    dialogTitle: 'Export Analytics Reports',
                    UTI: 'public.comma-separated-values-text',
                });
            } else {
                Alert.alert('Exported', `File saved: ${fileName}`);
            }
        } catch (err) {
            Alert.alert('Export Failed', 'Could not export analytics data.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <View style={s.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navyDeep} />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* ── Navy Header ── */}
                <LinearGradient colors={[C.navyDeep, C.navy, C.navyMid]} style={s.header}>
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                            <Ionicons name="arrow-back" size={20} color={C.white} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerTitle}>Officer Analytics</Text>
                            <Text style={s.headerSub}>Enforcement & verification insights</Text>
                        </View>
                        <TouchableOpacity
                            style={[s.exportBtn, exporting && { opacity: 0.6 }]}
                            onPress={handleExport}
                            disabled={exporting}
                        >
                            {exporting ? (
                                <ActivityIndicator size="small" color={C.navy} />
                            ) : (
                                <Ionicons name="download-outline" size={18} color={C.navy} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Date Range Selector */}
                    <View style={s.rangeRow}>
                        {RANGES.map(item => {
                            const active = range === item.key;
                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[s.rangeTab, active && s.rangeTabActive]}
                                    onPress={() => setRange(item.key)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[s.rangeLabel, active && s.rangeLabelActive]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </LinearGradient>

                {loading ? (
                    <View style={s.loaderBox}>
                        <ActivityIndicator size="large" color={C.navyMid} />
                        <Text style={s.loaderText}>Calculating enforcement statistics…</Text>
                    </View>
                ) : (
                    <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
                        {/* ── Summary Cards Horizontal Scroll ── */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.cardsScroll}
                        >
                            <View style={[s.summaryCard, { borderLeftColor: C.navyMid }]}>
                                <View style={s.cardIconBox}>
                                    <Ionicons name="document-text-outline" size={18} color={C.navyMid} />
                                </View>
                                <Text style={s.cardVal}>{totalReports}</Text>
                                <Text style={s.cardLbl}>Total Submissions</Text>
                            </View>

                            <View style={[s.summaryCard, { borderLeftColor: C.success }]}>
                                <View style={[s.cardIconBox, { backgroundColor: C.successSurface }]}>
                                    <Ionicons name="checkmark-circle-outline" size={18} color={C.success} />
                                </View>
                                <Text style={[s.cardVal, { color: C.success }]}>{approvedCount}</Text>
                                <Text style={s.cardLbl}>Approved Reports</Text>
                            </View>

                            <View style={[s.summaryCard, { borderLeftColor: C.error }]}>
                                <View style={[s.cardIconBox, { backgroundColor: C.errorSurface }]}>
                                    <Ionicons name="close-circle-outline" size={18} color={C.error} />
                                </View>
                                <Text style={[s.cardVal, { color: C.error }]}>{rejectedCount}</Text>
                                <Text style={s.cardLbl}>Rejected Reports</Text>
                            </View>

                            <View style={[s.summaryCard, { borderLeftColor: C.amber }]}>
                                <View style={[s.cardIconBox, { backgroundColor: '#FEF3C7' }]}>
                                    <Ionicons name="time-outline" size={18} color={C.amberDark} />
                                </View>
                                <Text style={[s.cardVal, { color: C.amberDark }]}>
                                    {formatReviewTime(avgReviewTimeMinutes)}
                                </Text>
                                <Text style={s.cardLbl}>Avg Turnaround</Text>
                            </View>
                        </ScrollView>

                        {/* ── Approval Rate + Quick Stats ── */}
                        <View style={s.sectionCard}>
                            <Text style={s.sectionTitle}>Verification Rate</Text>
                            <View style={s.rateRow}>
                                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                    <ProgressRing
                                        value={approvalRate}
                                        color={C.success}
                                        label="Approved Ratio"
                                    />
                                </View>
                                <View style={s.rateBreakdown}>
                                    <View style={s.breakdownRow}>
                                        <View style={[s.dot, { backgroundColor: C.success }]} />
                                        <Text style={s.breakdownText}>Approved: {approvedCount}</Text>
                                    </View>
                                    <View style={s.breakdownRow}>
                                        <View style={[s.dot, { backgroundColor: C.error }]} />
                                        <Text style={s.breakdownText}>Rejected: {rejectedCount}</Text>
                                    </View>
                                    <View style={s.breakdownRow}>
                                        <View style={[s.dot, { backgroundColor: C.amber }]} />
                                        <Text style={s.breakdownText}>Pending: {pendingCount}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* ── Reports Over Time (Bar Chart) ── */}
                        <View style={s.sectionCard}>
                            <View style={s.sectionHeader}>
                                <Text style={s.sectionTitle}>Reports Over Time</Text>
                                <Text style={s.sectionSub}>Daily volume</Text>
                            </View>
                            <View style={s.chartBox}>
                                {dailyChartData.list.map((item, idx) => {
                                    const heightPct = Math.max(8, Math.round((item.count / dailyChartData.max) * 100));
                                    return (
                                        <View key={idx} style={s.barCol}>
                                            <Text style={s.barCount}>{item.count > 0 ? item.count : ''}</Text>
                                            <View style={s.barTrack}>
                                                <View
                                                    style={[
                                                        s.barFill,
                                                        {
                                                            height: `${heightPct}%`,
                                                            backgroundColor: item.count > 0 ? C.navyMid : '#CBD5E1',
                                                        },
                                                    ]}
                                                />
                                            </View>
                                            <Text style={s.barLabel}>{item.label}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* ── Top Violations ── */}
                        <View style={s.sectionCard}>
                            <Text style={s.sectionTitle}>Top Reported Violations</Text>
                            {topViolations.list.length === 0 ? (
                                <Text style={s.emptyNotice}>No violations recorded for this timeframe.</Text>
                            ) : (
                                topViolations.list.map((item, idx) => {
                                    const pct = Math.round((item.count / topViolations.max) * 100);
                                    return (
                                        <View key={idx} style={s.violationRow}>
                                            <View style={s.violationMeta}>
                                                <Text style={s.violationName}>{item.type}</Text>
                                                <Text style={s.violationCount}>{item.count} report{item.count > 1 ? 's' : ''}</Text>
                                            </View>
                                            <View style={s.hBarTrack}>
                                                <View style={[s.hBarFill, { width: `${pct}%`, backgroundColor: C.amber }]} />
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </View>

                        {/* ── Top 5 Locations ── */}
                        <View style={s.sectionCard}>
                            <Text style={s.sectionTitle}>Hotspot Locations (Top 5)</Text>
                            {topLocations.length === 0 ? (
                                <Text style={s.emptyNotice}>No locations recorded for this timeframe.</Text>
                            ) : (
                                topLocations.map((item, idx) => (
                                    <View key={idx} style={s.locationRow}>
                                        <View style={s.locationRank}>
                                            <Text style={s.rankText}>#{idx + 1}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.locationText} numberOfLines={2}>{item.location}</Text>
                                        </View>
                                        <View style={s.locBadge}>
                                            <Text style={s.locBadgeText}>{item.count}</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* ── Export CTA ── */}
                        <TouchableOpacity
                            style={s.exportCta}
                            onPress={handleExport}
                            disabled={exporting}
                            activeOpacity={0.88}
                        >
                            <LinearGradient colors={[C.navyMid, C.navy]} style={s.exportCtaGrad}>
                                <Ionicons name="document-text-outline" size={18} color={C.white} />
                                <Text style={s.exportCtaText}>Export Current Data as CSV</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={{ height: 48 }} />
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.white },
    headerSub: { fontSize: 12, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.6)' },
    exportBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.amber, justifyContent: 'center', alignItems: 'center' },

    rangeRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 3, marginTop: 14 },
    rangeTab: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
    rangeTabActive: { backgroundColor: C.white },
    rangeLabel: { fontSize: 12, fontFamily: 'Nunito-Bold', color: 'rgba(255,255,255,0.7)' },
    rangeLabelActive: { color: C.navyMid },

    loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    loaderText: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textSecondary },

    content: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

    cardsScroll: { gap: 12, paddingBottom: 6 },
    summaryCard: {
        backgroundColor: C.white,
        borderRadius: 14,
        padding: 14,
        minWidth: 125,
        borderLeftWidth: 4,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    cardIconBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    cardVal: { fontSize: 20, fontFamily: 'Nunito-ExtraBold', color: C.textPrimary },
    cardLbl: { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textTertiary, marginTop: 2 },

    sectionCard: {
        backgroundColor: C.white,
        borderRadius: 16,
        padding: 16,
        marginTop: 14,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.navyMid, marginBottom: 12 },
    sectionSub: { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textTertiary },

    rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 6 },
    rateBreakdown: { gap: 8 },
    breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    breakdownText: { fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.textSecondary },

    chartBox: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, paddingTop: 10 },
    barCol: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end', gap: 4 },
    barCount: { fontSize: 9, fontFamily: 'Nunito-Bold', color: C.textTertiary, height: 12 },
    barTrack: { height: 90, width: 14, backgroundColor: '#F1F5F9', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
    barFill: { width: '100%', borderRadius: 4 },
    barLabel: { fontSize: 9, fontFamily: 'Nunito-Medium', color: C.textTertiary, marginTop: 4 },

    violationRow: { marginBottom: 10 },
    violationMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    violationName: { fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.textPrimary },
    violationCount: { fontSize: 11, fontFamily: 'Nunito-Bold', color: C.textTertiary },
    hBarTrack: { height: 7, backgroundColor: C.surfaceLow, borderRadius: 4, overflow: 'hidden' },
    hBarFill: { height: '100%', borderRadius: 4 },

    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    locationRank: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    rankText: { fontSize: 11, fontFamily: 'Nunito-Bold', color: C.navyMid },
    locationText: { fontSize: 12, fontFamily: 'Nunito-Medium', color: C.textPrimary },
    locBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    locBadgeText: { fontSize: 11, fontFamily: 'Nunito-Bold', color: C.amberDark },

    exportCta: { borderRadius: 14, overflow: 'hidden', marginTop: 16 },
    exportCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    exportCtaText: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.white },

    emptyNotice: { fontSize: 12, fontFamily: 'Nunito-Medium', color: C.textTertiary, fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
});
