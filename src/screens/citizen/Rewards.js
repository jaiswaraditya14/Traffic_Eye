import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Animated, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAuth } from '../../context';

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
};

export default function Rewards() {
    const { profile } = useAuth();
    const userPoints = profile?.points_balance || 0;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const heroScale = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(heroScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    const level = userPoints >= 1000 ? 'Guardian' : userPoints >= 500 ? 'Volunteer' : 'Newcomer';
    const nextLevelPoints = userPoints >= 1000 ? 2000 : userPoints >= 500 ? 1000 : 500;
    const progress = Math.min(userPoints / nextLevelPoints, 1);

    const badges = [
        { icon: 'star', label: 'First Report', color: C.amber, earned: true },
        { icon: 'shield-checkmark', label: 'Verified 5×', color: C.navyMid, earned: true },
        { icon: 'ribbon', label: 'Guardian', color: C.success, earned: true },
        { icon: 'trophy', label: 'Top Reporter', color: C.textTertiary, earned: false },
    ];

    const history = [
        { icon: 'camera', label: 'Report Submitted', points: '+10', time: 'Today' },
        { icon: 'checkmark-circle', label: 'Report Verified', points: '+50', time: 'Yesterday' },
        { icon: 'camera', label: 'Report Submitted', points: '+10', time: 'Jan 18' },
    ];

    const redemptions = [
        { title: 'Certificate of Civic Duty', pts: 100, icon: 'ribbon', available: true },
        { title: 'Priority Support Access', pts: 250, icon: 'headset', available: userPoints >= 250 },
        { title: 'Featured Reporter Badge', pts: 500, icon: 'medal', available: userPoints >= 500 },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* ── Navy Header ── */}
                    <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                        <Text style={styles.headerTitle}>My Rewards</Text>
                        <Text style={styles.headerSubtitle}>Keep reporting to earn more!</Text>

                        {/* Points Hero card */}
                        <Animated.View
                            style={[
                                styles.pointsCard,
                                { transform: [{ scale: heroScale }] },
                            ]}
                        >
                            <View style={styles.pointsCardLeft}>
                                <View style={styles.trophyBg}>
                                    <Ionicons name="trophy" size={28} color={C.amberDark} />
                                </View>
                                <View>
                                    <Text style={styles.pointsLabel}>TOTAL POINTS</Text>
                                    <Text style={styles.pointsValue}>{userPoints.toLocaleString()}</Text>
                                </View>
                            </View>
                            <View style={styles.levelRight}>
                                <View style={styles.levelBadge}>
                                    <Text style={styles.levelBadgeText}>Level: {level}</Text>
                                </View>
                                <Text style={styles.progressLabel}>{nextLevelPoints - userPoints} pts to next</Text>
                                <View style={styles.progressTrack}>
                                    <Animated.View
                                        style={[styles.progressFill, { width: `${progress * 100}%` }]}
                                    />
                                </View>
                            </View>
                        </Animated.View>
                    </LinearGradient>

                    {/* ── Badges ── */}
                    <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
                        <Text style={styles.sectionTitle}>Achievements</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.badgesScroll}
                        >
                            {badges.map((badge, idx) => (
                                <View
                                    key={idx}
                                    style={[styles.badgeCard, !badge.earned && styles.badgeCardLocked]}
                                >
                                    <View
                                        style={[
                                            styles.badgeIconBg,
                                            { backgroundColor: badge.earned ? `${badge.color}18` : C.surfaceLow },
                                        ]}
                                    >
                                        {badge.earned ? (
                                            <Ionicons name={badge.icon} size={24} color={badge.color} />
                                        ) : (
                                            <Ionicons name="lock-closed" size={20} color={C.textTertiary} />
                                        )}
                                    </View>
                                    <Text style={[styles.badgeLabel, !badge.earned && { color: C.textTertiary }]}>
                                        {badge.label}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    </Animated.View>

                    {/* ── Recent Earnings ── */}
                    <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
                        <Text style={styles.sectionTitle}>Points History</Text>
                        {history.map((h, idx) => (
                            <View key={idx} style={styles.historyItem}>
                                <View style={[styles.historyIcon, { backgroundColor: C.primarySurface }]}>
                                    <Ionicons name={h.icon} size={16} color={C.navyMid} />
                                </View>
                                <View style={styles.historyContent}>
                                    <Text style={styles.historyLabel}>{h.label}</Text>
                                    <Text style={styles.historyTime}>{h.time}</Text>
                                </View>
                                <Text style={styles.historyPoints}>{h.points} pts</Text>
                            </View>
                        ))}
                    </Animated.View>

                    {/* ── Redemption ── */}
                    <Animated.View style={[styles.section, { opacity: fadeAnim, marginBottom: 40 }]}>
                        <Text style={styles.sectionTitle}>Redeem Points</Text>
                        {redemptions.map((r, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.redeemCard, !r.available && styles.redeemCardLocked]}
                                activeOpacity={r.available ? 0.8 : 1}
                            >
                                <View style={[styles.redeemIcon, { backgroundColor: r.available ? C.primarySurface : C.surfaceLow }]}>
                                    <Ionicons name={r.icon} size={20} color={r.available ? C.navyMid : C.textTertiary} />
                                </View>
                                <View style={styles.redeemContent}>
                                    <Text style={[styles.redeemTitle, !r.available && { color: C.textTertiary }]}>
                                        {r.title}
                                    </Text>
                                    <View style={styles.redeemPtsRow}>
                                        <Ionicons name="trophy" size={12} color={r.available ? C.amberDark : C.textTertiary} />
                                        <Text style={[styles.redeemPts, !r.available && { color: C.textTertiary }]}>
                                            {r.pts} points
                                        </Text>
                                    </View>
                                </View>
                                {r.available ? (
                                    <View style={styles.redeemBtn}>
                                        <Text style={styles.redeemBtnText}>Redeem</Text>
                                    </View>
                                ) : (
                                    <Ionicons name="lock-closed" size={16} color={C.textTertiary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Header
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 28,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 3,
        marginBottom: 20,
    },

    // Points card
    pointsCard: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 18,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    pointsCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    trophyBg: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: C.amberSurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pointsLabel: {
        fontSize: 9,
        fontFamily: 'Nunito-Bold',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1.5,
        marginBottom: 3,
    },
    pointsValue: {
        fontSize: 30,
        fontFamily: 'Nunito-Bold',
        color: C.amber,
        letterSpacing: -1,
    },
    levelRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    levelBadge: {
        backgroundColor: C.amber,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    levelBadgeText: {
        fontSize: 11,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
    },
    progressLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.55)',
    },
    progressTrack: {
        width: 100,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 3,
    },
    progressFill: {
        height: '100%',
        backgroundColor: C.amber,
        borderRadius: 3,
    },

    // Sections
    section: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sectionTitle: {
        fontSize: 17,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        letterSpacing: -0.2,
        marginBottom: 14,
    },

    // Badges
    badgesScroll: {
        gap: 10,
        paddingBottom: 4,
    },
    badgeCard: {
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        width: 90,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    badgeCardLocked: {
        opacity: 0.55,
    },
    badgeIconBg: {
        width: 46,
        height: 46,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    badgeLabel: {
        fontSize: 10,
        fontFamily: 'Nunito-SemiBold',
        color: C.textPrimary,
        textAlign: 'center',
    },

    // History
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        gap: 12,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    historyIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyContent: {
        flex: 1,
    },
    historyLabel: {
        fontSize: 13,
        fontFamily: 'Nunito-SemiBold',
        color: C.textPrimary,
    },
    historyTime: {
        fontSize: 11,
        color: C.textTertiary,
        marginTop: 2,
    },
    historyPoints: {
        fontSize: 13,
        fontFamily: 'Nunito-Bold',
        color: C.success,
    },

    // Redemption
    redeemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        gap: 12,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    redeemCardLocked: { opacity: 0.5 },
    redeemIcon: {
        width: 46,
        height: 46,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    redeemContent: { flex: 1 },
    redeemTitle: {
        fontSize: 14,
        fontFamily: 'Nunito-SemiBold',
        color: C.textPrimary,
        marginBottom: 4,
    },
    redeemPtsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    redeemPts: {
        fontSize: 12,
        fontFamily: 'Nunito-Medium',
        color: C.amberDark,
    },
    redeemBtn: {
        backgroundColor: C.primarySurface,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    redeemBtnText: {
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
        color: C.navyMid,
    },

    headerContainer: {},
});
