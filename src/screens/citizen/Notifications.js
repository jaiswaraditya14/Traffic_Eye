/**
 * Notifications.js (Citizen) — Industry-standard notification screen
 *
 * Features:
 *  - Real Supabase data via fetchNotifications()
 *  - Realtime updates via subscribeToNotifications()
 *  - Read/unread state + mark-all-read
 *  - Category filter tabs (All, Report Status, Traffic Alerts, System)
 *  - Deep-link navigation: tap report notification → ReportDetail screen
 *  - Empty state per category
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context';
import { FocusAwareStatusBar } from '../../components';
import {
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    subscribeToNotifications,
} from '../../services/reports';
import { clearAllNotifications } from '../../services/notifications';

const C = {
    navy: '#0A1E3F',
    navyMid: '#0F2C59',
    amber: '#F59E0B',
    amberSurface: '#FEF3C7',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    success: '#059669',
    successSurface: '#D1FAE5',
    error: '#DC2626',
    errorSurface: '#FEE2E2',
    warning: '#D97706',
    warningSurface: '#FEF3C7',
    border: '#E2E8F0',
    borderLight: '#F0F2F5',
};

// All supported notification types → icon, color, category
function getConfig(type) {
    switch (type) {
        // Report status
        case 'report_approved':
            return { icon: 'checkmark-circle', color: C.success, bg: C.successSurface, category: 'report', label: 'Report Approved' };
        case 'report_rejected':
            return { icon: 'close-circle', color: C.error, bg: C.errorSurface, category: 'report', label: 'Report Rejected' };
        case 'report_pending':
            return { icon: 'time', color: C.warning, bg: C.warningSurface, category: 'report', label: 'Under Review' };
        case 'report_submitted':
            return { icon: 'cloud-upload', color: C.navyMid, bg: '#D7E2FF', category: 'report', label: 'Report Submitted' };
        // Rewards
        case 'points_earned':
            return { icon: 'trophy', color: C.amber, bg: C.amberSurface, category: 'system', label: 'Points Earned' };
        // Traffic / Safety
        case 'traffic_alert':
            return { icon: 'warning', color: '#EA580C', bg: '#FFEDD5', category: 'traffic', label: 'Traffic Alert' };
        case 'safety_update':
            return { icon: 'shield-checkmark', color: '#059669', bg: '#D1FAE5', category: 'traffic', label: 'Safety Update' };
        case 'fine_update':
            return { icon: 'receipt', color: '#7C3AED', bg: '#F3E8FF', category: 'traffic', label: 'Fine/Rule Update' };
        // Emergency
        case 'emergency':
            return { icon: 'alert-circle', color: C.error, bg: C.errorSurface, category: 'traffic', label: 'Emergency Alert' };
        // System
        case 'system':
        default:
            return { icon: 'notifications', color: C.navyMid, bg: '#D7E2FF', category: 'system', label: 'System' };
    }
}

// Report notifications that support deep-link navigation to ReportDetail
const REPORT_TYPES = new Set(['report_approved', 'report_rejected', 'report_pending', 'report_submitted']);

// Filter tab definitions
const TABS = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'report', label: 'My Reports', icon: 'document-text' },
    { key: 'traffic', label: 'Traffic & Safety', icon: 'warning' },
    { key: 'system', label: 'System', icon: 'settings' },
];

function timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
}

function isToday(iso) {
    if (!iso) return false;
    const d = new Date(iso);
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

export default function Notifications({ navigation }) {
    const { user } = useAuth();
    const [notifs, setNotifs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const load = useCallback(async (isRefresh = false) => {
        if (!user?.id) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        if (!isRefresh) setLoading(true);
        try {
            const { data } = await fetchNotifications(user.id);
            if (data) setNotifs(data);
        } catch (err) {
            if (__DEV__) console.warn('[Notifications] Load failed:', err?.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
            Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
        }
    }, [user?.id]);

    useEffect(() => { load(); }, [load]);

    // Clear OS notification banners + badge when user opens this screen
    useEffect(() => {
        clearAllNotifications();
    }, []);

    // Realtime: new notifications arrive instantly
    useEffect(() => {
        if (!user?.id) return;
        const ch = subscribeToNotifications(user.id, (payload) => {
            setNotifs(prev => [payload.new, ...prev]);
        });
        return () => { if (ch) ch.unsubscribe(); };
    }, [user?.id]);

    const handleMarkRead = async (notif) => {
        // Mark read first
        if (!notif.is_read) {
            setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            await markNotificationRead(notif.id);
        }

        // Deep link: if it's a report notification with a report_id, navigate to detail
        if (REPORT_TYPES.has(notif.type) && notif.report_id) {
            navigation.navigate('ReportDetail', { reportId: notif.report_id });
        }
    };

    const handleMarkAllRead = async () => {
        if (!user?.id) return;
        setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
        await markAllNotificationsRead(user.id);
    };

    // Filter by active tab
    const filtered = activeTab === 'all'
        ? notifs
        : notifs.filter(n => getConfig(n.type).category === activeTab);

    const unreadCount = notifs.filter(n => !n.is_read).length;
    const filteredUnread = filtered.filter(n => !n.is_read).length;

    // Group filtered by today / earlier
    const todayNotifs = filtered.filter(n => isToday(n.created_at));
    const earlierNotifs = filtered.filter(n => !isToday(n.created_at));

    const renderNotif = (n) => {
        const cfg = getConfig(n.type);
        const isReport = REPORT_TYPES.has(n.type) && n.report_id;
        return (
            <TouchableOpacity
                key={n.id}
                style={[s.card, !n.is_read && s.cardUnread]}
                activeOpacity={0.82}
                onPress={() => handleMarkRead(n)}
            >
                {!n.is_read && <View style={s.unreadStrip} />}
                <View style={[s.iconBox, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={21} color={cfg.color} />
                </View>
                <View style={s.cardContent}>
                    <View style={s.cardHeader}>
                        <View style={s.cardTitleRow}>
                            <Text style={[s.cardTitle, !n.is_read && s.cardTitleBold]} numberOfLines={1}>
                                {n.title}
                            </Text>
                            <View style={[s.typePill, { backgroundColor: cfg.bg }]}>
                                <Text style={[s.typePillText, { color: cfg.color }]}>
                                    {cfg.label}
                                </Text>
                            </View>
                        </View>
                        <Text style={s.cardTime}>{timeAgo(n.created_at)}</Text>
                    </View>
                    <Text style={s.cardBody} numberOfLines={3}>{n.body}</Text>
                    {isReport && (
                        <View style={s.deepLinkHint}>
                            <Ionicons name="arrow-forward-circle" size={13} color={C.navyMid} />
                            <Text style={s.deepLinkText}>Tap to view report</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={s.empty}>
            <View style={s.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={40} color={C.border} />
            </View>
            <Text style={s.emptyTitle}>
                {activeTab === 'all' ? 'No Notifications' : `No ${TABS.find(t => t.key === activeTab)?.label} Notifications`}
            </Text>
            <Text style={s.emptySub}>
                {activeTab === 'report'
                    ? 'Report approvals, rejections and status updates will appear here.'
                    : activeTab === 'traffic'
                    ? 'Traffic advisories, safety alerts and rule updates will appear here.'
                    : activeTab === 'system'
                    ? 'System messages, point rewards and app updates will appear here.'
                    : 'You\'re all caught up! All notifications will appear here.'}
            </Text>
        </View>
    );

    return (
        <View style={s.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>

                {/* Header */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle}>Notifications</Text>
                        {unreadCount > 0 && (
                            <Text style={s.headerSub}>{unreadCount} unread</Text>
                        )}
                    </View>
                    {unreadCount > 0 && (
                        <TouchableOpacity style={s.iconBtn} onPress={handleMarkAllRead}>
                            <Ionicons name="checkmark-done" size={20} color={C.white} />
                        </TouchableOpacity>
                    )}
                </LinearGradient>

                {/* Category Tabs */}
                <View style={s.tabBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
                        {TABS.map(tab => {
                            const active = activeTab === tab.key;
                            const tabUnread = tab.key === 'all'
                                ? unreadCount
                                : notifs.filter(n => !n.is_read && getConfig(n.type).category === tab.key).length;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    style={[s.tab, active && s.tabActive]}
                                    onPress={() => setActiveTab(tab.key)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons
                                        name={tab.icon}
                                        size={14}
                                        color={active ? C.navy : C.textTertiary}
                                    />
                                    <Text style={[s.tabText, active && s.tabTextActive]}>
                                        {tab.label}
                                    </Text>
                                    {tabUnread > 0 && (
                                        <View style={s.tabBadge}>
                                            <Text style={s.tabBadgeText}>
                                                {tabUnread > 9 ? '9+' : tabUnread}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Unread banner */}
                {filteredUnread > 0 && (
                    <View style={s.unreadBanner}>
                        <View style={s.unreadDot} />
                        <Text style={s.unreadBannerText}>
                            {filteredUnread} unread
                        </Text>
                        <TouchableOpacity onPress={handleMarkAllRead}>
                            <Text style={s.markAllText}>Mark all read</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {loading ? (
                    <View style={s.centered}>
                        <ActivityIndicator size="large" color={C.navyMid} />
                        <Text style={s.loadingText}>Loading notifications…</Text>
                    </View>
                ) : (
                    <Animated.ScrollView
                        style={{ flex: 1, opacity: fadeAnim }}
                        contentContainerStyle={s.list}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                colors={[C.navyMid]}
                                tintColor={C.navyMid}
                                onRefresh={() => { setRefreshing(true); load(true); }}
                            />
                        }
                    >
                        {filtered.length === 0 ? renderEmpty() : (
                            <>
                                {todayNotifs.length > 0 && (
                                    <>
                                        <Text style={s.groupLabel}>Today</Text>
                                        {todayNotifs.map(renderNotif)}
                                    </>
                                )}
                                {earlierNotifs.length > 0 && (
                                    <>
                                        <Text style={s.groupLabel}>Earlier</Text>
                                        {earlierNotifs.map(renderNotif)}
                                    </>
                                )}
                            </>
                        )}
                    </Animated.ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },

    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    },
    iconBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 19, fontFamily: 'Nunito-Bold', color: C.white, letterSpacing: -0.3 },
    headerSub: { fontSize: 11, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.65)', marginTop: 2 },

    // Category tabs
    tabBar: {
        backgroundColor: C.surface,
        borderBottomWidth: 1, borderBottomColor: C.borderLight,
    },
    tabScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tab: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, backgroundColor: C.offWhite,
        borderWidth: 1, borderColor: C.borderLight,
    },
    tabActive: { backgroundColor: C.navy, borderColor: C.navy },
    tabText: { fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.textTertiary },
    tabTextActive: { color: C.white, fontFamily: 'Nunito-Bold' },
    tabBadge: {
        minWidth: 18, height: 18, borderRadius: 9,
        backgroundColor: C.amber, paddingHorizontal: 4,
        justifyContent: 'center', alignItems: 'center',
    },
    tabBadgeText: { fontSize: 9, fontFamily: 'Nunito-ExtraBold', color: C.navy },

    // Unread banner
    unreadBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 20, paddingVertical: 9,
        backgroundColor: '#EEF2FF', borderBottomWidth: 1, borderBottomColor: C.border,
    },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.navyMid },
    unreadBannerText: { flex: 1, fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.navyMid },
    markAllText: { fontSize: 12, fontFamily: 'Nunito-Bold', color: C.navyMid, textDecorationLine: 'underline' },

    list: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40, gap: 10 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary },

    // Group labels
    groupLabel: {
        fontSize: 11, fontFamily: 'Nunito-ExtraBold', color: C.textTertiary,
        letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6, marginTop: 4,
    },

    // Notification card
    card: {
        flexDirection: 'row', backgroundColor: C.surface, borderRadius: 16,
        padding: 14, alignItems: 'flex-start', borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    },
    cardUnread: {
        borderWidth: 0,
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 12, elevation: 3,
    },
    unreadStrip: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 3.5, backgroundColor: C.navyMid },
    iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
    cardContent: { flex: 1 },
    cardHeader: { marginBottom: 5 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    cardTitle: { flex: 1, fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, marginRight: 6 },
    cardTitleBold: { fontFamily: 'Nunito-Bold' },
    cardTime: { fontSize: 10, fontFamily: 'Nunito-Medium', color: C.textTertiary },
    typePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
    typePillText: { fontSize: 9, fontFamily: 'Nunito-ExtraBold' },
    cardBody: { fontSize: 12, fontFamily: 'Nunito-Regular', color: C.textSecondary, lineHeight: 18 },

    deepLinkHint: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        marginTop: 8,
    },
    deepLinkText: { fontSize: 11, fontFamily: 'Nunito-SemiBold', color: C.navyMid },

    // Empty state
    empty: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 40 },
    emptyIconCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: C.borderLight, justifyContent: 'center', alignItems: 'center',
    },
    emptyTitle: { fontSize: 17, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    emptySub: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary, textAlign: 'center', lineHeight: 20 },
});
