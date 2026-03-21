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

export default function SplashScreen({ navigation }) {
    const { setShowSplash } = useAppContext();

    // ── Animations ──
    const logoScale = useRef(new Animated.Value(0.4)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleY = useRef(new Animated.Value(24)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const barWidth = useRef(new Animated.Value(0)).current;
    const amberPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // 1. Logo entrance
        Animated.sequence([
            Animated.delay(200),
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    tension: 55,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
            // 2. Title slide-up
            Animated.parallel([
                Animated.timing(titleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.timing(titleY, { toValue: 0, duration: 350, useNativeDriver: true }),
            ]),
            // 3. Subtitle
            Animated.timing(subtitleOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            // 4. Loading bar
            Animated.timing(barWidth, {
                toValue: 1,
                duration: 2800,
                useNativeDriver: false,
            }),
        ]).start();

        // Amber pulse on shield
        Animated.loop(
            Animated.sequence([
                Animated.timing(amberPulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
                Animated.timing(amberPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
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

            {/* Background gradient */}
            <LinearGradient
                colors={[C.navy, C.navyMid, C.navyLight]}
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFill}
            />

            {/* Subtle geometric accent circles */}
            <View style={styles.circleTopRight} />
            <View style={styles.circleBottomLeft} />

            {/* ── Center Logo Block ── */}
            <View style={styles.content}>
                {/* Shield + Eye icon */}
                <Animated.View
                    style={[
                        styles.logoContainer,
                        { opacity: logoOpacity, transform: [{ scale: logoScale }] },
                    ]}
                >
                    {/* Outer amber pulse ring */}
                    <Animated.View
                        style={[
                            styles.pulseRing,
                            { transform: [{ scale: amberPulse }] },
                        ]}
                    />
                    {/* Shield background */}
                    <View style={styles.shieldBg}>
                        <Ionicons name="shield-checkmark" size={64} color={C.amber} />
                    </View>

                    {/* Government seal ring */}
                    <View style={styles.sealRing} />
                </Animated.View>

                {/* App Name */}
                <Animated.View
                    style={{ opacity: titleOpacity, transform: [{ translateY: titleY }] }}
                >
                    <Text style={styles.appName}>
                        Traffic<Text style={styles.appNameAccent}>Eye</Text>
                    </Text>
                </Animated.View>

                {/* Tagline */}
                <Animated.Text style={[styles.tagline, { opacity: subtitleOpacity }]}>
                    Smart Civic Traffic Enforcement
                </Animated.Text>

                {/* Divider line */}
                <Animated.View style={[styles.divider, { opacity: subtitleOpacity }]} />

                {/* Authority badge */}
                <Animated.View style={[styles.authorityBadge, { opacity: subtitleOpacity }]}>
                    <Ionicons name="ribbon" size={13} color={C.amber} />
                    <Text style={styles.authorityText}>AI-Powered  •  Government Grade  •  Secure</Text>
                </Animated.View>
            </View>

            {/* ── Loading Bar ── */}
            <View style={styles.loadingSection}>
                <Text style={styles.loadingLabel}>Initializing...</Text>
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
    // Geometric accent circles (subtle background texture)
    circleTopRight: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        top: -80,
        right: -60,
    },
    circleBottomLeft: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.08)',
        bottom: -60,
        left: -70,
    },

    // ── Center Content ──
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
        marginBottom: 32,
    },
    pulseRing: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 1.5,
        borderColor: 'rgba(245,158,11,0.25)',
    },
    sealRing: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    shieldBg: {
        width: 90,
        height: 90,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Typography ──
    appName: {
        fontSize: 44,
        fontWeight: '800',
        color: C.white,
        letterSpacing: -1.5,
        textAlign: 'center',
    },
    appNameAccent: {
        color: C.amber,
    },
    tagline: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.55)',
        fontWeight: '500',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginTop: 8,
        textAlign: 'center',
    },
    divider: {
        width: 40,
        height: 2,
        backgroundColor: C.amber,
        borderRadius: 2,
        marginTop: 20,
        opacity: 0.7,
    },
    authorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(245,158,11,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.2)',
    },
    authorityText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.55)',
        fontWeight: '500',
        letterSpacing: 0.3,
    },

    // ── Loading Bar ──
    loadingSection: {
        paddingHorizontal: 40,
        paddingBottom: 60,
        alignItems: 'center',
    },
    loadingLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.35)',
        fontWeight: '500',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    loadingTrack: {
        width: '100%',
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    loadingBar: {
        height: '100%',
        backgroundColor: C.amber,
        borderRadius: 2,
    },
});
