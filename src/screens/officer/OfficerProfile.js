import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services';

const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    border: '#E5E7EB',
    error: '#BA1A1A',
    errorSurface: '#FFDAD6',
    success: '#059669',
    successSurface: '#D1FAE5',
};

export default function OfficerProfile({ navigation }) {
    const { setIsAuthenticated, setUserRole } = useAppContext();
    const { profile, signOut } = useAuth();
    const [loggingOut, setLoggingOut] = useState(false);
    const [stats, setStats] = useState({ verified: 0, rejected: 0, thisMonth: 0 });

    const loadStats = useCallback(async () => {
        if (!profile?.id) return;
        try {
            const { data, error } = await supabase
                .from('officer_reviews')
                .select('decision, review_timestamp')
                .eq('officer_id', profile.id);
            
            if (!error && data) {
                let verified = 0, rejected = 0, thisMonth = 0;
                const now = new Date();
                data.forEach(r => {
                    if (r.decision === 'approved') verified++;
                    if (r.decision === 'rejected') rejected++;
                    
                    if (r.review_timestamp) {
                        const d = new Date(r.review_timestamp);
                        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
                            thisMonth++;
                        }
                    }
                });
                setStats({ verified, rejected, thisMonth });
            }
        } catch (error) {
            console.error('Error fetching officer stats:', error);
        }
    }, [profile?.id]);

    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [loadStats])
    );

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
                }
            },
        ]);
    };

    const handleContact = () => {
        Alert.alert('Contact IT Support', 'How would you like to request assistance?', [
            { text: 'Email Helpdesk', onPress: () => Alert.alert('Email sent', 'A ticket has been opened for you.') },
            { text: 'Call Dispatch', onPress: () => Alert.alert('Calling', 'Connecting to dispatch...') },
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

    const displayName = profile?.full_name || 'Officer';
    const displayBadge = profile?.badge_id || 'N/A';
    const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            {/* ── Navy Hero Header ── */}
            <LinearGradient colors={[C.navy, C.navyMid]} style={styles.heroSection}>
                <SafeAreaView edges={['top']} style={styles.heroSafeTop}>
                    <View style={styles.heroTopRow}>
                        <Text style={styles.heroTitle}>Officer Profile</Text>
                        <TouchableOpacity onPress={handleContact} style={styles.headsetBtn}>
                            <Ionicons name="headset" size={20} color={C.white} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarBg}>
                            <Text style={styles.avatarInitials}>{initials}</Text>
                        </View>
                        <View style={styles.badgeShield}>
                            <Ionicons name="shield-checkmark" size={14} color={C.white} />
                        </View>
                    </View>
                    <Text style={styles.heroName}>{displayName}</Text>
                    <View style={styles.badgeRow}>
                        <Ionicons name="id-card" size={14} color={C.amber} />
                        <Text style={styles.heroBadge}>Badge #{displayBadge}</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* ── Officer Stats Row ── */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <View style={[styles.statIconBg, { backgroundColor: C.successSurface }]}>
                            <Ionicons name="checkmark-done" size={20} color={C.success} />
                        </View>
                        <Text style={styles.statValue}>{stats.verified}</Text>
                        <Text style={styles.statLabel}>Verified</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <View style={[styles.statIconBg, { backgroundColor: C.errorSurface }]}>
                            <Ionicons name="close" size={20} color={C.error} />
                        </View>
                        <Text style={styles.statValue}>{stats.rejected}</Text>
                        <Text style={styles.statLabel}>Rejected</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <View style={[styles.statIconBg, { backgroundColor: '#E0E7FF' }]}>
                            <Ionicons name="calendar" size={18} color={C.navyMid} />
                        </View>
                        <Text style={styles.statValue}>{stats.thisMonth}</Text>
                        <Text style={styles.statLabel}>This Month</Text>
                    </View>
                </View>

                {/* ── Analytics & Map ── */}
                <Text style={styles.sectionHeader}>Analytics & Map</Text>
                <View style={styles.menuGroup}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('LiveMap')} activeOpacity={0.7}>
                        <View style={[styles.menuIconBg, { backgroundColor: '#FEF3C7' }]}><Ionicons name="flame" size={20} color={C.amber} /></View>
                        <Text style={styles.menuItemText}>Live Violation Heatmap</Text>
                        <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
                    </TouchableOpacity>
                </View>

                {/* ── Menu Options ── */}
                <Text style={styles.sectionHeader}>Preferences</Text>
                <View style={styles.menuGroup}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('OfficerSettings')} activeOpacity={0.7}>
                        <View style={styles.menuIconBg}><Ionicons name="settings" size={20} color={C.navyMid} /></View>
                        <Text style={styles.menuItemText}>App Settings</Text>
                        <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
                    </TouchableOpacity>
                    <View style={styles.menuDivider} />
                    <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Help Center', 'Documentation opening...')} activeOpacity={0.7}>
                        <View style={styles.menuIconBg}><Ionicons name="help-buoy" size={20} color={C.navyMid} /></View>
                        <Text style={styles.menuItemText}>Help Center</Text>
                        <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeader}>Account</Text>
                <View style={styles.menuGroup}>
                    <TouchableOpacity 
                        style={styles.menuItem} 
                        onPress={handleLogout} 
                        disabled={loggingOut}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIconBg, { backgroundColor: C.errorSurface }]}>
                            {loggingOut ? <ActivityIndicator size="small" color={C.error} /> : <Ionicons name="log-out" size={20} color={C.error} />}
                        </View>
                        <Text style={[styles.menuItemText, { color: C.error }]}>{loggingOut ? 'Signing out...' : 'Sign Out'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footerVersion}>
                    <Text style={styles.versionText}>Traffic Eye App • Verified Officer Access</Text>
                    <Text style={styles.versionText}>Version 1.1.0-sec</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    
    // Hero
    heroSection: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 32, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
    heroSafeTop: { paddingHorizontal: 24, paddingTop: 16, alignItems: 'center' },
    heroTopRow: { flexDirection: 'row', width: '100%', justifyContent: 'center', alignItems: 'center', marginBottom: 24, position: 'relative' },
    heroTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.white },
    headsetBtn: { position: 'absolute', right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    
    avatarWrapper: { position: 'relative', marginBottom: 16 },
    avatarBg: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.amber, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: C.white },
    avatarInitials: { fontSize: 32, fontFamily: 'Nunito-Bold', color: C.navy, letterSpacing: 1 },
    badgeShield: { position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.white },
    
    heroName: { fontSize: 24, fontFamily: 'Nunito-Bold', color: C.white, marginBottom: 6, letterSpacing: -0.5 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    heroBadge: { fontSize: 14, fontFamily: 'Nunito-SemiBold', color: C.white },

    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

    // Stats
    statsRow: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 20, paddingVertical: 20, marginBottom: 24, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F2F4F6' },
    statBox: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: '#F2F4F6', marginVertical: 4 },
    statIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    statValue: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginBottom: 2 },
    statLabel: { fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.textTertiary, textTransform: 'uppercase' },

    // Menu
    sectionHeader: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textSecondary, marginBottom: 8, marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    menuGroup: { backgroundColor: C.surface, borderRadius: 20, marginBottom: 24, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F2F4F6' },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    menuDivider: { height: 1, backgroundColor: '#F2F4F6', marginLeft: 64 },
    menuIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8F9FB', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    menuItemText: { flex: 1, fontSize: 16, fontFamily: 'Nunito-SemiBold', color: C.textPrimary },

    footerVersion: { alignItems: 'center', marginTop: 10 },
    versionText: { fontSize: 12, color: C.textTertiary, fontFamily: 'Nunito-Medium', marginTop: 4 },
});
