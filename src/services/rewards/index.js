import { supabase } from '../supabase';

// ── Severity → Points mapping (single source of truth) ──
export const SEVERITY_POINTS = {
    'Low':      50,
    'Medium':   70,
    'High':     100,
    'Critical': 100,  // treated same as High
    'None':     0,
};

// ── Violation Severity Tiers ──
export const VIOLATION_SEVERITY = {
    LOW: {
        label: 'Low Severity',
        color: '#059669',
        surface: '#D1FAE5',
        icon: 'shield-outline',
        points: SEVERITY_POINTS['Low'],
        items: [
            { name: 'No Helmet', points: SEVERITY_POINTS['Low'], icon: 'bicycle-outline' },
            { name: 'No Seatbelt', points: SEVERITY_POINTS['Low'], icon: 'car-outline' },
            { name: 'Parking Violation', points: SEVERITY_POINTS['Low'], icon: 'location-outline' },
        ],
    },
    MEDIUM: {
        label: 'Medium Severity',
        color: '#D97706',
        surface: '#FEF3C7',
        icon: 'warning-outline',
        points: SEVERITY_POINTS['Medium'],
        items: [
            { name: 'Signal Jump', points: SEVERITY_POINTS['Medium'], icon: 'stop-circle-outline' },
            { name: 'Wrong Lane Driving', points: SEVERITY_POINTS['Medium'], icon: 'swap-horizontal-outline' },
            { name: 'Overloading', points: SEVERITY_POINTS['Medium'], icon: 'people-outline' },
            { name: 'Triple Seat Riding', points: SEVERITY_POINTS['Medium'], icon: 'people-circle-outline' },
        ],
    },
    HIGH: {
        label: 'High Severity',
        color: '#DC2626',
        surface: '#FEE2E2',
        icon: 'alert-circle-outline',
        points: SEVERITY_POINTS['High'],
        items: [
            { name: 'Rash Driving', points: SEVERITY_POINTS['High'], icon: 'speedometer-outline' },
            { name: 'Over Speeding', points: SEVERITY_POINTS['High'], icon: 'flash-outline' },
            { name: 'Drunk Driving', points: SEVERITY_POINTS['High'], icon: 'wine-outline' },
        ],
    },
};

// ── Flat map for point lookups (backwards compatible) ──
export const VIOLATION_POINTS_MAP = {};
Object.values(VIOLATION_SEVERITY).forEach(tier => {
    tier.items.forEach(item => {
        VIOLATION_POINTS_MAP[item.name] = item.points;
    });
});
VIOLATION_POINTS_MAP['Normal Report'] = 50;
VIOLATION_POINTS_MAP['Default'] = 50;

