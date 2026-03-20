import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, Button } from '../../components';
import { useAuth } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, GRADIENTS, formatNumber } from '../../utils';

export default function CitizenHome({ navigation }) {
    const { profile } = useAuth();
    const userPoints = profile?.points_balance || 0;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(30))).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();

        Animated.stagger(100, slideAnims.map(anim =>
            Animated.spring(anim, {
                toValue: 0,
                tension: 80,
                friction: 12,
                useNativeDriver: true,
            })
        )).start();
    }, []);

    const quickStats = [
        { label: 'Reports', value: '12', icon: 'document-text', color: COLORS.primary, bg: COLORS.primarySurface },
        { label: 'Verified', value: '8', icon: 'checkmark-circle', color: COLORS.success, bg: COLORS.successSurface },
        { label: 'Points', value: formatNumber(userPoints), icon: 'trophy', color: COLORS.accent, bg: COLORS.accentSurface },
    ];

    const recentActivity = [
        { id: 1, type: 'Illegal Parking', desc: 'At Downtown St.', time: 'Today, 10:45 AM', status: 'pending' },
        { id: 2, type: 'Red Light Violation', desc: 'At Main intersection', time: 'Oct 12, 4:20 PM', status: 'success' },
    ];

    const firstName = profile?.full_name?.split(' ')[0] || 'User';

    const getStatusConfig = (status) => ({
        success: { icon: 'checkmark-circle', color: COLORS.success, bg: COLORS.successSurface, label: 'Verified' },
        pending: { icon: 'time', color: COLORS.warning, bg: COLORS.warningSurface, label: 'Pending' },
        rejected: { icon: 'close-circle', color: COLORS.error, bg: COLORS.errorSurface, label: 'Rejected' },
    }[status]);

    // Navigate to Reports tab within the bottom tab navigator
    const handleSeeAllReports = () => {
        navigation.navigate('Reports');
    };

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.greeting}>Hello, {firstName}</Text>
                            <Text style={styles.headerSubtitle}>Let's keep the roads safe today</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.getParent()?.navigate('Notifications') ?? navigation.navigate('Notifications')}
                            style={styles.notificationBtn}
                        >
                            <View style={styles.notificationBtnInner}>
                                <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>3</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Quick Stats */}
                    <View style={styles.statsContainer}>
                        {quickStats.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
                                <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
                                    <Ionicons name={stat.icon} size={22} color={stat.color} />
                                </View>
                                <Text style={styles.statValue}>{stat.value}</Text>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Primary CTA — Report Button with real image */}
                    <View style={styles.reportSection}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => navigation.getParent()?.navigate('NewReport') ?? navigation.navigate('NewReport')}
                        >
                            <View style={styles.reportCard}>
                                <Image
                                    source={require('../../../assets/images/hero_image.png')}
                                    style={styles.reportCardBgImage}
                                    resizeMode="cover"
                                />
                                <LinearGradient
                                    colors={['rgba(79, 70, 229, 0.92)', 'rgba(99, 102, 241, 0.88)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.reportCardOverlay}
                                >
                                    <View style={styles.reportCardContent}>
                                        <View style={styles.reportCardLeft}>
                                            <Text style={styles.reportCardTitle}>Report a Violation</Text>
                                            <Text style={styles.reportCardSubtitle}>
                                                Capture photo or video evidence
                                            </Text>
                                        </View>
                                        <View style={styles.reportCardIcon}>
                                            <Ionicons name="camera" size={28} color="rgba(255,255,255,0.9)" />
                                        </View>
                                    </View>
                                </LinearGradient>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Quick Actions Flex Grid */}
                    <Animated.View style={[styles.section, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnims[1] }],
                    }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Quick Actions</Text>
                        </View>

                        <View style={styles.informationGrid}>
                            <TouchableOpacity
                                style={styles.infoCard}
                                onPress={() => navigation.getParent()?.navigate('SafetyTips') ?? navigation.navigate('SafetyTips')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.infoIconContainer, { backgroundColor: COLORS.primarySurface }]}>
                                    <Image
                                        source={require('../../../assets/images/helmet.png')}
                                        style={styles.infoImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.infoCard}
                                onPress={() => navigation.getParent()?.navigate('TrafficSigns') ?? navigation.navigate('TrafficSigns')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.infoIconContainer, { backgroundColor: COLORS.errorSurface }]}>
                                    <Image
                                        source={require('../../../assets/images/crosspath.png')}
                                        style={styles.infoImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.infoCard}
                                onPress={() => navigation.getParent()?.navigate('FineInformation') ?? navigation.navigate('FineInformation')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.infoIconContainer, { backgroundColor: COLORS.successSurface }]}>
                                    <Image
                                        source={require('../../../assets/images/image.png')}
                                        style={styles.infoImage}
                                        resizeMode="contain"
                                    />
                                </View>
                                <Text style={styles.infoCardTitle}>Fine Info</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Recent Activity */}
                    <View style={[styles.section, { marginBottom: SPACING.xxl }]}>
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
                                    activeOpacity={0.7}
                                    onPress={() => navigation.getParent()?.navigate('ReportDetail', { reportId: activity.id }) ?? navigation.navigate('ReportDetail', { reportId: activity.id })}
                                >
                                    <View style={[styles.activityIcon, { backgroundColor: config.bg }]}>
                                        <Ionicons name={config.icon} size={22} color={config.color} />
                                    </View>
                                    <View style={styles.activityContent}>
                                        <View style={styles.activityTopRow}>
                                            <Text style={styles.activityType}>{activity.type}</Text>
                                            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                                        </View>
                                        <Text style={styles.activityDesc}>{activity.desc}</Text>
                                    </View>
                                    <Text style={styles.activityTime}>{activity.time}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // ── Header ──
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.lg,
    },
    headerLeft: {
        flex: 1,
    },
    greeting: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    notificationBtn: {
        marginTop: SPACING.xs,
    },
    notificationBtnInner: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: COLORS.error,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.background,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: FONT_WEIGHTS.bold,
    },

    // ── Stats ──
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.xl,
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.xs,
    },
    statIcon: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    statValue: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        letterSpacing: -0.3,
    },
    statLabel: {
        fontSize: FONT_SIZES.xxs,
        color: COLORS.textTertiary,
        fontWeight: FONT_WEIGHTS.medium,
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // ── Report CTA ──
    reportSection: {
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.xl,
    },
    reportCard: {
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        ...SHADOWS.primary,
    },
    reportCardBgImage: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    reportCardOverlay: {
        padding: SPACING.xl,
    },
    reportCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reportCardLeft: {
        flex: 1,
    },
    reportCardTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: '#FFFFFF',
        marginBottom: SPACING.xxs,
        letterSpacing: -0.2,
    },
    reportCardSubtitle: {
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255, 255, 255, 0.85)',
    },
    reportCardIcon: {
        width: 56,
        height: 56,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: SPACING.md,
    },

    // ── Sections ──
    section: {
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        letterSpacing: -0.2,
    },
    seeAll: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.semibold,
    },

    // ── Info Cards ──
    informationGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
        justifyContent: 'space-between',
    },
    infoCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.xs,
    },
    infoIconContainer: {
        width: 52,
        height: 52,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    infoImage: {
        width: 30,
        height: 30,
    },
    infoCardTitle: {
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },

    // ── Activity Cards ──
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.xs,
    },
    activityIcon: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    activityContent: {
        flex: 1,
    },
    activityTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    activityType: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    activityDesc: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    activityTime: {
        fontSize: FONT_SIZES.xxs,
        color: COLORS.textTertiary,
        fontWeight: FONT_WEIGHTS.medium,
    },
});
