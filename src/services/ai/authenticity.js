/**
 * authenticity.js — Local Image Integrity Wrapper
 *
 * ARCHITECTURE CHANGE (v2):
 *   The mandatory AI-vision authenticity network call has been removed.
 *   Remote AI authenticity analysis was adding 4-6 seconds to every report
 *   and did not meet the evidence-integrity bar required for production use
 *   (a vision model's "authentic" verdict does not constitute legal proof).
 *
 * This module now wraps checkLocalIntegrity from preprocessing.js and provides
 * a compatible export surface so existing callers continue to work.
 *
 * Status vocabulary (never says "IMAGE_AUTHENTIC"):
 *   SUFFICIENT              — No integrity concerns from local inspection.
 *   POSSIBLE_INTEGRITY_ISSUE — Suspicious filename, AI metadata, or editing tools detected.
 *   INSUFFICIENT_EVIDENCE   — File too small, corrupt, or undecodable.
 *
 * The checkImageAuthenticity function is preserved for backwards-compatibility
 * but now returns instantly (0 API calls) using local file inspection only.
 *
 * @module authenticity
 */

import { checkLocalIntegrity } from './preprocessing';

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Inspect image integrity using only local, on-device checks.
 * Zero API calls. Zero network cost.
 *
 * Returns a result shape compatible with the previous async AI check so
 * callers do not need to be updated.
 *
 * @param {string} _base64Image - UNUSED (kept for API compatibility)
 * @param {string} [imageUri]   - Local file URI for inspection
 * @returns {Promise<{
 *   authentic:        boolean,
 *   confidence:       number,
 *   reason:           string,
 *   flags:            string[],
 *   status:           string,
 *   integrityStatus:  string,
 *   isLocalCheck:     true,
 * }>}
 */
export async function checkImageAuthenticity(_base64Image, imageUri = null) {
    if (!imageUri) {
        return {
            authentic:       true,
            confidence:      0,
            reason:          'No URI provided — integrity check skipped.',
            flags:           [],
            status:          'SUFFICIENT',
            integrityStatus: 'SUFFICIENT',
            isLocalCheck:    true,
        };
    }

    const result = await checkLocalIntegrity(imageUri);

    // Map integrity status to backwards-compatible authentic/confidence shape
    const authentic  = result.status === 'SUFFICIENT';
    const confidence = result.status === 'SUFFICIENT'     ? 80 :
                       result.status === 'INSUFFICIENT_EVIDENCE' ? 0  : 40;

    const reason = result.integrityDetails?.length
        ? result.integrityDetails.join(' ')
        : (authentic ? 'Local file integrity checks passed.' : 'Local integrity concern detected.');

    return {
        authentic,
        confidence,
        reason,
        flags:           result.status === 'POSSIBLE_INTEGRITY_ISSUE' ? ['local_integrity_concern'] : [],
        status:          result.status,
        integrityStatus: result.status,
        width:           result.width,
        height:          result.height,
        sizeBytes:       result.sizeBytes,
        isLocalCheck:    true,
    };
}

// Keep parseAuthenticityResult as a stub in case it is imported elsewhere
export const parseAuthenticityResult = (raw) => {
    throw new Error('parseAuthenticityResult: remote AI authenticity calls are disabled. Use checkLocalIntegrity instead.');
};
