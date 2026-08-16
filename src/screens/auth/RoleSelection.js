import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Animated, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer, FocusAwareStatusBar } from '../../components';
import { useAppContext, useAuth } from '../../context';
import { ROLES } from '../../utils';
import {
    COLORS, SPACING, FONT_FAMILIES, FONT_SIZES, BORDER_RADIUS,
} from '../../utils/theme';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
    bg: '#F4F6FA',           // soft off-white background
    white: '#FFFFFF',
    navy: COLORS.primaryDark,  // #0A1E3F
    navyMid: COLORS.primary,      // #0F2C59
    accent: '#0F2C59',           // primary CTA colour (navy)
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
            <FocusAwareStatusBar barStyle="dark-content" statusBgColor={C.bg} />
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
                        <Ionicons name="shield-checkmark" size={30} color="#0F2C59" />
                    </View>
                    <Text style={styles.appName}>TrafficEye</Text>
                    <Text style={styles.tagline}>Traffic Enforcement Portal • Govt Civic Service</Text>
                </Animated.View>

                {/* ── Heading ── */}
                <Animated.View style={[styles.headingBlock, { opacity: headerFade }]}>
                    <Text style={styles.heading}>Select Portal Access</Text>
                    <Text style={styles.subheading}>Choose your role to proceed to the official traffic enforcement portal.</Text>
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
                                    <Ionicons name="person" size={36} color="#0F2C59" />
                                </View>
                            </View>
                        </Animated.View>

                        {/* Text block */}
                        <Text style={styles.citizenTitle}>Citizen Portal</Text>
                        <Text style={styles.citizenSubtitle}>
                            Report traffic violations, track submitted e-challan status, check penalties, and contribute to public road safety.
                        </Text>

                        {/* CTA Button */}
                        <View style={styles.ctaButton}>
                            <Text style={styles.ctaText}>Enter Citizen Portal</Text>
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
                        activeOpacity={0.8}
                    >
                        <Ionicons name="shield" size={18} color="#0F2C59" />
                        <Text style={styles.officerLinkText}>
                            Police Officer Access •{' '}
                            <Text style={styles.officerLinkAccent}>Sign In Here →</Text>
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.footerNote}>
                        Restricted to registered Traffic Enforcement Officers & Station Personnel
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
