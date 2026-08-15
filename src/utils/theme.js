import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────
// TRAFFIC EYE — "Official Indian Government Civic Service" Design System
// Deep Navy (#0F2C59) + Civic Saffron (#D97706) + Off-White Canvas (#F4F6F9)
// High contrast, mobile-first, production-ready civic portal
// ─────────────────────────────────────────────────────────

export const COLORS = {
    // ── Primary: Deep Government Navy Blue (Authority, Security & Trust) ──
    primary: '#0F2C59',
    primaryDark: '#0A1E3F',
    primaryLight: '#1E3A8A',
    primarySurface: '#EFF6FF',     // Light navy tint for backgrounds
    primaryBorder: '#BFDBFE',

    // ── Accent: Saffron / Warm Amber (Action & Alert) ──
    secondary: '#D97706',
    secondaryDark: '#B45309',
    secondaryLight: '#F59E0B',
    secondarySurface: '#FEF3C7',   // Light saffron tint
    secondaryBorder: '#FDE68A',

    // ── Status Colors ──
    success: '#15803D',
    successLight: '#16A34A',
    successSurface: '#DCFCE7',
    warning: '#B45309',
    warningLight: '#D97706',
    warningSurface: '#FEF3C7',
    error: '#B91C1C',
    errorLight: '#DC2626',
    errorSurface: '#FEE2E2',
    info: '#0F2C59',
    infoLight: '#1E3A8A',
    infoSurface: '#EFF6FF',
    danger: '#B91C1C',

    // ── Surfaces ──
    background: '#F4F6F9',          // Base canvas — crisp civic light grey
    backgroundSecondary: '#EAEFE9', // Section layer
    surface: '#FFFFFF',             // Elevated white cards
    surfaceElevated: '#FFFFFF',
    surfaceContainerLow: '#F8FAFC', // Secondary content zones
    surfaceContainer: '#F1F5F9',    // Standard containers
    surfaceContainerHigh: '#E2E8F0',
    surfaceContainerHighest: '#CBD5E1',

    // ── Text ──
    textPrimary: '#0F172A',         // High contrast charcoal black
    textSecondary: '#475569',       // Clear dark slate
    textTertiary: '#64748B',        // Accessible grey
    textInverse: '#FFFFFF',
    textAccent: '#0F2C59',

    // ── Borders / Outline ──
    border: '#CBD5E1',
    borderLight: '#E2E8F0',
    borderFocus: '#1E3A8A',

    // ── Neutrals ──
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F8FAFC',
    gray100: '#F1F5F9',
    gray200: '#E2E8F0',
    gray300: '#CBD5E1',
    gray400: '#94A3B8',
    gray500: '#64748B',
    gray600: '#475569',
    gray700: '#334155',
    gray800: '#1E293B',
    gray900: '#0F172A',

    // ── Overlay ──
    overlay: 'rgba(15, 23, 42, 0.6)',
    overlayLight: 'rgba(15, 23, 42, 0.08)',
};

// Legacy dark colors (kept for backward compat with any remaining usage)
export const DARK_COLORS = {
    primary: '#90ABFF',
    primaryLight: '#B8CBFF',
    primaryDark: '#6B8FE0',
    primarySurface: '#1E3A6B',
    primaryBorder: '#4F7AC8',
    secondary: '#F59E0B',
    secondaryLight: '#FCD34D',
    secondaryDark: '#D97706',
    secondarySurface: '#451A03',
    accent: '#FCD34D',
    accentLight: '#FDE68A',
    accentDark: '#F59E0B',
    accentSurface: '#451A03',
    success: '#34D399',
    successLight: '#6EE7B7',
    successSurface: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#FCD34D',
    warningSurface: '#451A03',
    error: '#F87171',
    errorLight: '#FCA5A5',
    errorSurface: '#450A0A',
    info: '#60A5FA',
    infoLight: '#93C5FD',
    infoSurface: '#1E3A5F',
    danger: '#F87171',
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#0F172A',
    gray100: '#1E293B',
    gray200: '#334155',
    gray300: '#475569',
    gray400: '#64748B',
    gray500: '#94A3B8',
    gray600: '#CBD5E1',
    gray700: '#E2E8F0',
    gray800: '#F1F5F9',
    gray900: '#F8FAFC',
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    surface: '#1E293B',
    surfaceElevated: '#334155',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textTertiary: '#64748B',
    textInverse: '#0F172A',
    textAccent: '#818CF8',
    border: '#334155',
    borderLight: '#1E293B',
    borderFocus: '#6366F1',
    overlay: 'rgba(0, 0, 0, 0.6)',
    overlayLight: 'rgba(255, 255, 255, 0.06)',
};

