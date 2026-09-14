/* eslint-env jest */
import { startNotificationSession, notificationDestination } from '../notifications/lifecycle';
function session(overrides = {}) {
    let insert, update;
    const channel = {};
    const options = { userId: 'user', subscribe: jest.fn((id, a, b) => { insert = a; update = b; return channel; }),
        removeChannel: jest.fn(), onInsert: jest.fn(), onUpdate: jest.fn(), notify: jest.fn(), isForeground: () => false, ...overrides };
    const dispose = startNotificationSession(options);
    return { ...options, dispose, insert: row => insert({ new: row }), update: row => update({ new: row }), channel };
}
const row = { id: 'n1', user_id: 'user', is_read: false };
test('duplicate IDs cause one update and one local notification', () => {
    const s = session(); s.insert(row); s.insert(row);
    expect(s.onInsert).toHaveBeenCalledTimes(1); expect(s.notify).toHaveBeenCalledTimes(1); expect(s.subscribe).toHaveBeenCalledTimes(1);
});
test('foreground updates toast/badge without a duplicate OS alert', () => {
    const s = session({ isForeground: () => true }); s.insert(row); expect(s.onInsert).toHaveBeenCalledWith(row); expect(s.notify).not.toHaveBeenCalled();
});
test('logout removes channel and ignores queued callbacks', () => {
    const s = session(); s.dispose(); s.insert(row); s.update(row);
    expect(s.removeChannel).toHaveBeenCalledWith(s.channel); expect(s.onInsert).not.toHaveBeenCalled(); expect(s.onUpdate).not.toHaveBeenCalled();
});
test('wrong accounts and missing IDs are ignored', () => {
    const s = session(); s.insert({ ...row, user_id: 'other' }); s.insert({ user_id: 'user' }); expect(s.onInsert).not.toHaveBeenCalled();
});
test('account change suppresses deferred notifications', () => {
    let current = true; const s = session({ isCurrent: () => current }); s.insert(row);
    const stillCurrent = s.notify.mock.calls[0][1]; current = false;
    expect(stillCurrent()).toBe(false); s.insert({ ...row, id: 'n2' }); expect(s.onInsert).toHaveBeenCalledTimes(1);
});
test('new session can process IDs from prior session', () => {
    const a = session(); a.insert(row); a.dispose(); const b = session(); b.insert(row); expect(b.onInsert).toHaveBeenCalledTimes(1);
});
test.each([['citizen', 'Citizen', 'ImageReportStatus'], ['officer', 'Officer', 'ImageReportReview']])('routes to %s report', (role, name, screen) => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(notificationDestination({ userId: 'user', reportId: id }, { id: 'user', role })).toEqual({ name, params: { screen, params: { reportId: id } } });
});
test('cold start waits for profile and rejects other account', () => {
    expect(notificationDestination({ userId: 'user' }, null)).toBeNull(); expect(notificationDestination({ userId: 'other' }, { id: 'user' })).toBeNull();
});
test('invalid report ID falls back to inbox', () => expect(notificationDestination({ userId: 'user', reportId: '../../private' }, { id: 'user', role: 'officer' }).params.screen).toBe('OfficerNotifications'));
