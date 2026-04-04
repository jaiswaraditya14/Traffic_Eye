import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Animated, StatusBar, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAuth } from '../../context';

// ── Design Tokens (Civic Authority — Officer Side) ──
const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    navyLight: '#2C4E80',
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
    primarySurface: '#D7E2FF',
};

export default function OfficerDashboard({ navigation }) {
    const { profile } = useAuth();
    const officerName = profile?.full_name?.split(' ')[0] || 'Officer';
    const officerTitle = profile?.badge_title || 'Traffic Inspector';
    const officerZone = 'Mumbai Central';

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
        ]).start();
    }, []);

    const stats = [
        { label: 'Pending', value: '24', icon: 'time-outline', color: C.warning, bg: C.warningSurface },
        { label: 'Verified', value: '156', icon: 'checkmark-circle-outline', color: C.success, bg: C.successSurface },
        { label: 'Accuracy', value: '98%', icon: 'stats-chart-outline', color: C.navyMid, bg: C.primarySurface },
    ];

    const recentReports = [
        { id: 1, type: 'Speeding', location: 'Main St & 5th Ave', time: '15 min ago', priority: 'critical', vehicle: 'MH12AB1234' },
        { id: 2, type: 'Red Light', location: 'Oak Rd & Elm St', time: '1h ago', priority: 'high', vehicle: 'MH01CD5678' },
        { id: 3, type: 'No Helmet', location: 'Park Avenue East', time: '2h ago', priority: 'medium', vehicle: 'MH08EF9012' },
    ];

    const getPriorityConfig = (priority) => ({
        critical: { color: C.critical, bg: C.errorSurface, label: 'CRITICAL', barColor: C.critical },
        high: { color: C.error, bg: '#FFE4E4', label: 'HIGH', barColor: C.error },
        medium: { color: C.warning, bg: C.warningSurface, label: 'MEDIUM', barColor: C.amber },
        low: { color: C.textTertiary, bg: C.surfaceLow, label: 'LOW', barColor: C.border },
    }[priority]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* ── Navy Officer Header ── */}
                    <LinearGradient
                        colors={[C.navy, C.navyMid]}
                        style={styles.header}
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
                                    <TouchableOpacity style={styles.headerIconBtn}>
                                        <Ionicons name="settings-outline" size={20} color={C.white} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.headerIconBtn}>
                                        <Ionicons name="notifications-outline" size={20} color={C.white} />
                                        <View style={styles.notifDot} />
                                    </TouchableOpacity>
                                </View>
                            </View>

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
                                    <Text style={styles.alertTitle}>3 High Priority Reports</Text>
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
                        {stats.map((stat, idx) => (
                            <View key={idx} style={styles.statCard}>
                                <View style={[styles.statIconBg, { backgroundColor: stat.bg }]}>
                                    <Ionicons name={stat.icon} size={20} color={stat.color} />
                                </View>
                                <Text style={styles.statValue}>{stat.value}</Text>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </View>
                        ))}
                    </Animated.View>

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
                                <Text style={styles.actionCardDesc}>24 reports waiting for verification</Text>
                            </View>
                            <View style={styles.amberCountBadge}>
                                <Text style={styles.amberCountText}>24</Text>
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

                        {recentReports.map((report) => {
                            const config = getPriorityConfig(report.priority);
                            return (
                                <TouchableOpacity
                                    key={report.id}
                                    style={styles.reportCard}
                                    activeOpacity={0.8}
                                    onPress={() =>
                                        navigation.getParent()?.navigate('ReportVerification', { reportId: report.id }) ??
                                        navigation.navigate('ReportVerification', { reportId: report.id })
                                    }
                                >
                                    {/* Priority left bar */}
                                    <View style={[styles.reportBar, { backgroundColor: config.barColor }]} />

                                    {/* Thumbnail Frame (16:9 ish) */}
                                    <View style={styles.thumbnailFrame}>
                                        <Image
                                            source={require('../../../assets/images/traffic_violation.jpg')}
                                            style={styles.reportThumbnail}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.thumbnailOverlay}>
                                            <Ionicons name="scan" size={14} color={C.white} />
                                        </View>
                                    </View>

                                    {/* Content */}
                                    <View style={styles.reportContent}>
                                        <View style={styles.reportTopRow}>
                                            <Text style={styles.reportType}>{report.type}</Text>
                                            <View style={[styles.priorityChip, { backgroundColor: config.bg }]}>
                                                <Text style={[styles.priorityChipText, { color: config.color }]}>
                                                    {config.label}
                                                </Text>
                                            </View>
                                        </View>
                                        
                                        <Text style={styles.reportVehicle}>{report.vehicle}</Text>
                                        
                                        <View style={styles.metaRow}>
                                            <View style={styles.reportMeta}>
                                                <Ionicons name="location" size={11} color={C.textTertiary} />
                                                <Text style={styles.reportMetaText} numberOfLines={1}>{report.location}</Text>
                                            </View>
                                            <View style={styles.reportMeta}>
                                                <Ionicons name="time" size={11} color={C.textTertiary} />
                                                <Text style={styles.reportMetaText}>{report.time}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Review Action */}
                                    <View style={styles.actionArrow}>
                                        <Ionicons name="chevron-forward" size={18} color={C.navyMid} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
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
    statIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 10,
        color: C.textTertiary,
        fontFamily: 'Nunito-SemiBold',
        letterSpacing: 0.3,
        marginTop: 2,
        textTransform: 'uppercase',
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
