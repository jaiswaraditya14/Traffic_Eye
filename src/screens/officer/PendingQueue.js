/**
 * PendingQueue.js  (Officer Screen — rewritten)
 *
 * • Fetches pending image_reports from Supabase in real time
 * • Priority colour-coded by severity field
 * • Live badge counting + search filter
 * • Navigates to ImageReportReview for each card
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SectionList,
    Image, StatusBar, ActivityIndicator, Animated, RefreshControl,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchPendingReports, subscribeToOfficerQueue } from '../../services/reports';

// ── Tokens ────────────────────────────────────────────────────────────────
const C = {
    navy:     '#002452',
    navyMid:  '#1B3A6B',
    amber:    '#F59E0B',
    white:    '#FFFFFF',
    offWhite: '#F8F9FB',
    surface:  '#FFFFFF',
    textPrimary:   '#191C1E',
    textSecondary: '#44474F',
    textTertiary:  '#747780',
    border:   '#E2E8F0',
    critical: '#DC2626',
    high:     '#EA580C',
    medium:   '#D97706',
    low:      '#059669',
};

const SEV_CFG = {
    critical: { color: C.critical, bg: '#FEE2E2', label: 'CRITICAL', order: 0 },
    high:     { color: C.high,     bg: '#FFEDD5', label: 'HIGH',     order: 1 },
    medium:   { color: C.medium,   bg: '#FEF3C7', label: 'MEDIUM',   order: 2 },
    low:      { color: C.low,      bg: '#D1FAE5', label: 'LOW',      order: 3 },
};
const getSev = (s) => SEV_CFG[s] || SEV_CFG.medium;

// ── Live dot ─────────────────────────────────────────────────────────────
function LiveDot() {
    const pulse = useRef(new Animated.Value(0.5)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        ])).start();
    }, []);
    return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80', opacity: pulse }} />;
}

// ── Report card ──────────────────────────────────────────────────────────
function ReportCard({ report, onPress }) {
    const sev      = getSev(report.severity);
    const submitted = report.submitted_at
        ? new Date(report.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        : '—';
    const name = report.submitter?.full_name || 'Anonymous';

    return (
        <TouchableOpacity style={rc.card} onPress={onPress} activeOpacity={0.82}>
            <View style={[rc.bar, { backgroundColor: sev.color }]} />

            {/* Image */}
            {report.image_url ? (
                <Image source={{ uri: report.image_url }} style={rc.thumb} resizeMode="cover" />
            ) : (
                <View style={[rc.thumb, rc.thumbPlaceholder]}>
                    <Ionicons name="image-outline" size={22} color={C.textTertiary} />
                </View>
            )}

            {/* Content */}
            <View style={rc.content}>
                <View style={rc.topRow}>
                    <Text style={rc.type} numberOfLines={1}>{report.violation_type || 'Traffic Violation'}</Text>
                    <View style={[rc.sevChip, { backgroundColor: sev.bg }]}>
                        <Text style={[rc.sevText, { color: sev.color }]}>{sev.label}</Text>
                    </View>
                </View>

                {report.vehicle_number && (
                    <View style={rc.infoRow}>
                        <Ionicons name="car-outline" size={11} color={C.navyMid} />
                        <Text style={rc.infoText}>{report.vehicle_number}</Text>
                    </View>
                )}
                <View style={rc.infoRow}>
                    <Ionicons name="person-outline" size={11} color={C.textTertiary} />
                    <Text style={rc.infoText}>{name}</Text>
                </View>
                {report.location_address && (
                    <View style={rc.infoRow}>
                        <Ionicons name="location-outline" size={11} color={C.textTertiary} />
                        <Text style={rc.infoText} numberOfLines={1}>{report.location_address}</Text>
                    </View>
                )}
                <View style={rc.infoRow}>
                    <Ionicons name="time-outline" size={11} color={C.textTertiary} />
                    <Text style={rc.infoText}>{submitted}</Text>
                </View>
            </View>

            <Ionicons name="chevron-forward" size={16} color={C.navyMid} style={{ marginRight: 12 }} />
        </TouchableOpacity>
    );
}
const rc = StyleSheet.create({
    card:    { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 16, marginBottom: 10, overflow: 'hidden', alignItems: 'center', shadowColor: C.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    bar:     { width: 4, alignSelf: 'stretch' },
    thumb:   { width: 76, height: 88, backgroundColor: '#F2F4F6' },
    thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, padding: 12, gap: 4 },
    topRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 6 },
    type:    { flex: 1, fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    sevChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    sevText: { fontSize: 9, fontFamily: 'Nunito-ExtraBold', letterSpacing: 0.4 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoText: { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textSecondary },
});

import { useFocusEffect } from '@react-navigation/native';

// ── Main screen ───────────────────────────────────────────────────────────
export default function PendingQueue({ navigation }) {
    const [reports,    setReports]    = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search,     setSearch]     = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const hasLoadedRef = useRef(false);  // prevents blank list on focus returns

    const load = useCallback(async (isRefresh = false) => {
        if (!hasLoadedRef.current && !isRefresh) setLoading(true);
        const { data, error } = await fetchPendingReports();
        if (!error && data) {
            setReports(data);
            hasLoadedRef.current = true;
        }
        setLoading(false);
        setRefreshing(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }, [fadeAnim]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    // Realtime subscription — resubscribe on every focus so we never miss changes
    useFocusEffect(
        useCallback(() => {
            const ch = subscribeToOfficerQueue(
                () => load(true),   // INSERT: full reload
                () => load(true),   // UPDATE: full reload (handles pending→approved transitions)
            );
            return () => { if (ch) ch.unsubscribe(); };
        }, [load])
    );

    const filtered = reports.filter(r => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            (r.violation_type?.toLowerCase().includes(q)) ||
            (r.vehicle_number?.toLowerCase().includes(q)) ||
            (r.location_address?.toLowerCase().includes(q)) ||
            (r.submitter?.full_name?.toLowerCase().includes(q))
        );
    });

    // Group by severity order
    const GROUPS = ['critical', 'high', 'medium', 'low'];
    const sections = GROUPS
        .map(sev => ({ title: sev, data: filtered.filter(r => (r.severity || 'medium') === sev) }))
        .filter(s => s.data.length > 0);

    const counts = {
        critical: reports.filter(r => r.severity === 'critical').length,
        high:     reports.filter(r => r.severity === 'high').length,
        medium:   reports.filter(r => r.severity === 'medium').length,
        low:      reports.filter(r => r.severity === 'low').length,
    };

    const navigateToReview = (report) => {
        navigation.getParent()?.navigate('ImageReportReview', { reportId: report.id })
            ?? navigation.navigate('ImageReportReview', { reportId: report.id });
    };

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={s.header}>
                    <View style={s.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerTitle}>Pending Queue</Text>
                            <View style={s.liveRow}>
                                <LiveDot />
                                <Text style={s.headerSub}>Live • {reports.length} awaiting review</Text>
                            </View>
                        </View>
                        <View style={s.countBadge}>
                            <Text style={s.countText}>{reports.length}</Text>
                        </View>
                    </View>

                    {/* Priority stats */}
                    <View style={s.statsRow}>
                        {[
                            { label: 'Critical', count: counts.critical, color: C.critical },
                            { label: 'High',     count: counts.high,     color: C.high     },
                            { label: 'Medium',   count: counts.medium,   color: C.medium   },
                            { label: 'Low',      count: counts.low,      color: C.low      },
                        ].map(({ label, count, color }) => (
                            <View key={label} style={s.statItem}>
                                <View style={[s.statDot, { backgroundColor: color }]} />
                                <Text style={s.statCount}>{count}</Text>
                                <Text style={s.statLabel}>{label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Search */}
                    <View style={s.searchBox}>
                        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.5)" />
                        <TextInput
                            style={s.searchInput}
                            placeholder="Search by type, plate, location…"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>

                {/* List */}
                {loading ? (
                    <View style={s.centered}>
                        <ActivityIndicator size="large" color={C.navyMid} />
                        <Text style={s.loadingText}>Loading reports…</Text>
                    </View>
                ) : (
                    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                        <SectionList
                            sections={sections}
                            keyExtractor={item => item.id}
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
                            renderSectionHeader={({ section: { title, data } }) => {
                                const cfg = getSev(title);
                                return (
                                    <View style={s.sectionHeader}>
                                        <View style={[s.sectionDot, { backgroundColor: cfg.color }]} />
                                        <Text style={[s.sectionLabel, { color: cfg.color }]}>{cfg.label}</Text>
                                        <View style={[s.sectionBadge, { backgroundColor: cfg.bg }]}>
                                            <Text style={[s.sectionBadgeText, { color: cfg.color }]}>{data.length}</Text>
                                        </View>
                                    </View>
                                );
                            }}
                            renderItem={({ item }) => (
                                <ReportCard report={item} onPress={() => navigateToReview(item)} />
                            )}
                            ListEmptyComponent={
                                <View style={s.empty}>
                                    <Ionicons name="checkmark-done-circle-outline" size={52} color={C.textTertiary} />
                                    <Text style={s.emptyTitle}>Queue Clear!</Text>
                                    <Text style={s.emptySub}>
                                        {search ? 'No reports match your search.' : 'No pending reports. Check back later.'}
                                    </Text>
                                </View>
                            }
                        />
                    </Animated.View>
                )}
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },

    header:     { paddingTop: 8, paddingBottom: 16, paddingHorizontal: 20 },
    headerRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    liveRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    headerTitle: { fontSize: 22, fontFamily: 'Nunito-ExtraBold', color: C.white, letterSpacing: -0.4 },
    headerSub:   { fontSize: 12, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.6)' },
    countBadge:  { backgroundColor: C.amber, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5, justifyContent: 'center', alignItems: 'center' },
    countText:   { fontSize: 18, fontFamily: 'Nunito-ExtraBold', color: C.navy },

    statsRow:  { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, gap: 4, marginBottom: 14 },
    statItem:  { flex: 1, alignItems: 'center', gap: 3 },
    statDot:   { width: 8, height: 8, borderRadius: 4 },
    statCount: { fontSize: 16, fontFamily: 'Nunito-ExtraBold', color: C.white },
    statLabel: { fontSize: 9, fontFamily: 'Nunito-SemiBold', color: 'rgba(255,255,255,0.55)' },

    searchBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    searchInput: { flex: 1, fontSize: 13, fontFamily: 'Nunito-Medium', color: C.white },

    list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 },
    sectionDot:    { width: 8, height: 8, borderRadius: 4 },
    sectionLabel:  { fontSize: 11, fontFamily: 'Nunito-ExtraBold', letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 },
    sectionBadge:  { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    sectionBadgeText: { fontSize: 11, fontFamily: 'Nunito-Bold' },

    centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    loadingText: { fontSize: 14, fontFamily: 'Nunito-Medium', color: C.textSecondary },

    empty:      { alignItems: 'center', paddingTop: 80, gap: 10 },
    emptyTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    emptySub:   { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary, textAlign: 'center' },
});
