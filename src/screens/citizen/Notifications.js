import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

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
    success: '#059669',
    successSurface: '#D1FAE5',
    warning: '#D97706',
    warningSurface: '#FEF3C7',
    info: '#1B3A6B',
    infoSurface: '#D7E2FF',
};

export default function Notifications({ navigation }) {
    const notifications = [
        { id: 1, type: 'success', title: 'Report Verified', message: 'Your speeding violation report has been verified by an officer.', time: '2h ago', read: false },
        { id: 2, type: 'info', title: 'Reward Milestone', message: 'You reached 100 points! You can now redeem a coffee voucher.', time: '5h ago', read: false },
        { id: 3, type: 'warning', title: 'Report Under Review', message: 'Your red light violation is being reviewed.', time: '1d ago', read: true },
        { id: 4, type: 'success', title: 'Wallet Credited', message: '50 points from last week have hit your balance.', time: '3d ago', read: true },
    ];

    const getConfig = (type) => ({
        success: { icon: 'checkmark-circle', color: C.success, bg: C.successSurface },
        info: { icon: 'trophy', color: C.amber, bg: '#FEF3C7' },
        warning: { icon: 'time', color: C.warning, bg: C.warningSurface },
    }[type] || { icon: 'notifications', color: C.navyMid, bg: C.infoSurface });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Navy Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <View style={styles.markAllRead}>
                        <Ionicons name="checkmark-done" size={20} color={C.white} />
                    </View>
                </LinearGradient>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {notifications.map((notif) => {
                        const config = getConfig(notif.type);
                        return (
                            <TouchableOpacity
                                key={notif.id}
                                style={[styles.notifCard, !notif.read && styles.notifCardUnread]}
                                activeOpacity={0.8}
                            >
                                {/* Left strip for unread */}
                                {!notif.read && <View style={styles.unreadStrip} />}

                                <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
                                    <Ionicons name={config.icon} size={22} color={config.color} />
                                </View>

                                <View style={styles.notifContent}>
                                    <View style={styles.notifHeader}>
                                        <Text style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]}>
                                            {notif.title}
                                        </Text>
                                        <Text style={styles.notifTime}>{notif.time}</Text>
                                    </View>
                                    <Text style={styles.notifMessage}>{notif.message}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Header
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
    headerTitle: { fontSize: 20, fontFamily: 'DMSans-Bold', color: C.white, letterSpacing: -0.3 },
    markAllRead: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },

    // Content
    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

    notifCard: {
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    notifCardUnread: {
        backgroundColor: C.surface,
        borderWidth: 0,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    unreadStrip: {
        position: 'absolute', top: 0, bottom: 0, left: 0,
        width: 4, backgroundColor: C.navyMid,
    },
    iconContainer: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 14,
    },
    notifContent: { flex: 1 },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    notifTitle: { fontSize: 15, fontFamily: 'DMSans-SemiBold', color: C.textPrimary },
    notifTitleUnread: { fontFamily: 'DMSans-Bold' },
    notifTime: { fontSize: 12, color: C.textTertiary, fontFamily: 'DMSans-Medium' },
    notifMessage: { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
});
