import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer, Button, Input } from '../../components';
import { useAuth } from '../../context';
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
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
    const [referralCode, setReferralCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [signUpSuccess, setSignUpSuccess] = useState(false);

    const { signUpCitizen } = useAuth();

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
                phone.trim(),
                referralCode.trim() || null
            );

            if (error) {
                Alert.alert('Sign Up Failed', error.message || 'Could not create account');
                return;
            }

            setSignUpSuccess(true);
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (signUpSuccess) {
        return (
            <MobileContainer>
                <View style={styles.successContainer}>
                    <View style={styles.successIconContainer}>
                        <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
                    </View>
                    <Text style={styles.successTitle}>Account Created!</Text>
                    <Text style={styles.successMessage}>
                        Welcome to Traffic Eye! Your account has been created successfully.
                    </Text>
                    <Text style={styles.successSubMessage}>
                        You can now sign in with your email and password.
                    </Text>
                    <Button
                        onPress={() => navigation.navigate('CitizenSignIn')}
                        fullWidth
                        style={styles.successButton}
                    >
                        Continue to Sign In
                    </Button>
                </View>
            </MobileContainer>
        );
    }

    return (
        <MobileContainer>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join us in making roads safer</Text>
                    </View>

                    <View style={styles.form}>
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
                                    color={COLORS.gray500}
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
                                    color={COLORS.gray500}
                                />
                            </TouchableOpacity>
                        </View>

                        <Input
                            label="Referral Code (Optional)"
                            placeholder="Enter referral code"
                            value={referralCode}
                            onChangeText={setReferralCode}
                            autoCapitalize="none"
                        />

                        <Button
                            onPress={handleSignUp}
                            fullWidth
                            style={styles.signUpButton}
                            disabled={loading}
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
                    </View>
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
    title: { fontSize: FONT_SIZES.xxxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
    subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
    form: { paddingHorizontal: SPACING.lg },
    passwordContainer: { position: 'relative' },
    eyeIcon: {
        position: 'absolute',
        right: SPACING.md,
        top: 38,
        padding: 4,
    },
    signUpButton: { marginTop: SPACING.md },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg, marginBottom: SPACING.xl },
    footerText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    signInLink: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: FONT_WEIGHTS.semibold },
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
        backgroundColor: `${COLORS.success}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    successTitle: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    successMessage: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.sm,
        lineHeight: 22,
    },
    successSubMessage: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    successButton: {
        marginTop: SPACING.lg,
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
