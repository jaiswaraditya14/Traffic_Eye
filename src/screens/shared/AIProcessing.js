import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Animated, Easing, Alert, StatusBar, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context';
import { aiService } from '../../services';

const C = {
    navy:          '#0A1128',
    navyCard:      '#101F42',
    accentBlue:    '#2563EB',
    cyan:          '#06B6D4',
    amber:         '#F59E0B',
    white:         '#FFFFFF',
    textSecondary: '#94A3B8',
};

export default function AIProcessing({ navigation }) {
    const { currentReport } = useAppContext();

    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim    = useRef(new Animated.Value(1)).current;
    const rotateAnim   = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    // ── Industrial Level Animations ──────────────────────────────────────────
    useEffect(() => {
        // Laser scan line vertical sweep
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, {
                    toValue: 1, duration: 1600,
                    easing: Easing.inOut(Easing.quad), useNativeDriver: true,
                }),
                Animated.timing(scanLineAnim, {
                    toValue: 0, duration: 1600,
                    easing: Easing.inOut(Easing.quad), useNativeDriver: true,
                }),
            ])
        ).start();

        // Orbital ring continuous rotation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1, duration: 3000,
                easing: Easing.linear, useNativeDriver: true,
            })
        ).start();

        // Subtle glow pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,    duration: 1200, useNativeDriver: true }),
            ])
        ).start();

        // Indefinite smooth progress bar loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(progressAnim, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
                Animated.timing(progressAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
            ])
        ).start();
    }, []);

    // ── Main Execution ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!currentReport?.image) {
            setTimeout(() => navigation.replace('AIResultsVerification', {
                aiResults: {
                    violationDetected: false,
                    vehicleNumber: '', violationType: '',
                    allViolations: [], severity: 'None', confidence: 0,
                },
            }), 800);
            return;
        }

        let didNavigate = false;

        const run = async () => {
            try {
                const results = await aiService.analyzeViolationImage(currentReport.image);

                if (didNavigate) return;
                didNavigate = true;

                if (!results.violationDetected) {
                    Alert.alert(
                        'No Violation Detected',
                        results.description || 'No traffic violation detected in this image.',
                        [
                            { text: 'Try Again',     style: 'cancel', onPress: () => navigation.goBack() },
                            { text: 'Enter Manually', onPress: () => navigation.replace('AIResultsVerification', { aiResults: results }) },
                        ]
                    );
                    return;
                }

                navigation.replace('AIResultsVerification', { aiResults: results });

            } catch (error) {
                console.error('[AIProcessing] Error:', error);
                if (didNavigate) return;
                didNavigate = true;
                Alert.alert(
                    'Analysis Failed',
                    'Could not analyze the image automatically. You can enter details manually.',
                    [{
                        text: 'Enter Manually',
                        onPress: () => navigation.replace('AIResultsVerification', {
                            aiResults: {
                                violationDetected: false,
                                vehicleNumber: '', violationType: '',
                                allViolations: [], severity: 'Unknown', confidence: 0,
                            },
                        }),
                    }]
                );
            }
        };

        run();
        return () => { didNavigate = true; };
    }, [currentReport, navigation]);

    const translateY = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 160],
    });

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['0%', '70%', '100%'],
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Industrial Top Badge */}
            <View style={styles.badgeContainer}>
                <View style={styles.liveDot} />
                <Text style={styles.badgeText}>TRAFFIC EYE NEURAL ENGINE</Text>
            </View>

            {/* Futuristic Viewfinder HUD */}
            <View style={styles.hudWrapper}>
                {/* Outer Rotating Arc */}
                <Animated.View style={[styles.orbitalRing, { transform: [{ rotate: spin }] }]} />

                {/* Outer Pulsing Aura */}
                <Animated.View style={[styles.auraRing, { transform: [{ scale: pulseAnim }] }]} />

                {/* Viewfinder Target Container */}
                <View style={styles.imageCard}>
                    {/* HUD Radar Crosshair Grid */}
                    <View style={styles.radarGrid}>
                        <View style={styles.gridLineV} />
                        <View style={styles.gridLineH} />
                        <View style={styles.centerIconBg}>
                            <Ionicons name="hardware-chip-outline" size={38} color={C.cyan} />
                        </View>
                    </View>

                    {/* HUD Corner Brackets */}
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />

                    {/* Laser Scanner Line */}
                    <Animated.View style={[styles.laserLine, { transform: [{ translateY }] }]}>
                        <View style={styles.laserGlow} />
                    </Animated.View>
                </View>
            </View>

            {/* Title & Single Status */}
            <Text style={styles.title}>Analyzing Scene</Text>
            <Text style={styles.subtitle}>Processing computer vision & violation detection</Text>

            {/* Tech Giant Sleek Progress Bar */}
            <View style={styles.progressBarBg}>
                <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1, backgroundColor: C.navy,
        justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 32,
    },

    // Badge
    badgeContainer: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        borderColor: 'rgba(37, 99, 235, 0.4)', borderWidth: 1,
        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
        marginBottom: 40,
    },
    liveDot: {
        width: 7, height: 7, borderRadius: 3.5,
        backgroundColor: C.cyan,
    },
    badgeText: {
        fontSize: 11, fontFamily: 'Nunito-Bold',
        color: C.cyan, letterSpacing: 1,
    },

    // HUD Viewfinder
    hudWrapper: {
        width: 220, height: 220,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 36, position: 'relative',
    },
    orbitalRing: {
        position: 'absolute',
        width: 220, height: 220, borderRadius: 110,
        borderWidth: 2, borderColor: 'transparent',
        borderTopColor: C.cyan, borderRightColor: 'rgba(37,99,235,0.3)',
    },
    auraRing: {
        position: 'absolute',
        width: 190, height: 190, borderRadius: 95,
        backgroundColor: 'rgba(37,99,235,0.08)',
        borderWidth: 1, borderColor: 'rgba(37,99,235,0.25)',
    },
    imageCard: {
        width: 160, height: 160, borderRadius: 20,
        overflow: 'hidden', position: 'relative',
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: C.navyCard,
    },
    radarGrid: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        position: 'relative',
    },
    gridLineV: {
        position: 'absolute', top: 10, bottom: 10, width: 1,
        backgroundColor: 'rgba(6, 182, 212, 0.25)',
    },
    gridLineH: {
        position: 'absolute', left: 10, right: 10, height: 1,
        backgroundColor: 'rgba(6, 182, 212, 0.25)',
    },
    centerIconBg: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(6, 182, 212, 0.12)',
        borderWidth: 1.5, borderColor: 'rgba(6, 182, 212, 0.4)',
        justifyContent: 'center', alignItems: 'center',
    },

    // Corner HUD brackets
    corner: {
        position: 'absolute', width: 14, height: 14,
        borderColor: C.cyan,
    },
    topLeft: { top: 6, left: 6, borderTopWidth: 2, borderLeftWidth: 2 },
    topRight: { top: 6, right: 6, borderTopWidth: 2, borderRightWidth: 2 },
    bottomLeft: { bottom: 6, left: 6, borderBottomWidth: 2, borderLeftWidth: 2 },
    bottomRight: { bottom: 6, right: 6, borderBottomWidth: 2, borderRightWidth: 2 },

    // Laser Line
    laserLine: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, backgroundColor: C.cyan,
        shadowColor: C.cyan, shadowRadius: 10, shadowOpacity: 1,
    },
    laserGlow: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: -12,
        backgroundColor: 'rgba(6, 182, 212, 0.25)',
    },

    // Typography
    title: {
        fontSize: 22, fontFamily: 'Nunito-Bold',
        color: C.white, marginBottom: 6, textAlign: 'center',
    },
    subtitle: {
        fontSize: 14, fontFamily: 'Nunito-Medium',
        color: C.textSecondary, textAlign: 'center', marginBottom: 28,
    },

    // Progress Bar
    progressBarBg: {
        width: 180, height: 4, borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%', backgroundColor: C.cyan,
        borderRadius: 2,
    },
});
