/**
 * PressableScale.js — press-to-scale wrapper
 *
 * Removes the repeated `Animated.spring(scale, { toValue: 0.96/1 })` press
 * choreography duplicated across screens (OnboardingCarousel, RoleSelection,
 * buttons, cards). Wrap any tappable element to get a consistent, spring-based
 * press feedback using the shared SPRINGS vocabulary.
 *
 *   <PressableScale onPress={submit} disabled={busy}>
 *       <View style={styles.button}><Text>Submit</Text></View>
 *   </PressableScale>
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable } from 'react-native';
import { SPRINGS } from '../../utils/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PressableScale({
    children,
    onPress,
    disabled = false,
    scaleTo = 0.96,
    style,
    hitSlop,
    accessibilityLabel,
    accessibilityRole = 'button',
    accessibilityHint,
    ...rest
}) {
    const scale = useRef(new Animated.Value(1)).current;
    const [reduceMotion, setReduceMotion] = useState(false);
    useEffect(() => {
        let active = true;
        AccessibilityInfo.isReduceMotionEnabled().then(value => {
            if (active) setReduceMotion(value);
        }).catch(() => {});
        const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
        return () => { active = false; listener.remove(); scale.stopAnimation(); };
    }, [scale]);
    useEffect(() => { if (disabled || reduceMotion) { scale.stopAnimation(); scale.setValue(1); } }, [disabled, reduceMotion, scale]);

    const animateTo = useCallback(
        (toValue) => {
            if (reduceMotion) return;
            Animated.spring(scale, {
                toValue,
                useNativeDriver: true,
                ...SPRINGS.snappy,
            }).start();
        },
        [scale, reduceMotion],
    );

    const handlePressIn = useCallback(() => {
        if (!disabled) animateTo(scaleTo);
    }, [animateTo, disabled, scaleTo]);

    const handlePressOut = useCallback(() => {
        animateTo(1);
    }, [animateTo, disabled]);

    return (
        <AnimatedPressable
            onPress={disabled ? undefined : onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            hitSlop={hitSlop}
            accessibilityRole={accessibilityRole}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled }}
            style={[style, { transform: [{ scale }] }]}
            {...rest}
        >
            {children}
        </AnimatedPressable>
    );
}
