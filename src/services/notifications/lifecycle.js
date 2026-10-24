/** One session owner; injected dependencies keep lifecycle and dedup testable. */
export function startNotificationSession({ userId, subscribe, removeChannel, onInsert, onUpdate, notify, isForeground, isCurrent = () => true }) {
    const seen = new Set();
    let active = true;
    const channel = subscribe(userId, payload => {
        const row = payload?.new;
        if (!active || !isCurrent() || !row?.id || row.user_id !== userId || seen.has(row.id)) return;
        seen.add(row.id);
        onInsert(row);
        if (!isForeground()) Promise.resolve(notify(row, () => active && isCurrent())).catch(() => {});
    }, payload => {
        if (active && isCurrent() && payload?.new?.user_id === userId) onUpdate(payload.new);
    });
    return () => { active = false; seen.clear(); Promise.resolve(removeChannel(channel)).catch(() => {}); };
}
export function notificationDestination(data, profile) {
    if (!profile?.id || data?.userId !== profile.id) return null;
    const officer = profile.role === 'officer';
    const report = typeof data.reportId === 'string' && /^[0-9a-f-]{36}$/i.test(data.reportId);
    return {
        name: officer ? 'Officer' : 'Citizen',
        params: { screen: report ? (officer ? 'ImageReportReview' : 'ImageReportStatus') : (officer ? 'OfficerNotifications' : 'Notifications'),
            ...(report ? { params: { reportId: data.reportId } } : {}) },
    };
}

export async function registerPushToken(getPushToken = null, rpcCaller = null) {
    try {
        const fetchToken = getPushToken || (async () => {
            const { getExpoPushToken } = require('./index');
            return getExpoPushToken();
        });
        const token = await fetchToken();
        if (!token) return null;
        const callRpc = rpcCaller || (async (t) => {
            const { supabase } = require('../supabase');
            return supabase.rpc('save_push_token', { p_token: t });
        });
        await callRpc(token);
        return token;
    } catch (e) {
        if (__DEV__) console.log('[Notifications] Push token registration skipped/failed.');
        return null;
    }
}

export async function clearPushToken(rpcCaller = null) {
    try {
        const callRpc = rpcCaller || (async () => {
            const { supabase } = require('../supabase');
            return supabase.rpc('save_push_token', { p_token: null });
        });
        await callRpc();
    } catch (e) {
        if (__DEV__) console.log('[Notifications] Push token clear skipped/failed.');
    }
}

