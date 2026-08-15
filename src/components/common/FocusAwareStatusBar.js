import React, { useEffect } from 'react';
import { StatusBar as RNStatusBar, View, Platform, StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * FocusAwareStatusBar
 * 
 * Guarantees that the status bar style (light-content vs dark-content) and
 * background fill are active ONLY when the current screen is focused in React Navigation.
 * 
 * Prevents status bar conflicts, dissolving, or flickering during page transitions and scroll.
 */
export const FocusAwareStatusBar = ({
    barStyle = 'light-content',
    style, // support Expo-style 'light' | 'dark'
    backgroundColor = 'transparent',
    translucent = true,
    statusBgColor,
    showTopFill = true,
}) => {
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();

    // Map style prop if provided
    let finalBarStyle = barStyle;
    if (style === 'light') finalBarStyle = 'light-content';
    if (style === 'dark') finalBarStyle = 'dark-content';

    const topInset = insets.top > 0
        ? insets.top
        : Platform.OS === 'android'
            ? (RNStatusBar.currentHeight || 24)
            : 44;

    const defaultFillColor = finalBarStyle === 'light-content' ? '#002452' : '#F8F9FB';
    const fillBg = statusBgColor || defaultFillColor;

    useEffect(() => {
        if (isFocused) {
            RNStatusBar.setBarStyle(finalBarStyle, true);
            if (Platform.OS === 'android') {
                RNStatusBar.setTranslucent(translucent);
                RNStatusBar.setBackgroundColor(backgroundColor, true);
            }
        }
    }, [isFocused, finalBarStyle, backgroundColor, translucent]);

    if (!isFocused) return null;

    return (
        <>
            <RNStatusBar
                barStyle={finalBarStyle}
                backgroundColor={backgroundColor}
                translucent={translucent}
                animated={true}
            />
            {showTopFill && fillBg && (
                <View
                    pointerEvents="none"
                    style={[
                        styles.topFill,
                        {
                            height: topInset,
                            backgroundColor: fillBg,
                        },
                    ]}
                />
            )}
        </>
    );
};

export default FocusAwareStatusBar;

const styles = StyleSheet.create({
    topFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
    },
});
