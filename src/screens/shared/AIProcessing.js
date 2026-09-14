import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, Animated, Easing, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext, useAuth } from '../../context';
import { aiService } from '../../services';
import { COLORS, DARK_COLORS } from '../../utils/theme';
import { buildManualReviewResult } from '../../services/ai/manualReview';
import { checkPlateDuplicate, checkUserRateLimit } from '../../services/reports';
import { FocusAwareStatusBar, PressableScale, ConfirmationModal, StepIndicator } from '../../components';


import { buildDemoAiResult } from '../../services/demoMode';
import { aiStageIndex } from '../../utils/productExperience';
import useReducedMotion from '../../hooks/useReducedMotion';

export const AI_STAGES = [
    { label: 'Scanning image', icon: 'image-outline' },
    { label: 'Detecting vehicles', icon: 'car-outline' },
    { label: 'Reading plate', icon: 'document-text-outline' },
    { label: 'Cross-checking evidence', icon: 'shield-checkmark-outline' },
    { label: 'Report ready', icon: 'checkmark-circle-outline' },
];
// ─── Normalize plate for DB lookup ────────────────────────────────────────────
// Strips spaces and converts to uppercase: "MH 12 AB 1234" → "MH12AB1234"
const normalizePlate = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    const n = raw.replace(/\s+/g, '').toUpperCase();
    // Must be at least 4 chars and not a placeholder string
    if (n.length < 4 || n === 'NOTDETECTED' || n === 'NOTAPPLICABLE' || n === 'N/A') return null;
    return n;
};

// A pipeline result whose description is prefixed ANALYSIS_FAILED means the
// vision providers were unreachable / unparseable — i.e. AI is *unavailable*,
// as opposed to a genuine "insufficient evidence" manual-review outcome. These
// are routed to the error phase (Try Again / manual review), not the normal
// inconclusive-result alerts.
const isAiUnavailable = (results) =>
    typeof results?.description === 'string' && results.description.startsWith('ANALYSIS_FAILED');

// Result object attached to a report submitted for manual review because AI was
// unavailable. Persisted into ai_raw_result so officers can see the report was
// never machine-assessed and why.

