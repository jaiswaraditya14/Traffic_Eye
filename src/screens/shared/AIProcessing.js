// AIProcessing.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MobileContainer } from '../../components';
import { useAppContext } from '../../context';
import { aiService } from '../../services';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../utils';

export default function AIProcessing({ navigation }) {
    const { currentReport } = useAppContext();
    const [status, setStatus] = useState('Initializing AI...');
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        '🔍 Scanning image for violations...',
        '⚖️ Analyzing severity of violations...',
        '🔢 Reading vehicle number plate...',
        '📊 Calculating confidence level...',
        '✅ Finalizing results...',
    ];

    useEffect(() => {
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
                // Step 1: Scanning for violations
                setCurrentStep(0);
                setStatus(steps[0]);

                const results = await aiService.analyzeViolationImage(currentReport.image);

                // Step 2-4: Show progress steps quickly
                for (let i = 1; i < steps.length - 1; i++) {
                    setCurrentStep(i);
                    setStatus(steps[i]);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Step 5: Finalizing
                setCurrentStep(steps.length - 1);
                setStatus(steps[steps.length - 1]);

                // Check if no violation was detected
                if (results.violationDetected === false && results.violationType === 'None') {
                    Alert.alert(
                        '✅ No Violation Detected',
                        results.description || 'The AI did not detect any traffic violation in this image. Please try with a different image.',
                        [
                            {
                                text: 'Try Again',
                                onPress: () => navigation.goBack(),
                            },
                            {
                                text: 'Enter Manually',
                                onPress: () => navigation.replace('AIResultsVerification', { aiResults: results }),
                            },
                        ]
                    );
                    return;
                }

                // Violation found — proceed to results
                setTimeout(() => {
                    navigation.replace('AIResultsVerification', { aiResults: results });
                }, 500);

            } catch (error) {
                console.error('AI Processing Screen Error:', error);
                Alert.alert(
                    'AI Processing Failed',
                    'We couldn\'t analyze the image automatically. Please enter details manually.',
                    [
                        {
                            text: 'Enter Manually',
                            onPress: () => navigation.replace('AIResultsVerification', {
                                aiResults: { violationDetected: false, vehicleNumber: '', violationType: '', allViolations: [], severity: 'Unknown', confidence: 0 }
                            })
                        }
                    ]
                );
            }
        };

        processImage();
    }, [currentReport, navigation]);

    return (
        <MobileContainer>
            <View style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.title}>Analyzing Violation...</Text>
                <Text style={styles.subtitle}>{status}</Text>

                <View style={styles.detailsContainer}>
                    {steps.map((step, index) => (
                        <Text
                            key={index}
                            style={[
                                styles.detail,
                                index < currentStep && styles.detailDone,
                                index === currentStep && styles.detailActive,
                                index > currentStep && styles.detailPending,
                            ]}
                        >
                            {index < currentStep ? '✓ ' : index === currentStep ? '► ' : '○ '}
                            {step.replace(/^[^\s]+\s/, '')}
                        </Text>
                    ))}
                </View>
            </View>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.lg },
    title: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, marginTop: SPACING.lg, color: COLORS.textPrimary },
    subtitle: { fontSize: FONT_SIZES.md, marginTop: SPACING.sm, marginBottom: SPACING.xl, color: COLORS.primary },
    detailsContainer: {
        width: '100%',
        paddingHorizontal: SPACING.xl,
    },
    detail: { fontSize: FONT_SIZES.sm, marginTop: SPACING.sm, color: COLORS.textSecondary },
    detailDone: { color: '#22c55e' },
    detailActive: { color: COLORS.primary, fontWeight: FONT_WEIGHTS.semiBold },
    detailPending: { color: COLORS.textSecondary, opacity: 0.5 },
});

