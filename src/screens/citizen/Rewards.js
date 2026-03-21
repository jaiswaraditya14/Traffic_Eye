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
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* ── Navy Header ── */}
                    <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                        <View style={styles.headerTop}>
                            <View>
                                <Text style={styles.headerTitle}>Rewards</Text>
                            </View>
                            <View style={styles.authorityShield}>
                                <Ionicons name="shield-checkmark" size={24} color={C.amber} />
                            </View>
                        </View>

                        {/* Points Hero card - 32px Rounding */}
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
                                    <Text style={styles.pointsLabel}>REWARD BALANCE</Text>
                                    <Text style={styles.pointsValue}>{userPoints.toLocaleString()}</Text>
                                </View>
                            </View>
                        </Animated.View>
                    </LinearGradient>

                    {/* ── Points History ── */}
                    <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
                        <Text style={styles.sectionTitle}>Activity History</Text>
                        <View style={styles.historyContainer}>
                            {history.map((h, idx) => (
                                <View key={idx} style={styles.historyItem}>
                                    <View style={styles.historyIconFrame}>
                                        <Ionicons name={h.icon} size={18} color={C.navyMid} />
                                    </View>
                                    <View style={styles.historyContent}>
                                        <Text style={styles.historyLabel}>{h.label}</Text>
                                        <Text style={styles.historyTime}>{h.time}</Text>
                                    </View>
                                    <View style={styles.pointRewardPill}>
                                        <Text style={styles.historyPoints}>{h.points}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* ── Redemption (Authority Cards) ── */}
                    <Animated.View style={[styles.section, { opacity: fadeAnim, marginBottom: 40 }]}>
                        <Text style={styles.sectionTitle}>Civic Privileges</Text>
                        {redemptions.map((r, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.redeemCard, !r.available && styles.redeemCardLocked]}
                                activeOpacity={r.available ? 0.85 : 1}
                            >
                                <View style={styles.redeemIconFrame}>
                                    <Ionicons name={r.icon} size={24} color={r.available ? C.navyMid : '#94A3B8'} />
                                </View>
                                <View style={styles.redeemContent}>
                                    <Text style={[styles.redeemTitle, !r.available && { color: '#94A3B8' }]}>
                                        {r.title}
                                    </Text>
                                    <View style={styles.redeemPtsRow}>
                                        <Ionicons name="diamond-outline" size={12} color={r.available ? C.amberDark : '#94A3B8'} />
                                        <Text style={[styles.redeemPts, !r.available && { color: '#94A3B8' }]}>
                                            {r.pts} Verification Points
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.redeemAction, !r.available && styles.redeemActionLocked]}>
                                    <Ionicons
                                        name={r.available ? "arrow-forward" : "lock-closed"}
                                        size={18}
                                        color={r.available ? C.navyMid : '#94A3B8'}
                                    />
                                </View>
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
        paddingBottom: 32,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        fontFamily: 'Nunito-Medium',
        marginTop: 2,
    },
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

    // Points card
    pointsCard: {
        backgroundColor: C.white,
        borderRadius: 28,
        padding: 24,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
    pointsCardMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginBottom: 20,
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
    },
    trophyCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: C.amberSurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pointsCol: {
        flex: 1,
    },
    pointsLabel: {
        fontSize: 10,
        fontFamily: 'Nunito-ExtraBold',
        color: C.textTertiary,
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    pointsValue: {
        fontSize: 36,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
        letterSpacing: -1,
    },
    pointsBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    badgeText: {
        fontSize: 11,
        fontFamily: 'Nunito-Bold',
        color: C.success,
    },

    // Progress Section
    progressSection: {
        marginTop: 4,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressInfo: {
        fontSize: 12,
        color: C.textSecondary,
        fontFamily: 'Nunito-Medium',
    },
    progressPercent: {
        fontSize: 12,
        color: C.navyMid,
        fontFamily: 'Nunito-Bold',
    },
    progressTrackOuter: {
        height: 10,
        backgroundColor: C.surfaceLow,
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 5,
    },

    // Sections
    section: {
        paddingHorizontal: 20,
        paddingTop: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        letterSpacing: -0.3,
        marginBottom: 16,
    },

    // Badges (Circular)
    badgesScroll: {
        gap: 16,
        paddingBottom: 8,
    },
    badgeFrame: {
        alignItems: 'center',
        width: 100,
    },
    badgeOuterCircle: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: C.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 12,
        position: 'relative',
    },
    badgeInnerCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeLocked: {
        opacity: 0.6,
        backgroundColor: '#F8FAFC',
    },
    earnedDot: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: C.success,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: C.white,
    },
    badgeLabel: {
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        textAlign: 'center',
    },

    // Points History
    historyContainer: {
        backgroundColor: C.white,
        borderRadius: 24,
        padding: 4,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    historyIconFrame: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: C.offWhite,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyContent: {
        flex: 1,
    },
    historyLabel: {
        fontSize: 15,
        fontFamily: 'Nunito-SemiBold',
        color: C.textPrimary,
    },
    historyTime: {
        fontSize: 12,
        color: C.textTertiary,
        marginTop: 2,
        fontFamily: 'Nunito-Medium',
    },
    pointRewardPill: {
        backgroundColor: C.successSurface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
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
        backgroundColor: C.white,
        borderRadius: 24,
        padding: 18,
        marginBottom: 12,
        gap: 16,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    redeemCardLocked: {
        opacity: 0.7,
        backgroundColor: '#F8FAFC',
    },
    redeemIconFrame: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: C.offWhite,
        justifyContent: 'center',
        alignItems: 'center',
    },
    redeemContent: {
        flex: 1,
    },
    redeemTitle: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        marginBottom: 4,
    },
    redeemPtsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    redeemPts: {
        fontSize: 12,
        fontFamily: 'Nunito-Medium',
        color: C.amberDark,
    },
    redeemAction: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: C.primarySurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    redeemActionLocked: {
        backgroundColor: '#F1F5F9',
    },
});
