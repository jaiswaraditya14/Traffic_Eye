import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Animated, StatusBar, Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAppContext, useAuth } from '../../context';
import { ROLES } from '../../utils';
import {
    COLORS, SPACING, FONT_FAMILIES, FONT_SIZES,
    BORDER_RADIUS, SHADOWS, GRADIENTS,
} from '../../utils/theme';

const { width } = Dimensions.get('window');

// ── Design tokens (theme-aligned) ────────────────────────────────────────
const C = {
    navy:           COLORS.primaryDark,     // #002452
    navyMid:        COLORS.primary,         // #1B3A6B
    navyLight:      COLORS.primaryLight,    // #2C4E80
    amber:          COLORS.secondary,       // #F59E0B
    amberDark:      COLORS.secondaryDark,   // #D97706
    white:          COLORS.white,
    offWhite:       COLORS.background,      // #F8F9FB
    surface:        COLORS.surface,
    surfaceLow:     COLORS.surfaceContainerLow,
    textPrimary:    COLORS.textPrimary,
    textSecondary:  COLORS.textSecondary,
    textTertiary:   COLORS.textTertiary,
    success:        COLORS.success,
    successSurface: COLORS.successSurface,
    primarySurface: COLORS.primarySurface,
    amberSurface:   COLORS.secondarySurface,
    border:         COLORS.borderLight,
};


// ═════════════════════════════════════════════════════════════════════════════
// ROLE SELECTION — Premium UI
// ═════════════════════════════════════════════════════════════════════════════

