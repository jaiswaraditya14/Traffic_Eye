// Rewards.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../components/MobileContainer';
import { useAppContext } from '../context/AppContext';

import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function Rewards() {
    const { userPoints } = useAppContext();
    const rewards = [
        { id: 1, title: 'Coffee Voucher', points: 50, icon: 'cafe', available: true },
        { id: 2, title: 'Movie Ticket', points: 100, icon: 'film', available: true },
        { id: 3, title: 'Gas Card $10', points: 150, icon: 'car', available: false },
        { id: 4, title: 'Restaurant Voucher', points: 200, icon: 'restaurant', available: false },
    ];

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.title}>Rewards</Text>
                </View>
                <ScrollView style={styles.content}>
                    <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} style={styles.pointsCard}>
                        <Ionicons name="trophy" size={48} color="#FFFFFF" />
                        <Text style={styles.pointsLabel}>Your Points</Text>
                        <Text style={styles.pointsValue}>{userPoints}</Text>
                    </LinearGradient>

                    <Text style={styles.sectionTitle}>Available Rewards</Text>
                    {rewards.map((reward) => (
                        <View key={reward.id} style={[styles.rewardCard, { backgroundColor: COLORS.white }, !reward.available && styles.disabledCard]}>
                            <View style={[styles.rewardIcon, { backgroundColor: `${COLORS.primary}15` }]}>
                                <Ionicons name={reward.icon} size={32} color={COLORS.primary} />
                            </View>
                            <View style={styles.rewardInfo}>
                                <Text style={styles.rewardTitle}>{reward.title}</Text>
                                <View style={styles.rewardPoints}>
                                    <Ionicons name="trophy" size={16} color={COLORS.accent} />
                                    <Text style={styles.rewardPointsText}>{reward.points} points</Text>
                                </View>
                            </View>
                            {reward.available ? (
                                <Ionicons name="chevron-forward" size={24} color={COLORS.gray400} />
                            ) : (
                                <View style={styles.lockedBadge}>
                                    <Ionicons name="lock-closed" size={16} color={COLORS.gray500} />
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
    title: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold },
    content: { flex: 1, paddingHorizontal: SPACING.lg },
    pointsCard: { borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.xl, ...SHADOWS.lg },
    pointsLabel: { fontSize: FONT_SIZES.md, color: '#FFFFFF', marginTop: SPACING.md, opacity: 0.9 },
    pointsValue: { fontSize: FONT_SIZES.xxxl * 1.5, fontWeight: FONT_WEIGHTS.bold, color: '#FFFFFF' },
    sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, marginBottom: SPACING.md },
    rewardCard: { flexDirection: 'row', alignItems: 'center', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
    disabledCard: { opacity: 0.5 },
    rewardIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    rewardInfo: { flex: 1 },
    rewardTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, marginBottom: SPACING.xs },
    rewardPoints: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rewardPointsText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium },
    lockedBadge: { padding: SPACING.sm },
});



