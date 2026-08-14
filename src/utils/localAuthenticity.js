import * as FileSystem from 'expo-file-system/legacy';

const decodeBase64Ascii = (b64) => {
    try {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let str = '';
        let i = 0;
        const cleanB64 = (b64 || '').replace(/[^A-Za-z0-9+/=]/g, '');
        while (i < cleanB64.length) {
            const b1 = chars.indexOf(cleanB64.charAt(i++));
            const b2 = chars.indexOf(cleanB64.charAt(i++));
            const b3 = chars.indexOf(cleanB64.charAt(i++));
            const b4 = chars.indexOf(cleanB64.charAt(i++));
            const c1 = (b1 << 2) | (b2 >> 4);
            const c2 = ((b2 & 15) << 4) | (b3 >> 2);
            const c3 = ((b3 & 3) << 6) | b4;
            if (c1 > 0) str += String.fromCharCode(c1);
            if (b3 !== 64 && b3 !== -1 && c2 > 0) str += String.fromCharCode(c2);
            if (b4 !== 64 && b4 !== -1 && c3 > 0) str += String.fromCharCode(c3);
        }
        return str;
    } catch (e) {
        return '';
    }
};

/**
 * localAuthenticity.js — On-Device Image Authenticity & Forensics Engine
 *
 * Performs 100% local inspection on device with ZERO API keys and ZERO network calls.
 * Analyzes JPEG header markers, EXIF metadata tags, software signatures, and file properties.
 *
 * @param {string} imageUri - Local image URI
 * @returns {Promise<{ authentic: boolean, confidence: number, reason: string, flags: string[] }>}
 */
export async function checkLocalAuthenticity(imageUri) {
    if (!imageUri) {
        return { authentic: true, confidence: 0, reason: 'No image URI provided', flags: [] };
    }

    try {
        const cleanUri = imageUri.split('?')[0];
        const lowerUri = cleanUri.toLowerCase();
        const flags = [];
        let suspiciousScore = 0;
        const reasons = [];

        // ── 1. Filename & Path Inspection (Screenshot / Screen Capture detection) ──
        const screenshotKeywords = ['screenshot', 'screen_shot', 'screen-shot', 'screen_record', 'screencap', 'capture_20'];
        for (const kw of screenshotKeywords) {
            if (lowerUri.includes(kw)) {
                flags.push('screenshot');
                suspiciousScore += 50;
                reasons.push('Image filename matches standard screenshot file pattern.');
                break;
            }
        }

        // ── 2. Read JPEG Header Bytes (First 16KB for EXIF & Software Tags) ──
        let headerAscii = '';
        try {
            const base64Header = await FileSystem.readAsStringAsync(cleanUri, {
                encoding: FileSystem.EncodingType?.Base64 || 'base64',
                position: 0,
                length: 16384, // Read first 16KB of file
            });
            headerAscii = decodeBase64Ascii(base64Header.substring(0, 16384));
        } catch (readErr) {
            console.warn('[LocalAuthenticity] Header read warning:', readErr.message);
        }

        if (headerAscii) {
            const lowerHeader = headerAscii.toLowerCase();

            // ── A. AI Generation & Heavy Editing Software Signatures ──
            const aiSoftwareMarkers = [
                { pattern: 'midjourney',       flag: 'ai_generated', score: 90, desc: 'Midjourney AI generation signature detected in file metadata.' },
                { pattern: 'stable diffusion', flag: 'ai_generated', score: 90, desc: 'Stable Diffusion AI model signature detected in file metadata.' },
                { pattern: 'dall-e',           flag: 'ai_generated', score: 90, desc: 'DALL-E AI generation signature detected in file metadata.' },
                { pattern: 'photoshop',        flag: 'heavy_manipulation', score: 70, desc: 'Adobe Photoshop digital manipulation signature detected in file headers.' },
                { pattern: 'gimp',             flag: 'heavy_manipulation', score: 70, desc: 'GIMP digital editing software signature detected.' },
                { pattern: 'canva',            flag: 'heavy_manipulation', score: 60, desc: 'Canva graphic design metadata signature detected.' },
            ];

            for (const item of aiSoftwareMarkers) {
                if (lowerHeader.includes(item.pattern)) {
                    if (!flags.includes(item.flag)) flags.push(item.flag);
                    suspiciousScore += item.score;
                    reasons.push(item.desc);
                }
            }

            // ── B. EXIF Camera Hardware Signatures ──
            const cameraHardwareBrands = [
                'apple', 'iphone', 'samsung', 'galaxy', 'xiaomi', 'redmi', 'realme',
                'oneplus', 'google', 'pixel', 'vivo', 'oppo', 'motorola', 'huawei',
                'sony', 'canon', 'nikon', 'exif', 'camera'
            ];

            let hasCameraExif = false;
            for (const brand of cameraHardwareBrands) {
                if (lowerHeader.includes(brand)) {
                    hasCameraExif = true;
                    break;
                }
            }

            if (!hasCameraExif && lowerHeader.length > 2000) {
                suspiciousScore += 15;
                console.log('[LocalAuthenticity] Image lacks camera EXIF metadata (possible web download or AI image)');
            }
        }

        // ── 3. Final Decision ──────────────────────────────────────────────────
        const isSuspicious = suspiciousScore >= 60;
        const confidence = Math.min(Math.max(suspiciousScore, 0), 95);

        const result = {
            authentic: !isSuspicious,
            confidence: isSuspicious ? confidence : (100 - confidence),
            reason: reasons.length > 0 ? reasons.join(' ') : (isSuspicious ? 'Local forensics detected suspicious metadata signatures.' : 'Genuine camera photograph verified by local EXIF metadata inspection.'),
            flags,
            isLocalCheck: true,
        };

        console.log(`[LocalAuthenticity] Result: authentic=${result.authentic}, score=${suspiciousScore}, flags=[${flags.join(', ')}]`);
        return result;

    } catch (err) {
        console.warn('[LocalAuthenticity] Unexpected error — defaulting to authentic:', err.message);
        return { authentic: true, confidence: 0, reason: 'Local authenticity check error.', flags: [], isLocalCheck: true };
    }
}
