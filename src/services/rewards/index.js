import { authService } from '../auth';
import { SEVERITY_POINTS, REWARD_CATALOG, VIOLATION_POINTS } from '../../data/trafficData';

/**
 * Service to handle all Reward and Point-based logic
 */
export const RewardService = {
    /**
     * Calculates points to award based on violation type and severity
     * @param {string} priority - 'low', 'medium', 'high', 'critical'
     * @param {string} violationType - e.g., 'Triple Riding'
     * @returns {number} points
     */
    calculatePoints: (priority, violationType) => {
        // 1. Check for specific violation points first
        if (violationType && VIOLATION_POINTS[violationType]) {
            return VIOLATION_POINTS[violationType];
        }

        // 2. Fallback to severity-based points
        const normalizedPriority = priority?.toLowerCase() || 'medium';
        return SEVERITY_POINTS[normalizedPriority] || 100;
    },

    /**
     * Validates if a user has enough points to redeem a product
     * @param {number} currentBalance 
     * @param {number} cost 
     * @returns {boolean}
     */
    canRedeem: (currentBalance, cost) => {
        return currentBalance >= cost;
    },

    /**
     * Processes a product redemption
     * @param {string} userId 
     * @param {object} product - The product object from REWARD_CATALOG
     * @param {number} currentBalance 
     * @returns {Promise<object>} Result of the update
     */
    processRedemption: async (userId, product, currentBalance) => {
        if (!RewardService.canRedeem(currentBalance, product.pts)) {
            throw new Error('Insufficient points balance.');
        }

        const newBalance = currentBalance - product.pts;
        
        // Update the user's profile in Supabase
        const { data, error } = await authService.updateProfile(userId, {
            points_balance: newBalance
        });

        if (error) throw error;
        return { success: true, newBalance, data };
    },

    /**
     * Gets the full product catalog
     */
    getCatalog: () => REWARD_CATALOG,
};
