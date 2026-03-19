// OfficerDashboard.js
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAuth } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils';

export default function OfficerDashboard({ navigation }) {
    const { profile } = useAuth();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnims = useRef([0, 1, 2].map(() => new Animated.Value(30))).current;

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

    const firstName = profile?.full_name?.split(' ')[0] || 'Officer';

    const stats = [
        { label: 'Pending', value: '24', icon: 'time', color: COLORS.warning, bgColor: COLORS.accentSoft },
        { label: 'Verified', value: '156', icon: 'checkmark-circle', color: COLORS.success, bgColor: COLORS.secondarySoft },
        { label: 'Today', value: '12', icon: 'calendar', color: COLORS.info, bgColor: COLORS.primarySoft },
    ];

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                        <View>
                            <Text style={styles.greetingLabel}>Welcome back 🛡️</Text>
                            <Text style={styles.greeting}>{firstName}</Text>
                        </View>
                        <TouchableOpacity style={styles.notificationButton}>
                            <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View style={[styles.statsContainer, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnims[0] }],
                    }]}>
                        {stats.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
                                <LinearGradient
                                    colors={[stat.color, `${stat.color}CC`]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.statGradient}
                                >
                                    <Ionicons name={stat.icon} size={28} color={COLORS.white} />
                                    <Text style={styles.statValue}>{stat.value}</Text>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                </LinearGradient>
                            </View>
                        ))}
                    </Animated.View>

                    <Animated.View style={[styles.section, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnims[1] }],
                    }]}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Pending')} activeOpacity={0.7}>
                            <View style={[styles.actionIcon, { backgroundColor: COLORS.accentSoft || `${COLORS.warning}15` }]}>
                                <Ionicons name="time" size={28} color={COLORS.warning} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Review Pending Reports</Text>
                                <Text style={styles.actionDesc}>24 reports waiting for verification</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Verified')} activeOpacity={0.7}>
                            <View style={[styles.actionIcon, { backgroundColor: COLORS.secondarySoft || `${COLORS.success}15` }]}>
                                <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Verified Reports</Text>
                                <Text style={styles.actionDesc}>View all verified violations</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
                        </TouchableOpacity>
                    </Animated.View>
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
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
        marginBottom: SPACING.xl,
    },
    statCard: { flex: 1 },
    statGradient: {
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        alignItems: 'center',
        ...SHADOWS.md,
    },
    statValue: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.white,
        marginTop: SPACING.sm,
    },
    statLabel: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.85)', fontWeight: FONT_WEIGHTS.medium },
    section: { paddingHorizontal: SPACING.lg },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        ...SHADOWS.sm,
    },
    actionIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    actionContent: { flex: 1 },
    actionTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    actionDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
});
