/**
 * Traffic Eye — DM Sans Font System
 * Centralised font loader & font-family constants
 *
 * Usage:
 *   1. Wrap your root with <FontProvider> (or call useFonts at root)
 *   2. Import FONTS wherever you need fontFamily values
 */

import {
    DM_Sans_400Regular,
    DM_Sans_400Regular_Italic,
    DM_Sans_500Medium,
    DM_Sans_600SemiBold,
    DM_Sans_700Bold,
    DM_Sans_700Bold_Italic,
    useDMSans_400Regular,
} from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';

/**
 * Load all DM Sans weights.
 * Call this hook once in your root component (App.js or similar).
 *
 * @returns {{ fontsLoaded: boolean, fontError: Error|null }}
 */
export function useDMSansFonts() {
    const [fontsLoaded, fontError] = useFonts({
        'DMSans-Regular': DM_Sans_400Regular,
        'DMSans-RegularItalic': DM_Sans_400Regular_Italic,
        'DMSans-Medium': DM_Sans_500Medium,
        'DMSans-SemiBold': DM_Sans_600SemiBold,
        'DMSans-Bold': DM_Sans_700Bold,
        'DMSans-BoldItalic': DM_Sans_700Bold_Italic,
    });
    return { fontsLoaded, fontError };
}

/**
 * Font family constants — use these instead of inline fontFamily strings.
 *
 * Hierarchy:
 *   FONTS.bold      → Headings (H1, screen titles)             700
 *   FONTS.semibold  → Sub-headings, card titles, section heads  600
 *   FONTS.medium    → Labels, chips, captions, nav items        500
 *   FONTS.regular   → Body text, descriptions, placeholders     400
 *
 * Buttons always use FONTS.semibold with slightly increased letterSpacing (0.3).
 */
export const FONTS = {
    regular: 'DMSans-Regular',
    regularItalic: 'DMSans-RegularItalic',
    medium: 'DMSans-Medium',
    semibold: 'DMSans-SemiBold',
    bold: 'DMSans-Bold',
    boldItalic: 'DMSans-BoldItalic',
};

/**
 * Convenience text-style presets — spread these into StyleSheet.create() objects.
 *
 * Example:
 *   import { TEXT_STYLES } from './fonts';
 *   StyleSheet.create({ title: { ...TEXT_STYLES.h1, color: COLORS.textPrimary } })
 */
export const TEXT_STYLES = {
    // ── Display / Hero ──
    display: {
        fontFamily: 'DMSans-Bold',
        fontSize: 36,
        letterSpacing: -0.5,
        lineHeight: 44,
    },
    // ── Headings ──
    h1: {
        fontFamily: 'DMSans-Bold',
        fontSize: 28,
        letterSpacing: -0.3,
        lineHeight: 36,
    },
    h2: {
        fontFamily: 'DMSans-Bold',
        fontSize: 24,
        letterSpacing: -0.2,
        lineHeight: 32,
    },
    h3: {
        fontFamily: 'DMSans-SemiBold',
        fontSize: 20,
        letterSpacing: -0.1,
        lineHeight: 28,
    },
    h4: {
        fontFamily: 'DMSans-SemiBold',
        fontSize: 17,
        letterSpacing: 0,
        lineHeight: 24,
    },
    // ── Body ──
    bodyLg: {
        fontFamily: 'DMSans-Regular',
        fontSize: 16,
        letterSpacing: 0,
        lineHeight: 26,
    },
    body: {
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        letterSpacing: 0,
        lineHeight: 24,
    },
    bodySm: {
        fontFamily: 'DMSans-Regular',
        fontSize: 13,
        letterSpacing: 0,
        lineHeight: 20,
    },
    // ── Labels / Captions ──
    labelLg: {
        fontFamily: 'DMSans-Medium',
        fontSize: 13,
        letterSpacing: 0.3,
        lineHeight: 18,
    },
    label: {
        fontFamily: 'DMSans-Medium',
        fontSize: 12,
        letterSpacing: 0.4,
        lineHeight: 16,
    },
    caption: {
        fontFamily: 'DMSans-Medium',
        fontSize: 11,
        letterSpacing: 0.5,
        lineHeight: 15,
    },
    // ── Buttons ──
    button: {
        fontFamily: 'DMSans-SemiBold',
        fontSize: 15,
        letterSpacing: 0.3,
    },
    buttonSm: {
        fontFamily: 'DMSans-SemiBold',
        fontSize: 13,
        letterSpacing: 0.3,
    },
    buttonLg: {
        fontFamily: 'DMSans-SemiBold',
        fontSize: 17,
        letterSpacing: 0.3,
    },
    // ── Overline / Tag ──
    overline: {
        fontFamily: 'DMSans-Medium',
        fontSize: 10,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        lineHeight: 14,
    },
};
