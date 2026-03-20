import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ImageBackground, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../../utils/theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
    const { setShowSplash } = useAppContext();
    const logoScale = useRef(new Animated.Value(0.5)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const bgOpacity = useRef(new Animated.Value(0)).current;
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Background fade in first
        Animated.timing(bgOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        // Entrance animations
        Animated.sequence([
            Animated.delay(300),
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(subtitleOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Shimmer loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmer, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 8000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            {/* Background image — 2.jpg traffic signal */}
            <Animated.View style={[styles.bgImageContainer, { opacity: bgOpacity }]}>
                <ImageBackground
                    source={require('../../../assets/images/2.jpg')}
                    style={styles.bgImage}
                    resizeMode="cover"
                >
                    {/* Dark gradient overlay for readability */}
                    <LinearGradient
                        colors={[
                            'rgba(8, 28, 36, 0.75)',
                            'rgba(8, 28, 36, 0.6)',
                            'rgba(8, 28, 36, 0.85)',
                            'rgba(8, 28, 36, 0.95)',
                        ]}
                        locations={[0, 0.3, 0.7, 1]}
                        style={styles.overlay}
                    />
                </ImageBackground>
            </Animated.View>

            {/* Decorative glowing circles matching traffic light colors */}
            <Animated.View style={[styles.glowRed, { opacity: shimmer }]} />
            <View style={styles.glowGreen} />

            <View style={styles.content}>
                {/* App Name */}
                <Animated.Text style={[styles.title, { opacity: textOpacity }]}>
                    Traffic<Text style={styles.titleAccent}>Eye</Text>
                </Animated.Text>

                {/* Tagline */}
                <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
                    Smart Violation Reporting
                </Animated.Text>

                {/* Divider line */}
                <Animated.View style={[styles.divider, { opacity: subtitleOpacity }]} />

                {/* Version badge */}
                <Animated.View style={[styles.versionBadge, { opacity: subtitleOpacity }]}>
                    <Ionicons name="shield-checkmark" size={12} color="#2DD4BF" />
                    <Text style={styles.versionText}>AI-Powered • Secure</Text>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#081C24',
    },
    bgImageContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    bgImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
    },
    // Traffic-light inspired glowing decorations
    glowRed: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        top: height * 0.1,
        right: -40,
    },
    glowGreen: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(45, 212, 191, 0.06)',
        bottom: height * 0.15,
        left: -30,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    iconContainer: {
        marginBottom: SPACING.xxl,
    },
    iconOuter: {
        width: 130,
        height: 130,
        borderRadius: 36,
        backgroundColor: 'rgba(45, 212, 191, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(45, 212, 191, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconInner: {
        width: 100,
        height: 100,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 52,
    },
    title: {
        fontSize: 40,
        fontWeight: FONT_WEIGHTS.extrabold,
        color: '#FFFFFF',
        marginBottom: SPACING.sm,
        letterSpacing: -1,
    },
    titleAccent: {
        color: '#2DD4BF',
    },
    subtitle: {
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: FONT_WEIGHTS.medium,
        letterSpacing: 3,
        textTransform: 'uppercase',
    },
    divider: {
        width: 50,
        height: 3,
        backgroundColor: '#2DD4BF',
        borderRadius: 2,
        marginTop: SPACING.xl,
        opacity: 0.6,
    },
    versionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: SPACING.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 2,
        borderRadius: 20,
        backgroundColor: 'rgba(45, 212, 191, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(45, 212, 191, 0.15)',
    },
    versionText: {
        fontSize: FONT_SIZES.xxs,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: FONT_WEIGHTS.medium,
        letterSpacing: 0.5,
    },
});
