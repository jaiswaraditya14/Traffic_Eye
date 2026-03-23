import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
    Platform, ScrollView, Alert, ActivityIndicator, Animated,
    StatusBar, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { supabase } from '../../services';

const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    error: '#BA1A1A',
    errorSurface: '#FFDAD6',
    success: '#059669',
    successSurface: '#D1FAE5',
};

function StrengthBar({ password }) {
    const getStrength = (pwd) => {
        let score = 0;
        if (!pwd) return { score: 0, label: '', color: '#E2E8F0' };
        if (pwd.length >= 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        const map = [
            { score: 0, label: '', color: '#E2E8F0' },
            { score: 1, label: 'Weak', color: '#EF4444' },
            { score: 2, label: 'Fair', color: '#F59E0B' },
            { score: 3, label: 'Good', color: '#3B82F6' },
            { score: 4, label: 'Strong', color: '#059669' },
        ];
        return map[score] || map[0];
    };

    const { score, label, color } = getStrength(password);

    return (
        <View style={sStrength.container}>
            <View style={sStrength.bars}>
                {[1, 2, 3, 4].map(i => (
                    <View
                        key={i}
                        style={[sStrength.bar, i <= score && { backgroundColor: color }]}
                    />
                ))}
            </View>
            {!!label && <Text style={[sStrength.label, { color }]}>{label}</Text>}
        </View>
    );
}

const sStrength = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    bars: { flexDirection: 'row', gap: 4, flex: 1 },
    bar: { flex: 1, height: 4, borderRadius: 99, backgroundColor: '#E2E8F0' },
    label: { fontSize: 11, fontFamily: 'Nunito-Bold', minWidth: 44, textAlign: 'right' },
});

