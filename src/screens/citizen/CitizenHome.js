import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Animated, StatusBar, Image, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context';
import { COLORS } from '../../utils/theme';
import useReducedMotion from '../../hooks/useReducedMotion';
import { useNotifications } from '../../context/NotificationContext';
import { FocusAwareStatusBar, AnimatedCounter, StatSkeleton, CardSkeleton, EmptyState, PressableScale, GlassCard } from '../../components';
import * as Location from 'expo-location';
import { reverseGeocode } from '../../services/geoService';
import { fetchCitizenReports, subscribeToReportUpdates } from '../../services/reports';
import { useFocusEffect } from '@react-navigation/native';

// ── Design Tokens (Civic Authority) ──
const C = {
    navy: COLORS.primaryDark,
    navyMid: COLORS.primary,
    navyLight: COLORS.primaryLight,
    amber: COLORS.secondary,
    amberDark: COLORS.secondaryDark,
    amberSurface: COLORS.secondarySurface,
    white: COLORS.surface,
    offWhite: COLORS.background,
    surface: COLORS.surface,
    surfaceLow: COLORS.surfaceContainerLow,
    textPrimary: COLORS.textPrimary,
    textSecondary: COLORS.textSecondary,
    textTertiary: COLORS.textTertiary,
    border: COLORS.surfaceContainerHighest,
    success: COLORS.success,
    successSurface: COLORS.successSurface,
    warning: COLORS.secondaryDark,
    warningSurface: COLORS.secondarySurface,
    error: COLORS.error,
    errorSurface: COLORS.errorSurface,
    primarySurface: COLORS.primarySurface,
};

