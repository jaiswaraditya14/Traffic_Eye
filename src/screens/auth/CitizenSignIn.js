import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
    Platform, ScrollView, Alert, ActivityIndicator, StatusBar, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { MobileContainer } from '../../components';
import { useAuth } from '../../context';
import { supabase } from '../../services';
import { isValidEmail, validateRequiredFields } from '../../utils';

WebBrowser.maybeCompleteAuthSession();

// ── Design Tokens ──
const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    amberDark: '#D97706',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    surfaceLow: '#F2F4F6',
    surfaceInput: '#F2F4F6',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    border: '#C4C6D0',
    error: '#BA1A1A',
};

export default function CitizenSignIn({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    // ── BACKEND INTACT — all original auth logic preserved ──
    const { signIn, signInWithGoogle } = useAuth();

    const handleSignIn = async () => {
        const validation = validateRequiredFields({ Email: email, Password: password });
        if (!validation.valid) { Alert.alert('Error', validation.errors[0]); return; }
        if (!isValidEmail(email.trim())) { Alert.alert('Error', 'Please enter a valid email address'); return; }

        setLoading(true);
        try {
            const { error } = await signIn(email.trim(), password);
            if (error) {
                if (error.message?.toLowerCase().includes('email not confirmed')) {
                    Alert.alert('Email Not Verified', 'Please check your email and click the verification link before signing in.', [{ text: 'OK' }]);
                } else {
                    Alert.alert('Sign In Failed', error.message || 'Invalid email or password');
                }
                return;
            }
        } catch (error) {
            console.error('Sign in error:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        try {
            const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
            console.log('\n\n======================================================');
            console.log('🚀 EXACT REDIRECT URL TO PASTE INTO SUPABASE DASHBOARD:');
            console.log(redirectUri);
            console.log('======================================================\n\n');
            const { data, error } = await signInWithGoogle(redirectUri);
            if (error) { Alert.alert('Configuration Error', error.message); throw error; }

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
                if (result.type === 'success' && result.url) {
                    const getParam = (url, param) => {
                        const regex = new RegExp(`[#|?|&]${param}=([^&]*)`);
                        const match = url.match(regex);
                        return match ? decodeURIComponent(match[1]) : null;
                    };
                    const access_token = getParam(result.url, 'access_token');
                    const refresh_token = getParam(result.url, 'refresh_token');
                    if (access_token && refresh_token) {
                        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
                        if (sessionError) throw sessionError;
                    } else {
                        throw new Error('No authentication tokens found. Please try again.');
                    }
                } else if (result.type === 'cancel') {
                    Alert.alert('Cancelled', 'Sign in was cancelled');
                }
            }
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to sign in with Google');
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
            <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="always"
                >
                    {/* ── Navy Header ── */}
                    <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={20} color={C.white} />
                        </TouchableOpacity>
                        <View style={styles.headerContent}>
                            <View style={styles.logoMark}>
                                <Ionicons name="shield-checkmark" size={32} color={C.amber} />
                            </View>
                            <Text style={styles.headerTitle}>Citizen Sign In</Text>
                            <Text style={styles.headerSubtitle}>Report traffic violations</Text>
                        </View>
                    </LinearGradient>

                    {/* ── Form Section — Auth Card ── */}
                    <View style={styles.formContainer}>
                        <View style={styles.authCard}>
                            <Text style={styles.welcomeText}>Welcome Back</Text>
                            <Text style={styles.subWelcomeText}>Sign in to continue</Text>

                            {/* Email */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                                <View style={[styles.inputRow, emailFocused && styles.inputRowFocused]}>
                                    <Ionicons
                                        name="mail"
                                        size={18}
                                        color={emailFocused ? C.navyMid : '#94A3B8'}
                                    />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="johndoe@authority.com"
                                        placeholderTextColor="#94A3B8"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        onFocus={() => setEmailFocused(true)}
                                        onBlur={() => setEmailFocused(false)}
                                    />
                                </View>
                            </View>

                            {/* Password */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>PASSWORD</Text>
                                <View style={[styles.inputRow, passwordFocused && styles.inputRowFocused]}>
                                    <Ionicons
                                        name="lock-closed"
                                        size={18}
                                        color={passwordFocused ? C.navyMid : '#94A3B8'}
                                    />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="••••••••••••"
                                        placeholderTextColor="#94A3B8"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        onFocus={() => setPasswordFocused(true)}
                                        onBlur={() => setPasswordFocused(false)}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        <Ionicons
                                            name={showPassword ? 'eye-off' : 'eye'}
                                            size={18}
                                            color="#94A3B8"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Forgot Password */}
                            <TouchableOpacity
                                style={styles.forgotRow}
                                onPress={() => navigation.navigate('ForgotPassword')}
                            >
                                <Text style={styles.forgotText}>Forgot Password?</Text>
                            </TouchableOpacity>

                            {/* Sign In Button */}
                            <TouchableOpacity
                                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                                onPress={handleSignIn}
                                disabled={loading}
                                activeOpacity={0.88}
                            >
                                <LinearGradient
                                    colors={[C.navy, C.navyMid]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.primaryButtonGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={C.white} />
                                    ) : (
                                        <>
                                            <Text style={styles.primaryButtonText}>Sign In</Text>
                                            <Ionicons name="log-in-outline" size={20} color={C.white} style={{ marginLeft: 6 }} />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Divider */}
                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>OR SIGN IN WITH</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            {/* Google Sign In */}
                            <TouchableOpacity
                                style={[styles.googleButton, (loading || googleLoading) && styles.buttonDisabled]}
                                onPress={handleGoogleSignIn}
                                disabled={loading || googleLoading}
                                activeOpacity={0.88}
                            >
                                {googleLoading ? (
                                    <ActivityIndicator color={C.textPrimary} />
                                ) : (
                                    <>
                                        <View style={styles.googleIconFrame}>
                                            <Ionicons name="logo-google" size={18} color="#4285F4" />
                                        </View>
                                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Footer */}
                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Don't have an account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('CitizenSignUp')}>
                                    <Text style={styles.signUpLink}>Sign Up</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={styles.legalNotice}>Protected by Traffic Eye</Text>
                    </View>
                </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.offWhite,
    },
    scrollContent: {
        flexGrow: 1,
    },

    // ── Header ──
    header: {
        paddingTop: 52,
        paddingBottom: 32,
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
        marginBottom: 20,
    },
    headerContent: {
        alignItems: 'center',
    },
    logoMark: {
        width: 68,
        height: 68,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Nunito-Medium',
    },

    // ── Form Container & Card ──
    formContainer: {
        marginTop: -32,
        paddingHorizontal: 16,
        paddingBottom: 40,
        zIndex: 1,
        elevation: 1,
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
    inputRowFocused: {
        borderColor: C.navyMid,
        backgroundColor: C.white,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: C.textPrimary,
        fontFamily: 'Nunito-SemiBold',
        padding: 0,
    },

    // Forgot password
    forgotRow: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotText: {
        fontSize: 13,
        color: C.navyMid,
        fontFamily: 'Nunito-Bold',
    },

    // Primary button
    primaryButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        elevation: 4,
    },
    primaryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
    },
    primaryButtonText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
    buttonDisabled: {
        opacity: 0.6,
    },

    // Divider
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    dividerText: {
        fontSize: 10,
        color: '#94A3B8',
        fontFamily: 'Nunito-ExtraBold',
        letterSpacing: 1,
    },

    // Google button
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingVertical: 14,
        marginBottom: 24,
    },
    googleIconFrame: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleButtonText: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
    },

    // Footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    footerText: {
        fontSize: 14,
        color: C.textSecondary,
        fontFamily: 'Nunito-Medium',
    },
    signUpLink: {
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
});
