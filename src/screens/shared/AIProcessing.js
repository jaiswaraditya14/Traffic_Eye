import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Animated, Easing, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext, useAuth } from '../../context';
import { aiService } from '../../services';
import { checkPlateDuplicate, checkUserRateLimit } from '../../services/reports';
import { FocusAwareStatusBar } from '../../components';

const C = {
    navy:          '#0F2C59',
    navyCard:      '#1E3A8A',
    amber:         '#D97706',
    white:         '#FFFFFF',
    textPrimary:   '#FFFFFF',
    textSecondary: '#E2E8F0',
    border:        '#3B82F6',
};

// ─── Normalize plate for DB lookup ────────────────────────────────────────────
// Strips spaces and converts to uppercase: "MH 12 AB 1234" → "MH12AB1234"
const normalizePlate = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    const n = raw.replace(/\s+/g, '').toUpperCase();
    // Must be at least 4 chars and not a placeholder string
    if (n.length < 4 || n === 'NOTDETECTED' || n === 'NOTAPPLICABLE' || n === 'N/A') return null;
    return n;
};

export default function AIProcessing({ navigation }) {
    const { currentReport, setCurrentReport } = useAppContext();
    const { user } = useAuth();

    const pulseAnim    = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,    duration: 1000, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(progressAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
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
                // ══════════════════════════════════════════════════════════
                // STAGE -1 — Rate Limit Check (Max 3 reports per hour)
                // ══════════════════════════════════════════════════════════
                if (user?.id) {
                    console.log('[AIProcessing] Pre-flight — checking rate limit for user', user.id);
                    const { allowed, count, remainingMinutes } = await checkUserRateLimit(user.id, 3);
                    if (!allowed) {
                        if (didNavigate) return;
                        didNavigate = true;
                        Alert.alert(
                            'Hourly Report Limit Reached',
                            `You have submitted ${count} reports in the last hour.\n\n` +
                            `To ensure system quality and prevent abuse, citizens are limited to 3 reports per hour. Please wait ${remainingMinutes} minute(s) before submitting another report.`,
                            [{ text: 'Understood', style: 'default', onPress: () => navigation.goBack() }]
                        );
                        return;
                    }
                }

                // Strip any cache-buster query string from the URI before processing
                const rawUri = currentReport.image.split('?')[0];

                // ═══════════════════════════════════════════════════════════════════
                // CONCURRENT INTAKE PIPELINE
                //   Task A — AI Authenticity Check (staggered 250ms, non-blocking)
                //   Task B — Vision Violation Detection (Stage 1 + lazy Stage 2)
                //
                // Plate-OCR duplicate check runs AFTER Task B using the plate
                // extracted from Task B — no extra model call needed.
                // ═══════════════════════════════════════════════════════════════════
                console.log('[AIProcessing] Launching vision detection...');

                // Vision Violation Detection (Stage 1, optional Stage 1.5 + Stage 2)
                const results = await aiService.analyzeViolationImage(currentReport.image);

                // ── Plate-OCR Duplicate Check (uses plate from Task B — 0 extra API calls) ──
                // POSSIBLE_DUPLICATE ≠ automatic rejection. Officer still reviews.
                // PLATE_NOT_DETECTED → skip check; user enters plate manually.
                let possibleDuplicate = false;
                let duplicateExistingId = null;

                const normalizedPlate = normalizePlate(results?.vehicleNumber);
                if (normalizedPlate) {
                    try {
                        console.log(`[AIProcessing] Plate duplicate check: "${normalizedPlate}"`);
                        const { isDuplicate, existingReportId } = await checkPlateDuplicate(normalizedPlate);
                        if (isDuplicate) {
                            possibleDuplicate = true;
                            duplicateExistingId = existingReportId;
                            console.log(`[AIProcessing] ⚠️ POSSIBLE_DUPLICATE — plate "${normalizedPlate}" already in report ${existingReportId}`);
                        } else {
                            console.log(`[AIProcessing] ✅ UNIQUE — plate "${normalizedPlate}" not previously reported`);
                        }
                    } catch (e) {
                        // Fail open — a network error must not block a legitimate report
                        console.warn('[AIProcessing] Plate duplicate check error (failing open):', e.message);
                    }
                } else {
                    console.log('[AIProcessing] PLATE_NOT_DETECTED — skipping duplicate check');
                }

                if (didNavigate) return;
                didNavigate = true;

                if (!results.violationDetected) {
                    Alert.alert(
                        'Could Not Detect Violation',
                        'We could not identify a violation in this image.\n\nYou can try again with a clearer photo, or enter the violation details manually.',
                        [
                            { text: 'Try Again',      style: 'cancel', onPress: () => navigation.goBack() },
                            { text: 'Enter Manually', style: 'default', onPress: () => navigation.replace('AIResultsVerification', {
                                aiResults: results,
                                possibleDuplicate,
                                duplicateExistingId,
                            }) },
                        ]
                    );
                    return;
                }

                navigation.replace('AIResultsVerification', {
                    aiResults: results,
                    possibleDuplicate,
                    duplicateExistingId,
                });

            } catch (err) {
                if (didNavigate) return;
                didNavigate = true;
                console.error('[AIProcessing] Pipeline error:', err);
                Alert.alert(
                    'Analysis Unavailable',
                    'We could not analyze this image right now.\n\nPlease enter the violation details manually.',
                    [{ text: 'Enter Manually', style: 'default', onPress: () => navigation.replace('AIResultsVerification', {
                        aiResults: {
                            violationDetected: false, vehicleNumber: '', violationType: '',
                            allViolations: [], severity: 'None', confidence: 0,
                            description: 'Image could not be analyzed. Please enter the violation details manually.',
                        },
                    })}]
                );
            }
        };

        const timer = setTimeout(run, 300);
        return () => { didNavigate = true; clearTimeout(timer); };
    }, [currentReport?.image, navigation]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['15%', '95%'],
    });

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />

            {/* Official Badge Header */}
            <View style={styles.badgeContainer}>
                <Ionicons name="shield-checkmark" size={18} color="#F59E0B" />
                <Text style={styles.badgeText}>TRAFFIC EYE AI ANALYSIS</Text>
            </View>

            {/* Pulsing AI Icon */}
            <Animated.View style={[styles.card, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.iconCircle}>
                    <Ionicons name="hardware-chip-outline" size={44} color="#D97706" />
                </View>
            </Animated.View>

            {/* Title & Status */}
            <Text style={styles.title}>Analyzing Evidence</Text>
            <Text style={styles.subtitle}>Verifying license plate, location, and offense details</Text>

            {/* Progress Bar */}
            <View style={styles.progressBarBg}>
                <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.navy,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(217, 119, 6, 0.5)',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 36,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
        color: '#FFFFFF',
        letterSpacing: 0.8,
    },
    card: {
        width: 110,
        height: 110,
        borderRadius: 24,
        backgroundColor: C.navyCard,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: C.border,
        marginBottom: 32,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Nunito-Medium',
        color: C.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    progressBarBg: {
        width: 220,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: C.amber,
    },
});
