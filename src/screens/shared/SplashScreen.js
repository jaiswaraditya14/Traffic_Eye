import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Animated, Dimensions, StatusBar, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const { width, height } = Dimensions.get('window');

// ─── Design Tokens (Civic Authority) — UNCHANGED ───
const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    navyLight: '#2C4E80',
    amber: '#F59E0B',
    amberDark: '#D97706',
    white: '#FFFFFF',
    offWhite: '#D7E2FF',
};


// ═════════════════════════════════════════════════════════════════════════════
// SPLASH SCREEN — Premium "Digital Sentinel" entrance
// ═════════════════════════════════════════════════════════════════════════════

export default function SplashScreen({ navigation }) {
    const { setShowSplash } = useAppContext();

    // ── Animation values ──

    // Background radial burst
    const bgBurst = useRef(new Animated.Value(0)).current;

    // Logo entrance
    const logoScale   = useRef(new Animated.Value(0.3)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoRotate  = useRef(new Animated.Value(-0.05)).current;

    // Ambient pulse rings (continuous)
    const pulse1 = useRef(new Animated.Value(0.8)).current;
    const pulse1Opacity = useRef(new Animated.Value(0.6)).current;
    const pulse2 = useRef(new Animated.Value(0.6)).current;
    const pulse2Opacity = useRef(new Animated.Value(0.4)).current;

    // Scan sweep (rotating amber line inside eye)
    const scanRotate = useRef(new Animated.Value(0)).current;

    // Brand text
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleY       = useRef(new Animated.Value(20)).current;
    const titleSpacing = useRef(new Animated.Value(8)).current;

    // Version subtitle
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const subtitleY       = useRef(new Animated.Value(10)).current;

    // Tagline
    const taglineOpacity = useRef(new Animated.Value(0)).current;

    // Loading bar
    const barWidth  = useRef(new Animated.Value(0)).current;
    const barGlow   = useRef(new Animated.Value(0.3)).current;
    const loadLabelOpacity = useRef(new Animated.Value(0)).current;

    // Decorative floating particles
    const particle1Y = useRef(new Animated.Value(0)).current;
    const particle2Y = useRef(new Animated.Value(0)).current;
    const particle3Y = useRef(new Animated.Value(0)).current;

    useEffect(() => {

        // ── 1. ENTRANCE CHOREOGRAPHY ──
        Animated.sequence([
            // Phase 1: Background burst + logo springs in (0–600ms)
            Animated.parallel([
                Animated.timing(bgBurst, {
                    toValue: 1, duration: 800, useNativeDriver: true,
                }),
                Animated.spring(logoScale, {
                    toValue: 1, tension: 40, friction: 7, useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1, duration: 500, useNativeDriver: true,
                }),
                Animated.timing(logoRotate, {
                    toValue: 0, duration: 600, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true,
                }),
            ]),

            // Phase 2: Title slides up (600–1000ms)
            Animated.parallel([
                Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(titleY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
                Animated.timing(titleSpacing, { toValue: 4, duration: 500, useNativeDriver: false }),
            ]),

            // Phase 3: Subtitle + tagline stagger in (1000–1400ms)
            Animated.stagger(200, [
                Animated.parallel([
                    Animated.timing(subtitleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                    Animated.timing(subtitleY, { toValue: 0, duration: 350, useNativeDriver: true }),
                ]),
                Animated.timing(taglineOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]),

            // Phase 4: Loading bar appears + fills (1400–3800ms)
            Animated.parallel([
                Animated.timing(loadLabelOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.timing(barWidth, {
                    toValue: 1, duration: 2400,
                    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                    useNativeDriver: false,
                }),
            ]),
        ]).start();


        // ── 2. CONTINUOUS AMBIENT LOOPS ──

        // Pulse ring 1 — expands and fades
        Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(pulse1, { toValue: 1.6, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulse1, { toValue: 0.8, duration: 0, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(pulse1Opacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
                    Animated.timing(pulse1Opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
                ]),
            ])
        ).start();

        // Pulse ring 2 — offset timing for layered effect
        setTimeout(() => {
            Animated.loop(
                Animated.parallel([
                    Animated.sequence([
                        Animated.timing(pulse2, { toValue: 1.4, duration: 2500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                        Animated.timing(pulse2, { toValue: 0.6, duration: 0, useNativeDriver: true }),
                    ]),
                    Animated.sequence([
                        Animated.timing(pulse2Opacity, { toValue: 0, duration: 2500, useNativeDriver: true }),
                        Animated.timing(pulse2Opacity, { toValue: 0.4, duration: 0, useNativeDriver: true }),
                    ]),
                ])
            ).start();
        }, 1000);

        // Scan sweep — continuous rotation inside the eye
        Animated.loop(
            Animated.timing(scanRotate, {
                toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true,
            })
        ).start();

        // Loading bar glow pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(barGlow, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(barGlow, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        ).start();

        // Floating particles
        const floatParticle = (anim, dur) =>
            Animated.loop(Animated.sequence([
                Animated.timing(anim, { toValue: -12, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(anim, { toValue: 12, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ]));
        floatParticle(particle1Y, 3000).start();
        floatParticle(particle2Y, 4000).start();
        floatParticle(particle3Y, 3500).start();


        // ── 3. EXIT TIMER (logic unchanged) ──
        const timer = setTimeout(() => setShowSplash(false), 4200);
        return () => clearTimeout(timer);
    }, []);


    // ── Interpolations ──
    const barInterpolated = barWidth.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const spinInterpolate = scanRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const logoRotateInterp = logoRotate.interpolate({
        inputRange: [-0.05, 0],
        outputRange: ['-3deg', '0deg'],
    });

    const letterSpacingInterp = titleSpacing.interpolate({
        inputRange: [4, 8],
        outputRange: [4, 8],
    });


    // ── Render ──
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* ── Deep gradient background ── */}
            <LinearGradient
                colors={['#001535', C.navy, C.navyMid, C.navyLight]}
                locations={[0, 0.3, 0.6, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* ── Decorative background circles ── */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />
            <View style={styles.bgCircle3} />

            {/* ── Floating amber particles ── */}
            <Animated.View style={[styles.particle, styles.particle1, { transform: [{ translateY: particle1Y }] }]} />
            <Animated.View style={[styles.particle, styles.particle2, { transform: [{ translateY: particle2Y }] }]} />
            <Animated.View style={[styles.particle, styles.particle3, { transform: [{ translateY: particle3Y }] }]} />

            {/* ── Ambient radial burst (fades in behind logo) ── */}
            <Animated.View style={[styles.radialBurst, { opacity: bgBurst }]}>
                <LinearGradient
                    colors={['rgba(245,158,11,0.08)', 'rgba(245,158,11,0.02)', 'transparent']}
                    style={styles.radialGradient}
                    start={{ x: 0.5, y: 0.5 }}
                    end={{ x: 0, y: 0 }}
                />
            </Animated.View>


            {/* ════════════════════════════════════════════ */}
            {/* ── MAIN CONTENT ── */}
            {/* ════════════════════════════════════════════ */}
            <View style={styles.content}>

                {/* ── Logo Emblem ── */}
                <Animated.View
                    style={[
                        styles.logoContainer,
                        {
                            opacity: logoOpacity,
                            transform: [
                                { scale: logoScale },
                                { rotate: logoRotateInterp },
                            ],
                        },
                    ]}
                >
                    {/* Pulse ring 1 */}
                    <Animated.View
                        style={[
                            styles.pulseRing,
                            {
                                transform: [{ scale: pulse1 }],
                                opacity: pulse1Opacity,
                            },
                        ]}
                    />
                    {/* Pulse ring 2 (offset) */}
                    <Animated.View
                        style={[
                            styles.pulseRing2,
                            {
                                transform: [{ scale: pulse2 }],
                                opacity: pulse2Opacity,
                            },
                        ]}
                    />

                    {/* Outer glow halo */}
                    <View style={styles.logoGlow} />

                    {/* Main circle frame */}
                    <View style={styles.logoFrame}>
                        {/* Inner gradient overlay */}
                        <LinearGradient
                            colors={['rgba(245,158,11,0.08)', 'rgba(255,255,255,0.04)', 'rgba(245,158,11,0.06)']}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />

                        {/* The Eye icon */}
                        <Ionicons name="eye" size={52} color={C.amber} />

                        {/* Rotating scan sweep */}
                        <Animated.View
                            style={[
                                styles.scanSweep,
                                { transform: [{ rotate: spinInterpolate }] },
                            ]}
                        >
                            <View style={styles.scanBeam} />
                        </Animated.View>
                    </View>

                    {/* Outer precision ring */}
                    <View style={styles.precisionRing} />

                    {/* Tick marks (compass-style) */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                        <View
                            key={deg}
                            style={[
                                styles.tickMark,
                                {
                                    transform: [
                                        { rotate: `${deg}deg` },
                                        { translateY: -68 },
                                    ],
                                },
                            ]}
                        />
                    ))}
                </Animated.View>


                {/* ── Brand Name ── */}
                <Animated.View
                    style={{
                        opacity: titleOpacity,
                        transform: [{ translateY: titleY }],
                        alignItems: 'center',
                    }}
                >
                    <Animated.Text style={[styles.appName, { letterSpacing: letterSpacingInterp }]}>
                        TRAFFIC<Text style={styles.appNameAccent}>EYE</Text>
                    </Animated.Text>

                    {/* Decorative line under name */}
                    <View style={styles.nameDivider}>
                        <View style={styles.dividerLine} />
                        <View style={styles.dividerDiamond} />
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Version subtitle */}
                    <Animated.Text
                        style={[
                            styles.vSubtitle,
                            {
                                opacity: subtitleOpacity,
                                transform: [{ translateY: subtitleY }],
                            },
                        ]}
                    >
                        1.0 | Civic Intelligence Platform
                    </Animated.Text>
                </Animated.View>

                {/* ── Tagline ── */}
                <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
                    Smart Civic Traffic Enforcement
                </Animated.Text>
            </View>


            {/* ── Loading Progress ── */}
            <Animated.View style={[styles.loadingSection, { opacity: loadLabelOpacity }]}>
                <Text style={styles.loadingLabel}>Secure System Initializing...</Text>

                <View style={styles.loadingTrack}>
                    <Animated.View style={[styles.loadingBar, { width: barInterpolated }]}>
                        {/* Shimmer highlight on the bar tip */}
                        <Animated.View style={[styles.barShimmer, { opacity: barGlow }]} />
                    </Animated.View>
                </View>

                {/* Powered-by footer */}
                <View style={styles.poweredRow}>
                    <Ionicons name="shield-checkmark" size={10} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.poweredText}>Protected by TrafficEye</Text>
                </View>
            </Animated.View>
        </View>
    );
}


// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.navy,
    },

    // ── Background decoration ──
    bgCircle1: {
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: 200,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.025)',
        top: -120,
        right: -100,
    },
    bgCircle2: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.04)',
        bottom: -80,
        left: -100,
    },
    bgCircle3: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.02)',
        top: height * 0.35,
        left: width * 0.6,
    },

    // Floating amber particles
    particle: {
        position: 'absolute',
        borderRadius: 999,
        backgroundColor: 'rgba(245,158,11,0.15)',
    },
    particle1: { width: 4, height: 4, top: '25%', left: '15%' },
    particle2: { width: 3, height: 3, top: '60%', right: '12%' },
    particle3: { width: 5, height: 5, top: '45%', left: '80%' },

    // Radial burst behind logo
    radialBurst: {
        position: 'absolute',
        top: height * 0.2,
        left: width * 0.5 - 160,
        width: 320,
        height: 320,
    },
    radialGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 160,
    },

    // ── Main content ──
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },

    // ── Logo emblem ──
    logoContainer: {
        width: 160,
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 44,
    },

    // Expanding pulse rings
    pulseRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 1.5,
        borderColor: C.amber,
    },
    pulseRing2: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.5)',
    },

    // Soft amber glow behind logo
    logoGlow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(245,158,11,0.06)',
    },

    // Main circle frame
    logoFrame: {
        width: 108,
        height: 108,
        borderRadius: 54,
        backgroundColor: 'rgba(255,255,255,0.07)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(245,158,11,0.25)',
        overflow: 'hidden',
    },

    // Rotating scan sweep
    scanSweep: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanBeam: {
        position: 'absolute',
        top: 0,
        width: 1,
        height: '50%',
        backgroundColor: 'rgba(245,158,11,0.35)',
    },

    // Precision ring (outer detail)
    precisionRing: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.1)',
        borderStyle: 'dashed',
    },

    // Compass tick marks
    tickMark: {
        position: 'absolute',
        width: 1,
        height: 6,
        backgroundColor: 'rgba(245,158,11,0.3)',
    },

    // ── Typography ──
    appName: {
        fontFamily: 'Nunito-Bold',
        fontSize: 38,
        color: C.white,
    },
    appNameAccent: {
        color: C.amber,
        fontFamily: 'Nunito-ExtraBold',
    },

    // Decorative divider under app name
    nameDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        marginBottom: 10,
    },
    dividerLine: {
        width: 32,
        height: 1,
        backgroundColor: 'rgba(245,158,11,0.3)',
    },
    dividerDiamond: {
        width: 6,
        height: 6,
        transform: [{ rotate: '45deg' }],
        backgroundColor: C.amber,
        opacity: 0.5,
    },

    vSubtitle: {
        fontFamily: 'Nunito-SemiBold',
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1.5,
    },

    tagline: {
        fontFamily: 'Nunito-Medium',
        fontSize: 11,
        color: 'rgba(255,255,255,0.25)',
        letterSpacing: 2.5,
        textTransform: 'uppercase',
        marginTop: 40,
        textAlign: 'center',
    },

    // ── Loading section ──
    loadingSection: {
        paddingHorizontal: 48,
        paddingBottom: 60,
        alignItems: 'center',
    },
    loadingLabel: {
        fontFamily: 'Nunito-SemiBold',
        fontSize: 10,
        color: 'rgba(255,255,255,0.2)',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 14,
    },
    loadingTrack: {
        width: '100%',
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    loadingBar: {
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
    },
    barShimmer: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: 40,
        height: '100%',
        backgroundColor: C.amber,
        // The rest of the bar uses the amber gradient below
    },

    // Powered-by footer
    poweredRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 20,
    },
    poweredText: {
        fontFamily: 'Nunito-Medium',
        fontSize: 10,
        color: 'rgba(255,255,255,0.15)',
        letterSpacing: 1,
    },
});
