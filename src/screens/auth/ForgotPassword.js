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
import { isValidEmail } from '../../utils';

const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
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

export default function ForgotPassword({ navigation }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [focused, setFocused] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const successScaleAnim = useRef(new Animated.Value(0.5)).current;
    const successAnim = useRef(new Animated.Value(0)).current;

    // ── BACKEND INTACT: uses resetPassword from useAuth ──
    const { resetPassword } = useAuth();

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, []);

    const playSuccessAnimation = () => {
        Animated.parallel([
            Animated.spring(successScaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
            Animated.timing(successAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();
    };

    const handleResetPassword = async () => {
        if (!email.trim()) { Alert.alert('Error', 'Please enter your email address'); return; }
        if (!isValidEmail(email.trim())) { Alert.alert('Error', 'Please enter a valid email address'); return; }

        setLoading(true);
        try {
            const { error } = await resetPassword(email.trim());
            if (error) { Alert.alert('Error', error.message); return; }
            setSent(true);
            playSuccessAnimation();
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // ── Success State ──
    if (sent) {
        return (
            <MobileContainer>
                <View style={styles.successPage}>
                    <Animated.View
                        style={[
                            styles.successContent,
                            { opacity: successAnim, transform: [{ scale: successScaleAnim }] },
                        ]}
                    >
                        <View style={styles.successIconOuter}>
                            <View style={styles.successIconInner}>
                                <Ionicons name="mail-outline" size={48} color={C.navyMid} />
                            </View>
                        </View>

                        <Text style={styles.successTitle}>Check Your Email</Text>
                        <Text style={styles.successBody}>
                            We've sent a password reset link to{' '}
                            <Text style={styles.emailHighlight}>{email}</Text>
                        </Text>
                        <Text style={styles.successInstruction}>
                            Click the link in the email to reset your password. If you don't see the email, check your spam folder.
                        </Text>

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
                                <Text style={styles.successCTAText}>Back to Sign In</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.tryAgainRow}
                            onPress={() => { setSent(false); setEmail(''); }}
                        >
                            <Ionicons name="refresh" size={14} color={C.navyMid} />
                            <Text style={styles.tryAgainText}>Didn't receive the email? Try again</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </MobileContainer>
        );
    }

    // ── Main Form ──
    return (
        <MobileContainer>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
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
                        <View style={styles.lockIconBg}>
                            <Ionicons name="shield-half" size={36} color={C.amber} />
                        </View>
                        <Text style={styles.headerTitle}>Access Recovery</Text>
                        <Text style={styles.headerSubtitle}>
                            Initiate security protocol to reset your credentials
                        </Text>
                    </LinearGradient>

                    {/* Form — Recovery Card */}
                    <View style={styles.formContainer}>
                        <View style={styles.authCard}>
                            <Text style={styles.welcomeText}>Verify Identity</Text>
                            <Text style={styles.subWelcomeText}>Enter your registered email below</Text>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>REGISTERED EMAIL</Text>
                                <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
                                    <Ionicons
                                        name="mail"
                                        size={17}
                                        color={focused ? C.navyMid : '#94A3B8'}
                                    />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="you@authority.com"
                                        placeholderTextColor="#94A3B8"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        onFocus={() => setFocused(true)}
                                        onBlur={() => setFocused(false)}
                                    />
                                </View>
                            </View>

                            {/* Reset Button */}
                            <TouchableOpacity
                                style={[styles.resetButton, loading && { opacity: 0.6 }]}
                                onPress={handleResetPassword}
                                disabled={loading}
                                activeOpacity={0.88}
                            >
                                <LinearGradient
                                    colors={[C.navy, C.navyMid]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.resetGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={C.white} />
                                    ) : (
                                        <>
                                            <Text style={styles.resetText}>Send Recovery Link</Text>
                                            <Ionicons name="paper-plane" size={15} color={C.white} style={{ marginLeft: 8 }} />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.backLink}
                                onPress={() => navigation.goBack()}
                            >
                                <Text style={styles.backLinkText}>Return to Secure Login</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.legalNotice}>If you no longer have access to this email, contact administration.</Text>
                    </View>
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
        paddingBottom: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    backButton: {
        alignSelf: 'flex-start',
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    lockIconBg: {
        width: 80,
        height: 80,
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
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 16,
    },

    // ── Form Container & Auth Card ──
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
        marginBottom: 24,
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
    inputRowFocused: {
        borderColor: C.navyMid,
        backgroundColor: C.white,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: C.textPrimary,
        fontFamily: 'Nunito-SemiBold',
        padding: 0,
    },

    // Reset button
    resetButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        elevation: 4,
    },
    resetGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
    },
    resetText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
    backLink: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    backLinkText: {
        fontSize: 14,
        color: C.navyMid,
        fontFamily: 'Nunito-Bold',
    },
    legalNotice: {
        fontSize: 11,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 24,
        fontFamily: 'Nunito-Medium',
        paddingHorizontal: 16,
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
    successIconOuter: {
        width: 120,
        height: 120,
        borderRadius: 32,
        backgroundColor: C.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 6,
    },
    successIconInner: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: C.primarySurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successTitle: {
        fontSize: 26,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    successBody: {
        fontSize: 15,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 12,
        fontFamily: 'Nunito-Medium',
    },
    emailHighlight: {
        color: C.navyMid,
        fontFamily: 'Nunito-Bold',
    },
    successInstruction: {
        fontSize: 13,
        color: C.textTertiary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
        fontFamily: 'Nunito-Medium',
        paddingHorizontal: 8,
    },
    successCTA: {
        alignSelf: 'stretch',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 4,
    },
    successCTAGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    successCTAText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
    tryAgainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tryAgainText: {
        fontSize: 14,
        color: C.navyMid,
        fontFamily: 'Nunito-Bold',
    },
});
