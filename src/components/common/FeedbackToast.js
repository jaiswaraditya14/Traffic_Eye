import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useReducedMotion from '../../hooks/useReducedMotion';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../utils/theme';

/**
 * FeedbackToast — slide-down toast notification overlay.
 *
 * Props:
 * - visible:   boolean          — show/hide
 * - message:   string           — primary text
 * - subtitle:  string?          — secondary text (optional)
 * - variant:   'success' | 'error' | 'info' | 'warning'  (default: 'success')
 * - onDismiss: () => void       — called after auto-dismiss animation completes
 * - duration:  number           — auto-dismiss delay in ms (default: 3000)
 *
 * Fix notes:
 *  • Never returns null — keeps the component mounted so hide animation always runs.
 *  • Uses pointerEvents="none" when hidden so it never blocks touches underneath.
 *  • Safe-area-aware top position via useSafeAreaInsets.
 *  • Resets animation to hidden start position before each show to prevent
 *    stale-value flashes when re-shown quickly.
 */
export const FeedbackToast = ({
    visible,
    message,
    subtitle,
    variant = 'success',
    onDismiss,
    duration = 3000,
}) => {
    const insets     = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(-140)).current;
    const opacity    = useRef(new Animated.Value(0)).current;
    const timerRef   = useRef(null);
    const dismissRef = useRef(onDismiss);
    dismissRef.current = onDismiss;
    const reduced = useReducedMotion();

    const HIDE_Y = -140; // safely above any screen

    const variantConfig = {
        success: { icon: 'checkmark-circle',  color: COLORS.success, bg: COLORS.successSurface },
        error:   { icon: 'close-circle',      color: COLORS.error,   bg: COLORS.errorSurface   },
        info:    { icon: 'information-circle', color: COLORS.info,   bg: COLORS.infoSurface    },
        warning: { icon: 'warning',            color: COLORS.warning, bg: COLORS.warningSurface },
    };

    const config = variantConfig[variant] || variantConfig.success;

    useEffect(() => {
        let active = true;
        translateY.stopAnimation();
        opacity.stopAnimation();
        const animation = Animated.parallel([
            Animated.timing(translateY, { toValue: visible ? 0 : HIDE_Y, duration: reduced ? 0 : 220, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: reduced ? 0 : 220, useNativeDriver: true }),
        ]);
        animation.start();
        if (visible) timerRef.current = setTimeout(() => { if (active) dismissRef.current?.(); }, duration);
        return () => { active = false; clearTimeout(timerRef.current); animation.stop(); };
    }, [visible, message, subtitle, duration, reduced, translateY, opacity]);

    // Safe-area top: prefer insets, fall back to StatusBar height on Android
    const safeTop = insets.top > 0
        ? insets.top
        : Platform.OS === 'android'
            ? (StatusBar.currentHeight ?? 24)
            : 44;

    return (
        <Animated.View
            pointerEvents="none"
            accessibilityLiveRegion="polite"
            accessibilityElementsHidden={!visible}
            importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
            style={[
                styles.toast,
                {
                    backgroundColor: config.bg,
                    top: safeTop + 8,
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
        >
            <View style={[styles.iconWrapper, { backgroundColor: `${config.color}22` }]}>
                <Ionicons name={config.icon} size={22} color={config.color} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.message, { color: config.color }]}>
                    {message}
                </Text>
                {!!subtitle && (
                    <Text style={styles.subtitle}>{subtitle}</Text>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        left: SPACING.lg,
        right: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        zIndex: 9999,
        elevation: 20,
        ...SHADOWS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
        flexShrink: 0,
    },
    textContainer: {
        flex: 1,
    },
    message: {
        fontSize: FONT_SIZES.md,
        fontFamily: 'Nunito-SemiBold',
        letterSpacing: 0.1,
    },
    subtitle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        fontFamily: 'Nunito-Regular',
        marginTop: 2,
        lineHeight: 17,
    },
});
