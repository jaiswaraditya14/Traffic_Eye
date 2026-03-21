import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// ─────────────────────────────────────────────
// Enterprise Color Palette — "Indigo Authority"
// ─────────────────────────────────────────────

const LIGHT_COLORS = {
    // Primary — Deep Indigo
    primary: '#4F46E5',
    primaryLight: '#6366F1',
    primaryDark: '#3730A3',
    primarySurface: '#EEF2FF',       // Very light indigo tint for surfaces
    primaryBorder: '#C7D2FE',

    // Secondary — Teal
    secondary: '#0D9488',
    secondaryLight: '#14B8A6',
    secondaryDark: '#0F766E',
    secondarySurface: '#F0FDFA',

    // Accent — Amber
    accent: '#F59E0B',
    accentLight: '#FBBF24',
    accentDark: '#D97706',
    accentSurface: '#FFFBEB',

    // Status
    success: '#059669',
    successLight: '#10B981',
    successSurface: '#ECFDF5',
    warning: '#D97706',
    warningLight: '#F59E0B',
    warningSurface: '#FFFBEB',
    error: '#DC2626',
    errorLight: '#EF4444',
    errorSurface: '#FEF2F2',
    info: '#2563EB',
    infoLight: '#3B82F6',
    infoSurface: '#EFF6FF',
    danger: '#DC2626',

    // Neutrals — Cool Gray
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

    // Background
    background: '#F8FAFC',
    backgroundSecondary: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',

    // Text
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    textInverse: '#FFFFFF',
    textAccent: '#4F46E5',

    // Borders
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderFocus: '#4F46E5',

    // Overlay
    overlay: 'rgba(15, 23, 42, 0.5)',
    overlayLight: 'rgba(15, 23, 42, 0.08)',
};

const DARK_COLORS = {
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    primarySurface: '#1E1B4B',
    primaryBorder: '#4338CA',

    secondary: '#14B8A6',
    secondaryLight: '#2DD4BF',
    secondaryDark: '#0D9488',
    secondarySurface: '#042F2E',

    accent: '#FBBF24',
    accentLight: '#FCD34D',
    accentDark: '#F59E0B',
    accentSurface: '#451A03',

    success: '#10B981',
    successLight: '#34D399',
    successSurface: '#064E3B',
    warning: '#F59E0B',
    warningLight: '#FBBF24',
    warningSurface: '#451A03',
    error: '#EF4444',
    errorLight: '#F87171',
    errorSurface: '#450A0A',
    info: '#3B82F6',
    infoLight: '#60A5FA',
    infoSurface: '#1E3A5F',
    danger: '#EF4444',

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
    return isDarkMode ? DARK_COLORS : LIGHT_COLORS;
};

export const COLORS = LIGHT_COLORS;

// ─────────────────────────────────────
// Spacing — 4px base, refined scale
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
// Typography — Inter-inspired scale
// ─────────────────────────────────────

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
    xxxl: 28,
    full: 9999,
};

// ─────────────────────────────────────
// Shadows — Platform-aware, premium
// ─────────────────────────────────────

export const SHADOWS = {
    xs: Platform.select({
        ios: {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 2,
        },
        android: { elevation: 1 },
    }),
    sm: Platform.select({
        ios: {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
        },
        android: { elevation: 2 },
    }),
    md: Platform.select({
        ios: {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
        },
        android: { elevation: 4 },
    }),
    lg: Platform.select({
        ios: {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
        },
        android: { elevation: 8 },
    }),
    xl: Platform.select({
        ios: {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.16,
            shadowRadius: 24,
        },
        android: { elevation: 12 },
    }),
    // Colored shadows for CTA buttons
    primary: Platform.select({
        ios: {
            shadowColor: '#4F46E5',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
        },
        android: { elevation: 6 },
    }),
    success: Platform.select({
        ios: {
            shadowColor: '#059669',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
        },
        android: { elevation: 6 },
    }),
    error: Platform.select({
        ios: {
            shadowColor: '#DC2626',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
        },
        android: { elevation: 6 },
    }),
};

// ─────────────────────────────────────
// Gradients — for LinearGradient usage
// ─────────────────────────────────────

export const GRADIENTS = {
    primary: ['#4F46E5', '#6366F1'],
    primaryDark: ['#3730A3', '#4F46E5'],
    secondary: ['#0D9488', '#14B8A6'],
    accent: ['#D97706', '#F59E0B'],
    success: ['#059669', '#10B981'],
    danger: ['#DC2626', '#EF4444'],
    warning: ['#D97706', '#F59E0B'],
    info: ['#2563EB', '#3B82F6'],
    dark: ['#0F172A', '#1E293B'],
    // Premium hero gradients
    heroIndigo: ['#312E81', '#4F46E5', '#6366F1'],
    heroDark: ['#0F172A', '#1E293B', '#334155'],
    cardShine: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0)'],
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
    // Card base style
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    // Section title
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        letterSpacing: -0.3,
    },
    // Badge style
    badge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: BORDER_RADIUS.full,
        alignSelf: 'flex-start',
    },
});
