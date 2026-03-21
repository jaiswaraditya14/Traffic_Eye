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
                        <View style={styles.lockIconBg}>
                            <Ionicons name="lock-closed-outline" size={36} color={C.amber} />
                        </View>
                        <Text style={styles.headerTitle}>Forgot Password?</Text>
                        <Text style={styles.headerSubtitle}>
                            Enter your email and we'll send a reset link
                        </Text>
                    </LinearGradient>

                    {/* Form */}
                    <Animated.View style={[styles.formSection, { opacity: fadeAnim }]}>
                        <Text style={styles.fieldLabel}>Email Address</Text>
                        <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
                            <Ionicons
                                name="mail-outline"
                                size={17}
                                color={focused ? C.navyMid : C.textTertiary}
                            />
                            <TextInput
                                style={styles.textInput}
                                placeholder="you@example.com"
                                placeholderTextColor={C.textTertiary}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onFocus={() => setFocused(true)}
                                onBlur={() => setFocused(false)}
                            />
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
                                        <Text style={styles.resetText}>Send Reset Link</Text>
                                        <Ionicons name="send" size={15} color={C.white} />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backLink}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={15} color={C.navyMid} />
                            <Text style={styles.backLinkText}>Back to Sign In</Text>
                        </TouchableOpacity>
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

    // Form
    formSection: {
        paddingHorizontal: 24,
        paddingTop: 28,
    },
    fieldLabel: {
        fontSize: 12,
        fontFamily: 'Nunito-SemiBold',
        color: C.navyMid,
        marginBottom: 8,
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
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    inputRowFocused: {
        borderBottomColor: C.navyMid,
        backgroundColor: C.surface,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: C.textPrimary,
        padding: 0,
    },
    resetButton: {
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
        elevation: 6,
    },
    resetGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    resetText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    backLinkText: {
        fontSize: 14,
        color: C.navyMid,
        fontFamily: 'Nunito-Medium',
    },

    // Success state
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
        width: 110,
        height: 110,
        borderRadius: 28,
        backgroundColor: C.primarySurface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successIconInner: {
        width: 76,
        height: 76,
        borderRadius: 20,
        backgroundColor: 'rgba(27,58,107,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successTitle: {
        fontSize: 22,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        marginBottom: 10,
        letterSpacing: -0.4,
    },
    successBody: {
        fontSize: 14,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 10,
    },
    emailHighlight: {
        color: C.navyMid,
        fontFamily: 'Nunito-SemiBold',
    },
    successInstruction: {
        fontSize: 12,
        color: C.textTertiary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 28,
    },
    successCTA: {
        alignSelf: 'stretch',
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
    successCTAGradient: {
        paddingVertical: 16,
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
        gap: 6,
    },
    tryAgainText: {
        fontSize: 13,
        color: C.navyMid,
        fontFamily: 'Nunito-Medium',
    },
});
