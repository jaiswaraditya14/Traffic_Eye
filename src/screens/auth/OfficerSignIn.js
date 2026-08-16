import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
    Platform, ScrollView, Alert, ActivityIndicator, TextInput, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, FocusAwareStatusBar } from '../../components';
import { useAuth } from '../../context';

// ── Design Tokens (Civic Authority) ──
const C = {
    navy: '#0F2C59',
    navyMid: '#1E3A8A',
    amber: '#D97706',
    amberDark: '#B45309',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    surfaceInput: '#F1F5F9',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: '#CBD5E1',
    error: '#B91C1C',
};

export default function OfficerSignIn({ navigation }) {
    const [badgeId, setBadgeId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [badgeFocused, setBadgeFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    // ── BACKEND INTACT — original signInWithBadge preserved ──
    const { signInWithBadge } = useAuth();

    const handleSignIn = async () => {
        if (!badgeId.trim()) { Alert.alert('Error', 'Please enter your Badge ID'); return; }
        if (!password) { Alert.alert('Error', 'Please enter your password'); return; }

        setLoading(true);
        try {
            const { data, error } = await signInWithBadge(badgeId.trim(), password);
            if (error) { Alert.alert('Sign In Failed', error.message); return; }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor="#0F2C59" />
            <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="always"
                >
                    {/* ── Navy Hero Header (40% screen) ── */}
                    <LinearGradient
                        colors={[C.navy, C.navyMid, '#0F2C59']}
                        style={styles.hero}
                    >
                        {/* Back button */}
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={20} color={C.white} />
                        </TouchableOpacity>

                        {/* Secure badge */}
                        <View style={styles.secureBadge}>
                            <View style={styles.secureIndicator} />
                            <Text style={styles.secureText}>OFFICIAL USE ONLY</Text>
                        </View>

                        {/* Badge icon */}
                        <View style={styles.badgeIconContainer}>
                            <View style={styles.badgeIconOuter}>
                                <Ionicons name="shield-checkmark" size={48} color={C.amber} />
                            </View>
                            {/* Decorative rings - Circular framing */}
                            <View style={styles.badgeRing1} />
                            <View style={styles.badgeRing2} />
                        </View>

                        <Text style={styles.heroTitle}>Officer Portal</Text>
                        <Text style={styles.heroSubtitle}>Official Traffic Police Sign In</Text>
                    </LinearGradient>

                    {/* ── Auth Card Section ── */}
                    <View style={styles.formContainer}>
                        <View style={styles.authCard}>
                            <Text style={styles.cardHeaderTitle}>Officer Sign In</Text>
                            <Text style={styles.cardHeaderSub}>Sign in with your credentials</Text>

                            {/* Badge ID */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>BADGE ID</Text>
                                <View style={[styles.inputRow, badgeFocused && styles.inputRowFocused]}>
                                    <Ionicons
                                        name="id-card"
                                        size={18}
                                        color={badgeFocused ? C.navyMid : '#94A3B8'}
                                    />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter Badge ID"
                                        placeholderTextColor="#94A3B8"
                                        value={badgeId}
                                        onChangeText={setBadgeId}
                                        autoCapitalize="none"
                                        onFocus={() => setBadgeFocused(true)}
                                        onBlur={() => setBadgeFocused(false)}
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

                            {/* Sign In Button */}
                            <TouchableOpacity
                                style={[styles.signInButton, loading && styles.buttonDisabled]}
                                onPress={handleSignIn}
                                disabled={loading}
                                activeOpacity={0.88}
                            >
                                <LinearGradient
                                    colors={[C.navy, C.navyMid]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.signInGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={C.white} />
                                    ) : (
                                        <>
                                            <Text style={styles.signInText}>Sign In</Text>
                                            <Ionicons name="log-in-outline" size={20} color={C.white} style={{ marginLeft: 6 }} />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.contactRow}
                                onPress={() => navigation.navigate('ForgotPassword')}
                            >
                                <Text style={styles.contactText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Notice box */}
                        <View style={styles.noticeBox}>
                            <View style={styles.noticeIconFrame}>
                                <Ionicons name="alert-circle" size={18} color={C.amberDark} />
                            </View>
                            <Text style={styles.noticeText}>
                                Unauthorized access to the Traffic Eye network is prohibited.
                            </Text>
                        </View>
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

    // ── Hero Section ──
    hero: {
        paddingTop: 52,
        paddingBottom: 44,
        paddingHorizontal: 24,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    backButton: {
        alignSelf: 'flex-start',
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    secureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        position: 'absolute',
        top: 56,
        right: 20,
        backgroundColor: 'rgba(5,150,105,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    secureIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#34D399',
    },
    secureText: {
        fontSize: 10,
        color: '#34D399',
        fontFamily: 'Nunito-SemiBold',
    },
    badgeIconContainer: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    badgeIconOuter: {
        width: 84,
        height: 84,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    badgeRing1: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.2)',
    },
    badgeRing2: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    heroTitle: {
        fontSize: 22,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.4,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.55)',
        fontStyle: 'italic',
        fontFamily: 'Nunito-Medium',
        marginTop: 5,
    },

    // ── Form Container & Auth Card ──
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
    cardHeaderTitle: {
        fontSize: 22,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
        textAlign: 'center',
    },
    cardHeaderSub: {
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

    // Sign in button
    signInButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 12,
        marginBottom: 20,
        elevation: 4,
    },
    signInGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
    },
    signInText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
    buttonDisabled: {
        opacity: 0.6,
    },

    // Contact link
    contactRow: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    contactText: {
        fontSize: 13,
        color: C.navyMid,
        fontFamily: 'Nunito-Bold',
    },

    // Notice box
    noticeBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: 'rgba(245,158,11,0.06)',
        padding: 16,
        borderRadius: 20,
        marginTop: 32,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.15)',
    },
    noticeIconFrame: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(245,158,11,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    noticeText: {
        flex: 1,
        fontSize: 12,
        color: C.textSecondary,
        lineHeight: 18,
        fontFamily: 'Nunito-Medium',
    },
});
