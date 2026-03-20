// OfficerProfile.js
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAppContext, useAuth } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils';

export default function OfficerProfile({ navigation }) {
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

    const stats = [
        { label: 'Verified', value: '156', icon: 'checkmark-circle', color: COLORS.success },
        { label: 'Rejected', value: '24', icon: 'close-circle', color: COLORS.error },
        { label: 'This Month', value: '45', icon: 'calendar', color: COLORS.info },
    ];

    const settingsItems = [
        { icon: 'settings-outline', label: 'App Settings', description: 'Configure application preferences', screen: 'OfficerSettings', color: COLORS.secondary },
        { icon: 'chatbubbles-outline', label: 'Contact Administrator', description: 'Technical support & account issues', action: 'contact', color: COLORS.primary },
        { icon: 'help-circle-outline', label: 'Help Center', description: 'Guidelines and documentation', action: 'help', color: COLORS.accent },
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
                <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Officer Profile</Text>
                    </View>
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.profileCard}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {displayName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.name}>{displayName}</Text>
                            <View style={styles.badgeContainer}>
                                <Ionicons name="id-card" size={14} color={COLORS.secondary} />
                                <Text style={styles.badgeId}>Badge #{displayBadge}</Text>
                            </View>
                            <Text style={styles.email}>{displayEmail}</Text>

                            <View style={styles.infoRow}>
                                <View style={styles.infoItem}>
                                    <Ionicons name="business" size={14} color={COLORS.textSecondary} />
                                    <Text style={styles.infoText}>{displayDepartment}</Text>
                                </View>
                                <View style={styles.infoDot} />
                                <View style={styles.infoItem}>
                                    <Ionicons name="location" size={14} color={COLORS.textSecondary} />
                                    <Text style={styles.infoText}>{displayJurisdiction}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.statsContainer}>
                            {stats.map((stat, index) => (
                                <View key={index} style={styles.statCard}>
                                    <View style={[styles.statIconBox, { backgroundColor: `${stat.color}10` }]}>
                                        <Ionicons name={stat.icon} size={24} color={stat.color} />
                                    </View>
                                    <Text style={styles.statValue}>{stat.value}</Text>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Settings & Support</Text>
                            {settingsItems.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.settingCard}
                                    onPress={() => item.action ? handleAction(item) : navigation.navigate(item.screen)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.settingIcon, { backgroundColor: `${item.color}10` }]}>
                                        <Ionicons name={item.icon} size={20} color={item.color} />
                                    </View>
                                    <View style={styles.settingContent}>
                                        <Text style={styles.settingLabel}>{item.label}</Text>
                                        <Text style={styles.settingDescription}>{item.description}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
                                </TouchableOpacity>
                            ))}
                        </View>

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
                </Animated.View>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
    title: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    content: { flex: 1, paddingHorizontal: SPACING.lg },
    profileCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        marginBottom: SPACING.lg,
        ...SHADOWS.md,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 28,
        backgroundColor: COLORS.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    avatarText: {
        fontSize: FONT_SIZES.xxxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: '#FFFFFF',
    },
    name: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.secondarySoft || '#ECFDF5',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 2,
        borderRadius: BORDER_RADIUS.full,
        marginBottom: SPACING.sm,
    },
    badgeId: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.secondary },
    email: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: SPACING.md },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.xs,
    },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    infoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.textTertiary },
    infoText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    statsContainer: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    statIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    statValue: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginTop: SPACING.xs },
    statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
    section: { marginBottom: SPACING.lg },
    sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.md },
    settingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.xs,
        ...SHADOWS.sm,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    settingContent: { flex: 1 },
    settingLabel: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
    settingDescription: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        padding: SPACING.md,
        backgroundColor: `${COLORS.error}08`,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.xxl,
        borderWidth: 1,
        borderColor: `${COLORS.error}15`,
    },
    logoutText: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.error },
});
