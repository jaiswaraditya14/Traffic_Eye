import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../utils/theme';
import useReducedMotion from '../../hooks/useReducedMotion';

export default function StepIndicator({ labels, active = 0, vertical = false, complete = false }) {
    const reduced = useReducedMotion();
    const progress = useRef(new Animated.Value(active)).current;
    useEffect(() => {
        progress.stopAnimation();
        const animation = Animated.timing(progress, { toValue: active, duration: reduced ? 0 : 250, useNativeDriver: false });
        animation.start();
        return () => animation.stop();
    }, [active, progress, reduced]);
    return <View style={[styles.steps, vertical && styles.vertical]}>
        {labels.map((item, index) => {
            const label = typeof item === 'string' ? item : item.label;
            const done = index < active || complete;
            return <View key={label} style={vertical ? styles.verticalRow : styles.step} accessible accessibilityLabel={label + ': ' + (done ? 'complete' : index === active ? 'current' : 'upcoming')}>
                <View style={[styles.node, (done || index === active) && styles.active]}>
                    {typeof item === 'string' && !done ? <Text style={{ color: index === active ? COLORS.white : COLORS.textMuted }}>{index + 1}</Text> : <Ionicons name={done ? 'checkmark' : item.icon || 'ellipse-outline'} size={17} color={done || index === active ? COLORS.white : COLORS.textMuted} />}
                </View>
                <Text style={[styles.label, vertical && styles.verticalLabel]}>{label}</Text>
                {!vertical && index < labels.length - 1 && <View style={styles.track}>
                    <Animated.View style={[styles.fill, { width: progress.interpolate({ inputRange: [index, index + 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }]} />
                </View>}
            </View>;
        })}
    </View>;
}
const styles = StyleSheet.create({
    steps: { flexDirection: 'row', paddingVertical: SPACING.lg, gap: SPACING.sm },
    vertical: { flexDirection: 'column', gap: SPACING.md },
    step: { flex: 1, alignItems: 'center' }, verticalRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    node: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
    active: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
    label: { ...TYPOGRAPHY.caption, color: COLORS.text, textAlign: 'center', marginTop: SPACING.xs },
    verticalLabel: { ...TYPOGRAPHY.body, color: COLORS.white, textAlign: 'left', flex: 1, marginTop: 0 },
    track: { position: 'absolute', height: 2, backgroundColor: COLORS.borderLight, top: 17, left: '75%', width: '50%' },
    fill: { height: 2, backgroundColor: COLORS.secondary },
});
