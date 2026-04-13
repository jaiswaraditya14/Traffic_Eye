/**
 * Notifications.js  (Citizen) — rewritten to use real Supabase data
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context';
import {
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    subscribeToNotifications,
} from '../../services/reports';

const C = {
    navy:          '#002452',
    navyMid:       '#1B3A6B',
    amber:         '#F59E0B',
    white:         '#FFFFFF',
    offWhite:      '#F8F9FB',
    surface:       '#FFFFFF',
    textPrimary:   '#191C1E',
    textSecondary: '#44474F',
    textTertiary:  '#747780',
    success:       '#059669',
    successSurface:'#D1FAE5',
    error:         '#DC2626',
    errorSurface:  '#FEE2E2',
    warning:       '#D97706',
    warningSurface:'#FEF3C7',
    border:        '#E2E8F0',
};

function getConfig(type) {
    switch (type) {
        case 'report_approved': return { icon: 'checkmark-circle', color: C.success,  bg: C.successSurface };
        case 'report_rejected': return { icon: 'close-circle',     color: C.error,    bg: C.errorSurface   };
        case 'points_earned':  return { icon: 'trophy',            color: C.amber,    bg: C.warningSurface };
        default:               return { icon: 'notifications',     color: C.navyMid,  bg: '#D7E2FF'        };
    }
}

function timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

export default function Notifications({ navigation }) {
    const { user }                    = useAuth();
    const [notifs,     setNotifs]     = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const load = useCallback(async (isRefresh = false) => {
        if (!user?.id) return;
        if (!isRefresh) setLoading(true);
        const { data } = await fetchNotifications(user.id);
        if (data) setNotifs(data);
        setLoading(false);
        setRefreshing(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }, [user?.id]);

    useEffect(() => { load(); }, [load]);

    // Realtime: new notifications arrive instantly
    useEffect(() => {
        if (!user?.id) return;
        const ch = subscribeToNotifications(user.id, (payload) => {
            setNotifs(prev => [payload.new, ...prev]);
        });
        return () => { if (ch) ch.unsubscribe(); };
    }, [user?.id]);

    const handleMarkRead = async (notifId) => {
        setNotifs(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
        await markNotificationRead(notifId);
    };

    const handleMarkAllRead = async () => {
        if (!user?.id) return;
        setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
        await markAllNotificationsRead(user.id);
    };

    const unreadCount = notifs.filter(n => !n.is_read).length;

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <LinearGradient colors={[C.navy, C.navyMid]} style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Notifications</Text>
                    {unreadCount > 0 && (
                        <TouchableOpacity style={s.iconBtn} onPress={handleMarkAllRead}>
                            <Ionicons name="checkmark-done" size={20} color={C.white} />
                        </TouchableOpacity>
                    )}
                </LinearGradient>

                {unreadCount > 0 && (
                    <View style={s.unreadBanner}>
                        <Ionicons name="ellipse" size={8} color={C.navyMid} />
                        <Text style={s.unreadBannerText}>{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</Text>
                        <TouchableOpacity onPress={handleMarkAllRead}>
                            <Text style={s.markAllText}>Mark all read</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {loading ? (
                    <View style={s.centered}>
                        <ActivityIndicator size="large" color={C.navyMid} />
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
                        {notifs.length === 0 ? (
                            <View style={s.empty}>
                                <Ionicons name="notifications-off-outline" size={52} color={C.border} />
                                <Text style={s.emptyTitle}>No Notifications</Text>
                                <Text style={s.emptySub}>You're all caught up! Officer decisions and status updates will appear here.</Text>
                            </View>
                        ) : (
                            notifs.map(n => {
                                const cfg = getConfig(n.type);
                                return (
                                    <TouchableOpacity
                                        key={n.id}
                                        style={[s.card, !n.is_read && s.cardUnread]}
                                        activeOpacity={0.82}
                                        onPress={() => handleMarkRead(n.id)}
                                    >
                                        {!n.is_read && <View style={s.unreadStrip} />}
                                        <View style={[s.iconBox, { backgroundColor: cfg.bg }]}>
                                            <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                                        </View>
                                        <View style={s.cardContent}>
                                            <View style={s.cardHeader}>
                                                <Text style={[s.cardTitle, !n.is_read && s.cardTitleBold]} numberOfLines={1}>
                                                    {n.title}
                                                </Text>
                                                <Text style={s.cardTime}>{timeAgo(n.created_at)}</Text>
                                            </View>
                                            <Text style={s.cardBody} numberOfLines={3}>{n.body}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </Animated.ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },

    header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    iconBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.white, letterSpacing: -0.3 },

    unreadBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#EEF2FF', borderBottomWidth: 1, borderBottomColor: C.border },
    unreadBannerText: { flex: 1, fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.navyMid },
    markAllText: { fontSize: 12, fontFamily: 'Nunito-Bold', color: C.navyMid, textDecorationLine: 'underline' },

    list:    { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 10 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    card:        { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 16, padding: 14, alignItems: 'flex-start', borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    cardUnread:  { borderWidth: 0, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
    unreadStrip: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, backgroundColor: C.navyMid },
    iconBox:     { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardContent: { flex: 1 },
    cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardTitle:   { flex: 1, fontSize: 14, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, marginRight: 8 },
    cardTitleBold: { fontFamily: 'Nunito-Bold' },
    cardTime:    { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textTertiary },
    cardBody:    { fontSize: 13, fontFamily: 'Nunito-Regular', color: C.textSecondary, lineHeight: 18 },

    empty:     { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    emptySub:  { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary, textAlign: 'center', lineHeight: 19 },
});
