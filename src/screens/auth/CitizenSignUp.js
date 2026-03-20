import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer, Button, Input } from '../../components';
import { useAuth } from '../../context';
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
    BORDER_RADIUS,
    SHADOWS,
    isValidEmail,
    isValidPassword,
    isValidPhone,
    validateRequiredFields,
    passwordsMatch
} from '../../utils';

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

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const successScaleAnim = useRef(new Animated.Value(0.5)).current;
    const successFadeAnim = useRef(new Animated.Value(0)).current;
    const envelopeAnim = useRef(new Animated.Value(0)).current;

    const { signUpCitizen } = useAuth();

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    const playSuccessAnimation = () => {
        Animated.parallel([
            Animated.spring(successScaleAnim, {
                toValue: 1,
                tension: 60,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(successFadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Envelope float animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(envelopeAnim, {
                        toValue: -8,
                        duration: 1200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(envelopeAnim, {
                        toValue: 0,
                        duration: 1200,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        });
    };

    const validateForm = () => {
        const requiredFields = {
            'Full Name': name,
            'Email': email,
            'Phone Number': phone,
            'Password': password
        };

        const validation = validateRequiredFields(requiredFields);
        if (!validation.valid) {
            Alert.alert('Error', validation.errors[0]);
            return false;
        }

        if (!isValidEmail(email.trim())) {
            Alert.alert('Error', 'Please enter a valid email address');
            return false;
        }

        if (!isValidPassword(password)) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return false;
        }

        if (!passwordsMatch(password, confirmPassword)) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }

        if (!isValidPhone(phone.trim())) {
            Alert.alert('Error', 'Please enter a valid phone number');
            return false;
        }

        return true;
    };

    const handleSignUp = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const { error } = await signUpCitizen(
                email.trim(),
                password,
                name.trim(),
                phone.trim()
            );

            if (error) {
                Alert.alert('Sign Up Failed', error.message || 'Could not create account');
                return;
            }

            setSignUpSuccess(true);
            playSuccessAnimation();
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        try {
            // Re-trigger signup to resend confirmation email
            Alert.alert(
                'Email Resent',
                `A new verification email has been sent to ${email}. Please check your inbox and spam folder.`
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to resend email. Please try again.');
        }
    };

    if (signUpSuccess) {
        return (
            <MobileContainer>
                <Animated.View style={[styles.successContainer, {
                    opacity: successFadeAnim,
                    transform: [{ scale: successScaleAnim }],
                }]}>
                    {/* Email Verification Illustration */}
                    <Animated.View style={[
                        styles.successIconContainer,
                        { transform: [{ translateY: envelopeAnim }] },
                    ]}>
                        <View style={styles.successIconInner}>
                            <Ionicons name="mail" size={48} color={COLORS.primary} />
                        </View>
                    </Animated.View>

                    <View style={styles.successCheckBadge}>
                        <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
                    </View>

                    <Text style={styles.successTitle}>Verify Your Email</Text>

                    <Text style={styles.successMessage}>
                        We've sent a confirmation link to
                    </Text>
                    <Text style={styles.successEmail}>{email}</Text>

                    <View style={styles.stepsContainer}>
                        <View style={styles.stepItem}>
                            <View style={[styles.stepNumber, { backgroundColor: COLORS.primarySoft }]}>
                                <Text style={[styles.stepNumberText, { color: COLORS.primary }]}>1</Text>
                            </View>
                            <Text style={styles.stepText}>Open your email inbox</Text>
                        </View>
                        <View style={styles.stepItem}>
                            <View style={[styles.stepNumber, { backgroundColor: COLORS.primarySoft }]}>
                                <Text style={[styles.stepNumberText, { color: COLORS.primary }]}>2</Text>
                            </View>
                            <Text style={styles.stepText}>Click the verification link</Text>
                        </View>
                        <View style={styles.stepItem}>
                            <View style={[styles.stepNumber, { backgroundColor: COLORS.primarySoft }]}>
                                <Text style={[styles.stepNumberText, { color: COLORS.primary }]}>3</Text>
                            </View>
                            <Text style={styles.stepText}>Come back and sign in</Text>
                        </View>
                    </View>

                    <Button
                        onPress={() => navigation.navigate('CitizenSignIn')}
                        fullWidth
                        style={styles.successButton}
                        size="lg"
                    >
                        Continue to Sign In
                    </Button>

                    <TouchableOpacity onPress={handleResendEmail} style={styles.resendLink}>
                        <Ionicons name="refresh" size={16} color={COLORS.primary} />
                        <Text style={styles.resendText}>Didn't receive the email? Resend</Text>
                    </TouchableOpacity>

                    <Text style={styles.spamNote}>
                        Check your spam folder if you don't see the email
                    </Text>
                </Animated.View>
            </MobileContainer>
        );
    }

    return (
        <MobileContainer>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <View style={styles.backButtonCircle}>
                                <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join us in making roads safer</Text>
                    </Animated.View>

                    <Animated.View style={[styles.form, { opacity: fadeAnim }]}>
                        <Input
                            label="Full Name"
                            placeholder="Enter your name"
                            value={name}
                            onChangeText={setName}
                        />
                        <Input
                            label="Email"
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <Input
                            label="Phone Number"
                            placeholder="Enter your phone"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />

                        <View style={styles.passwordContainer}>
                            <Input
                                label="Password"
                                placeholder="Create password (min 6 characters)"
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

                        <View style={styles.passwordContainer}>
                            <Input
                                label="Confirm Password"
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                <Ionicons
                                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                                    size={20}
                                    color={COLORS.gray400}
                                />
                            </TouchableOpacity>
                        </View>

                        <Button
                            onPress={handleSignUp}
                            fullWidth
                            style={styles.signUpButton}
                            disabled={loading}
                            size="lg"
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                'Sign Up'
                            )}
                        </Button>

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
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { flexGrow: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
    backButton: { marginBottom: SPACING.lg },
    backButtonCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    title: { fontSize: FONT_SIZES.xxxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
    subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
    form: { paddingHorizontal: SPACING.lg },
    passwordContainer: { position: 'relative' },
    eyeIcon: {
        position: 'absolute',
        right: SPACING.md,
        top: 40,
        padding: 4,
    },
    signUpButton: { marginTop: SPACING.sm },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg, marginBottom: SPACING.xl },
    footerText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    signInLink: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: FONT_WEIGHTS.semibold },

    // Success / Email Verification Screen
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        backgroundColor: COLORS.background,
    },
    successIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.primarySoft || '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    successIconInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${COLORS.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successCheckBadge: {
        marginTop: -SPACING.md,
        marginBottom: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 4,
        ...SHADOWS.sm,
    },
    successTitle: {
        fontSize: FONT_SIZES.xxl + 2,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    successMessage: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    successEmail: {
        fontSize: FONT_SIZES.md,
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.semibold,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    stepsContainer: {
        alignSelf: 'stretch',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        gap: SPACING.md,
        ...SHADOWS.sm,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.bold,
    },
    stepText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        fontWeight: FONT_WEIGHTS.medium,
    },
    successButton: {
        marginTop: SPACING.sm,
    },
    resendLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: SPACING.lg,
        padding: SPACING.sm,
    },
    resendText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.medium,
    },
    spamNote: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textTertiary,
        textAlign: 'center',
        marginTop: SPACING.sm,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACING.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.gray300,
    },
    dividerText: {
        marginHorizontal: SPACING.md,
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
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
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACING.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.gray300,
    },
    dividerText: {
        marginHorizontal: SPACING.md,
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
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
});
