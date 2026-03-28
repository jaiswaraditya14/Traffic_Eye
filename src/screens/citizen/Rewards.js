<<<<<<< Updated upstream
// Rewards.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAppContext } from '../../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, GRADIENTS } from '../../utils/theme';

export default function Rewards() {
    const { userPoints } = useAppContext();
    const rewards = [
        { id: 1, title: 'Coffee Voucher', points: 50, icon: 'cafe', available: true, color: COLORS.accent },
        { id: 2, title: 'Movie Ticket', points: 100, icon: 'film', available: true, color: COLORS.primary },
        { id: 3, title: 'Gas Card $10', points: 150, icon: 'car', available: false, color: COLORS.secondary },
        { id: 4, title: 'Restaurant Voucher', points: 200, icon: 'restaurant', available: false, color: COLORS.error },
    ];

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.title}>Rewards</Text>
                </View>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Points Card */}
                    <LinearGradient
                        colors={GRADIENTS.accent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.pointsCard}
                    >
                        <View style={styles.pointsCardContent}>
                            <View style={styles.trophyCircle}>
                                <Ionicons name="trophy" size={32} color={COLORS.white} />
                            </View>
                            <View>
                                <Text style={styles.pointsLabel}>YOUR POINTS</Text>
                                <Text style={styles.pointsValue}>{userPoints}</Text>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Rewards List */}
                    <Text style={styles.sectionTitle}>Available Rewards</Text>
                    {rewards.map((reward) => (
                        <TouchableOpacity
                            key={reward.id}
                            style={[styles.rewardCard, !reward.available && styles.disabledCard]}
                            activeOpacity={reward.available ? 0.7 : 1}
                        >
                            <View style={[styles.rewardIcon, { backgroundColor: reward.available ? `${reward.color}15` : COLORS.gray100 }]}>
                                <Ionicons name={reward.icon} size={26} color={reward.available ? reward.color : COLORS.textTertiary} />
                            </View>
                            <View style={styles.rewardInfo}>
                                <Text style={[styles.rewardTitle, !reward.available && { color: COLORS.textTertiary }]}>
                                    {reward.title}
                                </Text>
                                <View style={styles.rewardPoints}>
                                    <Ionicons name="trophy" size={14} color={reward.available ? COLORS.accent : COLORS.textTertiary} />
                                    <Text style={[styles.rewardPointsText, !reward.available && { color: COLORS.textTertiary }]}>
                                        {reward.points} points
                                    </Text>
                                </View>
                            </View>
                            {reward.available ? (
                                <View style={styles.redeemBtn}>
                                    <Text style={styles.redeemText}>Redeem</Text>
                                    <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                                </View>
                            ) : (
                                <View style={styles.lockedBadge}>
                                    <Ionicons name="lock-closed" size={16} color={COLORS.textTertiary} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                    <View style={{ height: SPACING.xxl }} />
=======
import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Animated, StatusBar, Alert, Dimensions, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context';
import { RewardService } from '../../services/rewards';

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
    success: '#059669',
    successSurface: '#D1FAE5',
    primarySurface: '#D7E2FF',
    border: '#E2E8F0',
};

// ── Image Assets ──
const REWARD_IMAGES = {
    helmet: require('../../../assets/rewards/helmet.png'),
    gloves: require('../../../assets/rewards/gloves.png'),
    shoes: require('../../../assets/rewards/shoes.png'),
    goggles: require('../../../assets/rewards/goggles.png'),
    certificate: require('../../../assets/rewards/certificate.png'),
};

export default function Rewards() {
    const { profile } = useAuth();
    const [localPoints, setLocalPoints] = useState(profile?.points_balance || 0);
    const userPoints = localPoints;

    useEffect(() => {
        setLocalPoints(profile?.points_balance || 0);
    }, [profile?.points_balance]);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const heroScale = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(heroScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    const [activeTab, setActiveTab] = useState('shop'); // 'shop', 'history', 'guide'
    const redemptions = RewardService.getCatalog();
    
    const pointsGuide = [
        { title: 'Triple Seat riding', pts: 300, icon: 'people', color: '#002452' },
        { title: 'Over speeding', pts: 150, icon: 'speedometer', color: '#D97706' },
        { title: 'Jumping Red Signal', pts: 200, icon: 'alert-circle', color: '#BA1A1A' },
        { title: 'Normal Report', pts: 100, icon: 'checkmark-circle', color: '#1B3A6B' },
        { title: 'Low Priority', pts: 50, icon: 'information-circle', color: '#747780' },
    ];

    const handleRedeem = async (item) => {
        const canAfford = RewardService.canRedeem(userPoints, item.pts);
        
        if (!canAfford) {
            Alert.alert("Not Enough Points", "You need more points to get this gift.");
            return;
        }

        Alert.alert(
            "Confirm Gift",
            `Do you want to use ${item.pts} points for: ${item.title}?`,
            [
                { text: "No", style: "cancel" },
                { 
                    text: "Yes, Get it", 
                    onPress: async () => {
                        try {
                            setLocalPoints(prev => prev - item.pts);
                            await RewardService.processRedemption(profile?.id, item, userPoints);
                            Alert.alert("Success!", `You have successfully redeemed ${item.title}. Check your email for details.`);
                        } catch (err) {
                            setLocalPoints(userPoints);
                            Alert.alert("Error", err.message || "Something went wrong.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.headerTitle}>My Rewards</Text>
                        </View>
                        <View style={styles.authorityShield}>
                            <Ionicons name="shield-checkmark" size={24} color={C.amber} />
                        </View>
                    </View>

                    <Animated.View
                        style={[
                            styles.pointsCard,
                            { transform: [{ scale: heroScale }] },
                        ]}
                    >
                        <View style={styles.pointsCardMain}>
                            <View style={styles.trophyFrame}>
                                <View style={styles.trophyCircle}>
                                    <Ionicons name="trophy" size={32} color={C.amberDark} />
                                </View>
                            </View>
                            <View style={styles.pointsCol}>
                                <Text style={styles.pointsLabel}>MY POINTS BALANCE</Text>
                                <Text style={styles.pointsValue}>{userPoints.toLocaleString()}</Text>
                            </View>
                        </View>
                    </Animated.View>
                </LinearGradient>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.contentScroll}>
                    <View style={styles.section}>
                        {/* ── Tab Switcher ── */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity 
                                style={[styles.tab, activeTab === 'shop' && styles.activeTab]} 
                                onPress={() => setActiveTab('shop')}
                            >
                                <Text style={[styles.tabText, activeTab === 'shop' && styles.activeTabText]}>Gifts</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tab, activeTab === 'guide' && styles.activeTab]} 
                                onPress={() => setActiveTab('guide')}
                            >
                                <Text style={[styles.tabText, activeTab === 'guide' && styles.activeTabText]}>Earn Points</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
                                onPress={() => setActiveTab('history')}
                            >
                                <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>My Activity</Text>
                            </TouchableOpacity>
                        </View>

                        {activeTab === 'shop' && (
                            <View>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Available Gifts</Text>
                                    <Text style={styles.sectionSubtitle}>Use your points to get these items</Text>
                                </View>

                                <View style={styles.grid}>
                                    {redemptions.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={styles.card}
                                            onPress={() => handleRedeem(item)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.cardImageContainer}>
                                                <Image 
                                                    source={REWARD_IMAGES[item.imageKey]} 
                                                    style={styles.rewardImage}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                            <Text style={styles.cardTitle}>{item.title}</Text>
                                            <View style={styles.cardPointsContainer}>
                                                <Text style={styles.cardPoints}>{item.pts}</Text>
                                                <Text style={styles.cardPointsLabel}> PTS</Text>
                                            </View>
                                            <View style={[styles.redeemBadge, userPoints < item.pts && styles.lockedBadge]}>
                                                <Text style={styles.redeemText}>
                                                    {userPoints >= item.pts ? 'GET IT' : 'LOCKED'}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {activeTab === 'guide' && (
                            <View>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>How to Earn Points</Text>
                                    <Text style={styles.sectionSubtitle}>Get points by reporting these violations</Text>
                                </View>
                                {pointsGuide.map((item, idx) => (
                                    <View key={idx} style={styles.guideItem}>
                                        <View style={[styles.guideIcon, { backgroundColor: item.color + '15' }]}>
                                            <Ionicons name={item.icon} size={20} color={item.color} />
                                        </View>
                                        <Text style={styles.guideTitle}>{item.title}</Text>
                                        <View style={styles.guidePoints}>
                                            <Text style={styles.guidePtsValue}>+{item.pts}</Text>
                                            <Text style={styles.guidePtsLabel}> pts</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {activeTab === 'history' && (
                            <View>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                                </View>
                                <View style={styles.emptyHistory}>
                                    <Ionicons name="time-outline" size={48} color={C.border} />
                                    <Text style={styles.emptyText}>No activity history yet.</Text>
                                </View>
                            </View>
                        )}
                    </View>
>>>>>>> Stashed changes
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
<<<<<<< Updated upstream
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
=======
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },
>>>>>>> Stashed changes
    header: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
    },
    title: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        letterSpacing: -0.3,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.xl,
    },
<<<<<<< Updated upstream
    // ── Points Card ──
=======
    authorityShield: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
>>>>>>> Stashed changes
    pointsCard: {
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.xl,
        ...SHADOWS.lg,
    },
    pointsCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
<<<<<<< Updated upstream
        gap: SPACING.xl,
=======
        gap: 20,
    },
    trophyFrame: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFFBEB',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEF3C7',
>>>>>>> Stashed changes
    },
    trophyCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pointsLabel: {
        fontSize: FONT_SIZES.xxs,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: FONT_WEIGHTS.bold,
        letterSpacing: 1.5,
        marginBottom: SPACING.xxs,
    },
    pointsValue: {
<<<<<<< Updated upstream
        fontSize: 40,
        fontWeight: FONT_WEIGHTS.bold,
        color: '#FFFFFF',
=======
        fontSize: 36,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
        letterSpacing: -1,
    },
    contentScroll: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 100,
    },
    sectionHeader: {
        marginBottom: 20,
>>>>>>> Stashed changes
    },
    // ── Section ──
    sectionTitle: {
<<<<<<< Updated upstream
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
        letterSpacing: -0.2,
    },
    // ── Reward Cards ──
    rewardCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.xs,
    },
    disabledCard: {
        opacity: 0.55,
    },
    rewardIcon: {
        width: 52,
        height: 52,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.lg,
    },
    rewardInfo: {
        flex: 1,
    },
    rewardTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    rewardPoints: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    rewardPointsText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        color: COLORS.textSecondary,
    },
    redeemBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    redeemText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    lockedBadge: {
        padding: SPACING.sm,
=======
        fontSize: 18,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        letterSpacing: -0.3,
    },
    sectionSubtitle: {
        fontFamily: 'Nunito-Regular',
        fontSize: 14,
        color: C.textTertiary,
        marginTop: 2,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F3F9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: C.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontFamily: 'Nunito-SemiBold',
        fontSize: 14,
        color: C.textTertiary,
    },
    activeTabText: {
        color: C.navy,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
    },
    card: {
        width: (Dimensions.get('window').width - 64) / 2,
        backgroundColor: C.white,
        borderRadius: 20,
        padding: 16,
        margin: 8,
        borderWidth: 1,
        borderColor: '#EDF0F7',
        alignItems: 'center',
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardImageContainer: {
        width: '100%',
        height: 100,
        backgroundColor: '#F8F9FB',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        overflow: 'hidden',
    },
    rewardImage: {
        width: '90%',
        height: '90%',
    },
    cardTitle: {
        fontFamily: 'Nunito-Bold',
        fontSize: 14,
        color: C.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
        height: 40,
    },
    cardPointsContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 16,
    },
    cardPoints: {
        fontFamily: 'Nunito-ExtraBold',
        fontSize: 18,
        color: C.navy,
    },
    cardPointsLabel: {
        fontFamily: 'Nunito-Bold',
        fontSize: 10,
        color: C.textTertiary,
    },
    redeemBadge: {
        backgroundColor: C.navy,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    lockedBadge: {
        backgroundColor: '#C4C6D0',
    },
    redeemText: {
        fontFamily: 'Nunito-Bold',
        fontSize: 11,
        color: C.white,
    },
    guideItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#EDF0F7',
    },
    guideIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    guideTitle: {
        flex: 1,
        fontFamily: 'Nunito-SemiBold',
        fontSize: 15,
        color: C.textPrimary,
    },
    guidePoints: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    guidePtsValue: {
        fontFamily: 'Nunito-ExtraBold',
        fontSize: 18,
        color: '#059669',
    },
    guidePtsLabel: {
        fontFamily: 'Nunito-Bold',
        fontSize: 12,
        color: C.textTertiary,
    },
    emptyHistory: {
        backgroundColor: C.white,
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: C.border,
    },
    emptyText: {
        fontFamily: 'Nunito-Medium',
        fontSize: 14,
        color: C.textTertiary,
        marginTop: 12,
>>>>>>> Stashed changes
    },
});
