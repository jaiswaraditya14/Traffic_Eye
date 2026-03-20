import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAppContext, useAuth } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, GRADIENTS, formatPoints } from '../../utils';

export default function Profile({ navigation }) {
    const { setIsAuthenticated, setUserRole } = useAppContext();
    const { profile, signOut } = useAuth();
    const [loggingOut, setLoggingOut] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    const menuItems = [
        { icon: 'person-outline', label: 'Edit Profile', screen: 'EditProfile', color: COLORS.primary },
        { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications', color: COLORS.info },
        { icon: 'help-circle-outline', label: 'Help & FAQ', screen: 'Help', color: COLORS.secondary },
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy', screen: 'Privacy', color: COLORS.warning },
        { icon: 'call-outline', label: 'Contact Us', screen: 'ContactUs', color: COLORS.accent },
    ];

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        setLoggingOut(true);
                        try {
                            await signOut();
                            setIsAuthenticated(false);
                            setUserRole(null);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to logout. Please try again.');
                            console.error(error);
                        } finally {
                            setLoggingOut(false);
                        }
                    }
                },
            ]
        );
    };

    const displayName = profile?.full_name || 'User Name';
    const displayEmail = profile?.email || 'user@example.com';
    const displayPhone = profile?.phone || '';
    const displayPoints = profile?.points_balance ?? 0;

    // Get initials for avatar
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Profile Header */}
                <LinearGradient
                    colors={GRADIENTS.heroIndigo}
                    style={styles.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.decorCircle} />
                    <View style={styles.profileInfo}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                        <View style={styles.pointsBadge}>
                            <Ionicons name="trophy" size={16} color={COLORS.accent} />
                            <Text style={styles.pointsText}>{formatPoints(displayPoints)} pts</Text>
                        </View>
                    </View>
                    <View style={styles.pointsBadge}>
                        <Ionicons name="trophy" size={16} color={COLORS.accent} />
                        <Text style={styles.pointsText}>{formatPoints(displayPoints)} pts</Text>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Referral Code Section */}
                    {profile?.referral_code && (
                        <View style={styles.referralCard}>
                            <View style={styles.referralHeader}>
                                <View style={styles.referralIconBg}>
                                    <Ionicons name="gift" size={20} color={COLORS.primary} />
                                </View>
                                <Text style={styles.referralTitle}>Your Referral Code</Text>
                            </View>
                            <Text style={styles.referralCode}>{profile.referral_code}</Text>
                            <Text style={styles.referralInfo}>Share this code to earn 50 points per referral!</Text>
                        </View>
                    )}

                    {/* Menu Items */}
                    <View style={styles.menuSection}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.menuItem}
                                onPress={() => navigation.getParent()?.navigate(item.screen) ?? navigation.navigate(item.screen)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.menuIconBg, { backgroundColor: `${item.color}12` }]}>
                                    <Ionicons name={item.icon} size={20} color={item.color} />
                                </View>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Logout */}
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                        disabled={loggingOut}
                        activeOpacity={0.7}
                    >
                        {loggingOut ? (
                            <ActivityIndicator size="small" color={COLORS.error} />
                        ) : (
                            <View style={[styles.menuIconBg, { backgroundColor: COLORS.errorSurface }]}>
                                <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                            </View>
                        )}
                        <Text style={styles.logoutText}>
                            {loggingOut ? 'Logging out...' : 'Logout'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    // ── Header ──
    headerGradient: {
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.xxl,
        overflow: 'hidden',
    },
    decorCircle: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.04)',
        top: -40,
        right: -40,
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: BORDER_RADIUS.xxl,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.lg,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    avatarText: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: '#FFFFFF',
        marginBottom: SPACING.xxs,
        letterSpacing: -0.2,
    },
    userEmail: {
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.8)',
    },
    userPhone: {
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 2,
    },
    pointsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        marginTop: SPACING.lg,
        alignSelf: 'flex-start',
        gap: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    pointsText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.bold,
        color: '#FFFFFF',
    },

    // ── Content ──
    content: {
        flex: 1,
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xl,
    },

    // ── Referral Card ──
    referralCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.primaryBorder,
        ...SHADOWS.sm,
    },
    referralHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.md,
    },
    referralIconBg: {
        width: 36,
        height: 36,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.primarySurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    referralTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
    },
    referralCode: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.primary,
        textAlign: 'center',
        letterSpacing: 3,
        marginVertical: SPACING.md,
    },
    referralInfo: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },

    // ── Menu ──
    menuSection: {
        gap: SPACING.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.xs,
    },
    menuIconBg: {
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuLabel: {
        flex: 1,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        marginLeft: SPACING.md,
        fontWeight: FONT_WEIGHTS.medium,
    },

    // ── Logout ──
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginTop: SPACING.xl,
        marginBottom: SPACING.xxl,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.xs,
    },
    logoutText: {
        flex: 1,
        fontSize: FONT_SIZES.md,
        color: COLORS.error,
        marginLeft: SPACING.md,
        fontWeight: FONT_WEIGHTS.semibold,
    },
});
