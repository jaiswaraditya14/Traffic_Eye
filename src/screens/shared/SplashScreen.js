import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAppContext } from '../../context/AppContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, SCREEN_WIDTH, SCREEN_HEIGHT } from '../../utils/theme';

export default function SplashScreen({ navigation }) {
    const { setShowSplash } = useAppContext();
    const appOpacityAnim = useRef(new Animated.Value(1)).current; // Root opacity for seamless fade out
    // Start at 1 for scale to seamlessly match the static native splash image from Expo
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1.0)).current;
    const contentFadeAnim = useRef(new Animated.Value(0)).current;
    const contentSlideAnim = useRef(new Animated.Value(20)).current;
    const loadingAnim = useRef(new Animated.Value(0)).current; // For the loading bar

    useEffect(() => {
        // Subtle, smooth zoom effect extending off the native splash
        Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 6000,
            useNativeDriver: true,
        }).start();

        // Loading bar animation
        Animated.timing(loadingAnim, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: false,
        }).start();

        // Delay content so the native to JS transition is completely imperceptible
        Animated.sequence([
            Animated.delay(800),
            Animated.parallel([
                Animated.timing(contentFadeAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(contentSlideAnim, {
                    toValue: 0,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        ]).start();

        const timer = setTimeout(() => {
            // Smoothly fade out the entire splash screen into the main app
            Animated.timing(appOpacityAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }).start(() => {
                setShowSplash(false);
            });
        }, 4500);

        return () => clearTimeout(timer);
    }, []);

    const loadingWidth = loadingAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <Animated.View style={[styles.container, { opacity: appOpacityAnim }]}>
            <Animated.Image
                source={require('../../../assets/s-s.png')}
                style={[
                    styles.backgroundImage,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
                resizeMode="cover"
            />

            <View style={styles.overlay}>
                <Animated.View style={[
                    styles.content,
                    {
                        opacity: contentFadeAnim,
                        transform: [{ translateY: contentSlideAnim }],
                    },
                ]}>

                    <Text style={styles.title}>TrafficEye</Text>
                    <Text style={styles.subtitle}>Smart Violation Reporting</Text>

                    <View style={styles.taglineBox}>
                        <View style={styles.dot} />
                        <Text style={styles.taglineText}>REDEFINING ROAD SAFETY</Text>
                        <View style={styles.dot} />
                    </View>
                </Animated.View>

                <View style={styles.footer}>
                    <View style={styles.loadingTrack}>
                        <Animated.View style={[styles.loadingBar, { width: loadingWidth }]} />
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050309',
    },
    backgroundImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        position: 'absolute',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(5, 3, 9, 0.4)', // Premium dark overlay matching image
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 160,
    },
    content: {
        alignItems: 'center',
    },

    title: {
        fontSize: 48,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 1,
        marginBottom: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
        letterSpacing: 0.5,
        marginBottom: SPACING.xl,
    },
    taglineBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: 0.7,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#FFFFFF',
    },
    taglineText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 3,
    },
    footer: {
        position: 'absolute',
        bottom: 80,
        width: '100%',
        alignItems: 'center',
    },
    loadingTrack: {
        width: 140,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    loadingBar: {
        height: '100%',
        backgroundColor: COLORS.primary || '#3B82F6',
        borderRadius: 2,
    },
});
