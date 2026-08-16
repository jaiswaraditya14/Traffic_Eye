/**
 * src/services/notifications/index.js
 *
 * Traffic Eye — Notification Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-environment support:
 *  • Standalone APK / Production Build: Full native Android channels, system sound,
 *    mute/DND support, badge management, and push token registration.
 *  • Expo Go: Graceful fallback for local notifications and quiet error handling
 *    (as SDK 53+ removed remote push registration from Expo Go).
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Detect if running inside Expo Go client app
export const isExpoGo =
    Constants?.appOwnership === 'expo' ||
    Constants?.executionEnvironment === ExecutionEnvironment?.StoreClient;

// ── Channel config ─────────────────────────────────────────────────────────────
export const NOTIFICATION_CHANNEL_ID = 'traffic-eye-default';

// ── Foreground display handler ─────────────────────────────────────────────────
try {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: !isExpoGo, // Safe on native APK
            shouldSetBadge: true,
        }),
    });
} catch (e) {
    if (__DEV__) console.log('[Notifications] setNotificationHandler skipped:', e?.message);
}

/**
 * setupNotifications()
 *
 * Safe initialization on app startup.
 * • Configures Android notification channel with system ringtone
 * • Requests notification permissions gracefully
 */
export async function setupNotifications() {
    try {
        // ── 1. Create Android channel on native standalone builds ────────────
        if (Platform.OS === 'android') {
            try {
                await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
                    name: 'Traffic Eye Alerts',
                    importance: Notifications.AndroidImportance.HIGH,
                    sound: 'default',
                    vibrationPattern: [0, 250, 150, 250],
                    lightColor: '#F59E0B',
                    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                    bypassDnd: false,
                });
            } catch (chanErr) {
                if (__DEV__) console.log('[Notifications] Channel setup note:', chanErr?.message);
            }
        }

        // ── 2. Request permissions ───────────────────────────────────────────
        const { status: existing } = await Notifications.getPermissionsAsync();
        if (existing === 'granted') return true;

        const { status } = await Notifications.requestPermissionsAsync({
            ios: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
                allowCriticalAlerts: false,
            },
        });

        return status === 'granted';
    } catch (err) {
        if (__DEV__) console.log('[Notifications] setupNotifications caught:', err?.message);
        return false;
    }
}

/**
 * sendLocalNotification(title, body, data)
 *
 * Dispatches local notification with system sound and mute support.
 */
export async function sendLocalNotification(title, body, data = {}) {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: 'default',
                ...(Platform.OS === 'android' && !isExpoGo && {
                    channelId: NOTIFICATION_CHANNEL_ID,
                }),
            },
            trigger: null,
        });
    } catch (err) {
        if (__DEV__) console.log('[Notifications] sendLocalNotification note:', err?.message);
    }
}

/**
 * setBadgeCount(count)
 */
export async function setBadgeCount(count) {
    try {
        await Notifications.setBadgeCountAsync(count);
    } catch {
        // Safe fallback
    }
}

/**
 * clearAllNotifications()
 */
export async function clearAllNotifications() {
    try {
        await Notifications.dismissAllNotificationsAsync();
        await setBadgeCount(0);
    } catch {
        // Safe fallback
    }
}

/**
 * getExpoPushToken()
 *
 * Retrieves Expo push token for APK builds; returns null in Expo Go without crashing.
 */
export async function getExpoPushToken() {
    if (isExpoGo) {
        if (__DEV__) console.log('[Notifications] Push tokens require standalone APK (SDK 53+). Skipping in Expo Go.');
        return null;
    }

    try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({
            projectId: '9e523e68-8da2-454a-b616-125ec9831ad2',
        });
        return token;
    } catch (err) {
        if (__DEV__) console.log('[Notifications] Push token retrieval:', err?.message);
        return null;
    }
}

