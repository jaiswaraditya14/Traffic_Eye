import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils/theme';

/**
 * Premium toast-style success feedback.
 * 
 * Props:
 * - visible: boolean
 * - message: string
 * - subtitle: string (optional)
 * - variant: 'success' | 'error' | 'info' | 'warning' (default 'success')
 * - onDismiss: () => void (optional, auto-dismiss after 3s)
 */
export const FeedbackToast = ({ visible, message, subtitle, variant = 'success', onDismiss, duration = 3000 }) => {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    const variantConfig = {
        success: { icon: 'checkmark-circle', color: COLORS.success, bg: COLORS.successSurface },
        error: { icon: 'close-circle', color: COLORS.error, bg: COLORS.errorSurface },
        info: { icon: 'information-circle', color: COLORS.info, bg: COLORS.infoSurface },
        warning: { icon: 'warning', color: COLORS.warning, bg: COLORS.warningSurface },
    };

    const config = variantConfig[variant] || variantConfig.success;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 10,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();

            if (onDismiss) {
                const timer = setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(translateY, {
                            toValue: -100,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacity, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                    ]).start(() => onDismiss());
                }, duration);
                return () => clearTimeout(timer);
            }
        } else {
            translateY.setValue(-100);
            opacity.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View style={[
            styles.toast,
            { backgroundColor: config.bg, transform: [{ translateY }], opacity },
        ]}>
            <View style={[styles.iconWrapper, { backgroundColor: `${config.color}20` }]}>
                <Ionicons name={config.icon} size={22} color={config.color} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.message, { color: config.color }]}>{message}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        top: 60,
        left: SPACING.lg,
        right: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        zIndex: 1000,
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
    },
    textContainer: {
        flex: 1,
    },
    message: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        letterSpacing: 0.1,
    },
    subtitle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
});
