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

                        {/* ── Dashboard Hero: Report Violation ── */}
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
                                style={styles.heroOuter}
                            >
                                <LinearGradient
                                    colors={[C.amberDark, C.amber]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.reportHero}
                                >
                                    {/* Glassy overlay effect */}
                                    <View style={styles.heroOverlay}>
                                        <View style={styles.heroContent}>
                                            <View style={styles.heroBadge}>
                                                <Ionicons name="flash" size={10} color={C.white} />
                                                <Text style={styles.heroBadgeText}>AI-POWERED</Text>
                                            </View>
                                            <Text style={styles.heroTitle}>Report Violation</Text>
                                            <Text style={styles.heroSubtitle}>Ensure road safety with instant AI verification</Text>
                                            
                                            <View style={styles.heroActionBtn}>
                                                <Text style={styles.heroActionText}>Start Scan</Text>
                                                <Ionicons name="camera" size={16} color={C.amberDark} />
                                            </View>
                                        </View>
                                        
                                        {/* Stylized camera icon circle frame */}
                                        <View style={styles.heroIconFrame}>
                                            <Ionicons name="scan-outline" size={80} color="rgba(255,255,255,0.15)" />
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* ── Quick Action Circle Frames ── */}
                        <Animated.View
                            style={[
                                styles.section,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnims[1] }] },
                            ]}
                        >
                            <Text style={styles.sectionTitle}>Essential Resources</Text>
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
                                    <View style={[styles.actionIconFrame, { backgroundColor: '#E0E7FF' }]}>
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
                                    <View style={[styles.actionIconFrame, { backgroundColor: '#FFEDD5' }]}>
                                         <View style={styles.innerCircleFrame}>
                                            <Ionicons name="warning" size={24} color={C.amberDark} />
                                         </View>
                                    </View>
                                    <Text style={styles.actionLabel}>Signs Guide</Text>
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
                                    <View style={[styles.actionIconFrame, { backgroundColor: '#FEE2E2' }]}>
                                        <Ionicons name="receipt" size={24} color="#BA1A1A" />
                                    </View>
                                    <Text style={styles.actionLabel}>Fine Rates</Text>
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
        fontFamily: 'Nunito-Bold',
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
        fontFamily: 'Nunito-Medium',
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
        fontFamily: 'Nunito-Bold',
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
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Nunito-Medium',
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

    // Hero
    heroOuter: {
        marginBottom: 28,
        shadowColor: C.amber,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    reportHero: {
        borderRadius: 24,
        overflow: 'hidden',
        height: 180, // 16:9 ish
    },
    heroOverlay: {
        flex: 1,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    heroContent: {
        flex: 1,
        justifyContent: 'center',
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    heroBadgeText: {
        fontSize: 9,
        fontFamily: 'Nunito-ExtraBold',
        color: C.white,
        letterSpacing: 0.5,
    },
    heroTitle: {
        fontSize: 24,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.5,
    },
    heroSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 4,
        lineHeight: 18,
        maxWidth: '80%',
    },
    heroActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: C.white,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginTop: 16,
    },
    heroActionText: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: C.amberDark,
    },
    heroIconFrame: {
        position: 'absolute',
        right: -20,
        bottom: -20,
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

    // Actions grid
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionCard: {
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 20,
        padding: 18,
        alignItems: 'center',
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    actionIconFrame: {
        width: 56,
        height: 56,
        borderRadius: 28, // Perfect Circle Frame
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#1B3A6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    innerCircleFrame: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionImage: {
        width: 30,
        height: 30,
    },
    actionLabel: {
        fontSize: 11,
        fontFamily: 'Nunito-SemiBold',
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
        fontFamily: 'Nunito-SemiBold',
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
        fontFamily: 'Nunito-Medium',
    },
    statusChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginRight: 14,
    },
    statusChipText: {
        fontSize: 11,
        fontFamily: 'Nunito-Bold',
    },
});
