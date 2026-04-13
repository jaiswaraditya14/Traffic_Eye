import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
    Platform, ScrollView, Alert, ActivityIndicator, Animated,
    StatusBar, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { supabase } from '../../services';

const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    error: '#BA1A1A',
    errorSurface: '#FFDAD6',
    success: '#059669',
    successSurface: '#D1FAE5',
};

const OTP_LENGTH = 8;

export default function OtpVerification({ navigation, route }) {
    const { email } = route.params || {};

    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const inputRefs = useRef([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const cooldownRef = useRef(null);

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        startCooldown();
        // Auto-focus first input
        setTimeout(() => inputRefs.current[0]?.focus(), 500);
        return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
    }, []);

    const startCooldown = () => {
        setResendCooldown(60);
        setCanResend(false);
        cooldownRef.current = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(cooldownRef.current);
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const shakeError = () => {
        shakeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleOtpChange = (value, index) => {
        setError('');
        // Handle paste of full OTP
        if (value.length > 1) {
            const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
            const newOtp = [...otp];
            digits.forEach((d, i) => { if (index + i < OTP_LENGTH) newOtp[index + i] = d; });
            setOtp(newOtp);
            const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
            inputRefs.current[nextIndex]?.focus();
            return;
        }

        const digit = value.replace(/\D/g, '');
        const newOtp = [...otp];
        newOtp[index] = digit;
        setOtp(newOtp);

        if (digit && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace') {
            if (otp[index]) {
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            } else if (index > 0) {
                inputRefs.current[index - 1]?.focus();
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
            }
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < OTP_LENGTH) {
            setError('Please enter the complete 8-digit code.');
            shakeError();
            return;
        }

        setLoading(true);
        setError('');
        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: code,
                type: 'recovery',
            });

            if (verifyError) {
                if (verifyError.message?.toLowerCase().includes('expired')) {
                    setError('This code has expired. Please request a new one.');
                } else if (verifyError.message?.toLowerCase().includes('invalid')) {
                    setError('Invalid code. Please check and try again.');
                } else {
                    setError(verifyError.message || 'Verification failed. Please try again.');
                }
                shakeError();
                setOtp(Array(OTP_LENGTH).fill(''));
                setTimeout(() => inputRefs.current[0]?.focus(), 100);
                return;
            }

            // Success — navigate to NewPassword screen
            navigation.replace('NewPassword', { email });
        } catch (err) {
            setError('Something went wrong. Please try again.');
            shakeError();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend || resending) return;
        setResending(true);
        setError('');
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'trafficeye://auth/callback',
            });
            if (resetError) {
                setError('Failed to resend. Please try again.');
                return;
            }
            setOtp(Array(OTP_LENGTH).fill(''));
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
            startCooldown();
            Alert.alert('Code Sent', `A new verification code has been sent to ${email}`);
        } catch (err) {
            setError('Failed to resend. Please try again.');
        } finally {
            setResending(false);
        }
    };

    const filledCount = otp.filter(d => d !== '').length;

    return (
        <MobileContainer>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Navy Header */}
                    <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={20} color={C.white} />
                        </TouchableOpacity>
                        <View style={styles.iconBg}>
                            <Ionicons name="keypad" size={36} color={C.amber} />
                        </View>
                        <Text style={styles.headerTitle}>Enter Verification Code</Text>
                        <Text style={styles.headerSubtitle}>
                            We sent an 8-digit code to{'\n'}
                            <Text style={styles.emailHighlight}>{email}</Text>
                        </Text>
                    </LinearGradient>

                    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>OTP Verification</Text>
                            <Text style={styles.cardSubtitle}>Enter the code from your email</Text>

                            {/* OTP input boxes */}
                            <Animated.View
                                style={[
                                    styles.otpRow,
                                    { transform: [{ translateX: shakeAnim }] },
                                ]}
                            >
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={ref => (inputRefs.current[index] = ref)}
                                        style={[
                                            styles.otpBox,
                                            digit && styles.otpBoxFilled,
                                            error && styles.otpBoxError,
                                        ]}
                                        value={digit}
                                        onChangeText={val => handleOtpChange(val, index)}
                                        onKeyPress={e => handleKeyPress(e, index)}
                                        keyboardType="number-pad"
                                        maxLength={8}
                                        selectTextOnFocus
                                        textAlign="center"
                                    />
                                ))}
                            </Animated.View>

                            {/* Progress indicator */}
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${(filledCount / OTP_LENGTH) * 100}%` }]} />
                            </View>

                            {/* Error message */}
                            {!!error && (
                                <View style={styles.errorBadge}>
                                    <Ionicons name="alert-circle" size={14} color={C.error} />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            {/* Verify Button */}
                            <TouchableOpacity
                                style={[styles.verifyButton, (loading || filledCount < OTP_LENGTH) && styles.buttonDisabled]}
                                onPress={handleVerify}
                                disabled={loading || filledCount < OTP_LENGTH}
                                activeOpacity={0.88}
                            >
                                <LinearGradient
                                    colors={[C.navy, C.navyMid]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.verifyGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={C.white} />
                                    ) : (
                                        <>
                                            <Text style={styles.verifyText}>Verify Code</Text>
                                            <Ionicons name="checkmark-circle" size={18} color={C.white} style={{ marginLeft: 8 }} />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Resend */}
                            <TouchableOpacity
                                style={[styles.resendRow, !canResend && styles.resendDisabled]}
                                onPress={handleResend}
                                disabled={!canResend || resending}
                            >
                                {resending ? (
                                    <ActivityIndicator size="small" color={C.navyMid} />
                                ) : (
                                    <>
                                        <Ionicons name="refresh" size={14} color={canResend ? C.navyMid : C.textTertiary} />
                                        <Text style={[styles.resendText, !canResend && styles.resendTextDisabled]}>
                                            {canResend
                                                ? "Didn't receive the code? Resend"
                                                : `Resend code in ${resendCooldown}s`}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.legalNotice}>
                            The code expires in 10 minutes. Check your spam folder if needed.
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    scrollContent: { flexGrow: 1 },

    // Header
    header: {
        paddingTop: 52,
        paddingBottom: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    backButton: {
        alignSelf: 'flex-start',
        width: 36, height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconBg: {
        width: 80, height: 80,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.4,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.65)',
        textAlign: 'center',
        lineHeight: 20,
    },
    emailHighlight: {
        color: C.amber,
        fontFamily: 'Nunito-Bold',
    },

    // Form
    formContainer: {
        marginTop: -28,
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: C.white,
        borderRadius: 32,
        padding: 24,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 8,
    },
    cardTitle: {
        fontSize: 22,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
        textAlign: 'center',
    },
    cardSubtitle: {
        fontSize: 14,
        color: C.textSecondary,
        fontFamily: 'Nunito-Medium',
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 28,
    },

    // OTP Boxes
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 4,
        marginBottom: 16,
    },
    otpBox: {
        flex: 1,
        height: 50,
        borderRadius: 10,
        backgroundColor: '#F2F4F6',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        fontSize: 18,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
    },
    otpBoxFilled: {
        borderColor: C.navyMid,
        backgroundColor: '#EEF2FF',
    },
    otpBoxError: {
        borderColor: C.error,
        backgroundColor: C.errorSurface,
    },

    // Progress bar
    progressBar: {
        height: 3,
        backgroundColor: '#E2E8F0',
        borderRadius: 99,
        marginBottom: 16,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: C.navyMid,
        borderRadius: 99,
    },

    // Error
    errorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: C.errorSurface,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 16,
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        color: C.error,
        fontFamily: 'Nunito-SemiBold',
    },

    // Buttons
    verifyButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 4,
    },
    verifyGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
    },
    verifyText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
    buttonDisabled: {
        opacity: 0.5,
    },

    // Resend
    resendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
    },
    resendDisabled: {
        opacity: 0.6,
    },
    resendText: {
        fontSize: 13,
        color: C.navyMid,
        fontFamily: 'Nunito-Bold',
    },
    resendTextDisabled: {
        color: C.textTertiary,
        fontFamily: 'Nunito-Medium',
    },

    legalNotice: {
        fontSize: 11,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 24,
        fontFamily: 'Nunito-Medium',
        paddingHorizontal: 16,
        lineHeight: 16,
    },
});
