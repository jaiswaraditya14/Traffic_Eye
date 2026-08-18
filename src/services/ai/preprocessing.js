/**
 * preprocessing.js — Local Image Preprocessing & Integrity Inspector
 *
 * Performs ALL checks locally with zero API calls and zero network cost.
 *
 * Responsibilities:
 *   1. Validate image can be decoded (file integrity).
 *   2. Check minimum dimensions (must be >= 320px on smallest side).
 *   3. Check file size is within acceptable range.
 *   4. Normalize to standard resolution for vision analysis.
 *   5. Return local integrity status — NEVER claims IMAGE_AUTHENTIC.
 *
 * Integrity status values:
 *   SUFFICIENT              — No integrity concerns found.
 *   POSSIBLE_INTEGRITY_ISSUE — Suspicious filename, metadata mismatch, or
 *                              known editing-software signatures.
 *   INSUFFICIENT_EVIDENCE   — File could not be decoded or is too small/corrupt.
 *
 * This module intentionally does NOT:
 *   - Make any network requests.
 *   - Claim a photo is authentic.
 *   - Block vision analysis based solely on integrity checks.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_DIMENSION_PX = 320;        // Absolute minimum meaningful image
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;  // 30MB hard cap
const MIN_FILE_SIZE_BYTES = 1024;    // 1KB — anything smaller is almost certainly corrupt

// Vision analysis resolution: 1280px wide preserves:
//   - Number plate detail for OCR
//   - Helmet visibility on riders
//   - Seat belt status
//   - Traffic signal state
//   - Road markings and direction cues
const VISION_TARGET_WIDTH = 1280;
const VISION_COMPRESS     = 0.85;   // JPEG quality — high enough for fine evidence detail

// OCR pass: higher resolution for plate character accuracy
const OCR_TARGET_WIDTH    = 1280;
const OCR_COMPRESS        = 0.90;

// ─── AI software signatures (same set as localAuthenticity for consistency) ──
const SUSPICIOUS_FILENAME_PATTERNS = [
    'screenshot', 'screen_shot', 'screen-shot', 'screencap', 'screen_record',
    'capture_20',  // common Android screen-capture prefix
];
const AI_SOFTWARE_MARKERS = [
    'midjourney', 'stable diffusion', 'dall-e', 'photoshop', 'gimp', 'canva',
];
const CAMERA_EXIF_BRANDS = [
    'apple', 'iphone', 'samsung', 'galaxy', 'xiaomi', 'redmi', 'realme',
    'oneplus', 'google', 'pixel', 'vivo', 'oppo', 'motorola', 'huawei',
    'sony', 'canon', 'nikon', 'exif', 'camera',
];

// ─── Helper: fast base64 → ASCII for EXIF header inspection ──────────────────
const b64ToAsciiHeader = (b64) => {
    try {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        const clean = (b64 || '').replace(/[^A-Za-z0-9+/=]/g, '');
        let str = '';
        for (let i = 0; i < Math.min(clean.length, 16384); i += 4) {
            const b1 = chars.indexOf(clean[i]);
            const b2 = chars.indexOf(clean[i + 1]);
            const b3 = chars.indexOf(clean[i + 2]);
            const b4 = chars.indexOf(clean[i + 3]);
            const c1 = (b1 << 2) | (b2 >> 4);
            const c2 = ((b2 & 15) << 4) | (b3 >> 2);
            const c3 = ((b3 & 3) << 6) | b4;
            if (c1 > 0) str += String.fromCharCode(c1);
            if (b3 !== 64 && b3 !== -1 && c2 > 0) str += String.fromCharCode(c2);
            if (b4 !== 64 && b4 !== -1 && c3 > 0) str += String.fromCharCode(c3);
        }
        return str.toLowerCase();
    } catch {
        return '';
    }
};

// ─── Local Integrity Check ────────────────────────────────────────────────────
/**
 * Inspect image file locally.
 *
 * @param {string} imageUri - local file URI
 * @returns {{ status: string, integrityDetails: string[], width?: number, height?: number, sizeBytes?: number }}
 */
