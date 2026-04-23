import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Animated, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer } from '../../components';
import { useAppContext, useAuth } from '../../context';
import { ROLES } from '../../utils';
import {
    COLORS, SPACING, FONT_FAMILIES, FONT_SIZES, BORDER_RADIUS,
} from '../../utils/theme';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
    bg: '#F4F6FA',           // soft off-white background
    white: '#FFFFFF',
    navy: COLORS.primaryDark,  // #002452
    navyMid: COLORS.primary,      // #1B3A6B
    accent: '#1B3A6B',           // primary CTA colour (navy)
    accentSurface: '#E8EDF5',           // very light navy tint
    textPrimary: COLORS.textPrimary,
    textSecondary: COLORS.textSecondary,
    textMuted: COLORS.textTertiary,
    border: '#DDE3EE',
};

// ═════════════════════════════════════════════════════════════════════════════
// ROLE SELECTION — Citizen-First Layout
// ═════════════════════════════════════════════════════════════════════════════

export default function RoleSelection({ navigation, onConfirm }) {
    const { setUserRole } = useAppContext();
    const { isAuthenticated, profile, signOut } = useAuth();

    // ── Animations ──
    const headerFade = useRef(new Animated.Value(0)).current;
    const headerSlide = useRef(new Animated.Value(-24)).current;
    const cardScale = useRef(new Animated.Value(0.94)).current;
    const cardFade = useRef(new Animated.Value(0)).current;
    const footerFade = useRef(new Animated.Value(0)).current;

    // Subtle icon pulse
    const iconPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Entrance sequence
        Animated.sequence([
            Animated.parallel([
                Animated.timing(headerFade, { toValue: 1, duration: 450, useNativeDriver: true }),
                Animated.spring(headerSlide, { toValue: 0, tension: 55, friction: 11, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.spring(cardScale, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }),
                Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
            ]),
            Animated.timing(footerFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();

        // Gentle icon breathe loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(iconPulse, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
                Animated.timing(iconPulse, { toValue: 1.00, duration: 1800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // ── Role selection handler ──
    const handleRoleSelect = async (role) => {
        setUserRole(role);

        if (isAuthenticated && profile && profile.role !== role) {
            await signOut();
        }

        if (onConfirm) onConfirm();

        if (!isAuthenticated || (profile && profile.role !== role)) {
            if (role === ROLES.CITIZEN) {
                navigation.navigate('CitizenSignIn');
            } else {
                navigation.navigate('OfficerSignIn');
            }
        }
    };

    return (
        <MobileContainer>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* ── App Identity Header ── */}
                <Animated.View
                    style={[
                        styles.header,
                        { opacity: headerFade, transform: [{ translateY: headerSlide }] },
                    ]}
                >
                    {/* App logo mark */}
                    <View style={styles.logoMark}>
                        <Ionicons name="shield-checkmark" size={28} color={C.accent} />
                    </View>
                    <Text style={styles.appName}>TrafficEye</Text>
                    <Text style={styles.tagline}>Civic Intelligence Platform</Text>
                </Animated.View>

                {/* ── Heading ── */}
                <Animated.View style={[styles.headingBlock, { opacity: headerFade }]}>
                    <Text style={styles.heading}>Welcome to{'\n'}TrafficEye</Text>
                </Animated.View>

                {/* ── Citizen Card (Primary) ── */}
                <Animated.View
                    style={[
                        styles.cardWrap,
                        { opacity: cardFade, transform: [{ scale: cardScale }] },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.citizenCard}
                        onPress={() => handleRoleSelect(ROLES.CITIZEN)}
                        activeOpacity={0.88}
                    >
                        {/* Large icon area */}
                        <Animated.View
                            style={[
                                styles.iconArea,
                                { transform: [{ scale: iconPulse }] },
                            ]}
                        >
                            <View style={styles.iconOuter}>
                                <View style={styles.iconInner}>
                                    <Ionicons name="camera" size={42} color={C.accent} />
                                </View>
                            </View>
                        </Animated.View>

                        {/* Text block */}
                        <Text style={styles.citizenTitle}>Make an Impact</Text>
                        <Text style={styles.citizenSubtitle}>
                            Report traffic violations easily, track your verified submissions, and earn rewards for keeping our streets safe.
                        </Text>



                        {/* CTA Button */}
                        <View style={styles.ctaButton}>
                            <Text style={styles.ctaText}>Continue</Text>
                            <Ionicons name="arrow-forward" size={18} color={C.white} />
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Officer Text Link (Secondary) ── */}
                <Animated.View style={[styles.officerSection, { opacity: footerFade }]}>
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                        style={styles.officerLink}
                        onPress={() => handleRoleSelect(ROLES.OFFICER)}
                        activeOpacity={0.65}
                    >
                        <Ionicons name="shield-outline" size={15} color={C.textMuted} />
                        <Text style={styles.officerLinkText}>
                            Are you an officer?{' '}
                            <Text style={styles.officerLinkAccent}>Sign in here →</Text>
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.footerNote}>
                        Officer access requires Traffic Authority registration
                    </Text>
                </Animated.View>

            </ScrollView>
        </MobileContainer>
    );
}


// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({

    scroll: {
        flex: 1,
        backgroundColor: C.bg,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 48,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
    },

    // ── App identity header ──
    header: {
        alignItems: 'center',
        marginTop: Platform.OS === 'ios' ? 64 : 52,
        marginBottom: 4,
    },
    logoMark: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: C.accentSurface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: C.border,
    },
    appName: {
        fontFamily: FONT_FAMILIES.bold,
        fontSize: 20,
        color: C.navy,
        letterSpacing: -0.3,
    },
    tagline: {
        fontFamily: FONT_FAMILIES.regular,
        fontSize: FONT_SIZES.xs,
        color: C.textMuted,
        marginTop: 3,
        letterSpacing: 0.5,
    },

    // ── Heading ──
    headingBlock: {
        alignSelf: 'flex-start',
        marginTop: 36,
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    heading: {
        fontFamily: FONT_FAMILIES.bold,
        fontSize: 28,
        color: C.textPrimary,
        lineHeight: 36,
        letterSpacing: -0.6,
    },

    // ── Citizen card ──
    cardWrap: {
        width: '100%',
    },
    citizenCard: {
        width: '100%',
        backgroundColor: C.white,
        borderRadius: 20,
        padding: 28,
        borderWidth: 1.5,
        borderColor: C.border,
        // Subtle shadow
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 5,
    },

    // Icon area
    iconArea: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconOuter: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: C.accentSurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#D4DCF0',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Card text
    citizenTitle: {
        fontFamily: FONT_FAMILIES.bold,
        fontSize: 24,
        color: C.textPrimary,
        textAlign: 'center',
        letterSpacing: -0.4,
        marginBottom: 8,
    },
    citizenSubtitle: {
        fontFamily: FONT_FAMILIES.regular,
        fontSize: FONT_SIZES.sm,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 20,
        paddingHorizontal: 4,
    },

    // Feature chips
    chipRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
        flexWrap: 'wrap',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 11,
        paddingVertical: 6,
        backgroundColor: C.accentSurface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.border,
    },
    chipText: {
        fontFamily: FONT_FAMILIES.semibold,
        fontSize: 11,
        color: C.accent,
        letterSpacing: 0.2,
    },

    // CTA button
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: C.accent,
        borderRadius: 12,
        height: 52,
        gap: 8,
    },
    ctaText: {
        fontFamily: FONT_FAMILIES.bold,
        fontSize: FONT_SIZES.md,
        color: C.white,
        letterSpacing: 0.1,
    },

    // ── Officer secondary section ──
    officerSection: {
        width: '100%',
        alignItems: 'center',
        marginTop: 32,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        gap: 12,
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: C.border,
    },
    dividerText: {
        fontFamily: FONT_FAMILIES.regular,
        fontSize: FONT_SIZES.xs,
        color: C.textMuted,
    },
    officerLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    officerLinkText: {
        fontFamily: FONT_FAMILIES.regular,
        fontSize: FONT_SIZES.sm,
        color: C.textMuted,
    },
    officerLinkAccent: {
        fontFamily: FONT_FAMILIES.semibold,
        color: C.navyMid,
        textDecorationLine: 'underline',
    },
    footerNote: {
        fontFamily: FONT_FAMILIES.regular,
        fontSize: FONT_SIZES.xs,
        color: C.textMuted,
        textAlign: 'center',
        marginTop: 12,
        paddingHorizontal: 24,
        lineHeight: 18,
    },
});