export default function NewPassword({ navigation, route }) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pwFocused, setPwFocused] = useState(false);
    const [cfFocused, setCfFocused] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const successScaleAnim = useRef(new Animated.Value(0.5)).current;
    const successOpacity = useRef(new Animated.Value(0)).current;
    const [done, setDone] = useState(false);

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, []);

    const validate = () => {
        if (!password) { setError('Please enter a new password.'); return false; }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return false; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return false; }
        return true;
    };

    const handleUpdate = async () => {
        setError('');
        if (!validate()) return;

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) {
                setError(updateError.message || 'Failed to update password. Please try again.');
                return;
            }

            // Sign out so user re-authenticates cleanly
            await supabase.auth.signOut();

            setDone(true);
            Animated.parallel([
                Animated.spring(successScaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
                Animated.timing(successOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            ]).start();
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <MobileContainer>
                <View style={styles.successPage}>
                    <Animated.View style={[
                        styles.successContent,
                        { opacity: successOpacity, transform: [{ scale: successScaleAnim }] },
                    ]}>
                        <View style={styles.successIconOuter}>
                            <LinearGradient colors={['#D1FAE5', '#A7F3D0']} style={styles.successIconInner}>
                                <Ionicons name="checkmark-done" size={48} color={C.success} />
                            </LinearGradient>
                        </View>
                        <Text style={styles.successTitle}>Password Updated!</Text>
                        <Text style={styles.successBody}>
                            Your password has been reset successfully. You can now sign in with your new credentials.
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
                                <Text style={styles.successCTAText}>Go to Sign In</Text>
                                <Ionicons name="log-in-outline" size={18} color={C.white} style={{ marginLeft: 8 }} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </MobileContainer>
        );
    }

    return (
        <MobileContainer>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={20} color={C.white} />
                        </TouchableOpacity>
                        <View style={styles.iconBg}>
                            <Ionicons name="lock-open" size={36} color={C.amber} />
                        </View>
                        <Text style={styles.headerTitle}>Set New Password</Text>
                        <Text style={styles.headerSubtitle}>Create a strong, unique password</Text>
                    </LinearGradient>

                    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>New Password</Text>
                            <Text style={styles.cardSubtitle}>Must be at least 8 characters</Text>

                            {/* New Password */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
                                <View style={[styles.inputRow, pwFocused && styles.inputRowFocused]}>
                                    <Ionicons name="lock-closed" size={17} color={pwFocused ? C.navyMid : '#94A3B8'} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="At least 8 characters"
                                        placeholderTextColor="#94A3B8"
                                        value={password}
                                        onChangeText={v => { setPassword(v); setError(''); }}
                                        secureTextEntry={!showPassword}
                                        onFocus={() => setPwFocused(true)}
                                        onBlur={() => setPwFocused(false)}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={17} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                                <StrengthBar password={password} />
                            </View>

                            {/* Confirm Password */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                                <View style={[styles.inputRow, cfFocused && styles.inputRowFocused, confirmPassword && confirmPassword !== password && styles.inputRowError]}>
                                    <Ionicons name="lock-closed" size={17} color={cfFocused ? C.navyMid : '#94A3B8'} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Repeat new password"
                                        placeholderTextColor="#94A3B8"
                                        value={confirmPassword}
                                        onChangeText={v => { setConfirmPassword(v); setError(''); }}
                                        secureTextEntry={!showConfirm}
                                        onFocus={() => setCfFocused(true)}
                                        onBlur={() => setCfFocused(false)}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                                        <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={17} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                                {confirmPassword && confirmPassword === password && (
                                    <View style={styles.matchBadge}>
                                        <Ionicons name="checkmark-circle" size={13} color={C.success} />
                                        <Text style={styles.matchText}>Passwords match</Text>
                                    </View>
                                )}
                            </View>

                            {/* Error */}
                            {!!error && (
                                <View style={styles.errorBadge}>
                                    <Ionicons name="alert-circle" size={14} color={C.error} />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            {/* Requirements */}
                            <View style={styles.requirements}>
                                {[
                                    { rule: password.length >= 8, label: 'Minimum 8 characters' },
                                    { rule: /[A-Z]/.test(password), label: 'One uppercase letter' },
                                    { rule: /[0-9]/.test(password), label: 'One number' },
                                    { rule: /[^A-Za-z0-9]/.test(password), label: 'One special character' },
                                ].map((req, i) => (
                                    <View key={i} style={styles.req}>
                                        <Ionicons
                                            name={req.rule ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={13}
                                            color={req.rule ? C.success : C.textTertiary}
                                        />
                                        <Text style={[styles.reqText, req.rule && styles.reqTextMet]}>
                                            {req.label}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Submit */}
                            <TouchableOpacity
                                style={[styles.submitButton, loading && styles.buttonDisabled]}
                                onPress={handleUpdate}
                                disabled={loading}
                                activeOpacity={0.88}
                            >
                                <LinearGradient
                                    colors={[C.navy, C.navyMid]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.submitGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={C.white} />
                                    ) : (
                                        <>
                                            <Text style={styles.submitText}>Update Password</Text>
                                            <Ionicons name="shield-checkmark" size={17} color={C.white} style={{ marginLeft: 8 }} />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
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
    iconBg: {
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
        fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center',
    },

    formContainer: { marginTop: -28, paddingHorizontal: 16, paddingBottom: 40 },
    card: {
        backgroundColor: C.white, borderRadius: 32, padding: 24,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1, shadowRadius: 24, elevation: 8,
    },
    cardTitle: { fontSize: 22, fontFamily: 'Nunito-Bold', color: C.navy, textAlign: 'center' },
    cardSubtitle: {
        fontSize: 14, color: C.textSecondary, fontFamily: 'Nunito-Medium',
        textAlign: 'center', marginTop: 4, marginBottom: 28,
    },

    fieldGroup: { marginBottom: 20 },
    fieldLabel: {
        fontSize: 10, fontFamily: 'Nunito-ExtraBold',
        color: C.textTertiary, marginBottom: 8, letterSpacing: 1.2, marginLeft: 4,
    },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F2F4F6', borderRadius: 16,
        paddingHorizontal: 16, paddingVertical: 14,
        gap: 12, borderWidth: 1, borderColor: '#E2E8F0',
    },
    inputRowFocused: { borderColor: C.navyMid, backgroundColor: C.white },
    inputRowError: { borderColor: C.error },
    textInput: {
        flex: 1, fontSize: 15, color: C.textPrimary,
        fontFamily: 'Nunito-SemiBold', padding: 0,
    },

    matchBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
    },
    matchText: { fontSize: 12, color: C.success, fontFamily: 'Nunito-SemiBold' },

    errorBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: C.errorSurface, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
    },
    errorText: { flex: 1, fontSize: 13, color: C.error, fontFamily: 'Nunito-SemiBold' },

    requirements: { gap: 6, marginBottom: 24 },
    req: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    reqText: { fontSize: 12, color: C.textTertiary, fontFamily: 'Nunito-Medium' },
    reqTextMet: { color: C.success, fontFamily: 'Nunito-SemiBold' },

    submitButton: { borderRadius: 16, overflow: 'hidden', elevation: 4 },
    submitGradient: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 18,
    },
    submitText: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.white },
    buttonDisabled: { opacity: 0.6 },

    // Success state
    successPage: {
        flex: 1, backgroundColor: C.offWhite,
        justifyContent: 'center', alignItems: 'center', padding: 32,
    },
    successContent: { width: '100%', alignItems: 'center' },
    successIconOuter: {
        width: 120, height: 120, borderRadius: 32,
        backgroundColor: C.white, justifyContent: 'center', alignItems: 'center',
        marginBottom: 24,
        shadowColor: C.success, shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15, shadowRadius: 20, elevation: 6,
    },
    successIconInner: {
        width: 80, height: 80, borderRadius: 24,
        justifyContent: 'center', alignItems: 'center',
    },
    successTitle: {
        fontSize: 26, fontFamily: 'Nunito-Bold', color: C.navy,
        textAlign: 'center', marginBottom: 12, letterSpacing: -0.5,
    },
    successBody: {
        fontSize: 15, color: C.textSecondary, textAlign: 'center',
        lineHeight: 22, marginBottom: 32, fontFamily: 'Nunito-Medium',
        paddingHorizontal: 8,
    },
    successCTA: { alignSelf: 'stretch', borderRadius: 16, overflow: 'hidden', elevation: 4 },
    successCTAGradient: {
        flexDirection: 'row', paddingVertical: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    successCTAText: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.white },
});
