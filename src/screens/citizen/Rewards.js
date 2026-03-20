// Rewards.js
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAuth } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, formatPoints } from '../../utils';

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
                </Animated.View>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <LinearGradient
                            colors={[COLORS.accent, COLORS.accentDark]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.pointsCard}
                        >
                            <View style={styles.pointsIconCircle}>
                                <Ionicons name="trophy" size={32} color={COLORS.accent} />
                            </View>
                            <Text style={styles.pointsLabel}>Your Points</Text>
                            <Text style={styles.pointsValue}>{formatPoints ? formatPoints(userPoints) : userPoints}</Text>
                        </LinearGradient>
                    </Animated.View>

                    {/* Rewards List */}
                    <Text style={styles.sectionTitle}>Available Rewards</Text>
                    {rewards.map((reward) => (
                        <TouchableOpacity
                            key={reward.id}
                            style={[styles.rewardCard, !reward.available && styles.disabledCard]}
                            activeOpacity={reward.available ? 0.7 : 1}
                        >
                            <View style={[styles.rewardIcon, { backgroundColor: COLORS.primarySoft || `${COLORS.primary}15` }]}>
                                <Ionicons name={reward.icon} size={28} color={COLORS.primary} />
                            </View>
                            <View style={styles.rewardInfo}>
                                <Text style={[styles.rewardTitle, !reward.available && { color: COLORS.textTertiary }]}>
                                    {reward.title}
                                </Text>
                                <View style={styles.rewardPoints}>
                                    <Ionicons name="trophy" size={14} color={COLORS.accent} />
                                    <Text style={styles.rewardPointsText}>{reward.points} points</Text>
                                </View>
                            </View>
                            {reward.available ? (
                                <View style={styles.redeemBadge}>
                                    <Text style={styles.redeemText}>Redeem</Text>
                                </View>
                            ) : (
                                <View style={styles.lockedBadge}>
                                    <Ionicons name="lock-closed" size={16} color={COLORS.textTertiary} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                    <View style={{ height: SPACING.xl }} />
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
    title: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    content: { flex: 1, paddingHorizontal: SPACING.lg },
    pointsCard: {
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        marginBottom: SPACING.xl,
        ...SHADOWS.lg,
    },
    pointsIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    pointsLabel: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.85)', marginTop: SPACING.xs, fontWeight: FONT_WEIGHTS.medium },
    pointsValue: { fontSize: FONT_SIZES.xxxl * 1.4, fontWeight: FONT_WEIGHTS.extrabold, color: '#FFFFFF' },
    sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, marginBottom: SPACING.md, color: COLORS.textPrimary },
    rewardCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        ...SHADOWS.sm,
    },
    disabledCard: { opacity: 0.5 },
    rewardIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    rewardInfo: { flex: 1 },
    rewardTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, marginBottom: SPACING.xs, color: COLORS.textPrimary },
    rewardPoints: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rewardPointsText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, color: COLORS.textSecondary },
    redeemBadge: {
        backgroundColor: COLORS.primarySoft || `${COLORS.primary}15`,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 2,
        borderRadius: BORDER_RADIUS.full,
    },
    redeemText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.primary,
    },
    lockedBadge: { padding: SPACING.sm },
});
