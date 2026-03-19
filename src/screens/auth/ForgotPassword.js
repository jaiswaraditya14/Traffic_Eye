import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer, Button, Input } from '../../components';
import { useAuth } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, isValidEmail } from '../../utils';

export default function ForgotPassword({ navigation }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const successAnim = useRef(new Animated.Value(0)).current;
    const successScaleAnim = useRef(new Animated.Value(0.5)).current;

    const { resetPassword } = useAuth();

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

    const playSuccessAnimation = () => {
        Animated.parallel([
            Animated.spring(successScaleAnim, {
                toValue: 1,
                tension: 60,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(successAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleResetPassword = async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        if (!isValidEmail(email.trim())) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            const { error } = await resetPassword(email.trim());

            if (error) {
                Alert.alert('Error', error.message);
                return;
            }

            setSent(true);
            playSuccessAnimation();
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <MobileContainer>
                <View style={styles.container}>
                    <Animated.View style={[styles.successContainer, {
                        opacity: successAnim,
                        transform: [{ scale: successScaleAnim }],
                    }]}>
                        <View style={styles.successIcon}>
                            <View style={styles.successIconInner}>
                                <Ionicons name="mail-outline" size={48} color={COLORS.primary} />
                            </View>
                        </View>
                        <Text style={styles.successTitle}>Check Your Email</Text>
                        <Text style={styles.successText}>
                            We've sent a password reset link to{'\n'}
                            <Text style={styles.emailHighlight}>{email}</Text>
                        </Text>
                        <Text style={styles.instructionText}>
                            Click the link in the email to reset your password. If you don't see the email, check your spam folder.
                        </Text>

                        <Button
                            onPress={() => navigation.navigate('CitizenSignIn')}
                            fullWidth
                            style={styles.backToLoginButton}
                            size="lg"
                        >
                            Back to Sign In
                        </Button>

                        <TouchableOpacity
                            onPress={() => {
                                setSent(false);
                                setEmail('');
                            }}
                            style={styles.resendLink}
                        >
                            <Ionicons name="refresh" size={16} color={COLORS.primary} />
                            <Text style={styles.resendText}>Didn't receive the email? Try again</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </MobileContainer>
        );
    }

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

                        <View style={styles.iconContainer}>
                            <View style={styles.iconInner}>
                                <Ionicons name="lock-closed-outline" size={36} color={COLORS.primary} />
                            </View>
                        </View>

                        <Text style={styles.title}>Forgot Password?</Text>
                        <Text style={styles.subtitle}>
                            No worries! Enter your email address and we'll send you a link to reset your password.
                        </Text>
                    </Animated.View>

                    <Animated.View style={[styles.form, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }]}>
                        <Input
                            label="Email Address"
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Button
                            onPress={handleResetPassword}
                            fullWidth
                            style={styles.resetButton}
                            disabled={loading}
                            size="lg"
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                'Send Reset Link'
                            )}
                        </Button>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('CitizenSignIn')}
                            style={styles.backLink}
                        >
                            <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
                            <Text style={styles.backLinkText}>Back to Sign In</Text>
                        </TouchableOpacity>
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
        alignItems: 'center',
    },
    backButton: {
        alignSelf: 'flex-start',
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
    iconContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: COLORS.primarySoft || '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    iconInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: `${COLORS.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: FONT_SIZES.xxxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: SPACING.md,
    },
    form: {
        paddingHorizontal: SPACING.lg,
        marginTop: SPACING.lg,
    },
    resetButton: {
        marginTop: SPACING.md,
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        gap: SPACING.xs,
    },
    backLinkText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.medium,
    },
    // Success state styles
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    successIcon: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: COLORS.primarySoft || '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    successIconInner: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: `${COLORS.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successTitle: {
        fontSize: FONT_SIZES.xxl + 2,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    successText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.md,
        lineHeight: 24,
    },
    emailHighlight: {
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    instructionText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.xl,
    },
    backToLoginButton: {
        marginTop: SPACING.md,
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
});
