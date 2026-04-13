import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, FONT_FAMILIES, BORDER_RADIUS, SHADOWS } from '../../utils/theme';

export const Input = ({
    label,
    placeholder,
    value,
    onChangeText,
    error,
    secureTextEntry,
    keyboardType = 'default',
    multiline = false,
    numberOfLines = 1,
    style,
    inputStyle,
    helperText,
    required = false,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={[styles.container, style]}>
            {label && (
                <View style={styles.labelContainer}>
                    <Text style={[styles.label, error && styles.labelError]}>
                        {label}
                    </Text>
                    {required && <Text style={styles.required}>*</Text>}
                </View>
            )}
            <View style={[
                styles.inputWrapper,
                isFocused && styles.inputWrapperFocused,
                error && styles.inputWrapperError,
            ]}>
                <TextInput
                    style={[
                        styles.input,
                        multiline && styles.multiline,
                        inputStyle,
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textTertiary}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    selectionColor={COLORS.primary}
                    {...props}
                />
            </View>
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>⚠ {error}</Text>
                </View>
            )}
            {helperText && !error && (
                <Text style={styles.helperText}>{helperText}</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.lg,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    label: {
        fontFamily: FONT_FAMILIES.medium,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        letterSpacing: 0.3,
    },
    labelError: {
        color: COLORS.error,
    },
    required: {
        color: COLORS.error,
        fontSize: FONT_SIZES.sm,
        marginLeft: SPACING.xxs,
    },
    inputWrapper: {
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
        overflow: 'hidden',
    },
    inputWrapperFocused: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.white,
        ...SHADOWS.xs,
    },
    inputWrapperError: {
        borderColor: COLORS.error,
        backgroundColor: COLORS.errorSurface,
    },
    input: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md + 2,
        fontFamily: FONT_FAMILIES.regular,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    multiline: {
        minHeight: 100,
        textAlignVertical: 'top',
        paddingTop: SPACING.md,
    },
    errorContainer: {
        marginTop: SPACING.xs,
        paddingHorizontal: SPACING.xs,
    },
    errorText: {
        fontFamily: FONT_FAMILIES.medium,
        color: COLORS.error,
        fontSize: FONT_SIZES.xs,
    },
    helperText: {
        fontFamily: FONT_FAMILIES.regular,
        color: COLORS.textTertiary,
        fontSize: FONT_SIZES.xs,
        marginTop: SPACING.xs,
        paddingHorizontal: SPACING.xs,
    },
});
