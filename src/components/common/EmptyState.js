/**
 * EmptyState.js — Shared empty state component
 *
 * Used across MyReports, Notifications, PendingQueue, VerifiedReports, etc.
 * Consistent icon + title + subtitle + optional CTA button.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * @param {string}    icon       - Ionicons name
 * @param {string}    title      - Bold headline
 * @param {string}    subtitle   - Muted body text
 * @param {string}    [ctaLabel] - If provided, renders a CTA button
 * @param {function}  [onCta]    - Called when CTA pressed
 * @param {string}    [iconColor]- Override icon colour
 */
export default function EmptyState({ icon, title, subtitle, ctaLabel, onCta, iconColor = '#CBD5E1' }) {
    return (
        <View style={styles.container}>
            <View style={styles.iconCircle}>
                <Ionicons name={icon} size={38} color={iconColor} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {!!ctaLabel && !!onCta && (
                <TouchableOpacity style={styles.cta} onPress={onCta} activeOpacity={0.8}>
                    <Text style={styles.ctaText}>{ctaLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingTop: 64,
        paddingHorizontal: 40,
        paddingBottom: 32,
    },
    iconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 17,
        fontFamily: 'Nunito-Bold',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        fontFamily: 'Nunito-Medium',
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    cta: {
        marginTop: 24,
        backgroundColor: '#0F2C59',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    ctaText: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: '#FFFFFF',
    },
});
