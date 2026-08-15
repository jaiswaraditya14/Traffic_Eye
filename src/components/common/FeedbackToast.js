import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    const isShowing  = useRef(false);

    const HIDE_Y = -140; // safely above any screen

    const variantConfig = {
        success: { icon: 'checkmark-circle',  color: COLORS.success, bg: COLORS.successSurface },
        error:   { icon: 'close-circle',      color: COLORS.error,   bg: COLORS.errorSurface   },
        info:    { icon: 'information-circle', color: COLORS.info,   bg: COLORS.infoSurface    },
        warning: { icon: 'warning',            color: COLORS.warning, bg: COLORS.warningSurface },
    };

    const config = variantConfig[variant] || variantConfig.success;

    useEffect(() => {
        clearTimeout(timerRef.current);

        if (visible) {
            isShowing.current = true;

            // Reset to hidden position before animating in — prevents stale-position flash
            translateY.setValue(HIDE_Y);
            opacity.setValue(0);

            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 22,
                    stiffness: 260,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start();

            if (onDismiss) {
                timerRef.current = setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(translateY, {
                            toValue: HIDE_Y,
                            duration: 280,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacity, {
                            toValue: 0,
                            duration: 220,
                            useNativeDriver: true,
                        }),
                    ]).start(({ finished }) => {
                        if (finished) {
                            isShowing.current = false;
                            onDismiss();
                        }
                    });
                }, duration);
            }
        } else {
            // Animate out if currently visible, otherwise snap to hidden
            if (isShowing.current) {
                isShowing.current = false;
                Animated.parallel([
                    Animated.timing(translateY, {
                        toValue: HIDE_Y,
                        duration: 280,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 220,
                        useNativeDriver: true,
                    }),
                ]).start(() => onDismiss?.());
            } else {
                translateY.setValue(HIDE_Y);
                opacity.setValue(0);
            }
        }

        return () => clearTimeout(timerRef.current);
    }, [visible]);

    // Safe-area top: prefer insets, fall back to StatusBar height on Android
    const safeTop = insets.top > 0
        ? insets.top
        : Platform.OS === 'android'
            ? (StatusBar.currentHeight ?? 24)
            : 44;

    return (
        <Animated.View
            pointerEvents={visible ? 'auto' : 'none'}
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
                <Text style={[styles.message, { color: config.color }]} numberOfLines={2}>
                    {message}
                </Text>
                {!!subtitle && (
                    <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
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
