/* eslint-disable react-native/no-unused-styles */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, FONT_FAMILIES, BORDER_RADIUS, SHADOWS, GRADIENTS } from '../../utils/theme';

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
    const isPrimary = variant === 'primary';
    const isGradient = isPrimary && !disabled;

    const buttonStyles = [
        styles.button,
        styles[`size_${size}`],
        !isGradient && styles[variant],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
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
                    color={isPrimary || variant === 'danger' || variant === 'success' || variant === 'amber' ? '#FFFFFF' : COLORS.primary}
                    size="small"
                />
            );
        }

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
                activeOpacity={0.85}
                style={[fullWidth && styles.fullWidth, style]}
            >
                <LinearGradient
                    colors={['#0F2C59', '#1E3A8A']}
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
        <TouchableOpacity
            style={buttonStyles}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {renderContent()}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    gradientInner: {
        borderRadius: BORDER_RADIUS.md,
    },

    // ── Variants ──
    primary: {
        backgroundColor: COLORS.primary,
    },
    amber: {
        backgroundColor: COLORS.secondary,
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
        backgroundColor: COLORS.success,
    },
    soft: {
        backgroundColor: COLORS.primarySurface,
        borderWidth: 1,
        borderColor: COLORS.primaryBorder,
    },

    // ── Sizes ──
    size_sm: {
        paddingVertical: SPACING.xs + 2,
        paddingHorizontal: SPACING.md,
        minHeight: 38,
    },
    size_md: {
        paddingVertical: SPACING.sm + 4,
        paddingHorizontal: SPACING.xl,
        minHeight: 48,
    },
    size_lg: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xxl,
        minHeight: 54,
    },

    fullWidth: {
        width: '100%',
    },

    disabled: {
        opacity: 0.5,
    },

    disabledText: {
        opacity: 0.8,
    },

    // ── Text styles ──
    text: {
        fontFamily: FONT_FAMILIES.semibold,
        letterSpacing: 0.2,
    },
    primaryText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZES.md,
    },
    amberText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZES.md,
    },
    secondaryText: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
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
