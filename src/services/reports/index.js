/**
 * reportService.js  –  Image Report + Officer Review data layer
 *
 * All functions return { data, error } so callers can handle both paths cleanly.
 */
import { supabase } from '../supabase';

// ── Citizen helpers ────────────────────────────────────────────────────────

/**
 * Submit a new image report (after AI analysis is complete).
 *
 * @param {object} payload
 *   - user_id, image_url, image_storage_path (optional)
 *   - latitude, longitude, location_address (optional)
 *   - violation_type, violation_description, severity, ai_confidence, ai_raw_result, vehicle_number
 */
export async function submitImageReport(payload) {
    const { data, error } = await supabase
        .from('image_reports')
        .insert([payload])
        .select()
        .single();
    return { data, error };
}

/**
 * Fetch all image reports for the current citizen, ordered newest-first.
 * Each row is joined with its officer_review (if any).
 */
export async function fetchCitizenReports(userId) {
    const { data, error } = await supabase
        .from('image_reports')
        .select(`
            *,
            officer_review:officer_reviews (
                id,
                decision,
                remarks,
                review_timestamp,
                officer:officer_id ( full_name, badge_id )
            )
        `)
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false });
    return { data, error };
}

/**
 * Fetch a single image report with full details.
 */
export async function fetchReportById(reportId) {
    const { data, error } = await supabase
        .from('image_reports')
        .select(`
            *,
            submitter:user_id ( id, full_name, email, phone ),
            officer_review:officer_reviews (
                id,
                decision,
                remarks,
                internal_notes,
                review_timestamp,
                officer:officer_id ( id, full_name, badge_id, department )
            )
        `)
        .eq('id', reportId)
        .single();
    return { data, error };
}

// ── Officer helpers ────────────────────────────────────────────────────────

/**
 * Fetch all pending reports for the officer queue, newest-first.
 * Includes submitter profile.
 */
export async function fetchPendingReports() {
    const { data, error } = await supabase
        .from('image_reports')
        .select(`
            *,
            submitter:user_id ( id, full_name, email, phone )
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });
    return { data, error };
}

/**
 * Fetch all reviewed (approved | rejected) reports for officer history view.
 */
export async function fetchReviewedReports() {
    const { data, error } = await supabase
        .from('image_reports')
        .select(`
            *,
            submitter:user_id ( id, full_name, email ),
            officer_review:officer_reviews (
                decision,
                remarks,
                review_timestamp,
                officer:officer_id ( full_name, badge_id )
            )
        `)
        .in('status', ['approved', 'rejected'])
        .order('reviewed_at', { ascending: false });
    return { data, error };
}

/**
 * Officer submits their decision via the DB function (atomic + notifies citizen).
 *
 * @param {string} reportId
 * @param {string} officerId
 * @param {'approved'|'rejected'} decision
 * @param {string} [remarks]     - public remark shown to citizen
 * @param {string} [internalNotes] - private note
 */
export async function submitOfficerDecision(reportId, officerId, decision, remarks = null, internalNotes = null) {
    const { data, error } = await supabase.rpc('submit_officer_review', {
        p_report_id:  reportId,
        p_officer_id: officerId,
        p_decision:   decision,
        p_remarks:    remarks,
        p_internal:   internalNotes,
    });
    return { data, error };
}

// ── Notifications ──────────────────────────────────────────────────────────

/**
 * Fetch notifications for the current user, newest-first.
 */
export async function fetchNotifications(userId) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
    return { data, error };
}

/**
 * Mark one notification as read.
 */
export async function markNotificationRead(notifId) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId);
    return { error };
}

/**
 * Mark all notifications for a user as read.
 */
export async function markAllNotificationsRead(userId) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    return { error };
}

// ── Realtime channel builders ──────────────────────────────────────────────

/**
 * Subscribe to realtime changes on image_reports for a citizen.
 * Returns the channel so the caller can call supabase.removeChannel(ch).
 *
 * @param {string}   userId
 * @param {Function} onUpdate  (payload) => void
 * @param {Function} onInsert  (payload) => void
 */
export function subscribeToReportUpdates(userId, onUpdate, onInsert) {
    return supabase
        .channel(`image_reports_citizen_${userId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'image_reports',
            filter: `user_id=eq.${userId}`,
        }, onUpdate)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'image_reports',
            filter: `user_id=eq.${userId}`,
        }, onInsert)
        .subscribe();
}

/**
 * Subscribe to realtime changes on image_reports for the officer pending queue.
 */
export function subscribeToOfficerQueue(onInsert, onUpdate) {
    return supabase
        .channel('image_reports_officer_queue')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'image_reports',
        }, onInsert)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'image_reports',
        }, onUpdate)
        .subscribe();
}

/**
 * Subscribe to notifications for a user.
 */
export function subscribeToNotifications(userId, onInsert) {
    return supabase
        .channel(`notifications_${userId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
        }, onInsert)
        .subscribe();
}
