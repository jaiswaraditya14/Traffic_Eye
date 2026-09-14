import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../utils/theme';
import useReducedMotion from '../../hooks/useReducedMotion';
import AnimatedCounter from './AnimatedCounter';

/** Segmented ring: native Views only, with a numeric equivalent for accessibility. */
export default function ProgressRing({ value = 0, color = COLORS.secondary, label = 'Confidence', count, trigger }) {
    const target = Math.max(0, Math.min(1, Number(value) || 0));
    const reduced = useReducedMotion();
    const animated = useRef(new Animated.Value(target)).current;
    const [progress, setProgress] = useState(target);
    useEffect(() => {
        animated.stopAnimation();
        if (reduced) { setProgress(target); return undefined; }
        animated.setValue(0);
        const listener = animated.addListener(({ value: next }) => setProgress(next));
        const animation = Animated.timing(animated, { toValue: target, duration: 700, useNativeDriver: false });
        animation.start();
        return () => { animation.stop(); animated.removeListener(listener); };
    }, [animated, target, reduced, trigger]);
    return (
        <View style={styles.wrapper} accessible accessibilityLabel={label + ': ' + (count ?? Math.round(target * 100) + '%')}>
            <View style={styles.ring} importantForAccessibility="no-hide-descendants">
                {Array.from({ length: 24 }, (_, i) => {
                    const angle = i * Math.PI / 12 - Math.PI / 2;
                    return <View key={i} style={[styles.dot, { left: 36 + Math.cos(angle) * 34, top: 36 + Math.sin(angle) * 34, backgroundColor: progress >= (i + 1) / 24 ? color : COLORS.borderLight }]} />;
                })}
                <Text style={[TYPOGRAPHY.label, { color }]}>{Math.round(target * 100)}%</Text>
            </View>
            {count != null && <AnimatedCounter to={count} trigger={trigger} style={styles.count} />}
            <Text style={styles.label}>{label}</Text>
        </View>
    );
}
const styles = StyleSheet.create({
    wrapper: { alignItems: 'center', gap: SPACING.xs, flexShrink: 1 },
    ring: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
    dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
    count: { ...TYPOGRAPHY.h2, color: COLORS.text },
    label: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center' },
});
