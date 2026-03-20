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
    const { profile } = useAuth();
    const userPoints = profile?.points_balance || 0;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    const rewards = [
        { id: 1, title: 'Coffee Voucher', points: 50, icon: 'cafe', available: true, color: COLORS.accent },
        { id: 2, title: 'Movie Ticket', points: 100, icon: 'film', available: true, color: COLORS.primary },
        { id: 3, title: 'Gas Card $10', points: 150, icon: 'car', available: false, color: COLORS.secondary },
        { id: 4, title: 'Restaurant Voucher', points: 200, icon: 'restaurant', available: false, color: COLORS.error },
    ];

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <Animated.View style={[styles.headerContainer, { opacity: fadeAnim }]}>
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
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
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
    // ── Points Card ──
    pointsCard: {
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.xl,
        ...SHADOWS.lg,
    },
    pointsCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xl,
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
        fontSize: 40,
        fontWeight: FONT_WEIGHTS.bold,
        color: '#FFFFFF',
    },
    // ── Section ──
    sectionTitle: {
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
    },
});
