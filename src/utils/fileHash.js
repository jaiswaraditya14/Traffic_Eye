/**
 * fileHash.js — On-Device SHA-256 File Integrity Hashing
 *
 * Computes SHA-256 of the ACTUAL image file bytes — not the URI string,
 * not the EXIF JSON, not a re-encoded copy.
 *
 * Pipeline:
 *   1. Read full file from URI as base64 (expo-file-system)
 *   2. Decode base64 → ArrayBuffer (base64-arraybuffer)
 *   3. Digest ArrayBuffer with SHA-256 (expo-crypto)
 *   4. Return 64-character lowercase hexadecimal string
 *
 * Falls back to hashing the base64 string directly if Crypto.digest
 * (binary ArrayBuffer API) is unavailable in the current runtime.
 *
 * The file is NEVER resized, compressed, re-encoded, or modified before hashing.
 */

import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as decodeBase64 } from 'base64-arraybuffer';

/**
 * Converts an ArrayBuffer to a 64-character lowercase hexadecimal string.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function arrayBufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Computes SHA-256 of the actual file bytes at the given URI.
 *
 * The hash is computed over raw file bytes (not the URI string, not metadata).
 * The result is a 64-character lowercase hexadecimal string identical to
 * what `sha256sum` or `openssl dgst -sha256` would produce on the same file.
 *
 * @param {string} uri - Local file URI (file:// or content://)
 * @returns {Promise<{ sha256: string, fileSize: number, sourceUri: string } | null>}
 *   Returns null if the file cannot be read or hashed.
 */
export async function computeFileSha256(uri) {
    if (!uri) return null;
    const cleanUri = uri.split('?')[0];

    try {
        // Step 1: Read entire file as base64
        let base64;
        try {
            base64 = await FileSystem.readAsStringAsync(cleanUri, {
                encoding: FileSystem.EncodingType.Base64,
            });
        } catch (readErr) {
            console.warn('[SHA256] File read failed:', readErr.message, 'URI:', cleanUri);
            return null;
        }

        if (!base64) {
            console.warn('[SHA256] File read returned empty content for URI:', cleanUri);
            return null;
        }

        // Step 2: Decode base64 → ArrayBuffer (actual raw file bytes)
        const arrayBuffer = decodeBase64(base64);
        const fileSize = arrayBuffer.byteLength;

        let sha256 = null;

        // Step 3a: Primary — Crypto.digest with ArrayBuffer (hashes actual raw bytes)
        // expo-crypto ~15.x supports this API on both Android and iOS
        try {
            const hashBuffer = await Crypto.digest(
                Crypto.CryptoDigestAlgorithm.SHA256,
                arrayBuffer
            );
            sha256 = arrayBufferToHex(hashBuffer);
        } catch (digestBinaryErr) {
            // Step 3b: Fallback — digestStringAsync with base64 content
            // NOTE: This hashes the base64-encoded representation, not raw bytes.
            // The hash differs from sha256sum output but remains consistent
            // for the same file and is still tamper-evident for this app.
            try {
                sha256 = await Crypto.digestStringAsync(
                    Crypto.CryptoDigestAlgorithm.SHA256,
                    base64,
                    { encoding: Crypto.CryptoEncoding.HEX }
                );
                console.warn('[SHA256] Using base64-string fallback (Crypto.digest unavailable). Hash is NOT equivalent to sha256sum.');
            } catch (digestStrErr) {
                console.warn('[SHA256] Both digest methods failed:', digestStrErr.message);
                return null;
            }
        }

        if (__DEV__) {
            console.log('[SHA256]');
            console.log(`  sourceUri: ${cleanUri}`);
            console.log(`  fileSize:  ${fileSize} bytes`);
            console.log(`  sha256:    ${sha256}`);
        }

        return { sha256, fileSize, sourceUri: cleanUri };
    } catch (err) {
        console.warn('[SHA256] Unexpected hash computation error:', err.message);
        return null;
    }
}
