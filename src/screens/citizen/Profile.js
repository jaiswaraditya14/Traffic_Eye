import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, FocusAwareStatusBar } from '../../components';
import { useAppContext, useAuth } from '../../context';
import { formatPoints } from '../../utils';
import { supabase } from '../../services/supabase';

// ── Design Tokens ──
const C = {
    navy: '#0A1E3F',
    navyMid: '#0F2C59',
    amber: '#D97706',
    amberDark: '#B45309',
    amberSurface: '#FEF3C7',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    surfaceLow: '#F8FAFC',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: '#CBD5E1',
    success: '#15803D',
    successSurface: '#DCFCE7',
    error: '#B91C1C',
    errorSurface: '#FEE2E2',
    primarySurface: '#EFF6FF',
    info: '#0F2C59',
    infoSurface: '#EFF6FF',
};

export default function Profile({ navigation }) {
    const { setIsAuthenticated, setUserRole } = useAppContext();
    const { profile, signOut } = useAuth();
    const [loggingOut, setLoggingOut] = useState(false);
    const [reportCount, setReportCount] = useState(0);
    const [verifiedCount, setVerifiedCount] = useState(0);
    const insets = useSafeAreaInsets();

    // Fetch real report stats for this user
    useEffect(() => {
        if (!profile?.id) return;
        const fetchStats = async () => {
            const { count: total } = await supabase
                .from('image_reports')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', profile.id);
            const { count: verified } = await supabase
                .from('image_reports')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', profile.id)
                .eq('status', 'approved');
            setReportCount(total ?? 0);
            setVerifiedCount(verified ?? 0);
        };
        fetchStats();
    }, [profile?.id]);

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
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* ── Navy Profile Hero ── */}
                    <LinearGradient colors={[C.navy, C.navyMid]} style={[styles.hero, { paddingTop: insets.top + 16 }]}>
                        <View style={styles.heroContent}>
                            {/* Avatar with Circular Frame */}
                            <View style={styles.avatarFrame}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{initials}</Text>
                                </View>
                                <View style={styles.onlineDot} />
                            </View>
                            
                            <View style={styles.heroInfo}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.heroName}>{displayName}</Text>
                                </View>
                                <Text style={styles.heroEmail}>{displayEmail}</Text>
                                <View style={styles.memberBadge}>
                                    <Ionicons name="shield-checkmark" size={9} color={C.amber} />
                                    <Text style={styles.memberBadgeText}>CITIZEN</Text>
                                </View>
                            </View>
                        </View>

                        {/* Stats mini bar */}
                        <View style={styles.heroStats}>
                            {[
                                { label: 'Reports',  value: reportCount.toString(),  icon: 'document-text'   },
                                { label: 'Verified', value: verifiedCount.toString(), icon: 'checkmark-circle' },
                                { label: 'Points',   value: formatPoints ? formatPoints(displayPoints) : displayPoints.toLocaleString(), icon: 'trophy' },
                            ].map((s, idx, arr) => (
                                <View key={idx} style={styles.heroStatItem}>
                                    <Text style={styles.heroStatValue}>{s.value}</Text>
                                    <View style={styles.statLabelRow}>
                                        <Ionicons name={s.icon} size={10} color="rgba(255,255,255,0.4)" />
                                        <Text style={styles.heroStatLabel}>{s.label}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </LinearGradient>

                    {/* ── Menu Sections ── */}
                    <View style={styles.menuArea}>
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
                                            <View style={[styles.menuIconFrame, { backgroundColor: `${item.color}10` }]}>
                                                <Ionicons name={item.icon} size={18} color={item.color} />
                                            </View>
                                            <Text style={styles.menuLabel}>{item.label}</Text>
                                            <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ))}

                        {/* Sign Out - Premium Style */}
                        <TouchableOpacity
                            style={styles.signOutButton}
                            onPress={handleLogout}
                            disabled={loggingOut}
                            activeOpacity={0.8}
                        >
                            <View style={styles.signOutFrame}>
                                {loggingOut ? (
                                    <ActivityIndicator size="small" color={C.error} />
                                ) : (
                                    <Ionicons name="log-out" size={20} color={C.error} />
                                )}
                                <Text style={styles.signOutText}>
                                    {loggingOut ? 'Signing out...' : 'Logout from Eye'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Version footer */}
                        <View style={styles.versionFooter}>
                            <View style={styles.versionLogoRow}>
                                <Ionicons name="shield-checkmark" size={14} color={C.textTertiary} />
                                <Text style={styles.versionAppName}>TrafficEye</Text>
                            </View>
                            <Text style={styles.versionText}>Version 1.0.0 · Traffic Enforcement Portal</Text>
                            <Text style={styles.versionGov}>Government Civic Service · Maharashtra</Text>
                        </View>

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
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    avatarFrame: {
        position: 'relative',
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36, // Perfect Circle Avatar
        backgroundColor: C.amber,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: C.navyMid,
    },
    avatarText: {
        fontSize: 24,
        fontFamily: 'Nunito-ExtraBold',
        color: C.navy,
    },
    heroInfo: { flex: 1 },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    heroName: {
        fontSize: 20,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.3,
    },
    heroEmail: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
        fontFamily: 'Nunito-Medium',
    },
    memberBadge: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 6,
    },
    memberBadgeText: {
        fontSize: 9,
        fontFamily: 'Nunito-ExtraBold',
        color: C.amber,
        letterSpacing: 1,
    },

    // Stats bar
    heroStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 12,
        justifyContent: 'space-around',
    },
    heroStatItem: {
        alignItems: 'center',
    },
    heroStatValue: {
        fontSize: 20,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
    statLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    heroStatLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Nunito-ExtraBold',
        textTransform: 'uppercase',
    },

    // Menu area
    menuArea: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    menuSection: {
        marginBottom: 20,
    },
    menuSectionTitle: {
        fontSize: 12,
        fontFamily: 'Nunito-ExtraBold',
        color: C.textTertiary,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 4,
    },
    menuCard: {
        backgroundColor: C.surface,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 14,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F2F4F6',
    },
    menuIconFrame: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuLabel: {
        flex: 1,
        fontSize: 15,
        color: C.textPrimary,
        fontFamily: 'Nunito-SemiBold',
    },

    // Referral card
    referralCard: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 24,
        elevation: 2,
    },
    referralGradient: {
        padding: 18,
    },
    referralHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    giftIconFrame: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(245,158,11,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    referralTitle: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        color: C.amberDark,
    },
    codeContainer: {
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRadius: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.1)',
    },
    referralCode: {
        fontSize: 20,
        fontFamily: 'Nunito-ExtraBold',
        color: C.navyMid,
        letterSpacing: 4,
    },
    referralInfo: {
        fontSize: 12,
        color: C.textSecondary,
        textAlign: 'center',
        marginTop: 10,
        fontFamily: 'Nunito-Medium',
    },

    // Sign out
    signOutButton: {
        marginBottom: 40,
    },
    signOutFrame: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#FEF2F2',
        borderRadius: 20,
        paddingVertical: 18,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    signOutText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: '#B91C1C',
    },

    // Version footer
    versionFooter: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 4,
    },
    versionLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 2,
    },
    versionAppName: {
        fontSize: 13,
        fontFamily: 'Nunito-Bold',
        color: '#64748B',
    },
    versionText: {
        fontSize: 11,
        fontFamily: 'Nunito-Medium',
        color: '#94A3B8',
    },
    versionGov: {
        fontSize: 10,
        fontFamily: 'Nunito-Regular',
        color: '#CBD5E1',
    },
});