// ── Physical Rewards Catalog (12 items, 300–2000 pts) ──
export const REDEEM_CATALOG = [
    {
        id: 'r_stickers',
        title: 'Reflective Stickers',
        description: 'High-visibility reflective safety stickers for helmets and bikes.',
        pts: 300,
        icon: 'pricetags',
        iconColor: '#6366F1',
        iconBg: '#EDE9FE',
        gradColors: ['#7C3AED', '#6366F1'],
        image: require('../../../assets/images/rewards/stickers.png'),
        tag: 'STARTER',
    },
    {
        id: 'r_keychain',
        title: 'Safety Keychain',
        description: 'LED emergency keychain light with SOS whistle.',
        pts: 400,
        icon: 'flashlight',
        iconColor: '#F59E0B',
        iconBg: '#FEF3C7',
        gradColors: ['#D97706', '#F59E0B'],
        image: require('../../../assets/images/rewards/keychain.png'),
    },
    {
        id: 'r_goggles',
        title: 'UV Riding Goggles',
        description: 'Anti-glare UV400 protection goggles for day/night riding.',
        pts: 500,
        icon: 'glasses',
        iconColor: '#06B6D4',
        iconBg: '#CFFAFE',
        gradColors: ['#0891B2', '#06B6D4'],
        image: require('../../../assets/images/rewards/goggles.png'),
        tag: 'POPULAR',
    },
    {
        id: 'r_gloves',
        title: 'Riding Gloves',
        description: 'Padded knuckle-guard riding gloves with touchscreen tips.',
        pts: 600,
        icon: 'hand-left',
        iconColor: '#10B981',
        iconBg: '#D1FAE5',
        gradColors: ['#059669', '#10B981'],
        image: require('../../../assets/images/rewards/gloves.png'),
    },
    {
        id: 'r_mount',
        title: 'Phone Mount',
        description: 'Anti-vibration handlebar phone mount with 360° rotation.',
        pts: 700,
        icon: 'phone-portrait',
        iconColor: '#3B82F6',
        iconBg: '#DBEAFE',
        gradColors: ['#2563EB', '#3B82F6'],
        image: require('../../../assets/images/rewards/phone_mount.png'),
    },
    {
        id: 'r_firstaid',
        title: 'First Aid Kit',
        description: 'Compact 50-piece roadside emergency first aid kit.',
        pts: 800,
        icon: 'medkit',
        iconColor: '#EF4444',
        iconBg: '#FEE2E2',
        gradColors: ['#DC2626', '#EF4444'],
        image: require('../../../assets/images/rewards/first_aid.png'),
        tag: 'ESSENTIAL',
    },
    {
        id: 'r_boots',
        title: 'Riding Boots',
        description: 'Ankle-reinforced waterproof riding boots with anti-skid sole.',
        pts: 1000,
        icon: 'footsteps',
        iconColor: '#8B5CF6',
        iconBg: '#EDE9FE',
        gradColors: ['#7C3AED', '#8B5CF6'],
    },
    {
        id: 'r_helmet',
        title: 'Safety Helmet',
        description: 'ISI/DOT certified full-face helmet with anti-fog visor.',
        pts: 1200,
        icon: 'shield-checkmark',
        iconColor: '#F59E0B',
        iconBg: '#FEF3C7',
        gradColors: ['#D97706', '#F59E0B'],
        image: require('../../../assets/images/rewards/helmet.png'),
        tag: 'PREMIUM',
    },
    {
        id: 'r_kneeguard',
        title: 'Knee Guards',
        description: 'CE-rated impact-absorbing knee and shin protectors.',
        pts: 1400,
        icon: 'body',
        iconColor: '#14B8A6',
        iconBg: '#CCFBF1',
        gradColors: ['#0D9488', '#14B8A6'],
    },
    {
        id: 'r_jacket',
        title: 'Riding Jacket',
        description: 'Armored mesh riding jacket with back protector and reflectors.',
        pts: 1600,
        icon: 'shirt',
        iconColor: '#1D4ED8',
        iconBg: '#DBEAFE',
        gradColors: ['#1E3A8A', '#1D4ED8'],
        tag: 'TOP TIER',
    },
    {
        id: 'r_dashcam',
        title: 'Dash Camera',
        description: '1080p wide-angle dash cam with loop recording and G-sensor.',
        pts: 1800,
        icon: 'videocam',
        iconColor: '#EC4899',
        iconBg: '#FCE7F3',
        gradColors: ['#BE185D', '#EC4899'],
    },
    {
        id: 'r_smarthelmet',
        title: 'Smart Helmet Pro',
        description: 'Bluetooth helmet with HUD display, intercom, and noise cancellation.',
        pts: 2000,
        icon: 'hardware-chip',
        iconColor: '#002452',
        iconBg: '#D7E2FF',
        gradColors: ['#002452', '#1B3A6B'],
        tag: 'ULTIMATE',
    },
];

// ── Coupon Code Generator ──
function generateCouponCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `TE-${segment()}-${segment()}`;
}

