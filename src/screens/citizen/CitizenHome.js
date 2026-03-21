import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Animated, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context';
import { formatNumber } from '../../utils';

// ── Design Tokens (Civic Authority) ──
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
    primarySurface: '#D7E2FF',
};

export default function CitizenHome({ navigation }) {
    const { profile } = useAuth();
    const userPoints = profile?.points_balance || 0;
    const firstName = profile?.full_name?.split(' ')[0] || 'User';

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(30))).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        Animated.stagger(80, slideAnims.map(anim =>
            Animated.spring(anim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true })
        )).start();
    }, []);

    // Stats data
    const quickStats = [
        { label: 'Reports', value: '12', icon: 'document-text', color: C.navyMid, bg: C.primarySurface },
        { label: 'Verified', value: '8', icon: 'checkmark-circle', color: C.success, bg: C.successSurface },
        { label: 'Points', value: formatNumber(userPoints), icon: 'trophy', color: C.amberDark, bg: C.amberSurface },
    ];

    const recentActivity = [
        { id: 1, type: 'Illegal Parking', desc: 'Downtown St., Mumbai', time: 'Today, 10:45 AM', status: 'pending' },
        { id: 2, type: 'Red Light Violation', desc: 'Main intersection, Bandra', time: 'Oct 12, 4:20 PM', status: 'success' },
    ];

    const getStatusConfig = (status) => ({
        success: { icon: 'checkmark-circle', color: C.success, bg: C.successSurface, label: 'Verified', barColor: C.success },
        pending: { icon: 'time', color: C.warning, bg: C.warningSurface, label: 'Pending', barColor: C.amber },
        rejected: { icon: 'close-circle', color: C.error, bg: C.errorSurface, label: 'Rejected', barColor: C.error },
    }[status]);

    // Navigate to Reports tab within the bottom tab navigator
    const handleSeeAllReports = () => navigation.navigate('Reports');

    const getTimeOfDay = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* ── Navy Header ── */}
                    <LinearGradient
                        colors={[C.navy, C.navyMid]}
                        style={styles.header}
                    >
                        <View style={styles.headerTop}>
                            <View style={styles.headerLeft}>
                                <Text style={styles.greeting}>{getTimeOfDay()}, {firstName} 👋</Text>
                                <View style={styles.locationRow}>
                                    <Ionicons name="location" size={12} color="rgba(255,255,255,0.6)" />
                                    <Text style={styles.locationText}>Mumbai, Maharashtra</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() =>
                                    navigation.getParent()?.navigate('Notifications') ??
                                    navigation.navigate('Notifications')
                                }
                                style={styles.notifButton}
                            >
                                <Ionicons name="notifications-outline" size={20} color={C.white} />
                                <View style={styles.notifBadge}>
                                    <Text style={styles.notifBadgeText}>3</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Stats bar inside header */}
                        <View style={styles.statsBar}>
                            {quickStats.map((stat, idx) => (
                                <React.Fragment key={idx}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statValue}>{stat.value}</Text>
                                        <Text style={styles.statLabel}>{stat.label}</Text>
                                    </View>
                                    {idx < quickStats.length - 1 && (
                                        <View style={styles.statDivider} />
                                    )}
                                </React.Fragment>
                            ))}
                        </View>
                    </LinearGradient>

                    {/* ── Content Area ── */}
                    <View style={styles.content}>

                        {/* Report Violation CTA Banner */}
                        <Animated.View
                            style={{
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnims[0] }],
                            }}
                        >
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() =>
                                    navigation.getParent()?.navigate('NewReport') ??
                                    navigation.navigate('NewReport')
                                }
                            >
                                <LinearGradient
                                    colors={[C.amberDark, C.amber]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.reportCTA}
                                >
                                    <View style={styles.reportCTALeft}>
                                        <View style={styles.reportCTAIconBg}>
                                            <Ionicons name="camera" size={26} color={C.navyMid} />
                                        </View>
                                        <View>
                                            <Text style={styles.reportCTATitle}>Report a Violation</Text>
                                            <Text style={styles.reportCTASubtitle}>Capture photo evidence • AI analysis</Text>
                                        </View>
                                    </View>
                                    <Ionicons name="arrow-forward-circle" size={28} color="rgba(255,255,255,0.9)" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* ── Quick Actions ── */}
                        <Animated.View
                            style={[
                                styles.section,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnims[1] }] },
                            ]}
                        >
                            <Text style={styles.sectionTitle}>Quick Actions</Text>
                            <View style={styles.actionsGrid}>
                                {/* Safety Tips */}
                                <TouchableOpacity
                                    style={styles.actionCard}
                                    onPress={() =>
                                        navigation.getParent()?.navigate('SafetyTips') ??
                                        navigation.navigate('SafetyTips')
                                    }
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.actionIconBg, { backgroundColor: C.primarySurface }]}>
                                        <Image
                                            source={require('../../../assets/images/helmet.png')}
                                            style={styles.actionImage}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <Text style={styles.actionLabel}>Safety Tips</Text>
                                </TouchableOpacity>

                                {/* Traffic Signs */}
                                <TouchableOpacity
                                    style={styles.actionCard}
                                    onPress={() =>
                                        navigation.getParent()?.navigate('TrafficSigns') ??
                                        navigation.navigate('TrafficSigns')
                                    }
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.actionIconBg, { backgroundColor: C.errorSurface }]}>
                                        <Image
                                            source={require('../../../assets/images/crosspath.png')}
                                            style={styles.actionImage}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <Text style={styles.actionLabel}>Traffic Signs</Text>
                                </TouchableOpacity>

                                {/* Fine Info */}
                                <TouchableOpacity
                                    style={styles.actionCard}
                                    onPress={() =>
                                        navigation.getParent()?.navigate('FineInformation') ??
                                        navigation.navigate('FineInformation')
                                    }
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.actionIconBg, { backgroundColor: C.amberSurface }]}>
                                        <Image
                                            source={require('../../../assets/images/image.png')}
                                            style={styles.actionImage}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <Text style={styles.actionLabel}>Fine Info</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        {/* ── Recent Activity ── */}
                        <Animated.View
                            style={[
                                styles.section,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnims[2] }], marginBottom: 32 },
                            ]}
                        >
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Recent Activity</Text>
                                <TouchableOpacity onPress={handleSeeAllReports}>
                                    <Text style={styles.seeAll}>See All</Text>
                                </TouchableOpacity>
                            </View>

                            {recentActivity.map((activity) => {
                                const config = getStatusConfig(activity.status);
                                return (
                                    <TouchableOpacity
                                        key={activity.id}
                                        style={styles.activityCard}
                                        activeOpacity={0.8}
                                        onPress={() =>
                                            navigation.getParent()?.navigate('ReportDetail', { reportId: activity.id }) ??
                                            navigation.navigate('ReportDetail', { reportId: activity.id })
                                        }
                                    >
                                        {/* Left colored bar */}
                                        <View style={[styles.cardBar, { backgroundColor: config.barColor }]} />

                                        {/* Icon */}
                                        <View style={[styles.activityIcon, { backgroundColor: config.bg }]}>
                                            <Ionicons name={config.icon} size={20} color={config.color} />
                                        </View>

                                        {/* Content */}
                                        <View style={styles.activityContent}>
                                            <Text style={styles.activityType}>{activity.type}</Text>
                                            <Text style={styles.activityDesc}>{activity.desc}</Text>
                                            <Text style={styles.activityTime}>{activity.time}</Text>
                                        </View>

                                        {/* Status chip */}
                                        <View style={[styles.statusChip, { backgroundColor: config.bg }]}>
                                            <Text style={[styles.statusChipText, { color: config.color }]}>
                                                {config.label}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </Animated.View>
                    </View>
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

    // ── Navy Header ──
    header: {
        paddingHorizontal: 22,
        paddingTop: 16,
        paddingBottom: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    headerLeft: {},
    greeting: {
        fontSize: 20,
        fontFamily: 'DMSans-Bold',
        color: C.white,
        letterSpacing: -0.3,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    locationText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'DMSans-Medium',
    },
    notifButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notifBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: C.amber,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: C.navyMid,
    },
    notifBadgeText: {
        fontSize: 9,
        color: C.navy,
        fontFamily: 'DMSans-Bold',
    },

    // Stats bar
    statsBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 8,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 22,
        fontFamily: 'DMSans-Bold',
        color: C.white,
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'DMSans-Medium',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginVertical: 4,
    },

    // ── Content ──
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },

    // Report CTA
    reportCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 18,
        padding: 18,
        marginBottom: 24,
        shadowColor: C.amber,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    reportCTALeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    reportCTAIconBg: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reportCTATitle: {
        fontSize: 16,
        fontFamily: 'DMSans-Bold',
        color: C.white,
        letterSpacing: -0.3,
    },
    reportCTASubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },

    // Section
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 17,
        fontFamily: 'DMSans-Bold',
        color: C.textPrimary,
        letterSpacing: -0.2,
        marginBottom: 14,
    },
    seeAll: {
        fontSize: 13,
        color: C.amber,
        fontFamily: 'DMSans-SemiBold',
    },

    // Actions grid
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionCard: {
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    actionIconBg: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionImage: {
        width: 30,
        height: 30,
    },
    actionLabel: {
        fontSize: 11,
        fontFamily: 'DMSans-SemiBold',
        color: C.textPrimary,
        textAlign: 'center',
    },

    // Activity cards
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderRadius: 16,
        marginBottom: 10,
        overflow: 'hidden',
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
    activityIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 14,
    },
    activityContent: {
        flex: 1,
        paddingVertical: 14,
    },
    activityType: {
        fontSize: 14,
        fontFamily: 'DMSans-SemiBold',
        color: C.textPrimary,
    },
    activityDesc: {
        fontSize: 12,
        color: C.textSecondary,
        marginTop: 2,
    },
    activityTime: {
        fontSize: 11,
        color: C.textTertiary,
        marginTop: 3,
        fontFamily: 'DMSans-Medium',
    },
    statusChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginRight: 14,
    },
    statusChipText: {
        fontSize: 11,
        fontFamily: 'DMSans-Bold',
    },
});