export default function CitizenHome({ navigation }) {
    const { profile } = useAuth();
    const reduced = useReducedMotion();
    const userPoints = profile?.points_balance || 0;
    const firstName = profile?.full_name?.split(' ')[0] || 'User';
    const [userCity, setUserCity] = React.useState(profile?.jurisdiction || 'Mumbai, Maharashtra');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(30))).current;

    useEffect(() => {
        let active = true;
        const fetchCity = async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === 'granted') {
                    const pos = await Location.getLastKnownPositionAsync();
                    if (pos?.coords) {
                        const geo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
                        if (!active) return;
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
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (reduced) { fadeAnim.setValue(1); slideAnims.forEach(value => value.setValue(0)); return; }
        const animation = Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.stagger(80, slideAnims.map(anim => Animated.spring(anim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }))),
        ]);
        animation.start();
        return () => animation.stop();
    }, [reduced, fadeAnim, slideAnims]);

    // Stats data
    const [reports, setReports] = React.useState([]);
    const { unreadCount } = useNotifications();
    const [loading, setLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [loadError, setLoadError] = React.useState(false);
    const [focusKey, setFocusKey] = React.useState(0);
    const sequence = useRef(0);
    const loadData = React.useCallback(async () => {
        const request = ++sequence.current;
        if (!profile?.id) { setLoading(false); return; }
        try {
            const result = await fetchCitizenReports(profile.id);
            if (request !== sequence.current) return;
            if (result.error) throw result.error;
            setReports(result.data || []); setLoadError(false);
        } catch { if (request === sequence.current) setLoadError(true); }
        finally { if (request === sequence.current) { setLoading(false); setRefreshing(false); } }
    }, [profile?.id]);

    useFocusEffect(
        React.useCallback(() => {
            setFocusKey(key => key + 1);
            loadData();
            return () => { sequence.current++; };
        }, [loadData])
    );

    useFocusEffect(
        React.useCallback(() => {
            if (!profile?.id) return;
            const ch = subscribeToReportUpdates(
                profile.id,
                (payload) => setReports(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r)),
                (payload) => setReports(prev => [payload.new, ...prev.filter(row => row.id !== payload.new.id)]),
            );
            return () => { if (ch) ch.unsubscribe(); };
        }, [profile?.id])
    );

    const quickStats = [
        { label: 'Reports', value: reports.length.toString(), icon: 'document-text', color: C.navyMid, bg: C.primarySurface },
        { label: 'Verified', value: reports.filter(r => r.status === 'approved').length.toString(), icon: 'checkmark-circle', color: C.success, bg: C.successSurface },
        { label: 'Points', value: userPoints, icon: 'trophy', color: C.amberDark, bg: C.amberSurface },
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
        // r.image_url is the denormalized column; r.media[0].file_url is the
        // normalized evidence record in report_media. Always try both so the
        // thumbnail renders regardless of which path was used at submit time.
        imageUrl: r.image_url || r.media?.[0]?.file_url || null,
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
            accent: COLORS.secondaryLight,
            accentBg: COLORS.secondarySurface,
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
            accentBg: COLORS.errorSurface,
            stat: '31+', statLabel: 'Signs explained',
            gradColors: ['#1D4ED8', COLORS.primaryLight],
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
        { id: '6', title: 'Emergency',          icon: 'call',             color: '#EF4444', bg: COLORS.errorSurface, screen: 'EmergencyContacts' },
        { id: '7', title: 'My Image Reports',   icon: 'shield-checkmark', color: '#059669', bg: '#D1FAE5', screen: 'ImageReportStatus' },
        { id: '8', title: 'Fine Calculator',    icon: 'calculator',       color: COLORS.secondary, bg: COLORS.secondarySurface, screen: 'FineCalculator' },
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
                <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.secondary} colors={[COLORS.secondary]} progressBackgroundColor={COLORS.primaryDark} />}>

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
                                    (navigation.getParent() || navigation).navigate('Notifications')
                                }
                                style={styles.notifButton}
                                accessibilityRole="button" accessibilityLabel={'Notifications, ' + unreadCount + ' unread'}
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
                            {loading ? [0, 1, 2].map(key => <StatSkeleton key={key} style={{ flex: 1 }} />) : quickStats.map((stat, idx) => (
                                <React.Fragment key={idx}>
                                    <View style={styles.statItem}>
                                        <AnimatedCounter to={Number(stat.value)} trigger={focusKey} style={styles.statValue} />
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

                        {loadError && <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 8, padding: 12, backgroundColor: COLORS.warningSurface }}>
                            <Ionicons name="cloud-offline-outline" size={20} color={COLORS.warning} /><Text style={{ flex: 1, color: COLORS.warning }}>Could not refresh reports. Pull down to retry.</Text>
                        </View>}
                        <View style={{ flexDirection: 'row', gap: 12, marginVertical: 16 }}>
                            {[{ label: 'Photo Report', screen: 'NewReport', icon: 'camera', colors: [COLORS.secondaryDark, COLORS.secondary] }, { label: 'Video Report', screen: 'VideoReport', icon: 'videocam', colors: [COLORS.primaryDark, COLORS.primary] }].map(action => <PressableScale key={action.screen} style={{ flex: 1 }} accessibilityLabel={action.label} onPress={() => (navigation.getParent() || navigation).navigate(action.screen)}>
                                <LinearGradient colors={action.colors} style={{ borderRadius: 20, padding: 16, minHeight: 140, justifyContent: 'space-between' }}>
                                    <Ionicons name={action.icon} color={COLORS.white} size={28} />
                                    <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 18, color: COLORS.white }}>{action.label}</Text>
                                </LinearGradient>
                            </PressableScale>)}
                        </View>
                        <GlassCard style={{ backgroundColor: COLORS.secondarySurface, marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Ionicons name="trophy" size={28} color={COLORS.secondary} />
                                <View style={{ flex: 1 }}><AnimatedCounter to={userPoints} trigger={focusKey} suffix=" pts" style={{ color: COLORS.primary, fontSize: 24, fontFamily: 'DMSans-Bold' }} /><Text style={{ color: COLORS.textSecondary }}>Your road-safety rewards</Text></View>
                                <PressableScale accessibilityLabel="Redeem rewards" onPress={() => navigation.navigate('Rewards')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: COLORS.primary }}>Redeem →</Text></PressableScale>
                            </View>
                        </GlassCard>

                        {/* ── Recent Activity ── */}
                        <Animated.View
                            style={[
                                styles.section,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnims[1] }] },
                            ]}
                        >
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Recent Activity</Text>
                                <TouchableOpacity onPress={handleSeeAllReports}>
                                    <Text style={styles.seeAll}>See All</Text>
                                </TouchableOpacity>
                            </View>

                            {loading ? <><CardSkeleton /><CardSkeleton /></> : recentActivity.length === 0 ? (
                                <View style={styles.emptyActivity}>
                                    <Ionicons name="document-outline" size={36} color={C.textTertiary} />
                                    <Text style={styles.emptyActivityText}>No reports yet</Text>
                                    <Text style={styles.emptyActivitySub}>Your submitted reports will appear here</Text>
                                </View>
                            ) : (
                                recentActivity.map((activity) => {
                                    const config = getStatusConfig(activity.status);
                                    return (
                                        <TouchableOpacity
                                            key={activity.id}
                                            style={styles.activityCard}
                                            activeOpacity={0.8}
                                            onPress={() => {
                                                const fullReport = reports.find(r => r.id === activity.id);
                                                navigation.getParent()?.navigate('ReportDetail', { reportId: activity.id, report: fullReport }) ??
                                                navigation.navigate('ReportDetail', { reportId: activity.id, report: fullReport });
                                            }}
                                        >
                                            {/* Left colored bar */}
                                            <View style={[styles.cardBar, { backgroundColor: config.barColor }]} />

                                            {/* Evidence thumbnail — falls back to status icon */}
                                            <View style={styles.activityThumbContainer}>
                                                {activity.imageUrl ? (
                                                    <Image
                                                        source={{ uri: activity.imageUrl }}
                                                        style={styles.activityThumb}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View style={[styles.activityIconFallback, { backgroundColor: config.bg }]}>
                                                        <Ionicons name={config.icon} size={20} color={config.color} />
                                                    </View>
                                                )}
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
                                })
                            )}
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
                                            (navigation.getParent() || navigation).navigate(action.screen)
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

                        {/* ── Traffic Information ── */}
                        <Animated.View
                            style={[
                                styles.section,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnims[3] }] },
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
                                            (navigation.getParent() || navigation).navigate(item.screen)
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

                        {/* ── DEV ONLY: MapLibre Native Test ── */}
                        {__DEV__ && (
                            <TouchableOpacity
                                style={devBtnStyle}
                                onPress={() => navigation.navigate('MapLibreTest')}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="map" size={16} color={COLORS.primaryDark} />
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
    backgroundColor: COLORS.secondaryLight,
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
    color: COLORS.primaryDark,
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

    // Evidence thumbnail for Recent Activity
    activityThumbContainer: {
        width: 54,
        height: 54,
        borderRadius: 10,
        margin: 12,
        overflow: 'hidden',
    },
    activityThumb: {
        width: '100%',
        height: '100%',
    },
    activityIconFallback: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Empty state for Recent Activity
    emptyActivity: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    emptyActivityText: {
        fontSize: 15,
        fontFamily: 'Nunito-SemiBold',
        color: C.textSecondary,
        marginTop: 10,
    },
    emptyActivitySub: {
        fontSize: 12,
        color: C.textTertiary,
        marginTop: 4,
        textAlign: 'center',
    },
});
