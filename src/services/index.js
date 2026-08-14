// Services barrel export
export { supabase } from './supabase';
export { authService } from './auth';
export { aiService, checkImageAuthenticity } from './ai';
export { rewardService, VIOLATION_POINTS_MAP, VIOLATION_SEVERITY, REDEEM_CATALOG } from './rewards';
export * as reportService from './reports';

