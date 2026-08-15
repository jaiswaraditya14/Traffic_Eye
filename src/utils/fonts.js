/**
 * Traffic Eye — Nunito Font System
 * Centralised font loader & font-family constants
 */

import {
    Nunito_400Regular,
    Nunito_400Regular_Italic,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';

/**
 * Load all Nunito weights.
 */
export function useDMSansFonts() { // Keeping name for compatibility, updating logic
    const [fontsLoaded, fontError] = useFonts({
        'Nunito-Regular': Nunito_400Regular,
        'Nunito-RegularItalic': Nunito_400Regular_Italic,
        'Nunito-Medium': Nunito_500Medium,
        'Nunito-SemiBold': Nunito_600SemiBold,
        'Nunito-Bold': Nunito_700Bold,
        'Nunito-ExtraBold': Nunito_800ExtraBold,
    });
    return { fontsLoaded, fontError };
}

/**
 * Font family constants.
 */
export const FONTS = {
    regular: 'Nunito-Regular',
    regularItalic: 'Nunito-RegularItalic',
    medium: 'Nunito-Medium',
    semibold: 'Nunito-SemiBold',
    bold: 'Nunito-Bold',
    extraBold: 'Nunito-ExtraBold',
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
