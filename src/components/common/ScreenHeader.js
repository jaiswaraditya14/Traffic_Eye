/**
 * ScreenHeader.js — Shared header component for all detail/sub-screens
 *
 * Eliminates 30+ duplicate header implementations across the app.
 * Consistent: LinearGradient navy background, back button, title, subtitle, optional right element.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar } from './FocusAwareStatusBar';

const HEADER_COLORS = ['#0A1E3F', '#0F2C59'];

/**
 * @param {object}   props
 * @param {function} props.onBack        - Called when back button pressed. If absent, back button hidden.
 * @param {string}   props.title         - Bold headline text
 * @param {string}   [props.subtitle]    - Smaller muted subtitle below title
 * @param {ReactNode}[props.right]       - Optional element rendered on the right side
 * @param {string[]} [props.colors]      - Override gradient colours (default: navy)
 * @param {string}   [props.statusStyle] - 'light-content' | 'dark-content' (default: light)
 */
export default function ScreenHeader({
    onBack,
    title,
    subtitle,
    right,
    colors = HEADER_COLORS,
    statusStyle = 'light-content',
}) {
    return (
        <>
            <FocusAwareStatusBar barStyle={statusStyle} statusBgColor={colors[0]} />
            <LinearGradient colors={colors} style={styles.header}>
                <SafeAreaView style={styles.safe} edges={['top']}>
                    <View style={styles.row}>
                        {/* Back button */}
                        {onBack ? (
                            <TouchableOpacity
                                style={styles.backBtn}
                                onPress={onBack}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.placeholder} />
                        )}

                        {/* Title block */}
                        <View style={styles.titleBlock}>
                            <Text style={styles.title} numberOfLines={1}>{title}</Text>
                            {!!subtitle && (
                                <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
                            )}
                        </View>

                        {/* Right element */}
                        {right ? (
                            <View style={styles.rightSlot}>{right}</View>
                        ) : (
                            <View style={styles.placeholder} />
                        )}
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    safe: {},
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 20,
        gap: 12,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    placeholder: {
        width: 38,
        flexShrink: 0,
    },
    titleBlock: {
        flex: 1,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontFamily: 'Nunito-Bold',
        color: '#FFFFFF',
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 11,
        fontFamily: 'Nunito-Medium',
        color: 'rgba(255,255,255,0.65)',
        marginTop: 2,
        textAlign: 'center',
    },
    rightSlot: {
        flexShrink: 0,
        alignItems: 'flex-end',
    },
});