// ── Reward Service Logic ──
export const rewardService = {
    /**
     * Get the points a specific severity level is worth.
     * This is the preferred lookup — severity is always reliable.
     * @param {'Low'|'Medium'|'High'|'Critical'|'None'} severity
     */
    getPointsForSeverity(severity) {
        return SEVERITY_POINTS[severity] ?? SEVERITY_POINTS['Low'];
    },

    /**
     * Get the points a specific violation type is worth.
     * If severity is provided, it takes priority over the violation name lookup.
     * @param {string} violationType
     * @param {string} [severity]  - optional: 'Low' | 'Medium' | 'High' | 'Critical'
     */
    getPointsForViolation(violationType, severity = null) {
        // Severity-based lookup takes priority (more reliable)
        if (severity && SEVERITY_POINTS[severity] !== undefined) {
            return SEVERITY_POINTS[severity];
        }

        if (!violationType) return VIOLATION_POINTS_MAP.Default;

        // Fallback: violation name lookup
        for (const [key, pts] of Object.entries(VIOLATION_POINTS_MAP)) {
            if (violationType.toLowerCase().includes(key.toLowerCase())) {
                return pts;
            }
        }
        return VIOLATION_POINTS_MAP.Default;
    },

    /**
     * Fetch the user's report history to calculate accurate civic activity
     */
    async getUserReportHistory(limit = 10) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('verification_reports')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { success: true, history: data || [] };
        } catch (error) {
            if (__DEV__) console.warn('Failed to fetch report history:', error?.message || 'Unknown error');
            return { success: false, history: [], error: error.message };
        }
    },

    /**
     * Instantly award points to the user profile via server-side RPC.
     * This is a lightweight convenience wrapper for UI preview purposes.
     * Actual post-approval reward is awarded by submit_officer_review on the server.
     * @param {string} violationType
     * @param {string} [severity] - preferred: 'Low' | 'Medium' | 'High' | 'Critical'
     */
    async awardPointsForReport(violationType, severity = null) {
        // Return the calculated preview amount (actual award done server-side on approval)
        const pointsToAward = this.getPointsForViolation(violationType, severity);
        return { success: true, pointsAwarded: pointsToAward };
    },

    /**
     * Award base submission points via atomic server-side RPC.
     * The RPC is idempotent — repeated calls for the same reportId are a no-op.
     */
    async awardBaseSubmissionPoints(reportId) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase.rpc('award_submission_points', {
                p_user_id:   user.id,
                p_report_id: reportId,
            });

            if (error) throw error;

            return {
                success: true,
                pointsAwarded: data?.pointsAwarded ?? 10,
                skipped: data?.skipped ?? false,
            };
        } catch (error) {
            if (__DEV__) console.warn('[RewardService] Award submission points failed:', error?.message || 'Unknown error');
            return { success: false, error: error.message };
        }
    },

    /**
     * Handle item redemption via atomic server-side RPC.
     * The RPC uses SELECT ... FOR UPDATE to prevent race-condition double-spending.
     */
    async redeemItem(item) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Generate coupon code + 15-day expiry on client (used as input to RPC)
            const couponCode = generateCouponCode();
            const expiresAt = new Date(
                Date.now() + 15 * 24 * 60 * 60 * 1000
            ).toISOString();

            const { data, error } = await supabase.rpc('redeem_reward_item', {
                p_user_id:    user.id,
                p_item_id:    item.id,
                p_points:     item.pts,
                p_item_title: item.title,
                p_coupon:     couponCode,
                p_expires_at: expiresAt,
            });

            if (error) throw error;

            if (!data?.success) {
                return { success: false, error: data?.error || 'Redemption failed.' };
            }

            return {
                success:      true,
                newBalance:   data.newBalance,
                itemRedeemed: item,
                couponCode:   data.couponCode,
                unlockedAt:   data.unlockedAt,
                expiresAt:    data.expiresAt,
            };

        } catch (error) {
            if (__DEV__) console.warn('[RewardService] Redeem item failed:', error?.message || 'Unknown error');
            return { success: false, error: error.message };
        }
    },

    /**
     * Fetch all gifts the user has already redeemed (for persistent unlock state)
     * Returns a map: { [itemId]: { couponCode, unlockedAt, expiresAt } }
     */
    async getRedeemedItems() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: true, redeemed: {} };

            const { data, error } = await supabase
                .from('point_transactions')
                .select('description, created_at')
                .eq('user_id', user.id)
                .eq('action', 'gift_redeemed')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const redeemed = {};
            (data || []).forEach((row) => {
                try {
                    const parsed = JSON.parse(row.description);
                    // Keep only the FIRST (latest) redemption per item
                    if (parsed.itemId && !redeemed[parsed.itemId]) {
                        redeemed[parsed.itemId] = {
                            couponCode: parsed.couponCode,
                            unlockedAt: parsed.unlockedAt,
                            expiresAt: parsed.expiresAt,
                            itemTitle: parsed.itemTitle,
                        };
                    }
                } catch (_) { /* skip malformed rows */ }
            });

            return { success: true, redeemed };
        } catch (error) {
            if (__DEV__) console.warn('Failed to fetch redeemed items:', error?.message || 'Unknown error');
            return { success: false, redeemed: {} };
        }
    },

    /**
     * Fetch a unified activity timeline:
     *  - Earned points: from point_transactions (type=earned) joined with image_report title
     *  - Spent points : from point_transactions (type=redeemed)
     * Returns array sorted newest-first.
     */
    async getActivityHistory(limit = 40) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: true, history: [] };

            const { data, error } = await supabase
                .from('point_transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            // For earned rows that reference a report, fetch the report title
            const reportIds = (data || [])
                .filter(t => t.reference_id && t.type === 'earned')
                .map(t => t.reference_id);

            let reportMap = {};
            if (reportIds.length > 0) {
                const { data: reports } = await supabase
                    .from('image_reports')
                    .select('id, violation_type, severity')
                    .in('id', reportIds);
                (reports || []).forEach(r => (reportMap[r.id] = r));
            }

            const history = (data || []).map(t => {
                if (t.type === 'redeemed') {
                    let meta = {};
                    try { meta = JSON.parse(t.description); } catch (_e) { /* skip malformed */ }
                    return {
                        id: t.id,
                        type: 'spent',
                        points: -t.amount,
                        label: meta.itemTitle ? `Unlocked ${meta.itemTitle}` : 'Gift Redeemed',
                        sublabel: `Spent ${t.amount} pts`,
                        date: t.created_at,
                    };
                }
                // earned
                const report = reportMap[t.reference_id] || null;
                const violationLabel = report?.violation_type || 'Violation Report';
                return {
                    id: t.id,
                    type: 'earned',
                    points: t.amount,
                    label: `Earned ${t.amount} pts from ${violationLabel}`,
                    sublabel: report?.severity
                        ? `${report.severity.charAt(0).toUpperCase() + report.severity.slice(1)} severity`
                        : t.description || 'Points credited',
                    date: t.created_at,
                    reportId: t.reference_id,
                };
            });

            return { success: true, history };
        } catch (error) {
            if (__DEV__) console.warn('Failed to fetch activity history:', error?.message || 'Unknown error');
            return { success: false, history: [], error: error.message };
        }
    },

    /**
     * Clears all activity records for the current user
     */
    async clearUserHistory() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('verification_reports')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            if (__DEV__) console.warn('Failed to clear history:', error?.message || 'Unknown error');
            return { success: false, error: error.message };
        }
    }
};
