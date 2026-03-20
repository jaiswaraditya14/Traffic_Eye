// OfficerProfile.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, GRADIENTS } from '../../utils/theme';

export default function OfficerProfile({ navigation }) {
    const { setIsAuthenticated, setUserRole } = useAppContext();
    const { profile, signOut } = useAuth();
    const [loggingOut, setLoggingOut] = useState(false);

    const stats = [
        { label: 'Verified', value: '156', icon: 'checkmark-circle', color: COLORS.success, bg: COLORS.successSurface },
        { label: 'Rejected', value: '24', icon: 'close-circle', color: COLORS.error, bg: COLORS.errorSurface },
        { label: 'This Month', value: '45', icon: 'calendar', color: COLORS.info, bg: COLORS.infoSurface },
    ];

    const settingsItems = [
        { icon: 'settings-outline', label: 'App Settings', description: 'Configure app preferences', screen: 'OfficerSettings', color: COLORS.primary },
        { icon: 'chatbubbles-outline', label: 'Contact Administrator', description: 'Technical support & issues', action: 'contact', color: COLORS.secondary },
        { icon: 'help-circle-outline', label: 'Help Center', description: 'Guidelines & documentation', action: 'help', color: COLORS.accent },
    ];

    const handleAction = (item) => {
        if (item.action === 'contact') {
            Alert.alert(
                'Contact Administrator',
                'How would you like to contact support?',
                [
                    { text: 'Email Support', onPress: () => Alert.alert('Email', 'Support email: admin@trafficeye.gov') },
                    { text: 'Call IT Department', onPress: () => Alert.alert('Call', 'Connecting to IT support...') },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } else {
            Alert.alert('Info', `${item.label} feature coming soon!`);
        }
    };

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

    const displayName = profile?.full_name || 'Officer';
    const displayBadge = profile?.badge_id || 'N/A';
    const displayEmail = profile?.email || 'officer@trafficeye.com';
    const displayDepartment = profile?.department || 'Traffic Department';
    const displayJurisdiction = profile?.jurisdiction || 'City Center';
    const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Hero Header */}
                    <LinearGradient
                        colors={GRADIENTS.secondary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroHeader}
                    >
                        <Text style={styles.headerTitle}>Officer Profile</Text>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                            <View style={styles.shieldBadge}>
                                <Ionicons name="shield-checkmark" size={16} color={COLORS.secondary} />
                            </View>
                        </View>
                        <Text style={styles.name}>{displayName}</Text>
                        <View style={styles.badgeContainer}>
                            <Ionicons name="id-card" size={14} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.badgeId}>Badge #{displayBadge}</Text>
                        </View>
                    </LinearGradient>

                    <View style={styles.content}>
                        {/* Info Row */}
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <Ionicons name="mail" size={16} color={COLORS.textTertiary} />
                                <Text style={styles.infoText}>{displayEmail}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Ionicons name="business" size={16} color={COLORS.textTertiary} />
                                <Text style={styles.infoText}>{displayDepartment}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Ionicons name="location" size={16} color={COLORS.textTertiary} />
                                <Text style={styles.infoText}>{displayJurisdiction}</Text>
                            </View>
                        </View>

                        {/* Stats */}
                        <View style={styles.statsContainer}>
                            {stats.map((stat, index) => (
                                <View key={index} style={styles.statCard}>
                                    <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
                                        <Ionicons name={stat.icon} size={22} color={stat.color} />
                                    </View>
                                    <Text style={styles.statValue}>{stat.value}</Text>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Settings */}
                        <Text style={styles.sectionTitle}>Settings & Support</Text>
                        {settingsItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.settingCard}
                                onPress={() => item.action ? handleAction(item) : navigation.getParent()?.navigate(item.screen) ?? navigation.navigate(item.screen)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.settingIcon, { backgroundColor: `${item.color}12` }]}>
                                    <Ionicons name={item.icon} size={20} color={item.color} />
                                </View>
                                <View style={styles.settingContent}>
                                    <Text style={styles.settingLabel}>{item.label}</Text>
                                    <Text style={styles.settingDesc}>{item.description}</Text>
                                </View>
                                <View style={styles.settingChevron}>
                                    <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                                </View>
                            </TouchableOpacity>
                        ))}

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
                                <Ionicons name="log-out" size={20} color={COLORS.error} />
                            )}
                            <Text style={styles.logoutText}>
                                {loggingOut ? 'Logging out...' : 'Logout'}
                            </Text>
                        </TouchableOpacity>
                    </View>
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
    // ── Hero ──
    heroHeader: {
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.xxl,
        paddingHorizontal: SPACING.xl,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: FONT_WEIGHTS.medium,
        textTransform: 'uppercase',
        letterSpacing: 1,
        alignSelf: 'flex-start',
        marginBottom: SPACING.xl,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: SPACING.md,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.white,
    },
    shieldBadge: {
        position: 'absolute',
        bottom: 0,
        right: -4,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.md,
    },
    name: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.white,
        marginBottom: SPACING.xs,
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    badgeId: {
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: FONT_WEIGHTS.medium,
    },
    // ── Content ──
    content: {
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xl,
    },
    infoRow: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.md,
        marginBottom: SPACING.lg,
        ...SHADOWS.xs,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    infoText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    // ── Stats ──
    statsContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.xs,
    },
    statIcon: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    statValue: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    statLabel: {
        fontSize: FONT_SIZES.xxs,
        color: COLORS.textTertiary,
        fontWeight: FONT_WEIGHTS.medium,
        textAlign: 'center',
        marginTop: 2,
    },
    // ── Settings ──
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
        letterSpacing: -0.2,
    },
    settingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.xs,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    settingContent: {
        flex: 1,
    },
    settingLabel: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    settingDesc: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    settingChevron: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.gray50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // ── Logout ──
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        padding: SPACING.lg,
        backgroundColor: COLORS.errorSurface,
        borderRadius: BORDER_RADIUS.xl,
        marginTop: SPACING.md,
        marginBottom: SPACING.xxl,
        borderWidth: 1,
        borderColor: `${COLORS.error}20`,
    },
    logoutText: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.error,
    },
});
