import React, { useState, useRef } from 'react';
import { TextInput, View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../utils/theme';

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
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const borderAnim = useRef(new Animated.Value(0)).current;

    const handleFocus = () => {
        setIsFocused(true);
        Animated.timing(borderAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const handleBlur = () => {
        setIsFocused(false);
        Animated.timing(borderAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [COLORS.border, COLORS.primary],
    });

    return (
        <View style={[styles.container, style]}>
            {label && <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>}
            <Animated.View style={[
                styles.inputWrapper,
                { borderColor: error ? COLORS.error : borderColor },
                isFocused && styles.inputWrapperFocused,
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
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...props}
                />
            </Animated.View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs + 2,
        fontWeight: FONT_WEIGHTS.medium,
    },
    labelFocused: {
        color: COLORS.primary,
    },
    inputWrapper: {
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
    },
    inputWrapperFocused: {
        backgroundColor: COLORS.primarySoft || '#EFF6FF',
    },
    input: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md - 2,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    multiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    errorText: {
        color: COLORS.error,
        fontSize: FONT_SIZES.xs,
        marginTop: SPACING.xs,
        fontWeight: FONT_WEIGHTS.medium,
    },
});
