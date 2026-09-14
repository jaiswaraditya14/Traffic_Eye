import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, useWindowDimensions } from 'react-native';
import { COLORS } from '../../utils/theme';
import useReducedMotion from '../../hooks/useReducedMotion';

/** Decorative, non-interactive particles. Stable positions prevent render-time jumps. */
export default function Celebration({ sparkle = false }) {
    const reduced = useReducedMotion();
    const { width, height } = useWindowDimensions();
    const particles = useRef(Array.from({ length: sparkle ? 3 : 24 }, (_, index) => ({
        progress: new Animated.Value(0), x: ((index * 37 + 13) % 100) / 100, index,
    }))).current;
    useEffect(() => {
        if (reduced) return;
        const motions = particles.map(({ progress, index }) => {
            progress.setValue(0);
            const motion = sparkle ? Animated.loop(Animated.sequence([
                Animated.timing(progress, { toValue: 1, duration: 1200 + index * 200, useNativeDriver: true }),
                Animated.timing(progress, { toValue: 0, duration: 1200, useNativeDriver: true }),
            ])) : Animated.timing(progress, { toValue: 1, duration: 2400, delay: index * 45, useNativeDriver: true });
            motion.start(); return motion;
        });
        return () => motions.forEach(motion => motion.stop());
    }, [reduced, particles, sparkle]);
    if (reduced) return null;
    return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        {particles.map(({ progress, index, x }) => <Animated.View key={index} style={{
            position: 'absolute', left: sparkle ? `${20 + index * 30}%` : x * width, top: sparkle ? 40 + index * 28 : -20,
            width: sparkle ? 5 : 7, height: sparkle ? 5 : 9, borderRadius: index % 2 ? 8 : 1,
            backgroundColor: [COLORS.secondary, sparkle ? COLORS.white : COLORS.primary, COLORS.success][index % 3],
            opacity: progress.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: sparkle ? [0.2, 0.4, 0.8, 1] : [0, 1, 1, 0] }),
            transform: sparkle ? [] : [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '240deg'] }) }],
        }} />)}
    </View>;
}
