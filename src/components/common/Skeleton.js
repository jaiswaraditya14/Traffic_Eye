import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../../utils/theme';

/**
 * Reusable loading skeleton with shimmer animation.
 * Props:
 * - width: number | string (default '100%')
 * - height: number (default 16)
 * - borderRadius: number (default BORDER_RADIUS.md)
 * - style: additional styles
 */
export const Skeleton = ({ width = '100%', height = 16, borderRadius = BORDER_RADIUS.md, style }) => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                styles.skeleton,
                { width, height, borderRadius, opacity },
                style,
            ]}
        />
    );
};

/**
 * Card skeleton: avatar + lines
 */
export const CardSkeleton = ({ style }) => (
    <View style={[styles.card, style]}>
        <View style={styles.cardRow}>
            <Skeleton width={48} height={48} borderRadius={24} />
            <View style={styles.cardLines}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="40%" height={12} style={{ marginTop: SPACING.sm }} />
            </View>
        </View>
    </View>
);

/**
 * Stat skeleton
 */
export const StatSkeleton = ({ style }) => (
    <View style={[styles.statCard, style]}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <Skeleton width={32} height={20} style={{ marginTop: SPACING.sm }} />
        <Skeleton width={48} height={12} style={{ marginTop: SPACING.xs }} />
    </View>
);

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: COLORS.gray200,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.sm,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    cardLines: {
        flex: 1,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
});
