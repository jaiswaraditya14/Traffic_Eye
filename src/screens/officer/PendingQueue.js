import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';

// ── Design Tokens (Civic Authority — Officer Side) ──
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
    critical: '#DC2626',
};

export default function PendingQueue({ navigation }) {
    const pendingReports = [
        { id: 1, type: 'Speeding', vehicle: 'MH12AB1234', location: 'Main St & 5th Ave', time: '2h ago', priority: 'critical' },
        { id: 2, type: 'Red Light Violation', vehicle: 'MH01CD5678', location: 'Oak Rd & Elm St', time: '3h ago', priority: 'high' },
        { id: 3, type: 'Wrong Parking', vehicle: 'MH08EF9012', location: 'Park Avenue', time: '5h ago', priority: 'medium' },
        { id: 4, type: 'No Helmet', vehicle: 'MH05GH3456', location: 'Ring Road', time: '6h ago', priority: 'medium' },
        { id: 5, type: 'Overloading', vehicle: 'MH02IJ7890', location: 'Highway 8', time: '8h ago', priority: 'low' },
    ];

    const getPriorityConfig = (priority) => ({
        critical: { color: C.critical, bg: '#FFDAD6', label: 'CRITICAL', barColor: C.critical },
        high: { color: C.error, bg: '#FFE4E4', label: 'HIGH', barColor: C.error },
        medium: { color: C.warning, bg: C.warningSurface, label: 'MEDIUM', barColor: C.amber },
        low: { color: C.textTertiary, bg: C.surfaceLow, label: 'LOW', barColor: C.border },
    }[priority]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Navy Header */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.headerTitle}>Pending Queue</Text>
                            <Text style={styles.headerSubtitle}>Reports awaiting review</Text>
                        </View>
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{pendingReports.length}</Text>
                        </View>
                    </View>

                    {/* Priority summary */}
                    <View style={styles.prioritySummary}>
                        {[
                            { label: 'Critical', count: pendingReports.filter(r => r.priority === 'critical').length, color: C.critical },
                            { label: 'High', count: pendingReports.filter(r => r.priority === 'high').length, color: C.error },
                            { label: 'Medium', count: pendingReports.filter(r => r.priority === 'medium').length, color: C.amber },
                            { label: 'Low', count: pendingReports.filter(r => r.priority === 'low').length, color: 'rgba(255,255,255,0.4)' },
                        ].map((p, idx) => (
                            <View key={idx} style={styles.priorityStat}>
                                <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                                <Text style={styles.priorityStatCount}>{p.count}</Text>
                                <Text style={styles.priorityStatLabel}>{p.label}</Text>
                            </View>
                        ))}
                    </View>
                </LinearGradient>

                {/* Report list */}
                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                >
                    {pendingReports.map((report) => {
                        const config = getPriorityConfig(report.priority);
                        return (
                            <TouchableOpacity
                                key={report.id}
                                style={styles.reportCard}
                                onPress={() =>
                                    navigation.getParent()?.navigate('ReportVerification', { reportId: report.id }) ??
                                    navigation.navigate('ReportVerification', { reportId: report.id })
                                }
                                activeOpacity={0.8}
                            >
                                {/* Priority left bar */}
                                <View style={[styles.cardBar, { backgroundColor: config.barColor }]} />

                                {/* Thumbnail */}
                                <Image
                                    source={require('../../../assets/images/traffic_violation.jpg')}
                                    style={styles.thumbnail}
                                    resizeMode="cover"
                                />

                                {/* Content */}
                                <View style={styles.cardContent}>
                                    <View style={styles.cardTopRow}>
                                        <Text style={styles.reportType}>{report.type}</Text>
                                        <View style={[styles.priorityChip, { backgroundColor: config.bg }]}>
                                            <Text style={[styles.priorityChipText, { color: config.color }]}>
                                                {config.label}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.vehicleRow}>
                                        <Ionicons name="car-outline" size={12} color={C.navyMid} />
                                        <Text style={styles.vehicleText}>{report.vehicle}</Text>
                                    </View>

                                    <View style={styles.metaRow}>
                                        <Ionicons name="location-outline" size={12} color={C.textTertiary} />
                                        <Text style={styles.metaText}>{report.location}</Text>
                                    </View>
                                    <View style={styles.metaRow}>
                                        <Ionicons name="time-outline" size={12} color={C.textTertiary} />
                                        <Text style={styles.metaText}>{report.time}</Text>
                                    </View>
                                </View>

                                {/* Review arrow */}
                                <View style={styles.reviewArrow}>
                                    <Ionicons name="chevron-forward" size={16} color={C.navyMid} />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                    <View style={{ height: 40 }} />
                </ScrollView>
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
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'DMSans-Bold',
        color: C.white,
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 3,
    },
    countBadge: {
        backgroundColor: C.amber,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        minWidth: 36,
        alignItems: 'center',
    },
    countBadgeText: {
        fontSize: 15,
        fontFamily: 'DMSans-Bold',
        color: C.navy,
    },
    prioritySummary: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    priorityStat: {
        flex: 1,
        alignItems: 'center',
        gap: 3,
    },
    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    priorityStatCount: {
        fontSize: 16,
        fontFamily: 'DMSans-Bold',
        color: C.white,
    },
    priorityStatLabel: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.55)',
        fontFamily: 'DMSans-SemiBold',
    },

    // List
    list: { flex: 1 },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 14,
    },
    reportCard: {
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderRadius: 16,
        marginBottom: 10,
        overflow: 'hidden',
        alignItems: 'center',
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    cardBar: {
        width: 4,
        alignSelf: 'stretch',
    },
    thumbnail: {
        width: 72,
        height: 90,
    },
    cardContent: {
        flex: 1,
        padding: 12,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    reportType: {
        fontSize: 14,
        fontFamily: 'DMSans-Bold',
        color: C.textPrimary,
        flex: 1,
        marginRight: 6,
    },
    priorityChip: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    priorityChipText: {
        fontSize: 9,
        fontFamily: 'DMSans-Bold',
        letterSpacing: 0.5,
    },
    vehicleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    vehicleText: {
        fontSize: 12,
        color: C.navyMid,
        fontFamily: 'DMSans-Bold',
        letterSpacing: 0.5,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    metaText: {
        fontSize: 11,
        color: C.textSecondary,
    },
    reviewArrow: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: C.offWhite,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
});
