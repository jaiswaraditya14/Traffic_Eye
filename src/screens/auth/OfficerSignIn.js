import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer, Button, Input } from '../../components';
import { useAuth } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils';

export default function OfficerSignIn({ navigation }) {
    const [badgeId, setBadgeId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    const { signInWithBadge } = useAuth();

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
        if (!badgeId.trim()) {
            Alert.alert('Error', 'Please enter your Badge ID');
            return;
        }
        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await signInWithBadge(badgeId.trim(), password);

            if (error) {
                Alert.alert('Sign In Failed', error.message);
                return;
            }

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
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
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
                        <View style={styles.badge}>
                            <View style={styles.badgeInner}>
                                <Ionicons name="shield-checkmark" size={48} color={COLORS.secondary} />
                            </View>
                        </View>
                        <Text style={styles.title}>Officer Sign In</Text>
                        <Text style={styles.subtitle}>Access your verification dashboard</Text>
                    </Animated.View>

                    <Animated.View style={[styles.form, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }]}>
                        <Input
                            label="Badge ID"
                            placeholder="Enter your badge ID"
                            value={badgeId}
                            onChangeText={setBadgeId}
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

                        <Button
                            onPress={handleSignIn}
                            fullWidth
                            variant="success"
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

                        <View style={styles.infoBox}>
                            <View style={styles.infoIconBox}>
                                <Ionicons name="information-circle" size={20} color={COLORS.secondary} />
                            </View>
                            <Text style={styles.infoText}>
                                Officer accounts are created by administrators. Contact your department if you need access.
                            </Text>
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
    header: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.lg,
        alignItems: 'center',
    },
    backButton: { alignSelf: 'flex-start', marginBottom: SPACING.lg },
    backButtonCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    badge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.secondarySoft || '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    badgeInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: `${COLORS.secondary}15`,
        justifyContent: 'center',
        alignItems: 'center',
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
        textAlign: 'center',
    },
    form: { paddingHorizontal: SPACING.lg },
    passwordWrapper: {
        position: 'relative',
    },
    eyeIcon: {
        position: 'absolute',
        right: SPACING.md,
        top: 40,
        padding: 4,
    },
    signInButton: { marginTop: SPACING.md },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.secondarySoft || '#ECFDF5',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginTop: SPACING.xl,
        gap: SPACING.sm,
    },
    infoIconBox: {
        marginTop: 2,
    },
    infoText: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
});
