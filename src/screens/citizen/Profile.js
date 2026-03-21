import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAppContext, useAuth } from '../../context';
import { formatPoints } from '../../utils';

// ── Design Tokens ──
const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    amberDark: '#D97706',
    amberSurface: '#FEF3C7',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    surfaceLow: '#F2F4F6',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    border: '#C4C6D0',
    success: '#059669',
    successSurface: '#D1FAE5',
    error: '#BA1A1A',
    errorSurface: '#FFDAD6',
    primarySurface: '#D7E2FF',
    info: '#1B3A6B',
    infoSurface: '#D7E2FF',
};

export default function Profile({ navigation }) {
    const { setIsAuthenticated, setUserRole } = useAppContext();
    const { profile, signOut } = useAuth();
    const [loggingOut, setLoggingOut] = useState(false);

    // ── BACKEND INTACT: uses signOut, setIsAuthenticated, setUserRole ──
    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    setLoggingOut(true);
                    try {
                        await signOut();
                        setIsAuthenticated(false);
                        setUserRole(null);
                    } catch (error) {
                        Alert.alert('Error', 'Failed to sign out. Please try again.');
                        console.error(error);
                    } finally {
                        setLoggingOut(false);
                    }
                },
            },
        ]);
    };

    const displayName = profile?.full_name || 'User Name';
    const displayEmail = profile?.email || 'user@example.com';
    const displayPoints = profile?.points_balance ?? 0;
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    const menuSections = [
        {
            title: 'Account',
            items: [
                { icon: 'person-outline', label: 'Edit Profile', screen: 'EditProfile', color: C.navyMid },
                { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications', color: C.navyMid },
                { icon: 'lock-closed-outline', label: 'Change Password', screen: 'ChangePassword', color: C.navyMid },
            ],
        },
        {
            title: 'Help & Support',
            items: [
                { icon: 'call-outline', label: 'Contact Us', screen: 'ContactUs', color: '#047857' },
                { icon: 'information-circle-outline', label: 'Traffic Fines Info', screen: 'FineInformation', color: '#047857' },
                { icon: 'shield-checkmark-outline', label: 'Safety Tips', screen: 'SafetyTips', color: '#047857' },
                { icon: 'sign-language-outline', label: 'Traffic Signs', screen: 'TrafficSigns', color: '#047857' },
            ],
        },
        {
            title: 'App',
            items: [
                { icon: 'star-outline', label: 'Rate App', screen: null, color: C.amberDark },
                { icon: 'share-social-outline', label: 'Share App', screen: null, color: C.amberDark },
                { icon: 'document-text-outline', label: 'Terms & Privacy', screen: 'Privacy', color: C.amberDark },
            ],
        },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* ── Navy Profile Hero ── */}
                    <LinearGradient colors={[C.navy, C.navyMid]} style={styles.hero}>
                        <View style={styles.heroContent}>
                            {/* Avatar */}
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                            <View style={styles.heroInfo}>
                                <Text style={styles.heroName}>{displayName}</Text>
                                <Text style={styles.heroEmail}>{displayEmail}</Text>
                                <Text style={styles.heroSince}>Citizen Member</Text>
                            </View>
                        </View>

                        {/* Stats mini bar */}
                        <View style={styles.heroStats}>
                            {[
                                { label: 'Reports', value: '12', icon: 'document-text' },
                                { label: 'Verified', value: '8', icon: 'checkmark-circle' },
                                { label: 'Points', value: formatPoints ? formatPoints(displayPoints) : displayPoints.toLocaleString(), icon: 'trophy' },
                            ].map((s, idx, arr) => (
                                <React.Fragment key={idx}>
                                    <View style={styles.heroStatItem}>
                                        <Text style={styles.heroStatValue}>{s.value}</Text>
                                        <Text style={styles.heroStatLabel}>{s.label}</Text>
                                    </View>
                                    {idx < arr.length - 1 && <View style={styles.heroStatDivider} />}
                                </React.Fragment>
                            ))}
                        </View>
                    </LinearGradient>

                    {/* ── Menu Sections ── */}
                    <View style={styles.menuArea}>
                        {/* Referral Code */}
                        {profile?.referral_code && (
                            <View style={styles.referralCard}>
                                <View style={styles.referralHeader}>
                                    <View style={[styles.menuIconBg, { backgroundColor: C.amberSurface }]}>
                                        <Ionicons name="gift" size={18} color={C.amberDark} />
                                    </View>
                                    <Text style={styles.referralTitle}>Your Referral Code</Text>
                                </View>
                                <Text style={styles.referralCode}>{profile.referral_code}</Text>
                                <Text style={styles.referralInfo}>Share to earn 50 points per referral!</Text>
                            </View>
                        )}

                        {menuSections.map((section, sIdx) => (
                            <View key={sIdx} style={styles.menuSection}>
                                <Text style={styles.menuSectionTitle}>{section.title}</Text>
                                <View style={styles.menuCard}>
                                    {section.items.map((item, iIdx) => (
                                        <TouchableOpacity
                                            key={iIdx}
                                            style={[
                                                styles.menuItem,
                                                iIdx < section.items.length - 1 && styles.menuItemBorder,
                                            ]}
                                            onPress={() => {
                                                if (item.screen) {
                                                    navigation.getParent()?.navigate(item.screen) ??
                                                        navigation.navigate(item.screen);
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.menuIconBg, { backgroundColor: `${item.color}15` }]}>
                                                <Ionicons name={item.icon} size={18} color={item.color} />
                                            </View>
                                            <Text style={styles.menuLabel}>{item.label}</Text>
                                            <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ))}

                        {/* Sign Out */}
                        <TouchableOpacity
                            style={styles.signOutButton}
                            onPress={handleLogout}
                            disabled={loggingOut}
                            activeOpacity={0.8}
                        >
                            {loggingOut ? (
                                <ActivityIndicator size="small" color={C.error} />
                            ) : (
                                <Ionicons name="log-out-outline" size={18} color={C.error} />
                            )}
                            <Text style={styles.signOutText}>
                                {loggingOut ? 'Signing out...' : 'Sign Out'}
                            </Text>
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Hero
    hero: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 20,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: C.amber,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 22,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
        letterSpacing: 1,
    },
    heroInfo: { flex: 1 },
    heroName: {
        fontSize: 18,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.3,
    },
    heroEmail: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.65)',
        marginTop: 2,
    },
    heroSince: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.45)',
        marginTop: 3,
    },

    // Stats mini bar
    heroStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    heroStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    heroStatValue: {
        fontSize: 18,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.5,
    },
    heroStatLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.55)',
        fontFamily: 'Nunito-Medium',
        marginTop: 2,
    },
    heroStatDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginVertical: 4,
    },

    // Menu area
    menuArea: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    menuSection: {
        marginBottom: 16,
    },
    menuSectionTitle: {
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
        color: C.textTertiary,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 2,
    },
    menuCard: {
        backgroundColor: C.surface,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F2F4F6',
    },
    menuIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuLabel: {
        flex: 1,
        fontSize: 15,
        color: C.textPrimary,
        fontFamily: 'Nunito-Medium',
    },

    // Referral card
    referralCard: {
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: C.amberSurface,
    },
    referralHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    referralTitle: {
        fontSize: 14,
        fontFamily: 'Nunito-SemiBold',
        color: C.textPrimary,
    },
    referralCode: {
        fontSize: 22,
        fontFamily: 'Nunito-Bold',
        color: C.navyMid,
        textAlign: 'center',
        letterSpacing: 4,
        marginBottom: 6,
    },
    referralInfo: {
        fontSize: 12,
        color: C.textSecondary,
        textAlign: 'center',
    },

    // Sign out
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: C.errorSurface,
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 4,
    },
    signOutText: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        color: C.error,
    },
});
