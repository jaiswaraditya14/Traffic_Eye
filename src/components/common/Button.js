import React, { useRef } from 'react';
import { Animated, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, ANIMATION } from '../../utils/theme';

export const Button = ({
    children,
    onPress,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    disabled = false,
    loading = false,
    style,
    textStyle,
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const buttonStyles = [
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
    ];

    const textStyles = [
        styles.text,
        styles[`${variant}Text`],
        styles[`${size}Text`],
        textStyle,
    ];

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
                style={buttonStyles}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
            >
                {loading ? (
                    <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : COLORS.primary} />
                ) : typeof children === 'string' ? (
                    <Text style={textStyles}>{children}</Text>
                ) : (
                    children
                )}
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
    },

    // Variants
    primary: {
        backgroundColor: COLORS.primary,
    },
    secondary: {
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: COLORS.primary,
    },
    ghost: {
        backgroundColor: 'transparent',
        shadowColor: 'transparent',
        elevation: 0,
    },
    danger: {
        backgroundColor: COLORS.error,
    },
    success: {
        backgroundColor: COLORS.secondary,
    },

    // Sizes
    sm: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        minHeight: 36,
    },
    md: {
        paddingVertical: SPACING.md - 2,
        paddingHorizontal: SPACING.lg,
        minHeight: 48,
    },
    lg: {
        paddingVertical: SPACING.lg - 4,
        paddingHorizontal: SPACING.xl,
        minHeight: 56,
    },

    fullWidth: {
        width: '100%',
    },

    disabled: {
        opacity: 0.5,
    },

    // Text styles
    text: {
        fontWeight: FONT_WEIGHTS.semibold,
        letterSpacing: 0.3,
    },

    primaryText: {
        color: '#FFFFFF',
    },
    secondaryText: {
        color: COLORS.textPrimary,
    },
    outlineText: {
        color: COLORS.primary,
    },
    ghostText: {
        color: COLORS.primary,
    },
    dangerText: {
        color: '#FFFFFF',
    },
    successText: {
        color: '#FFFFFF',
    },

    smText: {
        fontSize: FONT_SIZES.sm,
    },
    mdText: {
        fontSize: FONT_SIZES.md,
    },
    lgText: {
        fontSize: FONT_SIZES.lg,
    },
});
