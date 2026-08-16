import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FocusAwareStatusBar } from '../../components';

const C = {
    navy: '#0A1E3F', navyMid: '#0F2C59',
    amber: '#F59E0B', amberDark: '#D97706', amberSurface: '#FEF3C7',
    white: '#FFFFFF', offWhite: '#F4F6F9', surface: '#FFFFFF', surfaceLow: '#F2F4F6',
    textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#64748B', border: '#CBD5E1',
    success: '#059669', successSurface: '#D1FAE5',
    primarySurface: '#D7E2FF',
    reviewed: '#0F2C59', reviewedSurface: '#D7E2FF',
};

const STATUS_CONFIG = {
    pending:       { label: 'Pending',       icon: 'time',             color: C.amber,    bg: C.amberSurface,    bar: C.amber },
    reviewed:      { label: 'Reviewed',      icon: 'eye',              color: C.navyMid,  bg: C.reviewedSurface, bar: C.navyMid },
    action_taken:  { label: 'Action Taken',  icon: 'checkmark-circle', color: C.success,  bg: C.successSurface,  bar: C.success },
};

const FILTERS = ['All', 'Pending', 'Reviewed', 'Action Taken'];

// Sample data — will be replaced with Supabase fetch
const SAMPLE_REPORTS = [];

function StatusLegend() {
    return (
        <View style={styles.legend}>
            {[
                { color: C.amber, label: 'Pending' },
                { color: C.navyMid, label: 'Reviewed' },
                { color: C.success, label: 'Action Taken' },
            ].map(item => (
                <View key={item.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>{item.label}</Text>
                </View>
            ))}
        </View>
    );
}

export default function VideoReportStatus({ navigation, route }) {
    const [activeFilter, setActiveFilter] = useState('All');
    const [reports, setReports] = useState(SAMPLE_REPORTS);
    const insets = useSafeAreaInsets();
    
    // Extract passed params if any
    const { newReport, highlightId } = route?.params || {};

    // Prepend newly submitted report if present
    React.useEffect(() => {
        if (newReport && !reports.some(r => r.id === newReport.id)) {
            setReports(prev => [newReport, ...prev]);
        }
    }, [newReport]);

    const filtered = activeFilter === 'All'
        ? reports
        : reports.filter(r => {
            const label = STATUS_CONFIG[r.status]?.label;
            return label === activeFilter;
        });

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>

                {/* Header */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={[styles.header, { paddingTop: insets.top + 16 }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Video Reports</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{reports.length}</Text>
                    </View>
                </LinearGradient>

                {/* Filter chips */}
                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                        {FILTERS.map(f => (
                            <TouchableOpacity
                                key={f}
                                style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
                                onPress={() => setActiveFilter(f)}
                            >
                                <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>{f}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <Text style={styles.countText}>Showing {filtered.length} report{filtered.length !== 1 ? 's' : ''}</Text>

                {/* Report list */}
                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                >
                    {filtered.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="videocam-off-outline" size={40} color={C.textTertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>No reports found</Text>
                            <Text style={styles.emptyDesc}>No video reports match the selected filter.</Text>
                        </View>
                    ) : (
                        filtered.map(report => {
                            const config = STATUS_CONFIG[report.status];
                            const isHighlighted = report.id === highlightId;
                            return (
                                <TouchableOpacity
                                    key={report.id}
                                    style={[styles.card, isHighlighted && styles.cardHighlighted]}
                                    activeOpacity={0.8}
                                    onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })}
                                >
                                    {/* Left status bar */}
                                    <View style={[styles.cardBar, { backgroundColor: config.bar }]} />

                                    {/* Video thumbnail */}
                                    <View style={styles.thumbWrap}>
                                        <View style={styles.thumb}>
                                            <Ionicons name="videocam" size={18} color={C.white} />
                                        </View>
                                        <View style={styles.thumbPlayOverlay}>
                                            <Ionicons name="play" size={8} color={C.navy} />
                                        </View>
                                    </View>

                                    {/* Card body */}
                                    <View style={styles.cardBody}>
                                        <View style={styles.cardTopRow}>
                                            <Text style={styles.cardType}>{report.type}</Text>
                                            <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
                                                <Ionicons name={config.icon} size={10} color={config.color} />
                                                <Text style={[styles.statusPillText, { color: config.color }]}>
                                                    {config.label}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.cardId}>{report.displayId || report.id}</Text>
                                        <View style={styles.metaRow}>
                                            <Ionicons name="location" size={11} color={C.textTertiary} />
                                            <Text style={styles.metaText} numberOfLines={1}>{report.location}</Text>
                                        </View>
                                        <View style={styles.metaRow}>
                                            <Ionicons name="calendar-outline" size={11} color={C.textTertiary} />
                                            <Text style={styles.metaText}>{report.date}</Text>
                                        </View>

                                    </View>

                                    {/* Arrow */}
                                    <View style={styles.arrowWrap}>
                                        <Ionicons name="chevron-forward" size={16} color={C.navyMid} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}

                    <StatusLegend />
                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* FAB — new video report */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('VideoReport')}
                    activeOpacity={0.85}
                >
                    <LinearGradient colors={[C.amberDark, C.amber]} style={styles.fabGrad}>
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
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 22,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { flex: 1, fontSize: 20, fontFamily: 'Nunito-Bold', color: C.white },
    countBadge: {
        backgroundColor: C.amber, borderRadius: 12,
        paddingHorizontal: 10, paddingVertical: 3,
    },
    countBadgeText: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.navy },

    // Filters
    filterContainer: { paddingTop: 14 },
    filterRow: { paddingHorizontal: 20, gap: 8 },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, backgroundColor: C.surfaceLow,
        borderWidth: 1.5, borderColor: 'transparent',
    },
    filterChipActive: { backgroundColor: C.primarySurface, borderColor: C.navyMid },
    filterChipText: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary },
    filterChipTextActive: { color: C.navyMid, fontFamily: 'Nunito-Bold' },
    countText: { fontSize: 12, color: C.textTertiary, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, fontFamily: 'Nunito-Medium' },

    // List
    list: { flex: 1 },
    listContent: { paddingHorizontal: 20, paddingTop: 8 },

    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.surface, borderRadius: 20, marginBottom: 14,
        overflow: 'hidden',
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 2, borderColor: 'transparent',
    },
    cardHighlighted: {
        borderColor: C.navy,
        backgroundColor: '#F8F9FA',
    },
    cardBar: { width: 4, alignSelf: 'stretch' },
    thumbWrap: { position: 'relative', margin: 12 },
    thumb: {
        width: 56, height: 56, borderRadius: 12,
        backgroundColor: C.navyMid, justifyContent: 'center', alignItems: 'center',
    },
    thumbPlayOverlay: {
        position: 'absolute', bottom: 2, right: 2,
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: C.amber, justifyContent: 'center', alignItems: 'center',
    },
    cardBody: { flex: 1, paddingVertical: 12, paddingRight: 4, gap: 3 },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
    cardType: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textPrimary, flex: 1 },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100,
    },
    statusPillText: { fontSize: 10, fontFamily: 'Nunito-ExtraBold', textTransform: 'uppercase', letterSpacing: 0.3 },
    cardId: { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textTertiary },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11, color: C.textSecondary, fontFamily: 'Nunito-Medium', flex: 1 },
    arrowWrap: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: C.primarySurface, justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },

    // Empty state
    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.surfaceLow, justifyContent: 'center', alignItems: 'center' },
    emptyTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    emptyDesc: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary, textAlign: 'center' },

    // Legend
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 16 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textTertiary },

    // FAB
    fab: {
        position: 'absolute', bottom: 24, right: 20, borderRadius: 20,
        overflow: 'hidden', shadowColor: C.amber, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
    },
    fabGrad: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
});
