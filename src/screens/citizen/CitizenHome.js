import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, Button } from '../../components';
import { useAuth } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, formatNumber } from '../../utils';

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
        { label: 'Reports', value: '12', icon: 'document-text', color: COLORS.primary, bgColor: COLORS.primarySoft },
        { label: 'Verified', value: '8', icon: 'checkmark-circle', color: COLORS.success, bgColor: COLORS.secondarySoft },
        { label: 'Points', value: formatNumber(userPoints), icon: 'trophy', color: COLORS.accent, bgColor: COLORS.accentSoft },
    ];

    const recentActivity = [
        { id: 1, type: 'Verified', desc: 'Speeding violation verified', time: '2h ago', status: 'success' },
        { id: 2, type: 'Pending', desc: 'Red light violation under review', time: '5h ago', status: 'pending' },
        { id: 3, type: 'Rejected', desc: 'Parking violation rejected', time: '1d ago', status: 'rejected' },
    ];

    const firstName = profile?.full_name?.split(' ')[0] || 'User';

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                        <View>
                            <Text style={styles.greetingLabel}>Good Day 👋</Text>
                            <Text style={styles.greeting}>{firstName}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Notifications')}
                            style={styles.notificationButton}
                        >
                            <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>3</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Quick Stats */}
                    <Animated.View style={[styles.statsContainer, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnims[0] }],
                    }]}>
                        {quickStats.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
                                <View style={[styles.statIcon, { backgroundColor: stat.bgColor || `${stat.color}15` }]}>
                                    <Ionicons name={stat.icon} size={22} color={stat.color} />
                                </View>
                                <Text style={styles.statValue}>{stat.value}</Text>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </View>
                        ))}
                    </Animated.View>

                    {/* Report Button */}
                    <Animated.View style={[styles.reportSection, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnims[1] }],
                    }]}>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => navigation.navigate('NewReport')}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, COLORS.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.reportGradient}
                            >
                                <View style={styles.reportIconCircle}>
                                    <Ionicons name="camera" size={28} color={COLORS.primary} />
                                </View>
                                <View style={styles.reportTextContainer}>
                                    <Text style={styles.reportButtonTitle}>Report Violation</Text>
                                    <Text style={styles.reportButtonSubtitle}>Capture photo or video</Text>
                                </View>
                                <Ionicons name="arrow-forward-circle" size={32} color="rgba(255,255,255,0.8)" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Information Section */}
                    <Animated.View style={[styles.section, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnims[2] }],
                    }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Information</Text>
                        </View>

                        <View style={styles.informationGrid}>
                            <TouchableOpacity style={styles.infoCard}>
                                <View style={[styles.infoIconContainer, { backgroundColor: COLORS.primarySoft || `${COLORS.primary}15` }]}>
                                    <Ionicons name="information-circle" size={28} color={COLORS.primary} />
                                </View>
                                <Text style={styles.infoCardTitle}>Safety Tips</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.infoCard}>
                                <View style={[styles.infoIconContainer, { backgroundColor: `${COLORS.error}10` }]}>
                                    <Ionicons name="warning" size={28} color={COLORS.error} />
                                </View>
                                <Text style={styles.infoCardTitle}>Traffic Signs</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.infoCard}
                                onPress={() => navigation.navigate('FineInformation')}
                            >
                                <View style={[styles.infoIconContainer, { backgroundColor: COLORS.secondarySoft || `${COLORS.success}15` }]}>
                                    <Ionicons name="cash" size={28} color={COLORS.success} />
                                </View>
                                <Text style={styles.infoCardTitle}>Fines</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Recent Activity */}
                    <Animated.View style={[styles.section, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnims[3] }],
                    }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Activity</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
                                <Text style={styles.seeAll}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {recentActivity.map((activity) => (
                            <TouchableOpacity key={activity.id} style={styles.activityCard}>
                                <View style={[
                                    styles.activityIcon,
                                    {
                                        backgroundColor: activity.status === 'success'
                                            ? (COLORS.secondarySoft || `${COLORS.success}15`)
                                            : activity.status === 'pending'
                                                ? (COLORS.accentSoft || `${COLORS.warning}15`)
                                                : `${COLORS.error}10`
                                    }
                                ]}>
                                    <Ionicons
                                        name={activity.status === 'success' ? 'checkmark-circle' : activity.status === 'pending' ? 'time' : 'close-circle'}
                                        size={22}
                                        color={activity.status === 'success' ? COLORS.success : activity.status === 'pending' ? COLORS.warning : COLORS.error}
                                    />
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={styles.activityType}>{activity.type}</Text>
                                    <Text style={styles.activityDesc}>{activity.desc}</Text>
                                </View>
                                <Text style={styles.activityTime}>{activity.time}</Text>
                            </TouchableOpacity>
                        ))}
                    </Animated.View>

                    <View style={{ height: SPACING.lg }} />
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.lg,
    },
    greetingLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    greeting: {
        fontSize: FONT_SIZES.xxl + 2,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    notifBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: COLORS.error,
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: FONT_WEIGHTS.bold },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    statIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    statValue: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
    reportSection: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
    reportGradient: {
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.lg,
    },
    reportIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    reportTextContainer: { flex: 1 },
    reportButtonTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: '#FFFFFF',
        marginBottom: 2,
    },
    reportButtonSubtitle: {
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.8)',
    },
    section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    seeAll: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: FONT_WEIGHTS.medium },
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        ...SHADOWS.sm,
    },
    activityIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    activityContent: { flex: 1 },
    activityType: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
    activityDesc: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
    activityTime: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
    informationGrid: {
        flexDirection: 'row',
        gap: SPACING.sm,
        justifyContent: 'space-between',
    },
    infoCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    infoIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    infoCardTitle: {
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
});