export async function checkLocalIntegrity(imageUri) {
    if (!imageUri) {
        return {
            status: 'INSUFFICIENT_EVIDENCE',
            integrityDetails: ['No image URI provided.'],
        };
    }

    const cleanUri = imageUri.split('?')[0];
    const lowerUri = cleanUri.toLowerCase();
    const details  = [];
    let suspiciousScore = 0;

    try {
        // ── 1. File size check ─────────────────────────────────────────────────
        let sizeBytes = null;
        try {
            const info = await FileSystem.getInfoAsync(cleanUri, { size: true });
            sizeBytes = info.size || null;
            if (sizeBytes !== null) {
                if (sizeBytes < MIN_FILE_SIZE_BYTES) {
                    return {
                        status: 'INSUFFICIENT_EVIDENCE',
                        integrityDetails: [`File too small (${sizeBytes} bytes) — likely corrupt or empty.`],
                        sizeBytes,
                    };
                }
                if (sizeBytes > MAX_FILE_SIZE_BYTES) {
                    details.push(`File size (${Math.round(sizeBytes / 1048576)}MB) exceeds 30MB limit.`);
                    suspiciousScore += 10;
                }
            }
        } catch {
            // Non-fatal — proceed without size info
        }

        // ── 2. Filename / path inspection ─────────────────────────────────────
        for (const kw of SUSPICIOUS_FILENAME_PATTERNS) {
            if (lowerUri.includes(kw)) {
                details.push(`Filename matches screenshot pattern: "${kw}".`);
                suspiciousScore += 50;
                break;
            }
        }

        // ── 3. JPEG header / EXIF inspection (first 16KB) ────────────────────
        let headerAscii = '';
        try {
            const b64Header = await FileSystem.readAsStringAsync(cleanUri, {
                encoding: FileSystem.EncodingType?.Base64 || 'base64',
                position: 0,
                length:   16384,
            });
            headerAscii = b64ToAsciiHeader(b64Header);
        } catch {
            // Can't read header — not fatal, just reduces confidence
            details.push('Image header could not be read — integrity check limited.');
        }

        if (headerAscii) {
            // A. AI/editing software metadata markers
            for (const marker of AI_SOFTWARE_MARKERS) {
                if (headerAscii.includes(marker)) {
                    details.push(`Editing/AI software marker found in metadata: "${marker}".`);
                    suspiciousScore += marker.includes('dall') || marker.includes('midjourney') || marker.includes('diffusion')
                        ? 90 : 60;
                }
            }

            // B. Camera EXIF (absence is a mild concern, not definitive)
            const hasCameraExif = CAMERA_EXIF_BRANDS.some(b => headerAscii.includes(b));
            if (!hasCameraExif && headerAscii.length > 500) {
                details.push('No camera hardware EXIF detected — may be a web download or AI image.');
                suspiciousScore += 15;
            }
        }

        // ── 4. Dimension check via ImageManipulator (decode validation) ───────
        let width  = null;
        let height = null;
        try {
            // manipulateAsync with empty actions validates decode and returns dimensions
            const img = await ImageManipulator.manipulateAsync(cleanUri, [], {
                format: ImageManipulator.SaveFormat.JPEG,
            });
            width  = img.width;
            height = img.height;
            // Immediately discard the output — we only needed dimensions
            if (img.uri && img.uri !== cleanUri) {
                FileSystem.deleteAsync(img.uri, { idempotent: true }).catch(() => {});
            }

            const minDim = Math.min(width, height);
            if (minDim < MIN_DIMENSION_PX) {
                return {
                    status: 'INSUFFICIENT_EVIDENCE',
                    integrityDetails: [`Image too small (${width}×${height}px) — minimum ${MIN_DIMENSION_PX}px required.`],
                    width, height, sizeBytes,
                };
            }
        } catch (decodeErr) {
            return {
                status: 'INSUFFICIENT_EVIDENCE',
                integrityDetails: ['Image could not be decoded — file may be corrupt or in an unsupported format.'],
                sizeBytes,
            };
        }

        // ── 5. Final status decision ───────────────────────────────────────────
        // Note: we never say "AUTHENTIC". We only say whether integrity evidence
        // is sufficient for evidence submission.
        const status = suspiciousScore >= 60
            ? 'POSSIBLE_INTEGRITY_ISSUE'
            : 'SUFFICIENT';

        console.log(`[Preprocessing] Integrity: ${status} (score=${suspiciousScore}) ${width}×${height}px ${sizeBytes ? Math.round(sizeBytes/1024)+'KB' : ''}`);

        return { status, integrityDetails: details, width, height, sizeBytes };

    } catch (err) {
        console.warn('[Preprocessing] Integrity check error:', err.message);
        return {
            status: 'POSSIBLE_INTEGRITY_ISSUE',
            integrityDetails: ['Local integrity check encountered an unexpected error.'],
        };
    }
}

// ─── Image normalisation for vision analysis ──────────────────────────────────
/**
 * Resize and compress image for primary vision analysis.
 * Target: 1280px wide, JPEG quality 0.85.
 * Deletes temporary file on completion.
 *
 * @param {string} imageUri
 * @returns {Promise<string>} base64-encoded JPEG (no data: prefix)
 */
export async function prepareVisionImage(imageUri) {
    const cleanUri = imageUri.split('?')[0];
    let tempUri = null;
    try {
        const img = await ImageManipulator.manipulateAsync(
            cleanUri,
            [{ resize: { width: VISION_TARGET_WIDTH } }],
            { compress: VISION_COMPRESS, format: ImageManipulator.SaveFormat.JPEG }
        );
        tempUri = img.uri;
        return await FileSystem.readAsStringAsync(tempUri, { encoding: 'base64' });
    } finally {
        if (tempUri) FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
    }
}

/**
 * Resize and compress image for plate OCR.
 * Target: 1280px wide, JPEG quality 0.90 (higher than vision for character precision).
 * Deletes temporary file on completion.
 *
 * @param {string} imageUri
 * @returns {Promise<string>} base64-encoded JPEG (no data: prefix)
 */
export async function prepareOcrImage(imageUri) {
    const cleanUri = imageUri.split('?')[0];
    let tempUri = null;
    try {
        const img = await ImageManipulator.manipulateAsync(
            cleanUri,
            [{ resize: { width: OCR_TARGET_WIDTH } }],
            { compress: OCR_COMPRESS, format: ImageManipulator.SaveFormat.JPEG }
        );
        tempUri = img.uri;
        return await FileSystem.readAsStringAsync(tempUri, { encoding: 'base64' });
    } finally {
        if (tempUri) FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
    }
}
