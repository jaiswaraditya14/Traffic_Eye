import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive scaling utility
const guidelineBaseWidth = 375;
const scale = (size) => (width / guidelineBaseWidth) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

// Light Mode Colors — refined modern palette
const LIGHT_COLORS = {
    // Primary - Police Navy Blue (Trust, Standard Indian State Apps)
    primary: '#1A365D',
    primaryLight: '#2B6CB0',
    primaryDark: '#000000',
    primarySoft: '#EBF8FF',

    // Secondary - Olive/Forest Green
    secondary: '#2F855A',
    secondaryLight: '#48BB78',
    secondaryDark: '#276749',
    secondarySoft: '#F0FFF4',

    // Accent - Traffic Saffron / Indian Orange
    accent: '#DD6B20',
    accentLight: '#ED8936',
    accentDark: '#C05621',
    accentSoft: '#FFFAF0',

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
    background: '#F7F7F7',
    backgroundSecondary: '#EAEAEA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',

    // Text
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    textInverse: '#FFFFFF',

    // Borders
    border: '#E2E8F0',
    borderLight: '#F1F5F9',

    // Overlay
    overlay: 'rgba(15, 23, 42, 0.4)',
    overlayLight: 'rgba(15, 23, 42, 0.08)',
};

const DARK_COLORS = {
    primary: '#4F46E5',
    primaryLight: '#818CF8',
    primaryDark: '#3730A3',
    primarySoft: '#312E81',

    secondary: '#10B981',
    secondaryLight: '#34D399',
    secondaryDark: '#059669',
    secondarySoft: '#064E3B',

    accent: '#F59E0B',
    accentLight: '#FBBF24',
    accentDark: '#D97706',
    accentSoft: '#78350F',

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
    gray50: '#1E293B',
    gray100: '#334155',
    gray200: '#475569',
    gray300: '#64748B',
    gray400: '#94A3B8',
    gray500: '#CBD5E1',
    gray600: '#E2E8F0',
    gray700: '#F1F5F9',
    gray800: '#F8FAFC',
    gray900: '#FFFFFF',

    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    surface: '#1E293B',
    surfaceElevated: '#334155',

    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    textInverse: '#0F172A',

    border: '#334155',
    borderLight: '#1E293B',

    overlay: 'rgba(0, 0, 0, 0.6)',
    overlayLight: 'rgba(255, 255, 255, 0.05)',
};

export const getColors = (isDarkMode = false) => {
    return isDarkMode ? DARK_COLORS : LIGHT_COLORS;
};

export const COLORS = LIGHT_COLORS;

// ─────────────────────────────────────
// Spacing — 4px base, refined scale
// ─────────────────────────────────────

export const SPACING = {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(16),
    lg: moderateScale(24),
    xl: moderateScale(32),
    xxl: moderateScale(48),
};

// ─────────────────────────────────────
// Typography — Inter-inspired scale
// ─────────────────────────────────────

export const FONT_SIZES = {
    xs: moderateScale(12),
    sm: moderateScale(14),
    md: moderateScale(16),
    lg: moderateScale(18),
    xl: moderateScale(20),
    xxl: moderateScale(24),
    xxxl: moderateScale(32),
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
    sm: 8,
    md: 12,
    lg: 20,
    xl: 24,
    xxl: 32,
    full: 9999,
};

// ─────────────────────────────────────
// Shadows — Platform-aware, premium
// ─────────────────────────────────────

export const SHADOWS = {
    sm: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 2,
    },
    md: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    xl: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.16,
        shadowRadius: 24,
        elevation: 12,
    },
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

export const ANIMATION = {
    fast: 150,
    normal: 300,
    slow: 500,
    spring: {
        type: 'spring',
        damping: 20,
        stiffness: 300,
    },
};

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
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.md,
    },
});
