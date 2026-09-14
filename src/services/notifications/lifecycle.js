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
