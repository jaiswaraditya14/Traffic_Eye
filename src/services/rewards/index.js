import { supabase } from '../supabase';

// ── Points Structure (Violations to Points Base) ──
export const VIOLATION_POINTS_MAP = {
    'Over speeding': 150,
    'Jumping Red Signal': 200,
    'Triple Seat riding': 300,
    'Normal Report': 100,
    'Default': 50
};

// ── Physical Rewards Catalog ──
export const REDEEM_CATALOG = [
    {
        id: 'r_helmet',
        title: 'Safety Helmet',
        description: 'ISI/DOT certified full-face helmet.',
        pts: 1000,
        image: require('../../../assets/images/rewards/helmet.png'),
        available: true
    },
    {
        id: 'r_gloves',
        title: 'Biking Gloves',
        description: 'Premium protection riding gloves.',
        pts: 500,
        image: 'https://images.unsplash.com/photo-1631548052479-7dd29344407b?q=80&w=400&h=400&auto=format&fit=crop',
        available: true
    },
    {
        id: 'r_boots',
        title: 'Biking Boots',
        description: 'Ankle-reinforced professional boots.',
        pts: 800,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&h=400&auto=format&fit=crop',
        available: true
    },
    {
        id: 'r_goggles',
        title: 'Biking Goggles',
        description: 'Anti-glare UV protection goggles.',
        pts: 300,
        image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=400&h=400&auto=format&fit=crop',
        available: true
    }
];

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
     * This relies on the verification_reports table
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
     * Instantly award points to the user profile (Demo feature)
     */
    async awardPointsForReport(violationType) {
        try {
            const pointsToAward = this.getPointsForViolation(violationType);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Fetch current profile
            const { data: profile, error: readError } = await supabase
                .from('profiles')
                .select('points_balance')
                .eq('id', user.id)
                .single();

            if (readError) throw readError;

            const newBalance = (profile?.points_balance || 0) + pointsToAward;

            // 2. Update profile points
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
     * Handle item redemption
     */
    async redeemItem(item) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Security Check: Fresh read of user profile
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

            // Optional: Insert into a redemptions log table here if you build one later
            return { success: true, newBalance, itemRedeemed: item };

        } catch (error) {
            console.error('Error redeeming item:', error);
            return { success: false, error: error.message };
        }
    }
};