export default function RoleSelection({ navigation, onConfirm }) {
    // ── Context (unchanged) ──
    const { setUserRole } = useAppContext();
    const { isAuthenticated, profile, signOut } = useAuth();

    // ── Animations ──
    const fadeAnim    = useRef(new Animated.Value(0)).current;
    const headerSlide = useRef(new Animated.Value(-40)).current;
    const card1Scale  = useRef(new Animated.Value(0.92)).current;
    const card1Fade   = useRef(new Animated.Value(0)).current;
    const card2Scale  = useRef(new Animated.Value(0.92)).current;
    const card2Fade   = useRef(new Animated.Value(0)).current;
    const footerFade  = useRef(new Animated.Value(0)).current;

    // Floating decorative orbs (subtle ambient movement)
    const orb1Y = useRef(new Animated.Value(0)).current;
    const orb2Y = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance sequence
        Animated.sequence([
            // 1. Header fades in & slides down
            Animated.parallel([
                Animated.timing(fadeAnim,    { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.spring(headerSlide, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
            ]),
            // 2. Cards spring in with stagger
            Animated.stagger(150, [
                Animated.parallel([
                    Animated.spring(card1Scale, { toValue: 1, tension: 65, friction: 9, useNativeDriver: true }),
                    Animated.timing(card1Fade,  { toValue: 1, duration: 350, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.spring(card2Scale, { toValue: 1, tension: 65, friction: 9, useNativeDriver: true }),
                    Animated.timing(card2Fade,  { toValue: 1, duration: 350, useNativeDriver: true }),
                ]),
            ]),
            // 3. Footer fades in
            Animated.timing(footerFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();

        // Ambient floating orbs (loop)
        const floatOrb = (anim, duration) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, { toValue: -8, duration, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 8,  duration, useNativeDriver: true }),
                ]),
            );
        floatOrb(orb1Y, 3000).start();
        floatOrb(orb2Y, 4000).start();
    }, []);

    // ── Role selection handler (logic unchanged) ──
    const handleRoleSelect = async (role) => {
        setUserRole(role);

        // Security logic: If already authenticated but choosing a different role, sign out
        if (isAuthenticated && profile && profile.role !== role) {
            console.log("Role mismatch in session, signing out for security.");
            await signOut();
            // After sign out, we stay in RoleSelection (via AppNavigator)
            // But we can proceed to sign in as the new role
        }

        // Call onConfirm to let AppNavigator know the user has interacted with selection
        if (onConfirm) onConfirm();

        // If the user was already authenticated with the SAME role, AppNavigator will
        // automatically switch to the Citizen/Officer stack now that onConfirm() fired.
        // We only forcefully navigate to SignIn screens if they actually need to sign in.
        if (!isAuthenticated || (profile && profile.role !== role)) {
            if (role === ROLES.CITIZEN) {
                navigation.navigate('CitizenSignIn');
            } else {
                navigation.navigate('OfficerSignIn');
            }
        }
    };

    // ── Render ──
    return (
        <MobileContainer>
            <StatusBar barStyle="light-content" backgroundColor={C.navy} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* ── Immersive Hero Header ── */}
                <LinearGradient
                    colors={GRADIENTS.heroDark}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={styles.hero}
                >
                    {/* Decorative floating orbs */}
                    <Animated.View style={[styles.orb, styles.orb1, { transform: [{ translateY: orb1Y }] }]} />
                    <Animated.View style={[styles.orb, styles.orb2, { transform: [{ translateY: orb2Y }] }]} />

                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [{ translateY: headerSlide }],
                            alignItems: 'center',
                        }}
                    >
                        {/* Glowing shield icon */}
                        <View style={styles.shieldGlow}>
                            <LinearGradient
                                colors={['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.04)']}
                                style={styles.shieldOuter}
                            >
                                <View style={styles.shieldInner}>
                                    <Ionicons name="shield-checkmark" size={36} color={C.amber} />
                                </View>
                            </LinearGradient>
                        </View>

                        <Text style={styles.heroTitle}>Welcome to TrafficEye</Text>
                        <Text style={styles.heroSubtitle}>Select your role to get started</Text>
                    </Animated.View>
                </LinearGradient>

                {/* ── Role Cards ── */}
                <View style={styles.cardsSection}>

                    {/* ─── Citizen Card ─── */}
                    <Animated.View style={{
                        opacity: card1Fade,
                        transform: [{ scale: card1Scale }],
                    }}>
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => handleRoleSelect(ROLES.CITIZEN)}
                            activeOpacity={0.85}
                        >
                            {/* Top gradient accent strip */}
                            <LinearGradient
                                colors={[C.navyMid, C.navyLight]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.cardAccentStrip}
                            />

                            <View style={styles.cardBody}>
                                {/* Icon + Title row */}
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconCircle, { backgroundColor: C.primarySurface }]}>
                                        <Ionicons name="person" size={26} color={C.navyMid} />
                                    </View>
                                    <View style={styles.cardTitleBlock}>
                                        <Text style={styles.cardTitle}>Citizen</Text>
                                        <View style={[styles.rolePill, { backgroundColor: C.primarySurface }]}>
                                            <Text style={[styles.rolePillText, { color: C.navyMid }]}>REPORTER</Text>
                                        </View>
                                    </View>
                                    <View style={styles.arrowCircle}>
                                        <Ionicons name="arrow-forward" size={18} color={C.navyMid} />
                                    </View>
                                </View>

                                {/* Description */}
                                <Text style={styles.cardDesc}>
                                    Report traffic violations and earn rewards for making roads safer.
                                </Text>

                                {/* Feature chips */}
                                <View style={styles.chipRow}>
                                    {['AI Reports', 'Track Status', 'Earn Points'].map((label, i) => (
                                        <View key={i} style={[styles.chip, { backgroundColor: C.successSurface }]}>
                                            <Ionicons name="checkmark-circle" size={13} color={C.success} />
                                            <Text style={[styles.chipText, { color: C.success }]}>{label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* ─── Officer Card ─── */}
                    <Animated.View style={{
                        opacity: card2Fade,
                        transform: [{ scale: card2Scale }],
                    }}>
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => handleRoleSelect(ROLES.OFFICER)}
                            activeOpacity={0.85}
                        >
                            {/* Top gradient accent strip */}
                            <LinearGradient
                                colors={GRADIENTS.amber}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.cardAccentStrip}
                            />

                            <View style={styles.cardBody}>
                                {/* Icon + Title row */}
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconCircle, { backgroundColor: C.amberSurface }]}>
                                        <Ionicons name="shield-checkmark" size={26} color={C.amberDark} />
                                    </View>
                                    <View style={styles.cardTitleBlock}>
                                        <Text style={styles.cardTitle}>Traffic Officer</Text>
                                        <View style={[styles.rolePill, { backgroundColor: C.amberSurface }]}>
                                            <Text style={[styles.rolePillText, { color: C.amberDark }]}>AUTHORITY</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.arrowCircle, { backgroundColor: C.amberSurface }]}>
                                        <Ionicons name="arrow-forward" size={18} color={C.amberDark} />
                                    </View>
                                </View>

                                {/* Description */}
                                <Text style={styles.cardDesc}>
                                    Verify reports, manage violations, and maintain road safety.
                                </Text>

                                {/* Feature chips */}
                                <View style={styles.chipRow}>
                                    {['Verify Reports', 'Manage Queue', 'Track Stats'].map((label, i) => (
                                        <View key={i} style={[styles.chip, { backgroundColor: C.amberSurface }]}>
                                            <Ionicons name="checkmark-circle" size={13} color={C.amberDark} />
                                            <Text style={[styles.chipText, { color: C.amberDark }]}>{label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* ── Footer ── */}
                <Animated.View style={[styles.footer, { opacity: footerFade }]}>
                    <View style={styles.footerDivider} />
                    <View style={styles.footerContent}>
                        <Ionicons name="lock-closed" size={13} color={C.textTertiary} />
                        <Text style={styles.footerText}>
                            Officer access requires Traffic Authority registration
                        </Text>
                    </View>
                </Animated.View>

            </ScrollView>
        </MobileContainer>
    );
}


// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({

    // ── Scroll container ──
    scrollView: {
        flex: 1,
        backgroundColor: C.offWhite,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },

    // ── Hero header ──
    hero: {
        paddingTop: Platform.OS === 'ios' ? 70 : 56,
        paddingBottom: 48,
        paddingHorizontal: SPACING.xl,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },

    // Decorative floating orbs
    orb: {
        position: 'absolute',
        borderRadius: 999,
    },
    orb1: {
        width: 120,
        height: 120,
        backgroundColor: 'rgba(245, 158, 11, 0.06)',
        top: -20,
        right: -30,
    },
    orb2: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        bottom: 10,
        left: -20,
    },

    // Shield icon with glow ring
    shieldGlow: {
        marginBottom: 20,
    },
    shieldOuter: {
        width: 88,
        height: 88,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shieldInner: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.2)',
    },

    heroTitle: {
        fontFamily: FONT_FAMILIES.bold,
        fontSize: 26,
        color: C.white,
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontFamily: FONT_FAMILIES.medium,
        fontSize: FONT_SIZES.md,
        color: 'rgba(255,255,255,0.55)',
        textAlign: 'center',
    },

    // ── Cards section ──
    cardsSection: {
        paddingHorizontal: 20,
        marginTop: -16,         // Overlap hero slightly for depth
        gap: 18,
        zIndex: 1,
    },

    // ── Individual card ──
    card: {
        backgroundColor: C.surface,
        borderRadius: BORDER_RADIUS.xxxl,
        overflow: 'hidden',
        ...SHADOWS.lg,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    cardAccentStrip: {
        height: 4,
        width: '100%',
    },
    cardBody: {
        padding: 22,
    },

    // Card header (icon + title + arrow)
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 14,
    },
    iconCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitleBlock: {
        flex: 1,
        gap: 6,
    },
    cardTitle: {
        fontFamily: FONT_FAMILIES.bold,
        fontSize: 20,
        color: C.textPrimary,
        letterSpacing: -0.3,
    },
    rolePill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.full,
    },
    rolePillText: {
        fontFamily: FONT_FAMILIES.bold,
        fontSize: 9,
        letterSpacing: 1.4,
    },
    arrowCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: C.primarySurface,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Card description
    cardDesc: {
        fontFamily: FONT_FAMILIES.regular,
        fontSize: FONT_SIZES.sm,
        color: C.textSecondary,
        lineHeight: 20,
        marginBottom: 16,
    },

    // Feature chips
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
    },
    chipText: {
        fontFamily: FONT_FAMILIES.semibold,
        fontSize: 11,
    },

    // ── Footer ──
    footer: {
        paddingHorizontal: 32,
        marginTop: 28,
        alignItems: 'center',
    },
    footerDivider: {
        width: 48,
        height: 3,
        borderRadius: 2,
        backgroundColor: C.border,
        marginBottom: 16,
    },
    footerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerText: {
        fontFamily: FONT_FAMILIES.regular,
        fontSize: FONT_SIZES.xs,
        color: C.textTertiary,
        textAlign: 'center',
    },
});
