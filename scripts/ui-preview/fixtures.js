import React, { createContext, useContext, useState } from 'react';
const Context = createContext({});
let scenario = 'populated';
export const fixtureReport = { id: '11111111-1111-4111-8111-111111111111', user_id: 'qa-user', violation_type: 'Signal Jump', vehicle_number: 'MH01AB1234', location_address: 'Synthetic Mumbai intersection', severity: 'high', status: 'pending', submitted_at: new Date().toISOString(), reviewed_at: null, latitude: 19.076, longitude: 72.8777, ai_confidence: 0.92, ai_raw_result: { allViolations: ['Signal Jump', 'No Helmet'] }, media: [], reward_amount: 0 };
export function FixtureProvider({ children, state, officer }) {
    scenario = state;
    const [demoMode, setDemoMode] = useState(state === 'demo');
    const [currentReport, setCurrentReport] = useState({ image: require('../../assets/images/onboarding_1.png'), location: { latitude: 19.076, longitude: 72.8777 }, address: 'Synthetic Mumbai intersection', demo: state === 'demo' });
    const profile = React.useMemo(() => ({ id: 'qa-user', full_name: 'Aarav Sharma', role: officer ? 'officer' : 'citizen', points_balance: 570, badge_id: 'TE001', jurisdiction: 'Mumbai', email: 'qa@example.invalid', phone: 'Synthetic' }), [officer]);
    return <Context.Provider value={{ profile, user: { id: 'qa-user' }, demoMode, setDemoMode, demoLoading: false, currentReport, setCurrentReport, setHasSeenOnboarding: () => {}, setIsAuthenticated: () => {}, setUserRole: () => {}, signOut: async () => {}, refreshProfile: async () => {}, unreadCount: 2, notificationRevision: 0, latestNotification: null, refreshUnread: async () => {} }}>{children}</Context.Provider>;
}
export const useAppContext = () => useContext(Context);
export const useAuth = useAppContext;
export const useNotifications = useAppContext;
export function useImagePicker() { const [image, setImage] = useState(null); return { image, setImage, loading: false, captureFromCamera: async () => null, pickFromGallery: async () => null, pickVideoFromGallery: async () => null }; }
export function useLocation() { const [address, setAddress] = useState(''); return { address, setAddress, location: null, loading: false, locationSource: 'MANUAL', setLocationSource() {}, detectLocation: async () => null, setManualLocation() {}, reverseGeocodeFromCoords: async () => null }; }
const response = (data = [fixtureReport]) => scenario === 'loading' ? new Promise(() => {}) : Promise.resolve({ data: scenario === 'empty' ? [] : data, error: scenario === 'error' ? new Error('Synthetic offline state') : null, count: 3 });
export const fetchCitizenReports = () => response();
export const fetchPendingReports = () => response();
export const fetchReviewedReports = () => response([{ ...fixtureReport, status: 'rejected' }]);
export const fetchReportById = () => response({ ...fixtureReport, ...(scenario === 'reviewed' ? { status: 'approved', reward_amount: 70, reviewed_at: new Date().toISOString() } : {}) });
export const fetchHeatmapPoints = () => response();
export const fetchReportsByDateRange = () => response();
export const fetchNotifications = () => response([{ id: 'n1', user_id: 'qa-user', title: 'Report received', body: 'Your synthetic report is awaiting review.', type: 'report_submitted', reference_id: fixtureReport.id, is_read: false, created_at: fixtureReport.submitted_at }]);
export const markNotificationRead = () => response(null);
export const markAllNotificationsRead = () => response(null);
const channel = { unsubscribe() {}, on() { return this; }, subscribe(callback) { callback?.('SUBSCRIBED'); return this; } };
export const subscribeToReportUpdates = () => channel;
export const subscribeToApprovedMapReports = () => channel;
export const subscribeToOfficerQueue = (a, b, status) => { status?.('SUBSCRIBED'); return channel; };
export const checkUserRateLimit = async () => ({ allowed: true });
export const checkPlateDuplicate = async () => ({ isDuplicate: false });
export const submitOfficerDecision = async () => ({ data: { already_reviewed: scenario === 'reviewed' }, error: scenario === 'error' ? new Error('Synthetic failure') : null });
export const reportService = { createReportSubmission: () => ({ id: 'qa-only' }), submitReportWithMedia: async () => ({ data: null, error: { userMessage: 'Isolated QA: saving is disabled.' } }) };
export const aiService = { analyzeViolationImage: async (uri, options) => { options?.onStageChange?.('audit'); if (scenario === 'error') return { description: 'ANALYSIS_FAILED: synthetic' }; return new Promise(() => {}); } };
export const REDEEM_CATALOG = [{ id: 'one', title: 'Safety Kit', description: 'Synthetic reward', pts: 100, icon: 'gift' }, { id: 'two', title: 'Helmet', description: 'Synthetic reward', pts: 900, icon: 'shield' }, { id: 'three', title: 'Reflective Vest', description: 'Not yet available', pts: 50, available: false, icon: 'shirt' }];
export const rewardService = { getActivityHistory: async () => ({ success: scenario !== 'error', history: [] }), getRedeemedItems: async () => ({ success: scenario !== 'error', redeemed: {} }), redeemItem: async () => ({ success: false, error: 'QA only' }) };
export const reverseGeocode = async () => ({ city: 'Mumbai', state: 'Maharashtra' });
export const forwardGeocode = async () => [];
export const debounce = fn => fn;
export const supabase = { from(table) {
    const query = { then(resolve, reject) { return response(table === 'profiles' ? { points_balance: 570 } : [fixtureReport]).then(resolve, reject); } };
    for (const method of ['select', 'eq', 'or', 'gte', 'lte', 'order', 'limit', 'maybeSingle', 'single', 'in']) query[method] = () => query;
    return query;
}, channel: () => channel, removeChannel: async () => {} };
