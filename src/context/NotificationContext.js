import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { subscribeToNotifications } from '../services/reports';
import { sendLocalNotification, setBadgeCount } from '../services/notifications';
import { startNotificationSession, notificationDestination } from '../services/notifications/lifecycle';
import { FeedbackToast } from '../components/common/FeedbackToast';

const Context = createContext({ unreadCount: 0, notificationRevision: 0, refreshUnread: async () => {}, latestNotification: null });
export const useNotifications = () => useContext(Context);

export function NotificationProvider({ children, navigationRef }) {
    const { user, profile } = useAuth();
    const identity = useRef(null);
    identity.current = user?.id || null;
    const profileRef = useRef(profile); profileRef.current = profile;
    const pendingTap = useRef(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationRevision, setRevision] = useState(0);
    const [latestNotification, setLatest] = useState(null);
    const [toast, setToast] = useState(null);
    const countSequence = useRef(0);
    useEffect(() => () => { identity.current = null; countSequence.current++; }, []);
    const refreshUnread = useCallback(async () => {
        const id = user?.id;
        const sequence = ++countSequence.current;
        if (!id) return;
        try {
            const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', id).eq('is_read', false);
            if (!error && Number.isInteger(count) && identity.current === id && sequence === countSequence.current) {
                setUnreadCount(count); setBadgeCount(count);
            }
        } catch { /* Preserve last-known count while offline. */ }
    }, [user?.id]);
    useEffect(() => {
        setUnreadCount(0); setLatest(null); setToast(null); countSequence.current++;
        setBadgeCount(0);
        const id = user?.id;
        if (!id) return undefined;
        refreshUnread();
        return startNotificationSession({
            userId: id, subscribe: subscribeToNotifications, removeChannel: channel => supabase.removeChannel(channel),
            isCurrent: () => identity.current === id,
            isForeground: () => AppState.currentState === 'active',
            onInsert: row => {
                countSequence.current++;
                setLatest(row); setRevision(value => value + 1);
                if (!row.is_read) setUnreadCount(value => value + 1);
                if (AppState.currentState === 'active') setToast({ message: row.title || 'Traffic Eye update', subtitle: row.body || 'Your report status changed.' });
                refreshUnread();
            },
            onUpdate: () => { setRevision(value => value + 1); refreshUnread(); },
            notify: (row, isCurrent) => sendLocalNotification('Traffic Eye update', 'Open the app to see your latest update.', {
                userId: id, notifId: row.id,
                reportId: /^report_/.test(row.type || '') ? row.reference_id : null,
            }, isCurrent),
        });
    }, [user?.id, refreshUnread]);
    useEffect(() => { setBadgeCount(unreadCount); }, [unreadCount]);
    useEffect(() => {
        let active = true;
        let timer;
        const drain = () => {
            if (!active || !pendingTap.current) return;
            const data = pendingTap.current;
            const target = notificationDestination(data, profileRef.current);
            if (target && navigationRef.isReady()) {
                pendingTap.current = null;
                navigationRef.navigate(target.name, target.params);
            } else if (identity.current && data.userId !== identity.current) pendingTap.current = null;
            else timer = setTimeout(drain, 500);
        };
        const receive = response => {
            const data = response?.notification?.request?.content?.data;
            if (!active || !data?.userId) return;
            clearTimeout(timer); pendingTap.current = data; drain();
            Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
        };
        const listener = Notifications.addNotificationResponseReceivedListener(receive);
        Notifications.getLastNotificationResponseAsync().then(receive).catch(() => {});
        return () => { active = false; clearTimeout(timer); listener.remove(); pendingTap.current = null; };
    }, [navigationRef]);
    return <Context.Provider value={{ unreadCount, notificationRevision, latestNotification, refreshUnread }}>
        {children}
        <FeedbackToast visible={!!toast} message={toast?.message} subtitle={toast?.subtitle} variant="info" onDismiss={() => setToast(null)} />
    </Context.Provider>;
}
