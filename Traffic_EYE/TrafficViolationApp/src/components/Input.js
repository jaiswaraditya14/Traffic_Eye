import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../utils/theme';

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
    return (
        <View style={[styles.container, style]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    multiline && styles.multiline,
                    error && styles.inputError,
                    inputStyle,
                ]}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                multiline={multiline}
                numberOfLines={numberOfLines}
                {...props}
            />
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
        color: '#111827',
        marginBottom: SPACING.xs,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        fontSize: FONT_SIZES.md,
        color: '#111827',
        backgroundColor: '#FFFFFF',
    },
    multiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    inputError: {
        borderColor: COLORS.error,
    },
    errorText: {
        color: COLORS.error,
        fontSize: FONT_SIZES.xs,
        marginTop: SPACING.xs,
    },
});
