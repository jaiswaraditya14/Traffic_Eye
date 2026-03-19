import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAppContext, useAuth } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, formatPoints } from '../../utils';

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
        { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications', color: COLORS.accent },
        { icon: 'help-circle-outline', label: 'Help & FAQ', screen: 'Help', color: COLORS.info },
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy', screen: 'Privacy', color: COLORS.secondary },
        { icon: 'call-outline', label: 'Contact Us', screen: 'ContactUs', color: COLORS.primary },
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

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header with Gradient */}
                <Animated.View style={{ opacity: fadeAnim }}>
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.header}
                    >
                        <View style={styles.profileInfo}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {displayName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{displayName}</Text>
                                <Text style={styles.userEmail}>{displayEmail}</Text>
                                {displayPhone ? (
                                    <Text style={styles.userPhone}>{displayPhone}</Text>
                                ) : null}
                            </View>
                        </View>
                        <View style={styles.pointsBadge}>
                            <Ionicons name="trophy" size={16} color={COLORS.accent} />
                            <Text style={styles.pointsText}>{formatPoints(displayPoints)} pts</Text>
                        </View>
                    </LinearGradient>
                </Animated.View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Referral Code Section */}
                    {profile?.referral_code && (
                        <View style={styles.referralCard}>
                            <View style={styles.referralHeader}>
                                <View style={styles.referralIconBox}>
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
                                onPress={() => navigation.navigate(item.screen)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.menuIconBox, { backgroundColor: `${item.color}10` }]}>
                                    <Ionicons name={item.icon} size={20} color={item.color} />
                                </View>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                        disabled={loggingOut}
                        activeOpacity={0.7}
                    >
                        {loggingOut ? (
                            <ActivityIndicator size="small" color={COLORS.error} />
                        ) : (
                            <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
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
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.xl,
        paddingBottom: SPACING.xl + SPACING.sm,
    },
    profileInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: {
        fontSize: FONT_SIZES.xxl + 4,
        fontWeight: FONT_WEIGHTS.bold,
        color: '#FFFFFF',
    },
    userInfo: { flex: 1 },
    userName: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: '#FFFFFF',
        marginBottom: 2,
    },
    userEmail: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.85)' },
    userPhone: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    pointsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        marginTop: SPACING.md,
        alignSelf: 'flex-start',
        gap: SPACING.xs,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    pointsText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: '#FFFFFF' },
    content: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
    referralCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        ...SHADOWS.sm,
        borderWidth: 1,
        borderColor: COLORS.borderLight || COLORS.primaryLight || '#e6f2ff',
    },
    referralHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
    referralIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.primarySoft || `${COLORS.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    referralTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
    referralCode: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.primary,
        textAlign: 'center',
        letterSpacing: 3,
        marginVertical: SPACING.sm,
    },
    referralInfo: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center' },
    menuSection: {
        gap: SPACING.xs,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        ...SHADOWS.sm,
    },
    menuIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuLabel: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, marginLeft: SPACING.md, fontWeight: FONT_WEIGHTS.medium },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: `${COLORS.error}08`,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginTop: SPACING.xl,
        marginBottom: SPACING.xxl,
        borderWidth: 1,
        borderColor: `${COLORS.error}15`,
    },
    logoutText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.error,
        fontWeight: FONT_WEIGHTS.semibold,
    },
});
