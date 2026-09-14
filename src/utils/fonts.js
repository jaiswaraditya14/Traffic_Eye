/**
 * Traffic Eye — Font System
 * Centralised font loader & font-family constants.
 *
 * Loads two families:
 *   • Nunito   — the app's established body/UI voice (used across all screens).
 *   • DM Sans  — the design-system display/heading voice backing theme
 *                TYPOGRAPHY presets. Loaded here so shared/new components can
 *                use DM Sans without any screen needing a separate loader.
 */

// Import weight-specific entry points. Importing either package root registers
// every bundled weight with Metro, adding more than 2 MB of unused font assets.
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { DMSans_800ExtraBold } from '@expo-google-fonts/dm-sans/800ExtraBold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_400Regular_Italic } from '@expo-google-fonts/nunito/400Regular_Italic';
import { Nunito_500Medium } from '@expo-google-fonts/nunito/500Medium';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';

/**
 * Load all Nunito + DM Sans weights used by the app.
 * (Name kept as `useDMSansFonts` for backward compatibility with App.js.)
 */
export function useDMSansFonts() {
    const [fontsLoaded, fontError] = useFonts({
        // Nunito (body / existing screens)
        'Nunito-Regular': Nunito_400Regular,
        'Nunito-RegularItalic': Nunito_400Regular_Italic,
        'Nunito-Medium': Nunito_500Medium,
        'Nunito-SemiBold': Nunito_600SemiBold,
        'Nunito-Bold': Nunito_700Bold,
        'Nunito-ExtraBold': Nunito_800ExtraBold,
        // DM Sans (display / design-system TYPOGRAPHY presets)
        'DMSans-Regular': DMSans_400Regular,
        'DMSans-Medium': DMSans_500Medium,
        'DMSans-SemiBold': DMSans_600SemiBold,
        'DMSans-Bold': DMSans_700Bold,
        'DMSans-ExtraBold': DMSans_800ExtraBold,
    });
    return { fontsLoaded, fontError };
}

/**
 * Nunito family constants (body / existing screens).
 */
export const FONTS = {
    regular: 'Nunito-Regular',
    regularItalic: 'Nunito-RegularItalic',
    medium: 'Nunito-Medium',
    semibold: 'Nunito-SemiBold',
    bold: 'Nunito-Bold',
    extraBold: 'Nunito-ExtraBold',
};

/**
 * DM Sans family constants (design-system display voice).
 */
export const DM_FONTS = {
    regular: 'DMSans-Regular',
    medium: 'DMSans-Medium',
    semibold: 'DMSans-SemiBold',
    bold: 'DMSans-Bold',
    extraBold: 'DMSans-ExtraBold',
};

export const TEXT_STYLES = {
    display: {
        fontFamily: 'Nunito-ExtraBold',
        fontSize: 36,
        letterSpacing: -0.5,
        lineHeight: 44,
    },
    h1: {
        fontFamily: 'Nunito-Bold',
        fontSize: 28,
        letterSpacing: -0.3,
        lineHeight: 36,
    },
    h2: {
        fontFamily: 'Nunito-Bold',
        fontSize: 24,
        letterSpacing: -0.2,
        lineHeight: 32,
    },
    h3: {
        fontFamily: 'Nunito-SemiBold',
        fontSize: 20,
        letterSpacing: -0.1,
        lineHeight: 28,
    },
    bodyLg: {
        fontFamily: 'Nunito-Regular',
        fontSize: 16,
        letterSpacing: 0,
        lineHeight: 26,
    },
    body: {
        fontFamily: 'Nunito-Regular',
        fontSize: 15,
        letterSpacing: 0,
        lineHeight: 24,
    },
    labelLg: {
        fontFamily: 'Nunito-Medium',
        fontSize: 13,
        letterSpacing: 0.3,
        lineHeight: 18,
    },
    button: {
        fontFamily: 'Nunito-SemiBold',
        fontSize: 15,
        letterSpacing: 0.3,
    },
};
