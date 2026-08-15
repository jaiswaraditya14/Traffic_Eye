import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
    Platform, ScrollView, Alert, ActivityIndicator, Animated,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, FocusAwareStatusBar } from '../../components';
import { supabase } from '../../services';
import { isValidEmail } from '../../utils';

const C = {
    navy: '#0A1E3F',
    navyMid: '#0F2C59',
    amber: '#F59E0B',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    surfaceInput: '#F2F4F6',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: '#CBD5E1',
    error: '#B91C1C',
    errorSurface: '#FFDAD6',
    primarySurface: '#D7E2FF',
};

export default function ForgotPassword({ navigation }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState(false);
    const [error, setError] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, []);

    const handleResetPassword = async () => {
        setError('');
        if (!email.trim()) { setError('Please enter your email address.'); return; }
        if (!isValidEmail(email.trim())) { setError('Please enter a valid email address.'); return; }

        setLoading(true);
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: 'trafficeye://auth/callback',
            });

            if (resetError) {
                setError(resetError.message || 'Failed to send reset email. Please try again.');
                return;
            }

            // Navigate to OTP entry screen, passing the email
            navigation.navigate('OtpVerification', { email: email.trim() });
        } catch (err) {
            setError('Something went wrong. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileContainer>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
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

                    {/* Form */}
                    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
                        <View style={styles.authCard}>
                            <Text style={styles.welcomeText}>Verify Identity</Text>
                            <Text style={styles.subWelcomeText}>
                                We'll send an 8-digit OTP to your registered email
                            </Text>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>REGISTERED EMAIL</Text>
                                <View style={[styles.inputRow, focused && styles.inputRowFocused, !!error && styles.inputRowError]}>
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
                                        onChangeText={v => { setEmail(v); setError(''); }}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        onFocus={() => setFocused(true)}
                                        onBlur={() => setFocused(false)}
                                    />
                                </View>
                            </View>

                            {/* Error */}
                            {!!error && (
                                <View style={styles.errorBadge}>
                                    <Ionicons name="alert-circle" size={14} color={C.error} />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            {/* Info banner */}
                            <View style={styles.infoBanner}>
                                <Ionicons name="information-circle" size={16} color={C.navyMid} />
                                <Text style={styles.infoText}>
                                    An 8-digit code will be sent to your email. It expires in 10 minutes.
                                </Text>
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
                                            <Text style={styles.resetText}>Send OTP Code</Text>
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
                        <Text style={styles.legalNotice}>
                            If you no longer have access to this email, contact administration.
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    scrollContent: { flexGrow: 1 },

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
        width: 36, height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 24,
    },
    lockIconBg: {
        width: 80, height: 80,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 22, fontFamily: 'Nunito-Bold',
        color: C.white, letterSpacing: -0.4, marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 13, color: 'rgba(255,255,255,0.6)',
        textAlign: 'center', lineHeight: 20, paddingHorizontal: 16,
    },

    formContainer: { marginTop: -32, paddingHorizontal: 16, paddingBottom: 40 },
    authCard: {
        backgroundColor: C.white, borderRadius: 32, padding: 24,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1, shadowRadius: 24, elevation: 8,
    },
    welcomeText: {
        fontSize: 22, fontFamily: 'Nunito-Bold',
        color: C.navy, textAlign: 'center',
    },
    subWelcomeText: {
        fontSize: 14, color: C.textSecondary, fontFamily: 'Nunito-Medium',
        textAlign: 'center', marginTop: 4, marginBottom: 28,
    },

    fieldGroup: { marginBottom: 16 },
    fieldLabel: {
        fontSize: 10, fontFamily: 'Nunito-ExtraBold',
        color: C.textTertiary, marginBottom: 8, letterSpacing: 1.2, marginLeft: 4,
    },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.offWhite, borderRadius: 16,
        paddingHorizontal: 16, paddingVertical: 14,
        gap: 12, borderWidth: 1, borderColor: '#E2E8F0',
    },
    inputRowFocused: { borderColor: C.navyMid, backgroundColor: C.white },
    inputRowError: { borderColor: C.error },
    textInput: {
        flex: 1, fontSize: 15, color: C.textPrimary,
        fontFamily: 'Nunito-SemiBold', padding: 0,
    },

    errorBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: C.errorSurface, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
    },
    errorText: { flex: 1, fontSize: 13, color: C.error, fontFamily: 'Nunito-SemiBold' },

    infoBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: '#EEF2FF', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 10, marginBottom: 24,
    },
    infoText: {
        flex: 1, fontSize: 12, color: C.navyMid,
        fontFamily: 'Nunito-Medium', lineHeight: 17,
    },

    resetButton: { borderRadius: 16, overflow: 'hidden', marginBottom: 24, elevation: 4 },
    resetGradient: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 18,
    },
    resetText: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.white },

    backLink: { alignItems: 'center', paddingVertical: 12 },
    backLinkText: { fontSize: 14, color: C.navyMid, fontFamily: 'Nunito-Bold' },

    legalNotice: {
        fontSize: 11, color: '#94A3B8', textAlign: 'center',
        marginTop: 24, fontFamily: 'Nunito-Medium', paddingHorizontal: 16,
    },
});
