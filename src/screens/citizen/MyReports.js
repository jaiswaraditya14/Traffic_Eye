import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';

// ── Design Tokens ──
const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    amberDark: '#D97706',
    amberSurface: '#FEF3C7',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    surfaceLow: '#F2F4F6',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    border: '#C4C6D0',
    success: '#059669',
    successSurface: '#D1FAE5',
    warning: '#D97706',
    warningSurface: '#FEF3C7',
    error: '#BA1A1A',
    errorSurface: '#FFDAD6',
    primarySurface: '#D7E2FF',
};

export default function MyReports({ navigation }) {
    const reports = [
        { id: 1, type: 'Speeding', vehicle: 'MH12AB1234', status: 'verified', location: 'Main St & 5th Ave', date: 'Jan 20, 2024', points: 10 },
        { id: 2, type: 'Red Light Violation', vehicle: 'MH01CD5678', status: 'pending', location: 'Oak Rd & Elm St', date: 'Jan 19, 2024', points: 0 },
        { id: 3, type: 'Wrong Parking', vehicle: 'MH08EF9012', status: 'rejected', location: 'Park Avenue', date: 'Jan 18, 2024', points: 0 },
    ];

    const filters = ['All', 'Pending', 'Verified', 'Rejected'];
    const [active, setActive] = React.useState('All');

    const getStatusConfig = (status) => ({
        verified: { icon: 'checkmark-circle', color: C.success, bg: C.successSurface, label: 'Verified', barColor: C.success },
        pending: { icon: 'time', color: C.warning, bg: C.warningSurface, label: 'Pending', barColor: C.amber },
        rejected: { icon: 'close-circle', color: C.error, bg: C.errorSurface, label: 'Rejected', barColor: C.error },
    }[status]);

    const filtered = active === 'All'
        ? reports
        : reports.filter(r => r.status === active.toLowerCase());

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Navy Header */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <View style={styles.headerRow}>
                        <Text style={styles.headerTitle}>My Reports</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{reports.length}</Text>
                        </View>
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
                                style={[styles.filterChip, active === f && styles.filterChipActive]}
                                onPress={() => setActive(f)}
                            >
                                <Text style={[styles.filterChipText, active === f && styles.filterChipTextActive]}>
                                    {f}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Report count */}
                <Text style={styles.showingText}>Showing {filtered.length} reports</Text>

                {/* Report list */}
                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                >
                    {filtered.map((report) => {
                        const config = getStatusConfig(report.status);
                        return (
                            <TouchableOpacity
                                key={report.id}
                                style={styles.reportCard}
                                onPress={() =>
                                    navigation.getParent()?.navigate('ReportDetail', { reportId: report.id }) ??
                                    navigation.navigate('ReportDetail', { reportId: report.id })
                                }
                                activeOpacity={0.8}
                            >
                                {/* Colored left bar */}
                                <View style={[styles.cardBar, { backgroundColor: config.barColor }]} />

                                {/* 16:9 Framed Thumbnail */}
                                <View style={styles.thumbnailFrame}>
                                    <Image
                                        source={require('../../../assets/images/traffic_violation.jpg')}
                                        style={styles.thumbnail}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.thumbnailOverlay}>
                                        <Ionicons name="eye" size={12} color="rgba(255,255,255,0.8)" />
                                    </View>
                                </View>

                                {/* Content */}
                                <View style={styles.cardBody}>
                                    <View style={styles.cardTopRow}>
                                        <Text style={styles.reportType}>{report.type}</Text>
                                        <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
                                            <Ionicons name={config.icon} size={10} color={config.color} />
                                            <Text style={[styles.statusPillText, { color: config.color }]}>
                                                {config.label}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.vehicleText}>{report.vehicle}</Text>

                                    <View style={styles.rowMeta}>
                                        <View style={styles.metaRow}>
                                            <Ionicons name="location" size={11} color={C.textTertiary} />
                                            <Text style={styles.metaText} numberOfLines={1}>{report.location}</Text>
                                        </View>
                                        <View style={styles.metaRow}>
                                            <Ionicons name="time" size={11} color={C.textTertiary} />
                                            <Text style={styles.metaText}>{report.date}</Text>
                                        </View>
                                    </View>

                                    {report.points > 0 && (
                                        <View style={styles.pointsBadge}>
                                            <Ionicons name="trophy" size={10} color={C.amberDark} />
                                            <Text style={styles.pointsText}>+{report.points} Verification Points</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.entryArrow}>
                                    <Ionicons name="chevron-forward" size={16} color={C.navyMid} />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                    <View style={{ height: 32 }} />
                </ScrollView>

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
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.4,
    },
    countBadge: {
        backgroundColor: C.amber,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    countBadgeText: {
        fontSize: 13,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
    },

    // Filters
    filterRow: {
        paddingTop: 14,
    },
    filterScroll: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterChip: {
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
    showingText: {
        fontSize: 12,
        color: C.textTertiary,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 6,
        fontFamily: 'Nunito-Medium',
    },

    // Report list
    list: { flex: 1 },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
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
    cardBar: {
        width: 4,
        alignSelf: 'stretch',
    },
    thumbnailFrame: {
        width: 76,
        height: 76,
        borderRadius: 12,
        margin: 12,
        backgroundColor: C.surfaceLow,
        overflow: 'hidden',
        position: 'relative',
    },
    thumbnail: {
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
    cardBody: {
        flex: 1,
        paddingVertical: 12,
        paddingRight: 8,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    reportType: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        flex: 1,
        marginRight: 6,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    statusPillText: {
        fontSize: 10,
        fontFamily: 'Nunito-ExtraBold',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    vehicleText: {
        fontSize: 14,
        color: C.navyMid,
        fontFamily: 'Nunito-Bold',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    rowMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        color: C.textSecondary,
        fontFamily: 'Nunito-Medium',
    },
    pointsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    pointsText: {
        fontSize: 11,
        color: C.amberDark,
        fontFamily: 'Nunito-Bold',
    },
    entryArrow: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: C.primarySurface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: C.amber,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    fabGradient: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
