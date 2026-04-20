import React, { useEffect, useRef, useCallback } from 'react';
import {
    Animated,
    View,
    Text,
    StyleSheet,
    PanResponder,
    StatusBar,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Variant config ──────────────────────────────────────────────────────────
const VARIANTS = {
    success: {
        icon: 'checkmark-circle',
        iconColor: '#34D399',
        accentColor: '#34D399',
        progressColor: '#34D399',
        bgColor: 'rgba(17, 24, 39, 0.92)',
    },
    warning: {
        icon: 'warning',
        iconColor: '#FBBF24',
        accentColor: '#FBBF24',
        progressColor: '#FBBF24',
        bgColor: 'rgba(17, 24, 39, 0.92)',
    },
    error: {
        icon: 'close-circle',
        iconColor: '#F87171',
        accentColor: '#F87171',
        progressColor: '#F87171',
        bgColor: 'rgba(17, 24, 39, 0.92)',
    },
    info: {
        icon: 'information-circle',
        iconColor: '#60A5FA',
        accentColor: '#60A5FA',
        progressColor: '#60A5FA',
        bgColor: 'rgba(17, 24, 39, 0.92)',
    },
    system: {
        icon: 'settings',
        iconColor: '#9CA3AF',
        accentColor: '#9CA3AF',
        progressColor: '#9CA3AF',
        bgColor: 'rgba(17, 24, 39, 0.92)',
    },
};

const AUTO_DISMISS_MS = 4000;
const SLIDE_HEIGHT = 110; // enough to fully hide above screen

/**
 * NotificationBar
 *
 * @param {boolean}  visible    - Show/hide the notification
 * @param {string}   variant    - 'success' | 'warning' | 'error' | 'info' | 'system'
 * @param {string}   title      - Bold headline
 * @param {string}   message    - Muted body text
 * @param {string}   timestamp  - e.g. 'Just now', '2m ago'
 * @param {function} onDismiss  - Called when dismissed (auto or swipe)
 * @param {number}   duration   - Override auto-dismiss duration (ms)
 */
export default function NotificationBar({
    visible,
    variant = 'info',
    title = '',
    message = '',
    timestamp = '',
    onDismiss,
    duration = AUTO_DISMISS_MS,
}) {
    const insets = useSafeAreaInsets();
    const config = VARIANTS[variant] ?? VARIANTS.info;

    // ── Animations ────────────────────────────────────────────────────────────
    const translateY = useRef(new Animated.Value(-SLIDE_HEIGHT)).current;
    const opacity    = useRef(new Animated.Value(0)).current;
    const progress   = useRef(new Animated.Value(1)).current;   // 1 → 0 over `duration`
    const swipeDelta = useRef(new Animated.Value(0)).current;   // tracks live swipe

    const dismissTimerRef   = useRef(null);
    const progressAnimRef   = useRef(null);
    const isAnimatingOut    = useRef(false);

    // ── Dismiss helper ────────────────────────────────────────────────────────
    const dismiss = useCallback(() => {
        if (isAnimatingOut.current) return;
        isAnimatingOut.current = true;

        clearTimeout(dismissTimerRef.current);
        progressAnimRef.current?.stop();

        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -SLIDE_HEIGHT,
                duration: 280,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
            }),
        ]).start(() => {
            isAnimatingOut.current = false;
            onDismiss?.();
        });
    }, [onDismiss, translateY, opacity]);

    // ── Show / hide effect ────────────────────────────────────────────────────
    useEffect(() => {
        if (visible) {
            isAnimatingOut.current = false;
            swipeDelta.setValue(0);
            progress.setValue(1);

            // Slide in
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 22,
                    stiffness: 260,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Start progress drain
                progressAnimRef.current = Animated.timing(progress, {
                    toValue: 0,
                    duration,
                    useNativeDriver: false, // width interpolation needs JS driver
                });
                progressAnimRef.current.start(({ finished }) => {
                    if (finished) dismiss();
                });
            });

            dismissTimerRef.current = setTimeout(dismiss, duration + 300);
        } else {
            // If hidden externally while visible, snap away
            translateY.setValue(-SLIDE_HEIGHT);
            opacity.setValue(0);
            clearTimeout(dismissTimerRef.current);
            progressAnimRef.current?.stop();
        }

        return () => {
            clearTimeout(dismissTimerRef.current);
            progressAnimRef.current?.stop();
        };
    }, [visible]);

    // ── Swipe-up to dismiss ────────────────────────────────────────────────────
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,

            onPanResponderGrant: () => {
                // Pause progress + dismiss timer while user is swiping
                progressAnimRef.current?.stop();
                clearTimeout(dismissTimerRef.current);
            },

            onPanResponderMove: (_, g) => {
                // Only allow upward swipe (negative dy)
                const dy = Math.min(0, g.dy);
                swipeDelta.setValue(dy);
                translateY.setValue(dy);
            },

            onPanResponderRelease: (_, g) => {
                if (g.dy < -36 || g.vy < -0.6) {
                    // Fast / far enough → dismiss
                    dismiss();
                } else {
                    // Snap back
                    swipeDelta.setValue(0);
                    Animated.spring(translateY, {
                        toValue: 0,
                        damping: 20,
                        stiffness: 300,
                        useNativeDriver: true,
                    }).start();

                    // Resume progress
                    const remaining = progress._value * duration;
                    progressAnimRef.current = Animated.timing(progress, {
                        toValue: 0,
                        duration: remaining,
                        useNativeDriver: false,
                    });
                    progressAnimRef.current.start(({ finished }) => {
                        if (finished) dismiss();
                    });
                    dismissTimerRef.current = setTimeout(dismiss, remaining + 300);
                }
            },
        })
    ).current;

    if (!visible) return null;

    const progressWidth = progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const statusBarHeight = insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0);

    return (
        <Animated.View
            style={[
                styles.wrapper,
                {
                    top: statusBarHeight + 8,
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
            {...panResponder.panHandlers}
        >
            {/* Frosted glass card */}
            <View style={[styles.card, { backgroundColor: config.bgColor }]}>
                {/* Left accent strip */}
                <View style={[styles.accentStrip, { backgroundColor: config.accentColor }]} />

                {/* Content row */}
                <View style={styles.contentRow}>
                    {/* Icon */}
                    <View style={[styles.iconWrap, { borderColor: config.accentColor + '33' }]}>
                        <Ionicons name={config.icon} size={22} color={config.iconColor} />
                    </View>

                    {/* Text block */}
                    <View style={styles.textBlock}>
                        <Text style={styles.title} numberOfLines={1}>{title}</Text>
                        <Text style={styles.message} numberOfLines={2}>{message}</Text>
                    </View>

                    {/* Timestamp */}
                    {!!timestamp && (
                        <Text style={styles.timestamp}>{timestamp}</Text>
                    )}
                </View>

                {/* Progress bar */}
                <View style={styles.progressTrack}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            { width: progressWidth, backgroundColor: config.progressColor },
                        ]}
                    />
                </View>
            </View>

            {/* Swipe handle hint */}
            <View style={styles.swipeHint} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
        elevation: 20,
    },

    card: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        // Shadow (iOS)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
    },

    accentStrip: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },

    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        gap: 12,
    },

    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },

    textBlock: {
        flex: 1,
        gap: 3,
    },

    title: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: '#F9FAFB',
        letterSpacing: 0.1,
    },

    message: {
        fontSize: 12,
        fontFamily: 'Nunito-Medium',
        color: '#9CA3AF',
        lineHeight: 17,
    },

    timestamp: {
        fontSize: 11,
        fontFamily: 'Nunito-Medium',
        color: '#6B7280',
        alignSelf: 'flex-start',
        marginTop: 1,
        flexShrink: 0,
    },

    progressTrack: {
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },

    progressFill: {
        height: 3,
        borderBottomLeftRadius: 16,
    },

    swipeHint: {
        alignSelf: 'center',
        marginTop: 6,
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
});
