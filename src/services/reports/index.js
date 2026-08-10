/**
 * reportService.js  –  Image Report + Officer Review + Media data layer
 *
 * All functions return { data, error } so callers can handle both paths cleanly.
 */
import { supabase } from '../supabase';
import * as FileSystem from 'expo-file-system/legacy';
const { EncodingType } = FileSystem;
import { decode } from 'base64-arraybuffer';

// ── File validation helpers ────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png'];
const ALLOWED_VIDEO_TYPES = ['mp4', 'mov', 'webm'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Validate a file by extension and size.
 * @param {string} uri
 * @param {number} [fileSize]
 * @returns {{ valid: boolean, error?: string, fileType: 'image'|'video' }}
 */
export function validateMediaFile(uri, fileSize) {
    const ext = uri.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_TYPES.includes(ext)) {
        return { valid: false, error: `File type .${ext} is not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}`, fileType: null };
    }
    if (fileSize && fileSize > MAX_FILE_SIZE) {
        return { valid: false, error: `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`, fileType: null };
    }
    const fileType = ALLOWED_IMAGE_TYPES.includes(ext) ? 'image' : 'video';
    return { valid: true, fileType };
}

// ── Media helpers ──────────────────────────────────────────────────────────

/**
 * Upload a media file (image or video) to the report-media bucket.
 * Returns the public URL and storage path.
 */
export async function uploadReportMedia(userId, fileUri, mimeType = 'image/jpeg') {
    try {
        const ext = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const storagePath = `${userId}/${fileName}`;

        const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: EncodingType?.Base64 || 'base64',
        });

        const { error: uploadError } = await supabase.storage
            .from('report-media')
            .upload(storagePath, decode(base64), {
                contentType: mimeType,
                upsert: true,
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('report-media')
            .getPublicUrl(storagePath);

        return { data: { publicUrl, storagePath, fileName }, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

/**
 * Insert a row into report_media.
 */
export async function insertReportMedia(reportId, mediaData) {
    const { data, error } = await supabase
        .from('report_media')
        .insert({
            report_id: reportId,
            file_url: mediaData.publicUrl,
            file_type: mediaData.fileType,
            storage_path: mediaData.storagePath || null,
            file_name: mediaData.fileName || null,
            mime_type: mediaData.mimeType || null,
            file_size: mediaData.fileSize || null,
        })
        .select()
        .single();
    return { data, error };
}

/**
 * Fetch all media attached to a report.
 */
export async function fetchReportMedia(reportId) {
    const { data, error } = await supabase
        .from('report_media')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });
    return { data, error };
}

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
 * Each row is joined with its officer_review (if any) and report_media.
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
            ),
            media:report_media (
                id,
                file_url,
                file_type,
                mime_type,
                created_at
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
            ),
            media:report_media (
                id,
                file_url,
                file_type,
                mime_type,
                file_name,
                file_size,
                created_at
            )
        `)
        .eq('id', reportId)
        .single();
    return { data, error };
}

// ── Officer helpers ────────────────────────────────────────────────────────

/**
 * Fetch all pending reports for the officer queue, newest-first.
 * Includes submitter profile and media.
 */
export async function fetchPendingReports(officerProfile = null, filterByJurisdiction = true) {
    let query = supabase
        .from('image_reports')
        .select(`
            *,
            submitter:user_id ( id, full_name, email, phone ),
            media:report_media (
                id,
                file_url,
                file_type,
                mime_type
            )
        `)
        .eq('status', 'pending');

    // Location routing logic (Jurisdiction & Pincode OR filtering)
    if (filterByJurisdiction && officerProfile && officerProfile.role === 'officer') {
        let filters = [];
        if (officerProfile.badge_id) {
            const digits = officerProfile.badge_id.match(/\d+$/);
            if (digits) {
                const suffix = digits[0].padStart(3, '0');
                filters.push(`location_address.ilike.%400${suffix}%`);
            }
        }
        if (officerProfile.jurisdiction) {
            filters.push(`location_address.ilike.%${officerProfile.jurisdiction}%`);
        }
        if (filters.length > 0) {
            query = query.or(filters.join(','));
        }
    }

    const { data, error } = await query.order('submitted_at', { ascending: false });
    return { data, error };
}

/**
 * Fetch all reviewed (approved | rejected) reports for officer history view.
 */
export async function fetchReviewedReports(officerProfile = null) {
    let query = supabase
        .from('image_reports')
        .select(`
            *,
            submitter:user_id ( id, full_name, email ),
            officer_review:officer_reviews (
                decision,
                remarks,
                review_timestamp,
                officer:officer_id ( full_name, badge_id )
            ),
            media:report_media (
                id,
                file_url,
                file_type,
                mime_type
            )
        `)
        .in('status', ['approved', 'rejected']);

    // Location routing logic (Strict Pincode mapping)
    if (officerProfile && officerProfile.role === 'officer' && officerProfile.badge_id) {
        const digits = officerProfile.badge_id.match(/\d+$/);
        if (digits) {
            const suffix = digits[0].padStart(3, '0');
            const pincode = `400${suffix}`;
            query = query.ilike('location_address', `%${pincode}%`);
        }
    }

    const { data, error } = await query.order('reviewed_at', { ascending: false });
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

/**
 * Fetch all approved reports for the live map view.
 * Joins officer_reviews to get the approving officer's details.
 */
/**
 * Fetch approved reports for the live map (legacy direct query).
 * Used as fallback if RPC is unavailable.
 */
export async function fetchApprovedMapReports() {
    const { data, error } = await supabase
        .from('image_reports')
        .select(`
            id, latitude, longitude, location_address, violation_type, severity,
            vehicle_number, submitted_at, reviewed_at,
            officer_review:officer_reviews (
                officer:officer_id ( full_name, badge_id )
            )
        `)
        .eq('status', 'approved')
        .order('submitted_at', { ascending: false })
        .limit(500);
    return { data, error };
}

/**
 * Fetch anonymized heatmap points via optimized RPC.
 * Supports bounding-box and time filtering for performance.
 *
 * @param {object|null} bbox  - { minLat, maxLat, minLng, maxLng } or null for all
 * @param {number}      daysBack - how many days back to query (default 30)
 */
export async function fetchHeatmapPoints(bbox = null, daysBack = 30) {
    const params = {
        p_days_back: daysBack,
        p_min_lat:   bbox?.minLat  ?? null,
        p_max_lat:   bbox?.maxLat  ?? null,
        p_min_lng:   bbox?.minLng  ?? null,
        p_max_lng:   bbox?.maxLng  ?? null,
    };
    const { data, error } = await supabase.rpc('get_approved_heatmap_points', params);
    if (error) {
        // Graceful fallback to direct query if RPC is not yet deployed
        console.warn('[Heatmap] RPC unavailable, falling back to direct query:', error.message);
        return fetchApprovedMapReports();
    }
    return { data, error: null };
}

/**
 * Subscribe to realtime changes on image_reports for the live map.
 */
/**
 * Subscribe to realtime changes on approved image_reports for the live heatmap.
 * Triggers on any UPDATE — the handler should re-fetch if new status is 'approved'.
 */
export function subscribeToApprovedMapReports(onChange) {
    return supabase
        .channel('image_reports_heatmap_realtime')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'image_reports',
        }, (payload) => {
            // Only refresh if the report was just approved (or is approved)
            if (payload?.new?.status === 'approved') {
                onChange(payload);
            }
        })
        .subscribe();
}