export default function AIProcessing({ navigation }) {
    const reduced = useReducedMotion();
    const { currentReport } = useAppContext();
    const { user } = useAuth();

    const pulseAnim    = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const [stageLabel, setStageLabel] = useState('Preparing image...');
    const [phase, setPhase] = useState('processing'); // 'processing' | 'error'
    const [manualModalVisible, setManualModalVisible] = useState(false);

    // Concurrency + lifecycle guards.
    const runningRef   = useRef(false); // prevents overlapping analysis loops
    const abortRef     = useRef(null);  // AbortController for the in-flight run
    const isMountedRef = useRef(true);

    useEffect(() => {
        if (reduced) { pulseAnim.setValue(1); progressAnim.setValue(1); return; }
        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,    duration: 1000, useNativeDriver: true }),
            ])
        );

        const progressLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(progressAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
                Animated.timing(progressAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
            ])
        );
        pulseLoop.start();
        progressLoop.start();
        return () => { pulseLoop.stop(); progressLoop.stop(); };
    }, [pulseAnim, progressAnim, reduced]);

    // ── Main Execution ───────────────────────────────────────────────────────
    const startAnalysis = useCallback(async () => {
        // No overlapping runs: a second trigger (e.g. Try Again while a run is
        // still winding down) is ignored until the current one settles.
        if (runningRef.current && !abortRef.current?.signal.aborted) return;

        if (currentReport?.demo) {
            setStageLabel('Report ready');
            navigation.replace('AIResultsVerification', { aiResults: buildDemoAiResult() });
            return;
        }
        if (!currentReport?.image) {
            navigation.replace('AIResultsVerification', {
                aiResults: {
                    violationDetected: false,
                    vehicleNumber: '', violationType: '',
                    allViolations: [], severity: 'None', confidence: 0,
                },
            });
            return;
        }

        runningRef.current = true;
        const controller = new AbortController();
        abortRef.current = controller;
        const { signal } = controller;

        // Reset UI to the processing state for this (possibly repeat) attempt.
        if (isMountedRef.current) {
            setPhase('processing');
            setStageLabel('Preparing image...');
        }

        // Guard every navigation/alert behind mount + abort so an unmounted or
        // superseded run can never drive the UI.
        const live = () => isMountedRef.current && !signal.aborted;

        try {
            // ══════════════════════════════════════════════════════════════════
            // STAGE -1 — Rate Limit Check (fail-closed: block when unverifiable)
            // ══════════════════════════════════════════════════════════════════
            const { allowed, indeterminate, count, remainingMinutes } = await checkUserRateLimit(user?.id, 3);
            if (signal.aborted) return;
            if (!allowed) {
                if (!live()) return;
                if (indeterminate) {
                    // Could not establish the count — do NOT let the report through
                    // (that would bypass the limiter). Offer a safe retry.
                    Alert.alert(
                        'Couldn\'t Verify Activity',
                        'We couldn\'t confirm your recent report activity. Please check your connection and try again.',
                        [
                            { text: 'Go Back', style: 'cancel', onPress: () => navigation.goBack() },
                            { text: 'Try Again', style: 'default', onPress: () => startAnalysis() },
                        ]
                    );
                } else {
                    Alert.alert(
                        'Hourly Report Limit Reached',
                        `You have submitted ${count} reports in the last hour.\n\n` +
                        `To ensure system quality and prevent abuse, citizens are limited to 3 reports per hour. Please wait ${remainingMinutes} minute(s) before submitting another report.`,
                        [{ text: 'Understood', style: 'default', onPress: () => navigation.goBack() }]
                    );
                }
                return;
            }

            // Preserve the selected evidence URI, including access-bearing query parameters.
            const rawUri = currentReport.image;

            // ═══════════════════════════════════════════════════════════════════
            // Vision Violation Detection — with live stage callbacks and a signal
            // so transient-failure retries stop the moment this screen unmounts.
            // ═══════════════════════════════════════════════════════════════════
            const results = await aiService.analyzeViolationImage(rawUri, {
                signal,
                onStageChange: (label) => {
                    if (isMountedRef.current && !signal.aborted) setStageLabel(label);
                },
            });
            if (signal.aborted) return;

            // AI unavailable (providers down / unparseable) → dedicated error phase
            // offering Try Again or an explicit manual-review submission.
            if (isAiUnavailable(results)) {
                if (live()) setPhase('error');
                return;
            }

            // ── Plate-OCR Duplicate Check (fail-closed) ────────────────────────
            // POSSIBLE_DUPLICATE ≠ automatic rejection — the officer still reviews.
            // A failed check blocks progression; the shared service also checks the
            // final edited plate immediately before submission.
            let possibleDuplicate = false;
            let duplicateExistingId = null;

            const normalizedPlate = normalizePlate(results?.vehicleNumber);
            if (normalizedPlate) {
                const { isDuplicate, indeterminate: dupIndeterminate, existingReportId } = await checkPlateDuplicate(normalizedPlate);
                if (signal.aborted) return;
                if (isDuplicate) {
                    possibleDuplicate = true;
                    duplicateExistingId = existingReportId;
                } else if (dupIndeterminate) {
                    if (live()) Alert.alert(
                        'Could not verify plate',
                        'Please check your connection and try again before submitting.',
                        [
                            { text: 'Go Back', onPress: () => navigation.goBack() },
                            { text: 'Try Again', onPress: () => startAnalysis() },
                        ]
                    );
                    return;
                }
            }

            if (!live()) return;

            if (results.requiresManualReview && !results.violationDetected) {
                Alert.alert(
                    'Manual Review Required',
                    'The image does not contain enough clear evidence for an automatic decision.\n\nPlease enter the violation details manually for officer review.',
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

            setStageLabel('Report ready');
            navigation.replace('AIResultsVerification', {
                aiResults: results,
                possibleDuplicate,
                duplicateExistingId,
            });

        } catch (err) {
            // Cancellation (unmount / user navigated away) is silent.
            if (signal.aborted || err?.code === 'CANCELLED') return;
            if (__DEV__) console.warn('[AIProcessing] Analysis unavailable.');
            if (isMountedRef.current) setPhase('error');
        } finally {
            if (abortRef.current === controller) runningRef.current = false;
        }
    }, [currentReport?.image, currentReport?.demo, user?.id, navigation]);

    useEffect(() => {
        isMountedRef.current = true;
        // Small delay lets the screen paint and the animations begin first.
        const timer = setTimeout(startAnalysis, 300);
        return () => {
            isMountedRef.current = false;
            clearTimeout(timer);
            // Cancel any in-flight retry loop so it can't run after unmount.
            abortRef.current?.abort();
        };
    }, [startAnalysis]);

    const handleTryAgain = useCallback(() => {
        if (runningRef.current) return;
        startAnalysis();
    }, [startAnalysis]);

    const handleSubmitManual = useCallback(() => {
        setManualModalVisible(false);
        navigation.replace('AIResultsVerification', {
            aiResults: buildManualReviewResult(),
            possibleDuplicate: false,
            duplicateExistingId: null,
        });
    }, [navigation]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['15%', '95%'],
    });

    // ── Error phase — AI unavailable ───────────────────────────────────────────
    if (phase === 'error') {
        return (
            <ScrollView contentContainerStyle={styles.container}>
                <FocusAwareStatusBar barStyle="light-content" statusBgColor={COLORS.primary} />

                <View style={styles.badgeContainer}>
                    <Ionicons name="shield-checkmark" size={18} color={COLORS.secondaryLight} />
                    <Text style={styles.badgeText}>TRAFFIC EYE AI ANALYSIS</Text>
                </View>

                <View style={styles.errorIconCircle}>
                    <Ionicons name="cloud-offline-outline" size={44} color={DARK_COLORS.errorLight} />
                </View>

                <Text style={styles.title}>Analysis Unavailable</Text>
                <Text style={styles.subtitle}>
                    We couldn&apos;t analyze this image right now. You can try again, or submit
                    the report for a certified officer to review manually.
                </Text>

                <PressableScale
                    onPress={handleTryAgain}
                    style={styles.primaryBtn}
                    accessibilityLabel="Try again"
                    accessibilityHint="Retries AI analysis of this image"
                >
                    <Ionicons name="refresh" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Try Again</Text>
                </PressableScale>

                <PressableScale
                    onPress={() => setManualModalVisible(true)}
                    style={styles.secondaryBtn}
                    accessibilityLabel="Submit for manual review"
                    accessibilityHint="Submits this report for an officer to review without AI"
                >
                    <Text style={styles.secondaryBtnText}>Submit for Manual Review</Text>
                </PressableScale>

                <PressableScale
                    onPress={() => navigation.goBack()}
                    style={styles.goBackBtn}
                    accessibilityLabel="Go back"
                >
                    <Text style={styles.goBackText}>Go Back</Text>
                </PressableScale>

                <ConfirmationModal
                    visible={manualModalVisible}
                    title="Submit for manual review?"
                    message="AI analysis is unavailable. Your report will be sent to a certified traffic officer to review manually."
                    icon="person-outline"
                    confirmLabel="Submit"
                    cancelLabel="Not now"
                    onConfirm={handleSubmitManual}
                    onCancel={() => setManualModalVisible(false)}
                />
            </ScrollView>
        );
    }

    // ── Processing phase ────────────────────────────────────────────────────────
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={COLORS.primary} />

            {/* Official Badge Header */}
            <View style={styles.badgeContainer}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.secondaryLight} />
                <Text style={styles.badgeText}>TRAFFIC EYE AI ANALYSIS</Text>
            </View>

            {/* Pulsing AI Icon */}
            <Animated.View style={[styles.card, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.iconCircle}>
                    <Ionicons name="hardware-chip-outline" size={44} color={COLORS.secondary} />
                </View>
            </Animated.View>

            {/* Title & Status */}
            <Text style={styles.title}>Analyzing Evidence</Text>
            <Text style={styles.subtitle}>{stageLabel}</Text>

            <StepIndicator labels={AI_STAGES} active={aiStageIndex(stageLabel)} vertical />

            {/* Progress Bar */}
            <View style={styles.progressBarBg}>
                <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingVertical: 48,
        backgroundColor: COLORS.primary,
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
        color: COLORS.surface,
        letterSpacing: 0.8,
    },
    card: {
        width: 110,
        height: 110,
        borderRadius: 24,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.primaryBorder,
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
        color: COLORS.textInverse,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Nunito-Medium',
        color: COLORS.gray200,
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
        backgroundColor: COLORS.secondary,
    },

    // ── Error phase ──
    errorIconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: DARK_COLORS.errorSurface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(252, 165, 165, 0.35)',
        marginBottom: 24,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.secondary,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        width: '100%',
        maxWidth: 320,
    },
    primaryBtnText: {
        fontSize: 16,
        fontFamily: 'Nunito-ExtraBold',
        color: COLORS.white,
        letterSpacing: 0.3,
    },
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderRadius: 16,
        paddingVertical: 15,
        paddingHorizontal: 24,
        width: '100%',
        maxWidth: 320,
        borderWidth: 1.5,
        borderColor: COLORS.primaryBorder,
        marginTop: 12,
    },
    secondaryBtnText: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        color: COLORS.white,
    },
    goBackBtn: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        marginTop: 6,
    },
    goBackText: {
        fontSize: 14,
        fontFamily: 'Nunito-SemiBold',
        color: COLORS.gray200,
    },
});
