import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Animated, Dimensions, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const { width, height } = Dimensions.get('window');

// ─── Design Tokens (Civic Authority) ───
const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    navyLight: '#2C4E80',
    amber: '#F59E0B',
    amberDark: '#D97706',
    white: '#FFFFFF',
    offWhite: '#D7E2FF',
};

/**
 * SplashScreen Component
 * Features a circular glowing "Eye" emblem (Civic Sentinel theme)
 * Implementation includes smooth fade-ins, spring entrance, and amber scan-pulse.
 */
export default function SplashScreen({ navigation }) {
    const { setShowSplash } = useAppContext();

    // ── Animations ──
    const logoScale = useRef(new Animated.Value(0.4)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleY = useRef(new Animated.Value(24)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const barWidth = useRef(new Animated.Value(0)).current;
    const scanPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // 1. Entrance Sequence
        Animated.sequence([
            Animated.delay(200),
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(titleY, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]),
            Animated.timing(subtitleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(barWidth, {
                toValue: 1,
                duration: 2500,
                useNativeDriver: false,
            }),
        ]).start();

        // 2. Continuous "AI Scan" pulse 
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanPulse, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
                Animated.timing(scanPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();

        const timer = setTimeout(() => setShowSplash(false), 4200);
        return () => clearTimeout(timer);
    }, []);

    const barInterpolated = barWidth.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.navy} />

            {/* Background Layer */}
            <LinearGradient
                colors={[C.navy, C.navyMid, C.navyLight]}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFill}
            />

            {/* Subtle background circles for depth */}
            <View style={styles.circleTopRight} />
            <View style={styles.circleBottomLeft} />

            {/* ── Main Content Area ── */}
            <View style={styles.content}>
                
                {/* 1. The Sentinel Eye Logo Frame */}
                <Animated.View
                    style={[
                        styles.logoContainer,
                        { opacity: logoOpacity, transform: [{ scale: logoScale }] },
                    ]}
                >
                    {/* Pulsing amber outer glow */}
                    <Animated.View
                        style={[
                            styles.pulseRing,
                            { transform: [{ scale: scanPulse }] },
                        ]}
                    />
                    
                    {/* Circle Image Frame */}
                    <View style={styles.logoFrame}>
                        {/* THE EYE EMBLEM */}
                        <View style={styles.eyeInnerWrapper}>
                            <Ionicons name="eye" size={48} color={C.amber} />
                            <Animated.View 
                                style={[
                                    styles.scanLine, 
                                    { transform: [{ scaleY: scanPulse }] }
                                ]} 
                            />
                        </View>
                    </View>

                    {/* Seal Detail overlay */}
                    <View style={styles.sealRing} />
                </Animated.View>

                {/* 2. Brand Identity */}
                <Animated.View
                    style={{ 
                        opacity: titleOpacity, 
                        transform: [{ translateY: titleY }],
                        alignItems: 'center'
                    }}
                >
                    <Text style={styles.appName}>
                        TRAFFIC<Text style={styles.appNameAccent}>EYE</Text>
                    </Text>
                    
                    <Animated.Text style={[styles.vSubtitle, { opacity: subtitleOpacity }]}>
                        2.0 | Civic Intelligence Platform
                    </Animated.Text>
                </Animated.View>

                {/* 3. Purpose Tagline */}
                <Animated.Text style={[styles.tagline, { opacity: subtitleOpacity }]}>
                    Smart Civic Traffic Enforcement
                </Animated.Text>

            </View>

            {/* ── Progress Section ── */}
            <View style={styles.loadingSection}>
                <Text style={styles.loadingLabel}>Secure System Initializing...</Text>
                <View style={styles.loadingTrack}>
                    <Animated.View
                        style={[styles.loadingBar, { width: barInterpolated }]}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.navy,
    },
    // BG accents
    circleTopRight: {
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: 160,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
        top: -100,
        right: -80,
    },
    circleBottomLeft: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.05)',
        bottom: -70,
        left: -80,
    },

    // Layout
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    logoContainer: {
        width: 140,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    pulseRing: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 1.5,
        borderColor: 'rgba(245,158,11,0.2)',
    },
    logoFrame: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        overflow: 'hidden',
    },
    eyeInnerWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanLine: {
        position: 'absolute',
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(245,158,11,0.4)',
    },
    sealRing: {
        position: 'absolute',
        width: 114,
        height: 114,
        borderRadius: 57,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },

    // Typography 
    appName: {
        fontFamily: 'Nunito-Bold',
        fontSize: 42,
        letterSpacing: 2,
        color: C.white,
    },
    appNameAccent: {
        color: C.amber,
        fontFamily: 'Nunito-ExtraBold',
    },
    vSubtitle: {
        fontFamily: 'Nunito-SemiBold',
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
        letterSpacing: 1,
    },
    tagline: {
        fontFamily: 'Nunito-Medium',
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginTop: 48,
        textAlign: 'center',
    },

    // Loading 
    loadingSection: {
        paddingHorizontal: 54,
        paddingBottom: 72,
        alignItems: 'center',
    },
    loadingLabel: {
        fontFamily: 'Nunito-SemiBold',
        fontSize: 10,
        color: 'rgba(255,255,255,0.25)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    loadingTrack: {
        width: '100%',
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    loadingBar: {
        height: '100%',
        backgroundColor: C.amber,
        borderRadius: 2,
    },
});
