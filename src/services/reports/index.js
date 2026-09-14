/**
 * reportService.js  –  Image Report + Officer Review + Media data layer
 *
 * All functions return { data, error } so callers can handle both paths cleanly.
 */
import { supabase } from '../supabase';
import * as FileSystem from 'expo-file-system/legacy';
const { EncodingType } = FileSystem;
import { decode } from 'base64-arraybuffer';
import { randomUUID } from 'expo-crypto';
import { officerJurisdictionFilters } from '../../utils/productExperience';

// ── File validation helpers ────────────────────────────────────────────────

const MEDIA_TYPES = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
};
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const safeDiagnostic = (event) => {
    if (__DEV__) console.warn('[reports]', event);
};
const submissionError = (code, message) => Object.assign(new Error(message), { code, userMessage: message });

export function validateMediaFile(uri, fileSize, mimeType) {
    if (typeof uri !== 'string' || !uri.trim()) {
        return { valid: false, error: 'Please attach an image or video.', fileType: null };
    }
    // Parse only for metadata; read the original URI unchanged.
    const extension = uri.split(/[?#]/)[0].split('/').pop().match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
    if (mimeType != null && typeof mimeType !== 'string') {
        return { valid: false, error: 'Unsupported or mismatched media type.', fileType: null };
    }
    const canonicalMime = mimeType?.toLowerCase();
    const inferredMime = MEDIA_TYPES[extension];
    const resolvedMime = canonicalMime || inferredMime;
    if (!resolvedMime || !Object.values(MEDIA_TYPES).includes(resolvedMime) ||
        (extension && (!inferredMime || inferredMime !== resolvedMime))) {
        return { valid: false, error: 'Unsupported or mismatched media type.', fileType: null };
    }
    if (fileSize != null && (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE)) {
        return { valid: false, error: 'Evidence must be between 1 byte and 50 MB.', fileType: null };
    }
    return {
        valid: true,
        fileType: resolvedMime.startsWith('video/') ? 'video' : 'image',
        mimeType: resolvedMime,
        extension: extension || Object.keys(MEDIA_TYPES).find(key => MEDIA_TYPES[key] === resolvedMime),
    };
}

/** Reuse this draft-scoped token for every tap/retry of the same submission. */
export function createReportSubmission() {
    return { id: randomUUID(), uploaded: null, uncertain: false, result: null, pending: null };
}

/** Upload local evidence without overwriting existing objects. */
export async function uploadReportMedia(userId, fileUri, mimeType, options = {}) {
    try {
        if (typeof userId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(userId)) throw new Error('Invalid owner');
        const validation = validateMediaFile(fileUri, options.fileSize, mimeType);
        if (!validation.valid) throw new Error(validation.error);
        if (!/^(file|content):\/\//i.test(fileUri)) throw new Error('Local evidence required');
        const objectId = options.objectId || randomUUID();
        if (!/^[A-Za-z0-9_-]+$/.test(objectId)) throw new Error('Invalid object id');
        const fileName = objectId + '.' + validation.extension;
        const storagePath = userId + '/' + fileName;
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: EncodingType?.Base64 || 'base64',
        });
        const bytes = decode(base64);
        if (!bytes.byteLength || bytes.byteLength > MAX_FILE_SIZE) throw new Error('Invalid evidence size');
        const { error } = await supabase.storage.from('report-media').upload(storagePath, bytes, {
            contentType: validation.mimeType,
            upsert: false,
        });
        const alreadyUploaded = options.retry && String(error?.statusCode || error?.status) === '409';
        if (error && !alreadyUploaded) throw error;
        const publicUrl = supabase.storage.from('report-media').getPublicUrl(storagePath)?.data?.publicUrl;
        if (!publicUrl) throw new Error('Storage URL unavailable');
        return { data: {
            publicUrl, storagePath, fileName, fileType: validation.fileType,
            mimeType: validation.mimeType, fileSize: bytes.byteLength,
        }, error: null };
    } catch {
        safeDiagnostic('MEDIA_UPLOAD_FAILED');
        return { data: null, error: submissionError('UPLOAD_FAILED', 'Could not upload evidence. Please check your connection and try again.') };
    }
}

/**
 * Remove an uploaded object from the report-media bucket.
 *
 * Used for orphan cleanup: if a media upload succeeds but the subsequent
 * image_reports insert fails, the stored file would otherwise be an
 * unreferenced orphan. This never throws — cleanup is best-effort and must not
 * mask the original failure. Diagnostic detail is logged in dev only.
 *
 * @param {string} storagePath - the `${userId}/${fileName}` path returned by uploadReportMedia
 * @returns {Promise<{ error: any }>}
 */
export async function removeReportMedia(storagePath) {
    if (!storagePath) return { error: null };
    try {
        const { error } = await supabase.storage.from('report-media').remove([storagePath]);
        if (error && __DEV__) console.warn('[reports] Orphan cleanup failed.');
        return { error };
    } catch (err) {
        if (__DEV__) console.warn('[reports] Orphan cleanup failed.');
        return { error: err };
    }
}

/**
 * Insert a row into report_media.
 */
export async function insertReportMedia(reportId, mediaData) {
    const { data, error } = await supabase
        .from('report_media')
        .insert({
            ...(mediaData.id ? { id: mediaData.id } : {}),
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

// ── Duplicate detection ────────────────────────────────────────────────────

/**
 * @deprecated LEGACY — no longer called from the UI.
 * Hash-based duplicate detection has been replaced by checkPlateDuplicate()
 * (plate-OCR + Supabase DB matching). This function is kept for backwards
 * compatibility with the existing image_hash DB column and check_image_duplicate RPC.
 *
 * @param {string} hash - 64-char hex SHA-256 fingerprint
 * @returns {Promise<{ isDuplicate: boolean, existingReportId: string|null }>}
 */
export async function checkImageHashExists(hash) {
    if (!hash) return { isDuplicate: false, existingReportId: null };
    try {
        // Strategy 1: Try SECURITY DEFINER RPC function (bypasses citizen RLS restrictions across all users)
        const { data: rpcData, error: rpcError } = await supabase.rpc('check_image_duplicate', { p_hash: hash });

        if (!rpcError && rpcData && rpcData.length > 0) {
            const result = rpcData[0];
            if (result?.is_duplicate) {
                return { isDuplicate: true, existingReportId: result.existing_report_id };
            }
            return { isDuplicate: false, existingReportId: null };
        }

        // Strategy 2: Direct table select fallback
        const { data, error } = await supabase
            .from('image_reports')
            .select('id, status, submitted_at')
            .eq('image_hash', hash)
            .neq('status', 'rejected')  // Rejected reports don't block re-submission
            .limit(1)
            .maybeSingle();

        if (error) {
            if (error.code === '42703' || error.message?.includes('image_hash')) {
                return { isDuplicate: false, existingReportId: null };
            }
            return { isDuplicate: false, existingReportId: null };
        }

        if (data) {
            return { isDuplicate: true, existingReportId: data.id };
        }

        return { isDuplicate: false, existingReportId: null };
    } catch (err) {
        return { isDuplicate: false, existingReportId: null };
    }
}

/**
 * Check whether a vehicle plate has already been reported recently.
 * Uses a SECURITY DEFINER RPC to check across ALL citizens' reports
 * (the direct client query fails silently under RLS).
 *
 * FAIL-CLOSED: duplicate prevention is a safety control. If the check cannot
 * be performed (RPC error / thrown exception), we return `indeterminate: true`
 * rather than silently reporting "unique" — a flaky or attacked endpoint must
 * not become a bypass. Callers treat `indeterminate` as "cannot proceed yet;
 * ask the user to retry". A valid placeholder / too-short plate is a real,
 * determinate "nothing to check" and is NOT indeterminate.
 *
 * @param {string} vehicleNumber - e.g. "MH02CR7036"
 * @returns {Promise<{ isDuplicate: boolean, indeterminate: boolean, existingReportId: string|null, reason?: string }>}
 */
export async function checkPlateDuplicate(vehicleNumber) {
    const unavailable = reason => ({ isDuplicate: false, indeterminate: true, existingReportId: null, reason });
    if (vehicleNumber != null && typeof vehicleNumber !== 'string') return unavailable('INVALID_RESPONSE');
    const normalized = (vehicleNumber || '').replace(/\s+/g, '').toUpperCase();
    if (!normalized || ['NOTDETECTED', 'NOTAPPLICABLE', 'N/A', 'PLATE_NOT_READABLE'].includes(normalized) || normalized.length < 4) {
        return { isDuplicate: false, indeterminate: false, existingReportId: null };
    }
    try {
        const { data, error } = await supabase.rpc('check_plate_duplicate', { p_vehicle_number: normalized });
        if (error) {
            safeDiagnostic('DUPLICATE_CHECK_FAILED');
            return unavailable('CHECK_FAILED');
        }
        if (!data || Array.isArray(data) || typeof data.is_duplicate !== 'boolean' ||
            (data.is_duplicate && (typeof data.existing_report_id !== 'string' || !data.existing_report_id))) {
            safeDiagnostic('DUPLICATE_CHECK_INVALID_RESPONSE');
            return unavailable('INVALID_RESPONSE');
        }
        return { isDuplicate: data.is_duplicate, indeterminate: false, existingReportId: data.is_duplicate ? data.existing_report_id : null };
    } catch {
        safeDiagnostic('DUPLICATE_CHECK_EXCEPTION');
        return unavailable('EXCEPTION');
    }
}

// ── Rate Limiting ──────────────────────────────────────────────────────────

/**
 * Check whether a user has exceeded the 3 reports per hour rate limit.
 *
 * FAIL-CLOSED: the rate limiter is an abuse control. If the count cannot be
 * established (query error / thrown exception / missing identity), we return
 * `allowed: false` with `indeterminate: true` so the submission is blocked and
 * the user is asked to retry — a limiter that is down must not silently permit
 * unlimited submissions. A determinate limit hit returns `allowed: false` with
 * `indeterminate: false` and the reset window.
 *
 * @param {string} userId
 * @param {number} maxPerHour
 * @returns {Promise<{ allowed: boolean, indeterminate: boolean, count: number, remainingMinutes: number, reason?: string }>}
 */
export async function checkUserRateLimit(userId, maxPerHour = 3) {
    if (!userId || !Number.isInteger(maxPerHour) || maxPerHour < 1) {
        // No identity → cannot attribute the count → fail closed.
        return { allowed: false, indeterminate: true, count: 0, remainingMinutes: 0, reason: 'NO_USER' };
    }
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data, error, count } = await supabase
            .from('image_reports')
            .select('submitted_at', { count: 'exact' })
            .eq('user_id', userId)
            .gte('submitted_at', oneHourAgo)
            .order('submitted_at', { ascending: true });

        if (error) {
            // Diagnostic context in dev only; block rather than allow a bypass.
            if (__DEV__) console.warn('[RateLimit] Activity check unavailable; submission blocked.');
            return { allowed: false, indeterminate: true, count: 0, remainingMinutes: 0, reason: 'CHECK_FAILED' };
        }

        if (!Number.isInteger(count) || count < 0 || !Array.isArray(data)) {
            return { allowed: false, indeterminate: true, count: 0, remainingMinutes: 0, reason: 'INVALID_RESPONSE' };
        }
        const recentCount = count;
        if (recentCount >= maxPerHour) {
            const oldestSubmission = new Date(data[0]?.submitted_at).getTime();
            const resetTime = Number.isFinite(oldestSubmission) ? oldestSubmission + 60 * 60 * 1000 : Date.now() + 60 * 60 * 1000;
            const remainingMs = Math.max(0, resetTime - Date.now());
            const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
            return { allowed: false, indeterminate: false, count: recentCount, remainingMinutes, reason: 'RATE_LIMITED' };
        }

        return { allowed: true, indeterminate: false, count: recentCount, remainingMinutes: 0 };
    } catch (err) {
        if (__DEV__) console.warn('[RateLimit] Activity check unavailable; submission blocked.');
        return { allowed: false, indeterminate: true, count: 0, remainingMinutes: 0, reason: 'EXCEPTION' };
    }
}


// ── Citizen helpers ────────────────────────────────────────────────────────

/**
 * Submit a new image report (after AI analysis is complete).
 *
 * @param {object} payload
 *   - user_id, image_url, image_storage_path (optional)
 *   - latitude, longitude, location_address (optional)
 *   - violation_type, violation_description, severity, ai_confidence, ai_raw_result, vehicle_number
 *   - image_hash (optional) - SHA-256 fingerprint for duplicate detection
 *   - authenticity_check (optional) - JSON result of Stage 0B AI check
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
 * Validate the final edited plate and activity before uploading. Reuse the
 * submission token on retry: its stable report PK handles lost acknowledgments.
 * Uncertain insert failures retain evidence until an owned-row lookup resolves.
 */
export function submitReportWithMedia({ userId, report, media = null, submission = createReportSubmission(), signal, onPhase }) {
    if (report?.demo || report?.ai_raw_result?.demo) return Promise.resolve({ data: null, error: submissionError('DEMO_NOT_SAVED', 'Demo evidence cannot be saved.') });
    if (submission.userId && submission.userId !== userId) {
        return Promise.resolve({ data: null, error: submissionError('AUTH_CHANGED', 'Please reopen this report after signing in.') });
    }
    if (submission.pending) return submission.pending;
    if (submission.result) return Promise.resolve(submission.result);
    submission.pending = performReportSubmission({ userId, report, media, submission, signal, onPhase })
        .catch(() => ({ data: null, error: submissionError('SUBMISSION_FAILED', 'Could not save the report. Please retry this draft.') }))
        .finally(() => { submission.pending = null; });
    return submission.pending;
}

async function performReportSubmission({ userId, report, media, submission, signal, onPhase }) {
    if (!userId) return { data: null, error: submissionError('NOT_SIGNED_IN', 'You are not signed in. Please sign in and try again.') };
    if (!report || typeof report !== 'object' || Array.isArray(report)) {
        return { data: null, error: submissionError('INVALID_REPORT', 'Report details are missing.') };
    }
    if (typeof report.violation_type !== 'string' || !report.violation_type.trim() ||
        !Number.isFinite(report.latitude) || Math.abs(report.latitude) > 90 ||
        !Number.isFinite(report.longitude) || Math.abs(report.longitude) > 180) {
        return { data: null, error: submissionError('INVALID_REPORT', 'Select a violation and a valid incident location before submitting.') };
    }
    const validation = validateMediaFile(media?.uri, media?.fileSize, media?.mimeType);
    if (!validation.valid || (media.fileType && media.fileType !== validation.fileType)) {
        return { data: null, error: submissionError('INVALID_MEDIA', validation.error || 'The evidence type does not match the selected file.') };
    }
    const fingerprint = JSON.stringify({ userId, report, media });
    if (submission.fingerprint && submission.fingerprint !== fingerprint) {
        return { data: null, error: submissionError('DRAFT_CHANGED', 'Retry the original draft before changing evidence or report details.') };
    }
    submission.userId = userId;

    const finish = async created => {
        if (submission.uploaded) {
            try {
                const { error } = await insertReportMedia(created.id, { ...submission.uploaded, id: submission.id });
                if (error && error.code !== '23505') safeDiagnostic('MEDIA_LINK_FAILED');
            } catch { safeDiagnostic('MEDIA_LINK_FAILED'); }
        }
        submission.result = { data: created, error: null };
        return submission.result;
    };

    if (submission.uncertain) {
        try {
            const { data, error } = await supabase.from('image_reports').select('*')
                .eq('id', submission.id).eq('user_id', userId).maybeSingle();
            if (error) throw error;
            if (data) return finish(data);
        } catch {
            return { data: null, error: submissionError('STATUS_UNKNOWN', 'We could not confirm whether your report was saved. Retry this draft when connected; do not create a new report.') };
        }
    }

    if (signal?.aborted) return { data: null, error: submissionError('CANCELLED', 'Submission cancelled before saving.') };
    onPhase?.('validating');
    const limit = await checkUserRateLimit(userId);
    if (!limit.allowed || limit.indeterminate) {
        return { data: null, error: submissionError('RATE_LIMIT', limit.indeterminate
            ? 'Could not verify recent activity. Please check your connection and try again.'
            : 'Hourly report limit reached. Please try again in ' + limit.remainingMinutes + ' minute(s).') };
    }
    const duplicate = await checkPlateDuplicate(report.vehicle_number);
    if (duplicate.indeterminate) {
        return { data: null, error: submissionError('DUPLICATE_CHECK', 'Could not verify this plate. Please check your connection and try again.') };
    }
    if (signal?.aborted) return { data: null, error: submissionError('CANCELLED', 'Submission cancelled before saving.') };
    // A confirmed possible duplicate retains the established officer-review flow.
    if (!submission.uploaded) {
        submission.fingerprint = fingerprint;
        const retry = Boolean(submission.uploadStarted);
        submission.uploadStarted = true;
        onPhase?.('uploading');
        const upload = await uploadReportMedia(userId, media.uri, validation.mimeType, {
            objectId: submission.id, retry, fileSize: media.fileSize,
        });
        if (upload.error) return upload;
        submission.uploaded = upload.data;
    }
    if (signal?.aborted) {
        // Installed storage-js cannot interrupt its upload request. Wait for its
        // acknowledgement, then remove only this confirmed, uncommitted object.
        // Never remove an uncertain draft: a prior insert might already own it.
        if (!submission.uncertain && submission.uploaded) {
            const cleanup = await removeReportMedia(submission.uploaded.storagePath);
            if (!cleanup.error) { submission.uploaded = null; submission.uploadStarted = false; submission.fingerprint = null; }
        }
        return { data: null, error: submissionError('CANCELLED', 'Submission cancelled before saving.') };
    }
    onPhase?.('saving');
    const payload = {
        ...report, id: submission.id, user_id: userId,
        image_url: submission.uploaded.publicUrl,
        image_storage_path: submission.uploaded.storagePath,
        vehicle_number: typeof report.vehicle_number === 'string' ? report.vehicle_number.replace(/\s+/g, '').toUpperCase() || null : null,
        possible_duplicate: duplicate.isDuplicate,
        duplicate_report_id: duplicate.existingReportId,
        status: 'pending', reward_amount: 0, reviewed_at: null,
    };
    delete payload.submitted_at;
    delete payload.created_at;
    delete payload.updated_at;
    let response;
    submission.uncertain = true;
    try {
        response = await submitImageReport(payload);
    } catch {
        safeDiagnostic('REPORT_INSERT_OUTCOME_UNKNOWN');
    }
    if (response?.data && !response.error) {
        submission.uncertain = false;
        return finish(response.data);
    }
    const code = response?.error?.code;
    // Only definite PostgreSQL validation/permission rejections prove no commit.
    // Network, missing response, and PK conflicts must be reconciled on retry.
    if (typeof code === 'string' && /^(22|23|42)/.test(code) && code !== '23505') {
        submission.uncertain = false;
        const cleanup = await removeReportMedia(submission.uploaded.storagePath);
        if (!cleanup.error) {
            submission.uploaded = null;
            submission.uploadStarted = false;
            submission.fingerprint = null;
        }
    }
    safeDiagnostic('REPORT_SAVE_FAILED');
    return { data: null, error: submissionError('SUBMISSION_FAILED', submission.uncertain
        ? 'Your report may have been saved. Retry this draft to confirm its status.'
        : 'Could not save the report. Please check the details and try again.') };
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
        const filters = officerJurisdictionFilters(officerProfile);
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
    const reviewedFilters = officerJurisdictionFilters(officerProfile);
    if (reviewedFilters.length > 0) {
        query = query.or(reviewedFilters.join(','));
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
export function subscribeToOfficerQueue(onInsert, onUpdate, onStatus, channelKey = 'queue') {
    return supabase
        .channel(`image_reports_officer_${channelKey}`)
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
        .subscribe(onStatus);
}

/**
 * Subscribe to notifications for a user.
 */
export function subscribeToNotifications(userId, onInsert, onUpdate = () => {}) {
    return supabase
        .channel(`notifications_${userId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
        }, onInsert)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, onUpdate)
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
        // Graceful fallback: direct query when RPC is unavailable
        if (__DEV__) console.warn('[Heatmap] RPC unavailable; using the bounded direct-query fallback.');
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('image_reports')
            .select(`
                id,
                latitude,
                longitude,
                location_address,
                violation_type,
                severity,
                reviewed_at,
                submitted_at,
                image_url,
                officer_reviews (
                    officer:profiles ( full_name, badge_id, jurisdiction )
                )
            `)
            .eq('status', 'approved')
            .order('reviewed_at', { ascending: false })
            .limit(500);
        if (fallbackError) {
            if (__DEV__) console.warn('[Heatmap] Direct-query fallback unavailable.');
            return { data: [], error: fallbackError };
        }
        // Normalize to match RPC shape
        const normalized = (fallbackData || []).map(r => ({
            ...r,
            weight: (() => {
                const s = (r.severity || 'low').toLowerCase();
                return s === 'critical' ? 4 : s === 'high' ? 3 : s === 'medium' ? 2 : 1;
            })(),
            officer_name: r.officer_reviews?.[0]?.officer?.full_name ?? null,
            officer_badge: r.officer_reviews?.[0]?.officer?.badge_id ?? null,
            officer_jurisdiction: r.officer_reviews?.[0]?.officer?.jurisdiction ?? null,
        }));
        return { data: normalized, error: null };
    }
    return { data, error: null };
}


/**
 * Fetch reports within a specific date range for officer export.
 *
 * @param {Date} fromDate
 * @param {Date} toDate
 * @param {string} status - 'all' | 'approved' | 'pending' | 'rejected'
 * @param {object|null} officerProfile
 * @returns {Promise<{ data: Array|null, error: any }>}
 */
export async function fetchReportsByDateRange(fromDate, toDate, status = 'all', officerProfile = null) {
    try {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        let query = supabase
            .from('image_reports')
            .select(`
                id,
                submitted_at,
                violation_type,
                vehicle_number,
                location_address,
                severity,
                status,
                ai_raw_result
            `)
            .gte('submitted_at', start.toISOString())
            .lte('submitted_at', end.toISOString())
            .order('submitted_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        // Location jurisdiction filter if officer
        const filters = officerJurisdictionFilters(officerProfile);
        if (filters.length > 0) {
            query = query.or(filters.join(','));
        }

        const { data, error } = await query;
        return { data, error };
    } catch (error) {
        if (__DEV__) console.warn('[ExportService] Date-range fetch unavailable.');
        return { data: null, error };
    }
}

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

