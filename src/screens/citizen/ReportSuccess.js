/**
 * ReportSuccess.js — Successful report submission confirmation
 * Shows: animated checkmark, what-happens-next steps, navigation options.
 */
import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Animated, BackHandler, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FocusAwareStatusBar } from '../../components';

const C = {
    navy: '#0A1E3F',
    navyMid: '#0F2C59',
    amber: '#D97706',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    success: '#15803D',
    successSurface: '#DCFCE7',
    border: '#E2E8F0',
};

const NEXT_STEPS = [
    {
        icon: 'scan',
        color: '#1D4ED8',
        bg: '#DBEAFE',
        title: 'AI Analysis',
        desc: 'Our AI verifies the licence plate, location, and violation type.',
    },
    {
        icon: 'shield-checkmark',
        color: '#047857',
        bg: '#D1FAE5',
        title: 'Officer Review',
        desc: 'A Traffic Enforcement Officer reviews your submission for validity.',
    },
    {
        icon: 'notifications',
        color: '#B45309',
        bg: '#FEF3C7',
        title: 'You Get Notified',
        desc: "You'll receive an in-app notification once your report is approved or actioned.",
    },
];

export default function ReportSuccess({ navigation }) {
    const scaleAnim = useRef(new Animated.Value(0.4)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const stepsAnim = useRef(new Animated.Value(0)).current;
    const ringAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        // Entrance
        Animated.sequence([
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            ]),
            Animated.timing(stepsAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();

        // Pulse ring loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(ringAnim, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
                Animated.timing(ringAnim, { toValue: 0.8, duration: 1200, useNativeDriver: true }),
            ])
        ).start();

        // Block hardware back → go home
        const onBackPress = () => {
            navigation.reset({ index: 0, routes: [{ name: 'CitizenMain' }] });
            return true;
        };
        const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backSub.remove();
    }, [navigation]);

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="dark-content" statusBgColor={C.offWhite} />
            <SafeAreaView style={styles.safe}>
                <Animated.ScrollView
                    style={{ opacity: fadeAnim }}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Animated checkmark ── */}
                    <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
                        {/* Pulse ring */}
                        <Animated.View style={[styles.pulseRing, { transform: [{ scale: ringAnim }] }]} />
                        <View style={styles.iconOuter}>
                            <View style={styles.iconInner}>
                                <Ionicons name="checkmark-circle" size={64} color={C.success} />
                            </View>
                        </View>
                    </Animated.View>

                    {/* ── Title ── */}
                    <Text style={styles.title}>Report Submitted!</Text>
                    <Text style={styles.subtitle}>
                        Your report has been received and AI analysis has begun. The officer will be notified.
                    </Text>

                    {/* ── What happens next ── */}
                    <Animated.View style={[styles.stepsCard, { opacity: stepsAnim }]}>
                        <View style={styles.stepsHeader}>
                            <Ionicons name="time-outline" size={16} color={C.navyMid} />
                            <Text style={styles.stepsTitle}>What happens next?</Text>
                        </View>
                        {NEXT_STEPS.map((step, idx) => (
                            <View key={idx} style={styles.step}>
                                {/* Step number + connector */}
                                <View style={styles.stepLeft}>
                                    <View style={[styles.stepIconFrame, { backgroundColor: step.bg }]}>
                                        <Ionicons name={step.icon} size={18} color={step.color} />
                                    </View>
                                    {idx < NEXT_STEPS.length - 1 && <View style={styles.stepConnector} />}
                                </View>
                                <View style={styles.stepRight}>
                                    <Text style={styles.stepTitle}>{step.title}</Text>
                                    <Text style={styles.stepDesc}>{step.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </Animated.View>

                    {/* ── Buttons ── */}
                    <View style={styles.btnGroup}>
                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'CitizenMain' }] })}
                            activeOpacity={0.88}
                        >
                            <LinearGradient
                                colors={[C.navy, C.navyMid]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.primaryGrad}
                            >
                                <Ionicons name="home" size={18} color={C.amber} />
                                <Text style={styles.primaryText}>Back to Home</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={() => navigation.navigate('CitizenMain', { screen: 'Reports' })}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="document-text-outline" size={17} color={C.navyMid} />
                            <Text style={styles.secondaryText}>View My Reports</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 32 }} />
                </Animated.ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safe: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        alignItems: 'center',
    },

    // Animated icon
    iconWrap: { alignItems: 'center', marginBottom: 28, position: 'relative' },
    pulseRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#DCFCE7',
        opacity: 0.5,
    },
    iconOuter: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: C.successSurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: C.surface,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 8,
    },

    title: {
        fontSize: 26,
        fontFamily: 'Nunito-ExtraBold',
        color: C.textPrimary,
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Nunito-Regular',
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
        paddingHorizontal: 8,
    },

    // What happens next card
    stepsCard: {
        width: '100%',
        backgroundColor: C.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 28,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 14,
        elevation: 4,
    },
    stepsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    stepsTitle: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: C.navyMid,
    },
    step: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 0,
    },
    stepLeft: {
        alignItems: 'center',
        width: 40,
    },
    stepIconFrame: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepConnector: {
        width: 2,
        flex: 1,
        backgroundColor: C.border,
        marginVertical: 4,
        minHeight: 20,
    },
    stepRight: {
        flex: 1,
        paddingBottom: 20,
    },
    stepTitle: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        marginBottom: 3,
    },
    stepDesc: {
        fontSize: 12,
        fontFamily: 'Nunito-Regular',
        color: C.textSecondary,
        lineHeight: 18,
    },

    // Buttons
    btnGroup: { alignSelf: 'stretch', gap: 12 },
    primaryBtn: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
    },
    primaryGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 18,
    },
    primaryText: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.white },
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: C.surface,
        borderWidth: 1.5,
        borderColor: C.border,
    },
    secondaryText: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.navyMid },
});
