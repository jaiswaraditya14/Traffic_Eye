import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image } from 'react-native';
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
        { label: 'Total Reports', value: '12', icon: 'document-text', color: COLORS.primary, bgColor: COLORS.primarySoft },
        { label: 'Verified', value: '8', icon: 'checkmark-circle', color: COLORS.success, bgColor: COLORS.secondarySoft },
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

                    {/* Hero Impact Card */}
                    <Animated.View style={[styles.heroCard, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnims[0] }],
                    }]}>
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.primaryLight]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGradient}
                        >
                            <Text style={styles.heroCardLabel}>Total Impact Points</Text>
                            <Text style={styles.heroCardValue}>{formatNumber(userPoints || 2450)}</Text>
                            <TouchableOpacity style={styles.heroCardAction} activeOpacity={0.8} onPress={() => navigation.navigate('Rewards')}>
                                <Text style={styles.heroCardActionText}>Redeem Rewards</Text>
                                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                            <Ionicons name="car-sport" size={120} color="rgba(255,255,255,0.1)" style={styles.heroBgIcon} />
                        </LinearGradient>
                    </Animated.View>

                    {/* Quick Actions Flex Grid */}
                    <Animated.View style={[styles.section, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnims[1] }],
                    }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Quick Actions</Text>
                        </View>
                        
                        <View style={styles.actionsGrid}>
                            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={() => navigation.navigate('NewReport')}>
                                <View style={[styles.actionIcon, { backgroundColor: COLORS.primarySoft, color: COLORS.primary }]}>
                                    <Ionicons name="camera" size={24} color={COLORS.primary} />
                                </View>
                                <View>
                                    <Text style={styles.actionTitle}>New Report</Text>
                                    <Text style={styles.actionDesc}>Upload a photo/video</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={() => navigation.navigate('SafetyTips')}>
                                <View style={[styles.actionIcon, { backgroundColor: COLORS.secondarySoft }]}>
                                    <Image source={require('../../../assets/safety.png')} style={{ width: 38, height: 38 }} resizeMode="contain" />
                                </View>
                                <View>
                                    <Text style={styles.actionTitle}>Safety Tips</Text>
                                    <Text style={styles.actionDesc}>Learn the guidelines</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={() => navigation.navigate('TrafficSigns')}>
                                <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                                    <Image source={require('../../../assets/traffic_light.jpg')} style={{ width: 44, height: 44, borderRadius: 6 }} resizeMode="cover" />
                                </View>
                                <View>
                                    <Text style={styles.actionTitle}>Traffic Signs</Text>
                                    <Text style={styles.actionDesc}>Know your signals</Text>
                                </View>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={() => navigation.navigate('FineInformation')}>
                                <View style={[styles.actionIcon, { backgroundColor: `${COLORS.accent}15` }]}>
                                    <Image source={require('../../../assets/fines.png')} style={{ width: 38, height: 38 }} resizeMode="contain" />
                                </View>
                                <View>
                                    <Text style={styles.actionTitle}>Fines</Text>
                                    <Text style={styles.actionDesc}>Official penalties</Text>
                                </View>
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
                            <TouchableOpacity onPress={handleSeeAllReports}>
                                <Text style={styles.seeAll}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {recentActivity.map((activity) => (
                            <TouchableOpacity key={activity.id} style={styles.activityCardNew}>
                                <View style={[
                                    styles.activityAvatarBase,
                                    { backgroundColor: activity.status === 'success' ? COLORS.secondarySoft : COLORS.warning + '15' }
                                ]}>
                                    <Ionicons name={activity.status === 'success' ? 'car' : 'warning'} size={24} color={activity.status === 'success' ? COLORS.success : COLORS.warning} />
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={styles.activityType}>{activity.type}</Text>
                                    <View style={styles.activityMetaRow}>
                                        <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
                                        <Text style={styles.activityTime}>{activity.time}</Text>
                                    </View>
                                </View>
                                <View style={[
                                    styles.statusPill,
                                    { backgroundColor: activity.status === 'success' ? '#D1FAE5' : '#FEF3C7' }
                                ]}>
                                    <Text style={[
                                        styles.statusPillText,
                                        { color: activity.status === 'success' ? '#059669' : '#D97706' }
                                    ]}>
                                        {activity.status === 'success' ? 'Verified' : 'Pending'}
                                    </Text>
                                </View>
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
    heroCard: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.xl,
    },
    heroGradient: {
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        position: 'relative',
        overflow: 'hidden',
        ...SHADOWS.md,
    },
    heroCardLabel: {
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: FONT_WEIGHTS.medium,
        marginBottom: SPACING.xs,
    },
    heroCardValue: {
        fontSize: 40,
        fontWeight: FONT_WEIGHTS.extrabold,
        color: '#FFFFFF',
        marginBottom: SPACING.lg,
        letterSpacing: -1,
    },
    heroCardAction: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.full,
        gap: 8,
    },
    heroCardActionText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    heroBgIcon: {
        position: 'absolute',
        right: -20,
        bottom: -20,
        transform: [{ rotate: '-15deg' }],
    },
    section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    seeAll: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: FONT_WEIGHTS.semibold },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    actionCard: {
        width: '47%',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
        gap: SPACING.sm,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    actionDesc: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    activityCardNew: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
        gap: SPACING.md,
    },
    activityAvatarBase: {
        width: 50,
        height: 50,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityContent: { flex: 1 },
    activityType: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: 4 },
    activityMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    activityTime: { fontSize: 11, color: COLORS.textSecondary },
    statusPill: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: BORDER_RADIUS.full,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: FONT_WEIGHTS.bold,
    },
});
