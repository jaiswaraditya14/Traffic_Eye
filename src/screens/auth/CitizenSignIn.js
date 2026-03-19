import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer, Button, Input } from '../../components';
import { useAuth } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, isValidEmail, validateRequiredFields } from '../../utils';

export default function CitizenSignIn({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    const { signIn, signInWithGoogle } = useAuth();

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

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
        setLoading(true);
        try {
            const { error } = await signInWithGoogle();
            if (error) {
                Alert.alert('Sign In Failed', error.message || 'Could not connect to Google');
            }
        } catch (error) {
            console.error('Google sign in error:', error);
            Alert.alert('Error', 'An unexpected error occurred during Google Sign-In.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileContainer>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Animated.View style={[styles.header, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <View style={styles.backButtonCircle}>
                                <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.welcomeIcon}>
                            <Ionicons name="person-circle" size={56} color={COLORS.primary} />
                        </View>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to continue reporting violations</Text>
                    </Animated.View>

                    <Animated.View style={[styles.form, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }]}>
                        <Input
                            label="Email"
                            placeholder="Enter your email"
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
                                    color={COLORS.gray400}
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                            <Text style={styles.forgotPassword}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <Button
                            onPress={handleSignIn}
                            fullWidth
                            style={styles.signInButton}
                            disabled={loading}
                            size="lg"
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                'Sign In'
                            )}
                        </Button>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <Button
                            variant="secondary"
                            fullWidth
                            style={styles.socialButton}
                            onPress={handleGoogleSignIn}
                            disabled={loading}
                        >
                            <View style={styles.socialButtonContent}>
                                <Ionicons name="logo-google" size={20} color={COLORS.textPrimary} />
                                <Text style={styles.socialButtonText}>Continue with Google</Text>
                            </View>
                        </Button>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('CitizenSignUp')}>
                                <Text style={styles.signUpLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
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
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.lg,
    },
    backButton: {
        marginBottom: SPACING.lg,
    },
    backButtonCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    welcomeIcon: {
        alignSelf: 'flex-start',
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: FONT_SIZES.xxxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    subtitle: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    form: {
        paddingHorizontal: SPACING.lg,
    },
    passwordWrapper: {
        position: 'relative',
    },
    eyeIcon: {
        position: 'absolute',
        right: SPACING.md,
        top: 40,
        padding: 4,
    },
    forgotPassword: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        textAlign: 'right',
        marginBottom: SPACING.lg,
        fontWeight: FONT_WEIGHTS.medium,
    },
    signInButton: {
        marginTop: SPACING.xs,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACING.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        marginHorizontal: SPACING.md,
        color: COLORS.textTertiary,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.medium,
    },
    socialButton: {
        marginBottom: SPACING.md,
    },
    socialButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    socialButtonText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontWeight: FONT_WEIGHTS.medium,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.lg,
        marginBottom: SPACING.xl,
    },
    footerText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    signUpLink: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.semibold,
    },
});
