import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context';
import { aiService } from '../../services';

const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    white: '#FFFFFF',
    textSecondary: '#A0AEC0',
};

export default function AIProcessing({ navigation }) {
    const { currentReport } = useAppContext();
    const [status, setStatus] = useState('Initializing AI...');
    const [currentStep, setCurrentStep] = useState(0);

    const spinValue = useRef(new Animated.Value(0)).current;
    const pulseValue = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Spin animation
        Animated.loop(
            Animated.timing(spinValue, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
        ).start();

        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseValue, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseValue, { toValue: 1, duration: 1000, useNativeDriver: true })
            ])
        ).start();

        const processImage = async () => {
            if (!currentReport?.image) {
                setTimeout(() => {
                    navigation.replace('AIResultsVerification', {
                        aiResults: { violationDetected: false, vehicleNumber: 'N/A', violationType: 'None', allViolations: [], severity: 'None', confidence: 0 }
                    });
                }, 2000);
                return;
            }

            try {
                const steps = [
                    'Scanning image for violations...',
                    'Analyzing severity of violations...',
                    'Reading vehicle number plate...',
                    'Calculating confidence level...',
                    'Finalizing results...'
                ];

                setCurrentStep(0); setStatus(steps[0]);
                const results = await aiService.analyzeViolationImage(currentReport.image);

                for (let i = 1; i < steps.length - 1; i++) {
                    setCurrentStep(i); setStatus(steps[i]);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                setCurrentStep(steps.length - 1); setStatus(steps[steps.length - 1]);

                if (results.violationDetected === false && results.violationType === 'None') {
                    Alert.alert('No Violation Detected', results.description || 'The AI did not detect any traffic violation.', [
                        { text: 'Try Again', onPress: () => navigation.goBack() },
                        { text: 'Enter Manually', onPress: () => navigation.replace('AIResultsVerification', { aiResults: results }) },
                    ]);
                    return;
                }

                setTimeout(() => { navigation.replace('AIResultsVerification', { aiResults: results }); }, 500);

            } catch (error) {
                console.error('AI Processing Screen Error:', error);
                Alert.alert('AI Processing Failed', 'We couldn\'t analyze the image automatically.', [
                    { text: 'Enter Manually', onPress: () => navigation.replace('AIResultsVerification', { aiResults: { violationDetected: false, vehicleNumber: '', violationType: '', allViolations: [], severity: 'Unknown', confidence: 0 } }) }
                ]);
            }
        };

        processImage();
    }, [currentReport, navigation]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <View style={styles.container}>
            <View style={styles.radarWrapper}>
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseValue }] }]} />
                <Animated.View style={[styles.spinCircle, { transform: [{ rotate: spin }] }]}>
                    <View style={styles.scanLine} />
                </Animated.View>
                <Ionicons name="scan" size={48} color={C.amber} style={styles.centerIcon} />
            </View>

            <Text style={styles.title}>AI Analysis in Progress</Text>
            <Text style={styles.subtitle}>{status}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.navy, justifyContent: 'center', alignItems: 'center' },
    radarWrapper: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
    pulseCircle: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
    spinCircle: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderTopColor: C.amber, borderTopWidth: 2, borderRightColor: 'transparent', borderRightWidth: 2, borderBottomColor: 'transparent', borderBottomWidth: 2, borderLeftColor: 'transparent', borderLeftWidth: 2, opacity: 0.8 },
    scanLine: { position: 'absolute', top: 0, left: 80, width: 80, height: 80, backgroundColor: 'rgba(245, 158, 11, 0.15)', borderLeftWidth: 1, borderLeftColor: C.amber },
    centerIcon: { position: 'absolute' },
    title: { fontSize: 24, fontWeight: '800', color: C.white, marginBottom: 12 },
    subtitle: { fontSize: 16, color: C.amber, fontWeight: '600' },
});
