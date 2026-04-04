import { supabase } from '../supabase';

// ── Violation Severity Tiers ──
export const VIOLATION_SEVERITY = {
    LOW: {
        label: 'Low Severity',
        color: '#059669',
        surface: '#D1FAE5',
        icon: 'shield-outline',
        items: [
            { name: 'No Helmet', points: 50, icon: 'bicycle-outline' },
            { name: 'No Seatbelt', points: 50, icon: 'car-outline' },
            { name: 'Parking Violation', points: 50, icon: 'location-outline' },
        ],
    },
    MEDIUM: {
        label: 'Medium Severity',
        color: '#D97706',
        surface: '#FEF3C7',
        icon: 'warning-outline',
        items: [
            { name: 'Signal Jump', points: 100, icon: 'stop-circle-outline' },
            { name: 'Wrong Lane Driving', points: 100, icon: 'swap-horizontal-outline' },
            { name: 'Overloading', points: 100, icon: 'people-outline' },
            { name: 'Triple Seat Riding', points: 100, icon: 'people-circle-outline' },
        ],
    },
    HIGH: {
        label: 'High Severity',
        color: '#DC2626',
        surface: '#FEE2E2',
        icon: 'alert-circle-outline',
        items: [
            { name: 'Rash Driving', points: 200, icon: 'speedometer-outline' },
            { name: 'Over Speeding', points: 200, icon: 'flash-outline' },
            { name: 'Drunk Driving', points: 200, icon: 'wine-outline' },
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
     * Get the points a specific violation type is worth
     */
    getPointsForViolation(violationType) {
        if (!violationType) return VIOLATION_POINTS_MAP.Default;

        // Find exact or partial match
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
            console.error('Error fetching report history:', error);
            return { success: false, history: [], error: error.message };
        }
    },

    /**
     * Instantly award points to the user profile
     */
    async awardPointsForReport(violationType) {
        try {
            const pointsToAward = this.getPointsForViolation(violationType);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile, error: readError } = await supabase
                .from('profiles')
                .select('points_balance')
                .eq('id', user.id)
                .single();

            if (readError) throw readError;

            const newBalance = (profile?.points_balance || 0) + pointsToAward;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ points_balance: newBalance })
                .eq('id', user.id);

            if (updateError) throw updateError;

            return { success: true, pointsAwarded: pointsToAward, newBalance };
        } catch (error) {
            console.error('Error awarding points:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Handle item redemption — generates coupon code and deducts points
     */
    async redeemItem(item) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Fresh read of user profile
            const { data: profile, error: readError } = await supabase
                .from('profiles')
                .select('points_balance')
                .eq('id', user.id)
                .single();

            if (readError) throw readError;

            const currentPoints = profile?.points_balance || 0;

            if (currentPoints < item.pts) {
                return { success: false, error: 'Insufficient points balance.' };
            }

            // 2. Deduct points
            const newBalance = currentPoints - item.pts;
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ points_balance: newBalance })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 3. Generate coupon code
            const couponCode = generateCouponCode();

            return { success: true, newBalance, itemRedeemed: item, couponCode };

        } catch (error) {
            console.error('Error redeeming item:', error);
            return { success: false, error: error.message };
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
            console.error('Error clearing history:', error);
            return { success: false, error: error.message };
        }
    }
};
