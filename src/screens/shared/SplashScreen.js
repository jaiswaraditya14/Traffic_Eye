import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ImageBackground, Image } from 'react-native';
import { useAppContext } from '../../context/AppContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, SCREEN_WIDTH, SCREEN_HEIGHT } from '../../utils/theme';

export default function SplashScreen({ navigation }) {
    const { setShowSplash } = useAppContext();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1.1)).current;
    const contentFadeAnim = useRef(new Animated.Value(0)).current;
    const contentSlideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        // Entrance animation sequence
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 3000,
                useNativeDriver: true,
            }),
        ]).start();

        // Staggered content entry
        Animated.delay(400).start(() => {
            Animated.parallel([
                Animated.timing(contentFadeAnim, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                Animated.timing(contentSlideAnim, {
                    toValue: 0,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ]).start();
        });

        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 9000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <Animated.Image
                source={require('../../../assets/splash-custom.png')}
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
                    <View style={styles.logoBadge}>
                        <Text style={styles.logoEmoji}>🚦</Text>
                    </View>
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
                        <Animated.View style={styles.loadingBar} />
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    backgroundImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        position: 'absolute',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)', // Premium dark overlay
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    logoBadge: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    logoEmoji: {
        fontSize: 40,
    },
    title: {
        fontSize: 48,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 1,
        marginBottom: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    loadingBar: {
        width: '30%',
        height: '100%',
        backgroundColor: COLORS.primary || '#3B82F6',
        borderRadius: 2,
    },
});
