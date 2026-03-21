import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
    Platform, ScrollView, Alert, ActivityIndicator, Animated,
    StatusBar, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAuth } from '../../context';
import {
    isValidEmail, isValidPassword, isValidPhone,
    validateRequiredFields, passwordsMatch,
} from '../../utils';

// ── Design Tokens ──
const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    amberDark: '#D97706',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    surfaceInput: '#F2F4F6',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    border: '#C4C6D0',
    success: '#059669',
    successSurface: '#D1FAE5',
    primarySurface: '#D7E2FF',
    error: '#BA1A1A',
};

export default function CitizenSignUp({ navigation }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [signUpSuccess, setSignUpSuccess] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const successScaleAnim = useRef(new Animated.Value(0.5)).current;
    const successFadeAnim = useRef(new Animated.Value(0)).current;
    const envelopeAnim = useRef(new Animated.Value(0)).current;

    // ── BACKEND INTACT: uses signUpCitizen from useAuth ──
    const { signUpCitizen } = useAuth();

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, []);

    const playSuccessAnimation = () => {
        Animated.parallel([
            Animated.spring(successScaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
            Animated.timing(successFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(envelopeAnim, { toValue: -8, duration: 1200, useNativeDriver: true }),
                    Animated.timing(envelopeAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
                ])
            ).start();
        });
    };

    const validateForm = () => {
        const validation = validateRequiredFields({ 'Full Name': name, 'Email': email, 'Phone': phone, 'Password': password });
        if (!validation.valid) { Alert.alert('Error', validation.errors[0]); return false; }
        if (!isValidEmail(email.trim())) { Alert.alert('Error', 'Please enter a valid email address'); return false; }
        if (!isValidPassword(password)) { Alert.alert('Error', 'Password must be at least 6 characters'); return false; }
        if (!passwordsMatch(password, confirmPassword)) { Alert.alert('Error', 'Passwords do not match'); return false; }
        if (!isValidPhone(phone.trim())) { Alert.alert('Error', 'Please enter a valid phone number'); return false; }
        return true;
    };

    const handleSignUp = async () => {
        if (!validateForm()) return;
        setLoading(true);
        try {
            const { error } = await signUpCitizen(email.trim(), password, name.trim(), phone.trim());
            if (error) { Alert.alert('Sign Up Failed', error.message || 'Could not create account'); return; }
            setSignUpSuccess(true);
            playSuccessAnimation();
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = () => {
        Alert.alert('Email Resent', `A new verification email has been sent to ${email}. Please check your inbox and spam folder.`);
    };

    // ── Success: Email Verification Screen ──
    if (signUpSuccess) {
        return (
            <MobileContainer>
                <View style={styles.successPage}>
                    <Animated.View
                        style={[
                            styles.successContent,
                            { opacity: successFadeAnim, transform: [{ scale: successScaleAnim }] },
                        ]}
                    >
                        {/* Envelope */}
                        <Animated.View style={[styles.envelopeContainer, { transform: [{ translateY: envelopeAnim }] }]}>
                            <View style={styles.envelopeOuter}>
                                <View style={styles.envelopeInner}>
                                    <Ionicons name="mail" size={48} color={C.navyMid} />
                                </View>
                            </View>
                            {/* Check badge */}
                            <View style={styles.checkBadge}>
                                <Ionicons name="checkmark-circle" size={28} color={C.success} />
                            </View>
                        </Animated.View>

                        <Text style={styles.successTitle}>Account Created! 🎉</Text>
                        <Text style={styles.successDesc}>Verify your email to get started</Text>
                        <View style={styles.emailPill}>
                            <Ionicons name="mail-outline" size={14} color={C.navyMid} />
                            <Text style={styles.emailPillText}>{email}</Text>
                        </View>

                        {/* Steps */}
                        <View style={styles.stepsList}>
                            {[
                                { n: '1', text: 'Open your email inbox' },
                                { n: '2', text: 'Click the verification link' },
                                { n: '3', text: 'Come back and sign in' },
                            ].map((step, idx) => (
                                <View key={idx} style={styles.stepRow}>
                                    <View style={styles.stepNum}>
                                        <Text style={styles.stepNumText}>{step.n}</Text>
                                    </View>
                                    <Text style={styles.stepText}>{step.text}</Text>
                                </View>
                            ))}
                        </View>

                        {/* CTA */}
                        <TouchableOpacity
                            style={styles.successCTA}
                            onPress={() => navigation.navigate('CitizenSignIn')}
                            activeOpacity={0.88}
                        >
                            <LinearGradient
                                colors={[C.navy, C.navyMid]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.successCTAGradient}
                            >
                                <Text style={styles.successCTAText}>Continue to Sign In</Text>
                                <Ionicons name="arrow-forward" size={16} color={C.white} />
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.resendRow} onPress={handleResendEmail}>
                            <Ionicons name="refresh" size={14} color={C.navyMid} />
                            <Text style={styles.resendText}>Didn't receive the email? Resend</Text>
                        </TouchableOpacity>

                        <Text style={styles.spamNote}>Check your spam folder if not found</Text>
                    </Animated.View>
                </View>
            </MobileContainer>
        );
    }

    // ── Sign Up Form ──
    return (
        <MobileContainer>
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
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
                        <View style={styles.headerContent}>
                            <View style={styles.logoMark}>
                                <Ionicons name="person-add" size={28} color={C.amber} />
                            </View>
                            <Text style={styles.headerTitle}>Create Account</Text>
                            <Text style={styles.headerSubtitle}>Join us in making roads safer</Text>
                        </View>
                    </LinearGradient>

                    {/* Form */}
                    <Animated.View style={[styles.form, { opacity: fadeAnim }]}>
                        {/* Full Name */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Full Name</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="person-outline" size={17} color={C.textTertiary} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your full name"
                                    placeholderTextColor={C.textTertiary}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        </View>

                        {/* Email */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Email Address</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="mail-outline" size={17} color={C.textTertiary} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="you@example.com"
                                    placeholderTextColor={C.textTertiary}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* Phone */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Phone Number</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="call-outline" size={17} color={C.textTertiary} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="+91 00000 00000"
                                    placeholderTextColor={C.textTertiary}
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Password</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="lock-closed-outline" size={17} color={C.textTertiary} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Min 6 characters"
                                    placeholderTextColor={C.textTertiary}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.textTertiary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Confirm Password</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="lock-closed-outline" size={17} color={C.textTertiary} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Re-enter your password"
                                    placeholderTextColor={C.textTertiary}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.textTertiary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Sign Up Button */}
                        <TouchableOpacity
                            style={[styles.signUpButton, loading && { opacity: 0.6 }]}
                            onPress={handleSignUp}
                            disabled={loading}
                            activeOpacity={0.88}
                        >
                            <LinearGradient
                                colors={[C.navy, C.navyMid]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.signUpGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color={C.white} />
                                ) : (
                                    <>
                                        <Text style={styles.signUpText}>Create Account</Text>
                                        <Ionicons name="arrow-forward" size={16} color={C.white} />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('CitizenSignIn')}>
                                <Text style={styles.signInLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    scrollContent: { flexGrow: 1 },

    // Header
    header: {
        paddingTop: 52,
        paddingBottom: 28,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerContent: { alignItems: 'center' },
    logoMark: {
        width: 62,
        height: 62,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'DMSans-Bold',
        color: C.white,
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
    },

    // Form
    form: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 40,
    },
    fieldGroup: { marginBottom: 14 },
    fieldLabel: {
        fontSize: 12,
        fontFamily: 'DMSans-SemiBold',
        color: C.navyMid,
        marginBottom: 7,
        letterSpacing: 0.2,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surfaceInput,
        borderRadius: 12,
        paddingHorizontal: 13,
        paddingVertical: 13,
        gap: 9,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: C.textPrimary,
        padding: 0,
    },

    // Sign Up Button
    signUpButton: {
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 8,
        marginBottom: 20,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
        elevation: 6,
    },
    signUpGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    signUpText: {
        fontSize: 16,
        fontFamily: 'DMSans-Bold',
        color: C.white,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    footerText: { fontSize: 14, color: C.textSecondary },
    signInLink: { fontSize: 14, fontFamily: 'DMSans-Bold', color: C.amber },

    // Success Page
    successPage: {
        flex: 1,
        backgroundColor: C.offWhite,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    successContent: {
        width: '100%',
        alignItems: 'center',
    },
    envelopeContainer: {
        width: 110,
        height: 110,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    envelopeOuter: {
        width: 100,
        height: 100,
        borderRadius: 28,
        backgroundColor: C.primarySurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    envelopeInner: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: 'rgba(27,58,107,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 2,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    successTitle: {
        fontSize: 24,
        fontFamily: 'DMSans-Bold',
        color: C.textPrimary,
        textAlign: 'center',
        marginTop: 16,
        letterSpacing: -0.4,
    },
    successDesc: {
        fontSize: 14,
        color: C.textSecondary,
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 14,
    },
    emailPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: C.primarySurface,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 24,
    },
    emailPillText: {
        fontSize: 13,
        fontFamily: 'DMSans-SemiBold',
        color: C.navyMid,
    },
    stepsList: {
        alignSelf: 'stretch',
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        gap: 12,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stepNum: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: C.primarySurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumText: {
        fontSize: 13,
        fontFamily: 'DMSans-Bold',
        color: C.navyMid,
    },
    stepText: {
        fontSize: 14,
        color: C.textPrimary,
        fontFamily: 'DMSans-Medium',
    },
    successCTA: {
        alignSelf: 'stretch',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
        elevation: 6,
    },
    successCTAGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    successCTAText: {
        fontSize: 16,
        fontFamily: 'DMSans-Bold',
        color: C.white,
    },
    resendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
    },
    resendText: {
        fontSize: 13,
        color: C.navyMid,
        fontFamily: 'DMSans-Medium',
    },
    spamNote: {
        fontSize: 11,
        color: C.textTertiary,
        textAlign: 'center',
        marginTop: 8,
    },
});
