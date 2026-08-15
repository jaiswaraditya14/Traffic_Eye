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
        marginBottom: SPACING.md + 4,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    label: {
        fontFamily: FONT_FAMILIES.semibold,
        fontSize: FONT_SIZES.sm + 1,
        color: COLORS.textPrimary,
        letterSpacing: 0.1,
    },
    labelError: {
        color: COLORS.error,
    },
    required: {
        color: COLORS.error,
        fontSize: FONT_SIZES.sm + 1,
        marginLeft: 4,
        fontWeight: 'bold',
    },
    inputWrapper: {
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surface,
        overflow: 'hidden',
    },
    inputWrapperFocused: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.white,
        borderWidth: 2,
    },
    inputWrapperError: {
        borderColor: COLORS.error,
        backgroundColor: COLORS.errorSurface,
    },
    input: {
        paddingHorizontal: SPACING.md + 2,
        paddingVertical: SPACING.md,
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
        marginTop: 4,
        paddingHorizontal: 2,
    },
    errorText: {
        fontFamily: FONT_FAMILIES.semibold,
        color: COLORS.error,
        fontSize: FONT_SIZES.xs + 1,
    },
    helperText: {
        fontFamily: FONT_FAMILIES.regular,
        color: COLORS.textTertiary,
        fontSize: FONT_SIZES.xs + 1,
        marginTop: 4,
        paddingHorizontal: 2,
    },
});
