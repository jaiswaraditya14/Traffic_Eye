import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
    Platform, ScrollView, Alert, ActivityIndicator, StatusBar, TextInput, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAuth } from '../../context';

// ── Design Tokens (Civic Authority) ──
const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    amberDark: '#D97706',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    surfaceInput: '#F2F4F6',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    border: '#C4C6D0',
    error: '#BA1A1A',
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
            console.log('Officer sign in successful. AuthContext will update AppNavigator.');
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileContainer>
            <StatusBar barStyle="light-content" backgroundColor={C.navy} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Navy Hero Header (40% screen) ── */}
                    <LinearGradient
                        colors={[C.navy, C.navyMid, '#2C4E80']}
                        locations={[0, 0.6, 1]}
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
                            <Text style={styles.secureText}>Secure Connection</Text>
                        </View>

                        {/* Badge icon */}
                        <View style={styles.badgeIconContainer}>
                            <View style={styles.badgeIconOuter}>
                                <Ionicons name="shield-checkmark" size={48} color={C.amber} />
                            </View>
                            {/* Decorative rings */}
                            <View style={styles.badgeRing1} />
                            <View style={styles.badgeRing2} />
                        </View>

                        <Text style={styles.heroTitle}>Traffic Officer Login</Text>
                        <Text style={styles.heroSubtitle}>Official Access Only</Text>

                        {/* Diagonal line texture (visual) */}
                        <View style={styles.diagonalAccent} />
                    </LinearGradient>

                    {/* ── White Form Section (rounded top) ── */}
                    <View style={styles.formWrapper}>
                        {/* Badge ID */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Badge ID</Text>
                            <View style={[styles.inputRow, badgeFocused && styles.inputRowFocused]}>
                                <Ionicons
                                    name="card-outline"
                                    size={18}
                                    color={badgeFocused ? C.navyMid : C.textTertiary}
                                />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your Badge ID"
                                    placeholderTextColor={C.textTertiary}
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
                            <Text style={styles.fieldLabel}>Password</Text>
                            <View style={[styles.inputRow, passwordFocused && styles.inputRowFocused]}>
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={18}
                                    color={passwordFocused ? C.navyMid : C.textTertiary}
                                />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your password"
                                    placeholderTextColor={C.textTertiary}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    onFocus={() => setPasswordFocused(true)}
                                    onBlur={() => setPasswordFocused(false)}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                        size={18}
                                        color={C.textTertiary}
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
                                        <Ionicons name="shield-checkmark" size={16} color={C.white} />
                                        <Text style={styles.signInText}>Sign In as Officer</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Contact admin link */}
                        <TouchableOpacity style={styles.contactRow}>
                            <Ionicons name="headset-outline" size={15} color={C.navyMid} />
                            <Text style={styles.contactText}>Having trouble? Contact Admin</Text>
                        </TouchableOpacity>

                        {/* Auth notice */}
                        <View style={styles.noticeBox}>
                            <Ionicons name="information-circle-outline" size={15} color={C.textTertiary} />
                            <Text style={styles.noticeText}>
                                This portal is for authorized Traffic Authority personnel only. Unauthorized access is prohibited.
                            </Text>
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
        fontWeight: '600',
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
        fontWeight: '700',
        color: C.white,
        letterSpacing: -0.4,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.55)',
        fontStyle: 'italic',
        fontWeight: '500',
        marginTop: 5,
    },
    diagonalAccent: {
        position: 'absolute',
        bottom: -40,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },

    // ── Form Section ──
    formWrapper: {
        backgroundColor: C.offWhite,
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 40,
    },
    fieldGroup: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: C.navyMid,
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surfaceInput,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        gap: 10,
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

    // Sign in button
    signInButton: {
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 4,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    signInGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    signInText: {
        fontSize: 16,
        fontWeight: '700',
        color: C.white,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    divider: {
        height: 1,
        backgroundColor: C.border,
        marginVertical: 24,
        opacity: 0.5,
    },
    dividerLine: {
        flex: 1,
    },

    // Contact / admin
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 20,
    },
    contactText: {
        fontSize: 14,
        color: C.navyMid,
        fontWeight: '600',
    },

    // Notice box
    noticeBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#F2F4F6',
        padding: 14,
        borderRadius: 12,
    },
    noticeText: {
        flex: 1,
        fontSize: 12,
        color: C.textTertiary,
        lineHeight: 18,
    },
});
