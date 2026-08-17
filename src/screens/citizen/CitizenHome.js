import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Animated, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context';
import { FocusAwareStatusBar } from '../../components';
import * as Location from 'expo-location';
import { reverseGeocode } from '../../services/geoService';
import { formatNumber } from '../../utils';
import { fetchCitizenReports, subscribeToReportUpdates, fetchNotifications } from '../../services/reports';
import { useFocusEffect } from '@react-navigation/native';

// ── Design Tokens (Civic Authority) ──
const C = {
    navy: '#0A1E3F',
    navyMid: '#0F2C59',
    navyLight: '#1E3A8A',
    amber: '#D97706',
    amberDark: '#B45309',
    amberSurface: '#FEF3C7',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    surfaceLow: '#F8FAFC',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: '#CBD5E1',
    success: '#15803D',
    successSurface: '#DCFCE7',
    warning: '#B45309',
    warningSurface: '#FEF3C7',
    error: '#B91C1C',
    errorSurface: '#FEE2E2',
    primarySurface: '#EFF6FF',
};

export default function CitizenHome({ navigation }) {
    const { profile } = useAuth();
    const userPoints = profile?.points_balance || 0;
    const firstName = profile?.full_name?.split(' ')[0] || 'User';
    const [userCity, setUserCity] = React.useState(profile?.jurisdiction || 'Mumbai, Maharashtra');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(30))).current;

    useEffect(() => {
        const fetchCity = async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === 'granted') {
                    const pos = await Location.getLastKnownPositionAsync();
                    if (pos?.coords) {
                        const geo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
                        if (geo?.city && geo?.state) {
                            setUserCity(`${geo.city}, ${geo.state}`);
                        } else if (geo?.city) {
                            setUserCity(geo.city);
                        } else if (geo?.displayName) {
                            setUserCity(geo.displayName);
                        }
                    }
                }
            } catch (_) {
                // Non-fatal — keep default
            }
        };
        fetchCity();
    }, []);

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        Animated.stagger(80, slideAnims.map(anim =>
            Animated.spring(anim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true })
        )).start();
    }, []);

    // Stats data
    const [reports, setReports] = React.useState([]);
    const [unreadCount, setUnreadCount] = React.useState(0);

    const loadData = React.useCallback(async () => {
        if (!profile?.id) return;
        const [reportsResult, notifsResult] = await Promise.all([
            fetchCitizenReports(profile.id),
            fetchNotifications(profile.id),
        ]);
        if (!reportsResult.error && reportsResult.data) {
            setReports(reportsResult.data);
        }
        if (!notifsResult.error && notifsResult.data) {
            setUnreadCount(notifsResult.data.filter(n => !n.is_read).length);
        }
    }, [profile?.id]);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [loadData])
    );

    useFocusEffect(
        React.useCallback(() => {
            if (!profile?.id) return;
            const ch = subscribeToReportUpdates(
                profile.id,
                (payload) => setReports(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r)),
                (payload) => setReports(prev => [payload.new, ...prev]),
            );
            return () => { if (ch) ch.unsubscribe(); };
        }, [profile?.id])
    );

    const quickStats = [
        { label: 'Reports', value: reports.length.toString(), icon: 'document-text', color: C.navyMid, bg: C.primarySurface },
        { label: 'Verified', value: reports.filter(r => r.status === 'approved').length.toString(), icon: 'checkmark-circle', color: C.success, bg: C.successSurface },
        { label: 'Points', value: formatNumber(userPoints), icon: 'trophy', color: C.amberDark, bg: C.amberSurface },
    ];

    const getStatusConfig = (status) => ({
        approved: { icon: 'checkmark-circle', color: C.success, bg: C.successSurface, label: 'Verified', barColor: C.success },
        pending: { icon: 'time', color: C.warning, bg: C.warningSurface, label: 'Pending', barColor: C.amber },
        rejected: { icon: 'close-circle', color: C.error, bg: C.errorSurface, label: 'Rejected', barColor: C.error },
    }[status] || { icon: 'time', color: C.warning, bg: C.warningSurface, label: 'Pending', barColor: C.amber });

    const recentActivity = reports.slice(0, 3).map(r => ({
        id: r.id,
        type: r.violation_type || 'Traffic Violation',
        desc: r.location_address || 'Report submitted',
        time: new Date(r.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        status: r.status,
    }));

    // Navigate to Reports tab within the bottom tab navigator
    const handleSeeAllReports = () => navigation.navigate('Reports');

    // ── Traffic Info Cards Data (no images — code-driven) ──
    const TRAFFIC_INFO = [
        {
            id: '1',
            title: 'Offences & Fines',
            sub: 'Know your penalties',
            screen: 'FineInformation',
            icon: 'document-text',
            accent: '#F59E0B',
            accentBg: '#FEF3C7',
            stat: '96', statLabel: 'Offences listed',
            gradColors: [C.navy, C.navyMid],
        },
        {
            id: '2',
            title: 'Traffic Signs',
            sub: 'IRC SP-30 visual guide',
            screen: 'TrafficSigns',
            icon: 'warning',
            accent: '#F87171',
            accentBg: '#FEE2E2',
            stat: '31+', statLabel: 'Signs explained',
            gradColors: ['#1D4ED8', '#1E3A8A'],
        },
        {
            id: '3',
            title: 'Road Safety',
            sub: 'MoRTH · MV Act 1988',
            screen: 'SafetyTips',
            icon: 'shield-checkmark',
            accent: '#34D399',
            accentBg: '#D1FAE5',
            stat: '8', statLabel: 'Rule categories',
            gradColors: ['#065F46', '#059669'],
        },
    ];

    const QUICK_SERVICES = [
        { id: '5', title: 'Speed Limits',      icon: 'speedometer',      color: '#6366F1', bg: '#EDE9FE', screen: 'SpeedLimits' },
        { id: '6', title: 'Emergency',          icon: 'call',             color: '#EF4444', bg: '#FEE2E2', screen: 'EmergencyContacts' },
        { id: '7', title: 'My Image Reports',   icon: 'shield-checkmark', color: '#059669', bg: '#D1FAE5', screen: 'ImageReportStatus' },
        { id: '8', title: 'Fine Calculator',    icon: 'calculator',       color: '#D97706', bg: '#FEF3C7', screen: 'FineCalculator' },
    ];

    const insets = useSafeAreaInsets();
    
    const getTimeOfDay = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* ── Navy Header ── */}
                    <LinearGradient
                        colors={[C.navy, C.navyMid]}
                        style={[styles.header, { paddingTop: insets.top + 16 }]}
                    >
                        <View style={styles.headerTop}>
                            <View style={styles.headerLeft}>
                                <Text style={styles.greeting}>{getTimeOfDay()}, {firstName}</Text>
                                <View style={styles.locationRow}>
                                    <Ionicons name="location" size={12} color="rgba(255,255,255,0.6)" />
                                    <Text style={styles.locationText}>{userCity}</Text>
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
                                {unreadCount > 0 && (
                                <View style={styles.notifBadge}>
                                    <Text style={styles.notifBadgeText}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Text>
                                </View>
                            )}
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


                        {/* ── Traffic Info ── */}
                        <Animated.View
                            style={[
                                styles.section,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnims[1] }] },
                            ]}
                        >
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Traffic Information</Text>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trafficInfoScroll}>
                                {TRAFFIC_INFO.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        activeOpacity={0.85}
                                        onPress={() =>
                                            navigation.getParent()?.navigate(item.screen) ??
                                            navigation.navigate(item.screen)
                                        }
                                    >
                                        <LinearGradient
                                            colors={item.gradColors}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.infoCard}
                                        >
                                            {/* Top row: icon + stat */}
                                            <View style={styles.infoCardTop}>
                                                <View style={[styles.infoIconCircle, { backgroundColor: item.accent + '28' }]}>
                                                    <Ionicons name={item.icon} size={22} color={item.accent} />
                                                </View>
                                                <View style={styles.infoStatBox}>
                                                    <Text style={[styles.infoStatNum, { color: item.accent }]}>{item.stat}</Text>
                                                    <Text style={styles.infoStatLabel}>{item.statLabel}</Text>
                                                </View>
                                            </View>

                                            {/* Decorative dots */}
                                            <View style={styles.infoDots}>
                                                <View style={[styles.infoDot, { backgroundColor: item.accent + '60' }]} />
                                                <View style={[styles.infoDot, { width: 6, height: 6, backgroundColor: item.accent + '30' }]} />
                                                <View style={[styles.infoDot, { width: 4, height: 4, backgroundColor: item.accent + '20' }]} />
                                            </View>

                                            {/* Bottom text */}
                                            <Text style={styles.infoTitle}>{item.title}</Text>
                                            <View style={styles.infoBottom}>
                                                <Text style={styles.infoSub}>{item.sub}</Text>
                                                <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.6)" />
                                            </View>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </Animated.View>

                        {/* ── Quick Services ── */}
                        <Animated.View
                            style={[
                                styles.section,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnims[2] }] },
                            ]}
                        >
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Quick Services</Text>
                            </View>

                            <View style={styles.servicesGrid}>
                                {QUICK_SERVICES.map((action) => (
                                    <TouchableOpacity
                                        key={action.id}
                                        style={styles.serviceCard}
                                        activeOpacity={0.75}
                                        onPress={() =>
                                            navigation.getParent()?.navigate(action.screen) ??
                                            navigation.navigate(action.screen)
                                        }
                                    >
                                        <View style={[styles.serviceIcon, { backgroundColor: action.bg }]}>
                                            <Ionicons name={action.icon} size={22} color={action.color} />
                                        </View>
                                        <Text style={styles.serviceText}>{action.title}</Text>
                                        <Ionicons name="chevron-forward" size={13} color="rgba(0,0,0,0.2)" style={{ marginTop: 2 }} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Animated.View>

                        {/* ── Recent Activity ── */}
                        <Animated.View
                            style={[
                                styles.section,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnims[3] }], marginBottom: 32 },
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
                        {/* ── DEV ONLY: MapLibre Native Test ── */}
                        {__DEV__ && (
                            <TouchableOpacity
                                style={devBtnStyle}
                                onPress={() => navigation.navigate('MapLibreTest')}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="map" size={16} color="#0A1E3F" />
                                <Text style={devBtnTextStyle}>🗺 MapLibre Native Runtime Test</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// Dev-only inline styles (no StyleSheet entry needed)
const devBtnStyle = {
    margin: 16,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
};
const devBtnTextStyle = {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    color: '#0A1E3F',
};

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
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        letterSpacing: -0.3,
    },
    seeAll: {
        fontSize: 13,
        color: C.amber,
        fontFamily: 'Nunito-Bold',
    },

    // ── Traffic Info Horizontal Scroll ──
    trafficInfoScroll: {
        paddingRight: 20,
        gap: 14,
    },
    infoCard: {
        width: 200,
        height: 170,
        borderRadius: 22,
        padding: 16,
        justifyContent: 'space-between',
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 8,
        overflow: 'hidden',
    },
    infoCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    infoIconCircle: {
        width: 40, height: 40, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    infoStatBox: { alignItems: 'flex-end' },
    infoStatNum: { fontSize: 20, fontFamily: 'Nunito-Bold', lineHeight: 24 },
    infoStatLabel: { fontSize: 9, fontFamily: 'Nunito-SemiBold', color: 'rgba(255,255,255,0.6)', marginTop: 1 },
    infoDots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
    infoDot: { width: 8, height: 8, borderRadius: 4 },
    infoTitle: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.2,
    },
    infoBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    infoSub: {
        fontSize: 11,
        fontFamily: 'Nunito-Medium',
        color: 'rgba(255,255,255,0.7)',
    },

    // ── Quick Services Grid ──
    servicesGrid: {
        gap: 10,
    },
    serviceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.white,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 14,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    serviceIcon: {
        width: 46,
        height: 46,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
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
