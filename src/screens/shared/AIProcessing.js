import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, Animated, Easing, Alert, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context';
import { aiService } from '../../services';

const C = {
    navy:          '#002452',
    navyMid:       '#1B3A6B',
    amber:         '#F59E0B',
    amberDim:      'rgba(245,158,11,0.18)',
    white:         '#FFFFFF',
    textSecondary: '#A0AEC0',
    success:       '#34D399',
    successDim:    'rgba(52,211,153,0.15)',
};

// Steps with their estimated start times (ms from kick-off).
// These run concurrently with the real API call so the UI always feels alive.
const STEPS = [
    { label: 'Preparing image for analysis…',     startAt:     0, icon: 'image-outline'         },
    { label: 'Scanning scene for violations…',    startAt:  2500, icon: 'search-outline'         },
    { label: 'Identifying primary violator…',     startAt:  7000, icon: 'car-outline'            },
    { label: 'Running dedicated plate OCR…',      startAt: 13000, icon: 'barcode-outline'        },
    { label: 'Verifying number plate accuracy…',  startAt: 19000, icon: 'checkmark-circle-outline'},
    { label: 'Finalizing results…',               startAt: 24000, icon: 'sparkles-outline'       },
];

export default function AIProcessing({ navigation }) {
    const { currentReport } = useAppContext();

    const [stepIdx,  setStepIdx]  = useState(0);
    const [stepDone, setStepDone] = useState(false); // true = results in hand

    const spinValue  = useRef(new Animated.Value(0)).current;
    const pulseValue = useRef(new Animated.Value(1)).current;
    const fadeValue  = useRef(new Animated.Value(1)).current;

    // ── Animations ─────────────────────────────────────────────────────────────
    useEffect(() => {
        Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1, duration: 2800,
                easing: Easing.linear, useNativeDriver: true,
            })
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseValue, { toValue: 1.18, duration: 900,  useNativeDriver: true }),
                Animated.timing(pulseValue, { toValue: 1,    duration: 900,  useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Cross-fade between step labels
    const transitionStep = (idx) => {
        Animated.sequence([
            Animated.timing(fadeValue, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(fadeValue, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start();
        setStepIdx(idx);
    };

    // ── Main logic ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!currentReport?.image) {
            // No image — skip straight to manual entry
            setTimeout(() => navigation.replace('AIResultsVerification', {
                aiResults: {
                    violationDetected: false,
                    vehicleNumber: '', violationType: '',
                    allViolations: [], severity: 'None', confidence: 0,
                },
            }), 1500);
            return;
        }

        // Timer-based step progression (concurrent with real API call)
        const stepTimers = STEPS.map((step, i) =>
            setTimeout(() => {
                if (!stepDone) transitionStep(i);
            }, step.startAt)
        );

        let didNavigate = false;

        const run = async () => {
            try {
                const results = await aiService.analyzeViolationImage(currentReport.image);

                // Clear fake progress timers — result is back
                stepTimers.forEach(clearTimeout);
                setStepDone(true);
                transitionStep(STEPS.length - 1); // "Finalizing…"

                await new Promise(r => setTimeout(r, 600)); // brief pause on last step

                if (didNavigate) return;
                didNavigate = true;

                if (!results.violationDetected) {
                    Alert.alert(
                        'No Violation Detected',
                        results.description || 'The AI did not detect any traffic violation in this image.',
                        [
                            { text: 'Try Again',     style: 'cancel', onPress: () => navigation.goBack() },
                            { text: 'Enter Manually', onPress: () => navigation.replace('AIResultsVerification', { aiResults: results }) },
                        ]
                    );
                    return;
                }

                navigation.replace('AIResultsVerification', { aiResults: results });

            } catch (error) {
                stepTimers.forEach(clearTimeout);
                console.error('[AIProcessing] Error:', error);
                if (didNavigate) return;
                didNavigate = true;
                Alert.alert(
                    'Analysis Failed',
                    'Could not analyze the image automatically. You can enter the details manually.',
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
        return () => { stepTimers.forEach(clearTimeout); didNavigate = true; };
    }, [currentReport, navigation]);

    const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const currentStep = STEPS[stepIdx] ?? STEPS[0];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Radar animator */}
            <View style={styles.radarWrapper}>
                <Animated.View style={[styles.outerRing, { transform: [{ scale: pulseValue }] }]} />
                <Animated.View style={[styles.spinRing,  { transform: [{ rotate: spin }] }]}>
                    <View style={styles.scanSweep} />
                </Animated.View>
                <View style={styles.iconBg}>
                    <Ionicons name={currentStep.icon} size={32} color={C.amber} />
                </View>
            </View>

            {/* Step counter dots */}
            <View style={styles.dotsRow}>
                {STEPS.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            i === stepIdx && styles.dotActive,
                            i < stepIdx  && styles.dotDone,
                        ]}
                    />
                ))}
            </View>

            <Text style={styles.title}>AI Analysis in Progress</Text>

            <Animated.Text style={[styles.subtitle, { opacity: fadeValue }]}>
                {currentStep.label}
            </Animated.Text>

            <Text style={styles.hint}>
                Step {stepIdx + 1} of {STEPS.length}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1, backgroundColor: C.navy,
        justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 32,
    },

    // Radar
    radarWrapper: {
        width: 180, height: 180,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 36,
    },
    outerRing: {
        position: 'absolute',
        width: 160, height: 160, borderRadius: 80,
        backgroundColor: C.amberDim,
        borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.35)',
    },
    spinRing: {
        position: 'absolute',
        width: 180, height: 180, borderRadius: 90,
        borderTopColor: C.amber, borderTopWidth: 2.5,
        borderRightColor: 'transparent', borderRightWidth: 2.5,
        borderBottomColor: 'transparent', borderBottomWidth: 2.5,
        borderLeftColor: 'transparent', borderLeftWidth: 2.5,
    },
    scanSweep: {
        position: 'absolute', top: 0, left: 90,
        width: 90, height: 90,
        backgroundColor: 'rgba(245,158,11,0.08)',
        borderLeftWidth: 1, borderLeftColor: 'rgba(245,158,11,0.6)',
    },
    iconBg: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: 'rgba(245,158,11,0.12)',
        borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
        justifyContent: 'center', alignItems: 'center',
    },

    // Step dots
    dotsRow: {
        flexDirection: 'row', gap: 6, marginBottom: 32,
    },
    dot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dotActive: {
        width: 18, backgroundColor: C.amber, borderRadius: 3,
    },
    dotDone: {
        backgroundColor: C.success,
    },

    title: {
        fontSize: 22, fontFamily: 'Nunito-Bold',
        color: C.white, marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15, color: C.amber,
        fontFamily: 'Nunito-SemiBold',
        textAlign: 'center', lineHeight: 22,
        minHeight: 44,
    },
    hint: {
        marginTop: 12,
        fontSize: 12, fontFamily: 'Nunito-Medium',
        color: 'rgba(255,255,255,0.3)',
    },
});