export const getColors = (isDarkMode = false) => {
    return isDarkMode ? DARK_COLORS : COLORS;
};

// ─────────────────────────────────────
// Spacing — 4px base
// ─────────────────────────────────────

export const SPACING = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
    '4xl': 64,
};

// ─────────────────────────────────────
// Typography — DM Sans scale
// ─────────────────────────────────────

export const FONT_FAMILIES = {
    regular: 'Nunito-Regular',
    regularItalic: 'Nunito-RegularItalic',
    medium: 'Nunito-Medium',
    semibold: 'Nunito-SemiBold',
    bold: 'Nunito-Bold',
    boldItalic: 'Nunito-BoldItalic',
};

export const FONT_SIZES = {
    xxs: 10,
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
};

export const LINE_HEIGHTS = {
    xxs: 14,
    xs: 16,
    sm: 18,
    md: 22,
    lg: 24,
    xl: 28,
    xxl: 32,
    xxxl: 38,
    display: 44,
};

export const FONT_WEIGHTS = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
};

// ─────────────────────────────────────
// Border Radius
// ─────────────────────────────────────

export const BORDER_RADIUS = {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    xxxl: 24,
    full: 9999,
};

// ─────────────────────────────────────
// Shadows — "Ambient Navy" tonal shadows
// No harsh black shadows — use navy-tinted ambient light
// ─────────────────────────────────────

export const SHADOWS = {
    xs: Platform.select({
        ios: {
            shadowColor: '#1B3A6B',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
        },
        android: { elevation: 1 },
    }),
    sm: Platform.select({
        ios: {
            shadowColor: '#1B3A6B',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
        },
        android: { elevation: 2 },
    }),
    md: Platform.select({
        ios: {
            shadowColor: '#1B3A6B',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.10,
            shadowRadius: 12,
        },
        android: { elevation: 4 },
    }),
    lg: Platform.select({
        ios: {
            shadowColor: '#1B3A6B',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
        },
        android: { elevation: 8 },
    }),
    xl: Platform.select({
        ios: {
            shadowColor: '#1B3A6B',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.15,
            shadowRadius: 32,
        },
        android: { elevation: 12 },
    }),
    // Amber glow shadow for primary CTAs
    primary: Platform.select({
        ios: {
            shadowColor: '#F59E0B',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
        },
        android: { elevation: 6 },
    }),
    // Navy shadow for cards
    navy: Platform.select({
        ios: {
            shadowColor: '#002452',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
        },
        android: { elevation: 4 },
    }),
    success: Platform.select({
        ios: {
            shadowColor: '#059669',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
        },
        android: { elevation: 6 },
    }),
    error: Platform.select({
        ios: {
            shadowColor: '#BA1A1A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
        },
        android: { elevation: 6 },
    }),
};

// ─────────────────────────────────────
// Gradients
// ─────────────────────────────────────

export const GRADIENTS = {
    // Primary navy gradient for headers & CTAs
    primary: ['#002452', '#1B3A6B'],
    primaryLight: ['#1B3A6B', '#2C4E80'],
    // Amber gradient for CTA buttons
    amber: ['#D97706', '#F59E0B'],
    amberLight: ['#F59E0B', '#FCD34D'],
    // Secondary/teal
    secondary: ['#0D9488', '#14B8A6'],
    // Status gradients
    success: ['#059669', '#10B981'],
    danger: ['#BA1A1A', '#DC2626'],
    warning: ['#D97706', '#F59E0B'],
    // Dark navy hero
    hero: ['#002452', '#1B3A6B', '#2C4E80'],
    heroDark: ['#001535', '#002452', '#1B3A6B'],
    // Card shine
    cardShine: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0)'],
};

// ─────────────────────────────────────
// Dimensions
// ─────────────────────────────────────

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

// ─────────────────────────────────────
// Global Styles
// ─────────────────────────────────────

export const globalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    shadow: SHADOWS.md,
    // Card base — "Civic Sentinel" style
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.sm,
    },
    // Section title
    sectionTitle: {
        fontFamily: 'Nunito-Bold',
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        letterSpacing: -0.2,
    },
    // Badge/chip style
    badge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: BORDER_RADIUS.full,
        alignSelf: 'flex-start',
    },
    // Navy header style
    navyHeader: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xl,
        borderBottomLeftRadius: BORDER_RADIUS.xxxl,
        borderBottomRightRadius: BORDER_RADIUS.xxxl,
    },
});
