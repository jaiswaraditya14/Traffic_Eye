import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, Share, ToastAndroid, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context';

const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    amberDark: '#D97706',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    success: '#059669',
    successSurface: '#D1FAE5',
};

export default function ReferralProgram({ navigation }) {
    const { profile } = useAuth();
    const referralCode = profile?.referral_code || 'EYE-RFR-2024';
    const pointsPerReferral = 50;
    
    // Dummy analytics for enterprise feel
    const [referrals, setReferrals] = useState([
        { id: 1, name: 'John Doe', status: 'Completed', date: '21 Mar, 2024', points: '+50 pts' },
        { id: 2, name: 'Jane Smith', status: 'Pending', date: '20 Mar, 2024', points: '0 pts' },
    ]);

    const handleCopy = async () => {
        await Clipboard.setStringAsync(referralCode);
        if (Platform.OS === 'android') {
            ToastAndroid.show('Referral code copied to clipboard!', ToastAndroid.SHORT);
        } else {
            Alert.alert('Copied', 'Referral code copied to clipboard!');
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Join me on Traffic Eye! Use my referral code: ${referralCode} to get 50 bonus points. Let's make our roads safer together!`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Navy Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Referral Program</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    
                    {/* Hero Section */}
                    <View style={styles.heroSection}>
                        <View style={styles.iconFrame}>
                            <Ionicons name="gift-outline" size={32} color={C.amberDark} />
                        </View>
                        <Text style={styles.heroTitle}>Invite & Earn Rewards</Text>
                        <Text style={styles.heroSubtitle}>
                            Help expand the Civic Authority network. For every friend who signs up using your code, you both earn <Text style={{ fontFamily: 'Nunito-Bold', color: C.amberDark }}>{pointsPerReferral} bonus points</Text>.
                        </Text>
                    </View>

                    {/* Quick Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>12</Text>
                            <Text style={styles.statLabel}>Invites Sent</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>1</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNumber, { color: C.amberDark }]}>50</Text>
                            <Text style={styles.statLabel}>Points Earned</Text>
                        </View>
                    </View>

                    {/* Code Widget */}
                    <View style={styles.widgetContainer}>
                        <Text style={styles.widgetTitle}>Your Unique Code</Text>
                        <View style={styles.codeRow}>
                            <Text style={styles.codeText}>{referralCode}</Text>
                            <TouchableOpacity onPress={handleCopy} style={styles.copyBtn} activeOpacity={0.7}>
                                <Ionicons name="copy-outline" size={20} color={C.navy} />
                                <Text style={styles.copyText}>Copy</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                            <LinearGradient colors={[C.amberDark, C.amber]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareGradient}>
                                <Ionicons name="share-social-outline" size={20} color={C.white} />
                                <Text style={styles.shareBtnText}>Share Invitation Link</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* History Section */}
                    <View style={styles.historySection}>
                        <Text style={styles.historyTitle}>Referral History</Text>
                        {referrals.map((item, index) => (
                            <View key={item.id} style={[styles.historyRow, index !== referrals.length - 1 && styles.historyBorder]}>
                                <View style={styles.historyLeft}>
                                    <View style={styles.historyAvatar}>
                                        <Text style={styles.historyInitials}>{item.name.charAt(0)}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.historyName}>{item.name}</Text>
                                        <Text style={styles.historyDate}>{item.date}</Text>
                                    </View>
                                </View>
                                <View style={styles.historyRight}>
                                    <Text style={[styles.historyPoints, { color: item.status === 'Completed' ? C.success : C.textTertiary }]}>{item.points}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'Completed' ? C.successSurface : '#F2F4F6' }]}>
                                        <Text style={[styles.statusText, { color: item.status === 'Completed' ? C.success : C.textTertiary }]}>{item.status}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    backButton: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18, fontFamily: 'Nunito-Bold',
        color: C.white, letterSpacing: -0.3,
    },
    content: {
        flex: 1, paddingHorizontal: 20, paddingTop: 20,
    },
    heroSection: {
        alignItems: 'center', marginBottom: 24,
    },
    iconFrame: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 24, fontFamily: 'Nunito-ExtraBold',
        color: C.navy, letterSpacing: -0.5, marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 15, color: C.textSecondary,
        fontFamily: 'Nunito-Medium', textAlign: 'center',
        lineHeight: 24, paddingHorizontal: 10,
    },
    statsGrid: {
        flexDirection: 'row', gap: 12, marginBottom: 24,
    },
    statBox: {
        flex: 1, backgroundColor: C.surface, padding: 16,
        borderRadius: 16, alignItems: 'center',
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    statNumber: {
        fontSize: 22, fontFamily: 'Nunito-ExtraBold',
        color: C.navy, marginBottom: 4,
    },
    statLabel: {
        fontSize: 12, fontFamily: 'Nunito-SemiBold',
        color: C.textTertiary,
    },
    widgetContainer: {
        backgroundColor: C.surface, borderRadius: 20, padding: 20,
        marginBottom: 24, shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
        borderWidth: 1, borderColor: '#F2F4F6',
    },
    widgetTitle: {
        fontSize: 14, fontFamily: 'Nunito-Bold',
        color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
    },
    codeRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F8F9FB', borderRadius: 12,
        borderWidth: 1, borderColor: '#E5E7EB', padding: 4,
        marginBottom: 16,
    },
    codeText: {
        flex: 1, fontSize: 20, fontFamily: 'Nunito-ExtraBold',
        color: C.navyMid, letterSpacing: 2, textAlign: 'center',
    },
    copyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 8,
    },
    copyText: {
        fontFamily: 'Nunito-Bold', fontSize: 14, color: C.navy,
    },
    shareBtn: {
        borderRadius: 12, overflow: 'hidden',
    },
    shareGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 14,
    },
    shareBtnText: {
        fontFamily: 'Nunito-Bold', fontSize: 16, color: C.white,
    },
    historySection: {
        backgroundColor: C.surface, borderRadius: 20, padding: 20,
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    historyTitle: {
        fontSize: 16, fontFamily: 'Nunito-Bold', color: C.navyMid, marginBottom: 16,
    },
    historyRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12,
    },
    historyBorder: {
        borderBottomWidth: 1, borderBottomColor: '#F2F4F6',
    },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    historyAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F2F4F6', justifyContent: 'center', alignItems: 'center',
    },
    historyInitials: {
        fontFamily: 'Nunito-Bold', fontSize: 16, color: C.textSecondary,
    },
    historyName: {
        fontFamily: 'Nunito-Bold', fontSize: 15, color: C.textPrimary,
    },
    historyDate: {
        fontFamily: 'Nunito-Medium', fontSize: 13, color: C.textTertiary, marginTop: 2,
    },
    historyRight: { alignItems: 'flex-end', gap: 4 },
    historyPoints: {
        fontFamily: 'Nunito-Bold', fontSize: 14,
    },
    statusBadge: {
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    },
    statusText: {
        fontFamily: 'Nunito-Bold', fontSize: 10, textTransform: 'uppercase',
    },
});
