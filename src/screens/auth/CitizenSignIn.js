import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { MobileContainer, Button, Input } from '../../components';
import { useAuth } from '../../context';
import { supabase } from '../../services';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, isValidEmail, validateRequiredFields } from '../../utils';

WebBrowser.maybeCompleteAuthSession();

export default function CitizenSignIn({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const { signIn, signInWithGoogle } = useAuth();

    const handleSignIn = async () => {
        const validation = validateRequiredFields({ Email: email, Password: password });
        if (!validation.valid) {
            Alert.alert('Error', validation.errors[0]);
            return;
        }

        if (!isValidEmail(email.trim())) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            const { error } = await signIn(email.trim(), password);

            if (error) {
                // Check if email is not confirmed
                if (error.message?.toLowerCase().includes('email not confirmed')) {
                    Alert.alert(
                        'Email Not Verified',
                        'Please check your email and click the verification link before signing in.',
                        [{ text: 'OK' }]
                    );
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
            const redirectUri = AuthSession.makeRedirectUri({
                scheme: 'trafficeye',
                path: 'auth/callback'
            });

            console.log('1. [OAuth] Initiating with redirect URI:', redirectUri);

            const { data, error } = await signInWithGoogle(redirectUri);

            if (error) {
                console.log('2. [OAuth] Supabase Error:', error.message);
                Alert.alert('Configuration Error', error.message);
                throw error;
            }

            if (data?.url) {
                console.log('3. [OAuth] Opening Browser at:', data.url);
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
                console.log('4. [OAuth] Browser Session Finished. Result Type:', result.type);

                if (result.type === 'success' && result.url) {
                    console.log('5. [OAuth] Success! URL received:', result.url);

                    const getParam = (url, param) => {
                        const regex = new RegExp(`[#|?|&]${param}=([^&]*)`);
                        const match = url.match(regex);
                        return match ? decodeURIComponent(match[1]) : null;
                    };

                    const access_token = getParam(result.url, 'access_token');
                    const refresh_token = getParam(result.url, 'refresh_token');

                    console.log('6. [OAuth] Tokens extracted:', !!access_token, !!refresh_token);

                    if (access_token && refresh_token) {
                        console.log('7. [OAuth] Setting session...');
                        const { error: sessionError } = await supabase.auth.setSession({
                            access_token,
                            refresh_token,
                        });

                        if (sessionError) {
                            console.error('8. [OAuth] Session Error:', sessionError);
                            throw sessionError;
                        }
                        console.log('✅ Session set successfully');
                    } else {
                        throw new Error('No authentication tokens found in the redirect. Please try again.');
                    }
                } else if (result.type === 'cancel') {
                    console.log('User cancelled the sign-in');
                    Alert.alert('Cancelled', 'Sign in was cancelled');
                } else {
                    console.log('Unexpected result type:', result.type);
                }
            }
        } catch (error) {
            console.error('Google sign in error:', error);
            Alert.alert('Error', error.message || 'Failed to sign in with Google');
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <MobileContainer>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <View style={styles.backButtonInner}>
                                <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.headerTextContainer}>
                            <Text style={styles.title}>Welcome Back</Text>
                            <Text style={styles.subtitle}>Sign in to continue reporting violations</Text>
                        </View>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <Input
                            label="Email"
                            placeholder="you@example.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <View style={styles.passwordWrapper}>
                            <Input
                                label="Password"
                                placeholder="Enter your password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off' : 'eye'}
                                    size={20}
                                    color={COLORS.textTertiary}
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                            <Text style={styles.forgotPassword}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <Button
                            onPress={handleSignIn}
                            fullWidth
                            size="lg"
                            style={styles.signInButton}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                'Sign In'
                            )}
                        </Button>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Google Sign In */}
                        <Button
                            variant="secondary"
                            fullWidth
                            size="lg"
                            style={styles.socialButton}
                            onPress={handleGoogleSignIn}
                            disabled={loading || googleLoading}
                        >
                            {googleLoading ? (
                                <ActivityIndicator color={COLORS.textPrimary} />
                            ) : (
                                <View style={styles.socialButtonContent}>
                                    <Ionicons name="logo-google" size={20} color={COLORS.textPrimary} />
                                    <Text style={styles.socialButtonText}>Continue with Google</Text>
                                </View>
                            )}
                        </Button>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('CitizenSignUp')}>
                                <Text style={styles.signUpLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.lg,
    },
    backButton: {
        marginBottom: SPACING.xl,
    },
    backButtonInner: {
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextContainer: {
        gap: SPACING.sm,
    },
    title: {
        fontSize: FONT_SIZES.xxxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    form: {
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.sm,
    },
    eyeIcon: {
        position: 'absolute',
        right: SPACING.lg,
        top: 40,
        padding: SPACING.xs,
    },
    forgotPassword: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        textAlign: 'right',
        marginBottom: SPACING.lg,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    signInButton: {
        marginTop: SPACING.sm,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACING.xl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        marginHorizontal: SPACING.lg,
        color: COLORS.textTertiary,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.semibold,
        letterSpacing: 1,
    },
    socialButton: {
        marginBottom: SPACING.md,
    },
    socialButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    socialButtonText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        paddingBottom: SPACING.xxl,
    },
    footerText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    signUpLink: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.bold,
    },
});
