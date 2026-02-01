import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer } from '../components/MobileContainer';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAppContext } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../utils/theme';

export default function CitizenSignIn({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { setIsAuthenticated } = useAppContext();

    const handleSignIn = () => {
        // TODO: Implement actual authentication
        setIsAuthenticated(true);
        navigation.replace('PermissionsRequest');
    };

    return (
        <MobileContainer>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to continue reporting violations</Text>
                    </View>

                    <View style={styles.form}>
                        <Input
                            label="Email"
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <View>
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
                                    color={COLORS.gray500}
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                            <Text style={styles.forgotPassword}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <Button onPress={handleSignIn} fullWidth style={styles.signInButton}>
                            Sign In
                        </Button>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <Button variant="secondary" fullWidth style={styles.socialButton}>
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
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.lg,
    },
    backButton: {
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: FONT_SIZES.xxxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
    },
    form: {
        paddingHorizontal: SPACING.lg,
    },
    eyeIcon: {
        position: 'absolute',
        right: SPACING.md,
        top: 38,
    },
    forgotPassword: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        textAlign: 'right',
        marginBottom: SPACING.lg,
    },
    signInButton: {
        marginTop: SPACING.md,
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
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.lg,
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


