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
    icon,
    iconPosition = 'left',
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
        styles[`size_${size}`],
        !isGradient && styles[variant],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        isPrimary && !disabled && SHADOWS.primary,
        variant === 'danger' && !disabled && SHADOWS.error,
        variant === 'success' && !disabled && SHADOWS.success,
        style,
    ];

    const textStyles = [
        styles.text,
        styles[`${variant}Text`],
        styles[`${size}Text`],
        disabled && styles.disabledText,
        textStyle,
    ];

    const renderContent = () => {
        if (loading) {
            return (
                <ActivityIndicator
                    color={isPrimary || variant === 'danger' || variant === 'success' ? '#FFFFFF' : COLORS.primary}
                    size="small"
                />
            );
        }

        // If children is a string, render as Text; otherwise render as-is (for custom content like icons)
        if (typeof children === 'string') {
            return <Text style={textStyles}>{children}</Text>;
        }

        return children;
    };

    if (isGradient) {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled || loading}
                activeOpacity={0.8}
                style={[fullWidth && styles.fullWidth, isPrimary && !disabled && SHADOWS.primary, style]}
            >
                <LinearGradient
                    colors={GRADIENTS.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.button, styles[`size_${size}`], styles.gradientInner]}
                >
                    {renderContent()}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

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
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    gradientInner: {
        borderRadius: BORDER_RADIUS.lg,
    },

    // ── Variants ──
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
    soft: {
        backgroundColor: COLORS.primarySurface,
    },

    // ── Sizes ──
    size_sm: {
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
        opacity: 0.45,
    },

    disabledText: {
        opacity: 0.7,
    },

    // ── Text styles ──
    text: {
        fontWeight: FONT_WEIGHTS.semibold,
        letterSpacing: 0.3,
    },
    primaryText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZES.md,
    },
    secondaryText: {
        color: COLORS.textPrimary,
    },
    outlineText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.md,
    },
    ghostText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.md,
    },
    dangerText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZES.md,
    },
    successText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZES.md,
    },
    softText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.md,
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
