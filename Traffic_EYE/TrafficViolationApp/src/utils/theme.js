import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Light Mode Colors
const LIGHT_COLORS = {
    // Primary
    primary: '#2563EB',
    primaryLight: '#3B82F6',
    primaryDark: '#1E40AF',

    // Secondary
    secondary: '#10B981',
    secondaryLight: '#34D399',
    secondaryDark: '#059669',

    // Accent
    accent: '#F59E0B',
    accentLight: '#FBBF24',
    accentDark: '#D97706',

    // Status
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    danger: '#EF4444',

    // Neutrals
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',

    // Background
    background: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',

    // Text
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',
};

// Dark Mode Colors
const DARK_COLORS = {
    // Primary
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryDark: '#2563EB',

    // Secondary
    secondary: '#10B981',
    secondaryLight: '#34D399',
    secondaryDark: '#059669',

    // Accent
    accent: '#F59E0B',
    accentLight: '#FBBF24',
    accentDark: '#D97706',

    // Status
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    danger: '#EF4444',

    // Neutrals
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#1F2937',
    gray100: '#374151',
    gray200: '#4B5563',
    gray300: '#6B7280',
    gray400: '#9CA3AF',
    gray500: '#D1D5DB',
    gray600: '#E5E7EB',
    gray700: '#F3F4F6',
    gray800: '#F9FAFB',
    gray900: '#FFFFFF',

    // Background
    background: '#111827',
    backgroundSecondary: '#1F2937',

    // Text
    textPrimary: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',
    textInverse: '#111827',
};

// Function to get colors based on theme
export const getColors = (isDarkMode = false) => {
    return isDarkMode ? DARK_COLORS : LIGHT_COLORS;
};

// Default export for backward compatibility
export const COLORS = LIGHT_COLORS;

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const FONT_SIZES = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const FONT_WEIGHTS = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
};

export const BORDER_RADIUS = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
};

export const SHADOWS = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
};

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

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
});
