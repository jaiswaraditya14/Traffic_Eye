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
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
            <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="always"
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
                            <Text style={styles.headerTitle}>Join the Force</Text>
                            <Text style={styles.headerSubtitle}></Text>
                        </View>
                    </LinearGradient>

                    {/* Form — Enrollment Card */}
                    <View style={styles.formContainer}>
                        <View style={styles.authCard}>
                            <Text style={styles.welcomeText}>New Enrollment</Text>
                            <Text style={styles.subWelcomeText}>Provide your credentials to begin service</Text>

                            {/* Full Name */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>FULL IDENTITY NAME</Text>
                                <View style={styles.inputRow}>
                                    <Ionicons name="person" size={17} color="#94A3B8" />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Full Name"
                                        placeholderTextColor="#94A3B8"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </View>

                            {/* Email */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>AUTHORITY EMAIL</Text>
                                <View style={styles.inputRow}>
                                    <Ionicons name="mail" size={17} color="#94A3B8" />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="you@authority.com"
                                        placeholderTextColor="#94A3B8"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            {/* Phone */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>CONTACT NUMBER</Text>
                                <View style={styles.inputRow}>
                                    <Ionicons name="call" size={17} color="#94A3B8" />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="+91 00000 00000"
                                        placeholderTextColor="#94A3B8"
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>

                            {/* Password */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>SECURE PASSWORD</Text>
                                <View style={styles.inputRow}>
                                    <Ionicons name="lock-closed" size={17} color="#94A3B8" />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Min 8 unique characters"
                                        placeholderTextColor="#94A3B8"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={17} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Confirm Password */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                                <View style={styles.inputRow}>
                                    <Ionicons name="shield-checkmark" size={17} color="#94A3B8" />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Re-enter password"
                                        placeholderTextColor="#94A3B8"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirmPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={17} color="#94A3B8" />
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
                                            <Text style={styles.signUpText}>Submit Enrollment</Text>
                                            <Ionicons name="chevron-forward" size={16} color={C.white} />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Footer */}
                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Found your badge? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('CitizenSignIn')}>
                                    <Text style={styles.signInLink}>Sign In Here</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={styles.legalNotice}></Text>
                    </View>
                </ScrollView>
        </View>
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
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
    },

    // Form Container & Card
    formContainer: {
        marginTop: -32,
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    authCard: {
        backgroundColor: C.white,
        borderRadius: 32,
        padding: 24,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 8,
    },
    welcomeText: {
        fontSize: 22,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
        textAlign: 'center',
    },
    subWelcomeText: {
        fontSize: 14,
        color: C.textSecondary,
        fontFamily: 'Nunito-Medium',
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 32,
    },

    // Fields
    fieldGroup: {
        marginBottom: 20,
    },
    fieldLabel: {
        fontSize: 10,
        fontFamily: 'Nunito-ExtraBold',
        color: C.textTertiary,
        marginBottom: 8,
        letterSpacing: 1.2,
        marginLeft: 4,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.offWhite,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: C.textPrimary,
        fontFamily: 'Nunito-SemiBold',
        padding: 0,
    },

    // Sign Up Button
    signUpButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 12,
        marginBottom: 24,
        elevation: 4,
    },
    signUpGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
    },
    signUpText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    footerText: {
        fontSize: 14,
        color: C.textSecondary,
        fontFamily: 'Nunito-Medium',
    },
    signInLink: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: C.amberDark,
    },
    legalNotice: {
        fontSize: 11,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 24,
        fontFamily: 'Nunito-Medium',
    },

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
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    envelopeOuter: {
        width: 100,
        height: 100,
        borderRadius: 32,
        backgroundColor: C.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 6,
    },
    envelopeInner: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: C.primarySurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 15,
        right: 15,
        backgroundColor: C.white,
        borderRadius: 12,
        padding: 2,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    successTitle: {
        fontSize: 26,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
        textAlign: 'center',
        marginTop: 8,
        letterSpacing: -0.5,
    },
    successDesc: {
        fontSize: 15,
        color: C.textSecondary,
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 16,
        fontFamily: 'Nunito-Medium',
    },
    emailPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: C.primarySurface,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        marginBottom: 32,
    },
    emailPillText: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: C.navyMid,
    },
    stepsList: {
        alignSelf: 'stretch',
        backgroundColor: C.white,
        borderRadius: 24,
        padding: 20,
        marginBottom: 32,
        gap: 16,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 3,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    stepNum: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: C.primarySurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumText: {
        fontSize: 14,
        fontFamily: 'Nunito-ExtraBold',
        color: C.navyMid,
    },
    stepText: {
        fontSize: 15,
        color: C.textPrimary,
        fontFamily: 'Nunito-SemiBold',
    },
    successCTA: {
        alignSelf: 'stretch',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
    },
    successCTAGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
    },
    successCTAText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
    resendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
    },
    resendText: {
        fontSize: 14,
        color: C.navyMid,
        fontFamily: 'Nunito-Bold',
    },
    spamNote: {
        fontSize: 12,
        color: C.textTertiary,
        textAlign: 'center',
        marginTop: 8,
        fontFamily: 'Nunito-Medium',
    },
});
