import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

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
        <TouchableOpacity
            style={buttonStyles}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : COLORS.primary} />
            ) : (
                <Text style={textStyles}>{children}</Text>
            )}
        </TouchableOpacity>
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
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    danger: {
        backgroundColor: COLORS.error,
    },
    success: {
        backgroundColor: COLORS.success,
    },

    // Sizes
    sm: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
    },
    md: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
    },
    lg: {
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xl,
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
    },

    primaryText: {
        color: '#FFFFFF',
    },
    secondaryText: {
        color: '#111827',
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
