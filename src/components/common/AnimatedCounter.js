import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';
import useReducedMotion from '../../hooks/useReducedMotion';

const integer = value => Math.round(value).toLocaleString();
export default function AnimatedCounter({ from = 0, to = 0, duration = 850, formatValue = integer, style, prefix = '', suffix = '', trigger }) {
    const reduced = useReducedMotion();
    const target = Number.isFinite(Number(to)) ? Number(to) : 0;
    const start = Number.isFinite(Number(from)) ? Number(from) : 0;
    const value = useRef(new Animated.Value(start)).current;
    const [display, setDisplay] = useState(target);
    useEffect(() => {
        value.stopAnimation();
        if (reduced) { value.setValue(target); setDisplay(target); return undefined; }
        setDisplay(start);
        value.setValue(start);
        const listener = value.addListener(({ value: next }) => setDisplay(next));
        const animation = Animated.timing(value, { toValue: target, duration: Math.max(0, duration), useNativeDriver: false });
        animation.start();
        return () => { animation.stop(); value.removeListener(listener); };
    }, [value, start, target, duration, trigger, reduced]);
    return <Text style={style} accessibilityLabel={prefix + formatValue(target) + suffix}>{prefix}{formatValue(display)}{suffix}</Text>;
}
