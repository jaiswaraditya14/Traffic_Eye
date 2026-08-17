/**
 * exifParser.js — Robust EXIF GPS Parser & Evidence Geolocation Engine
 *
 * Supports:
 *   - Flat Android EXIF keys (GPSLatitude, GPSLatitudeRef, etc.)
 *   - Nested iOS / standard blocks ({GPS}, GPS, gps, GPSInfo)
 *   - 6-element flat rational arrays [degNum, degDen, minNum, minDen, secNum, secDen]
 *   - 3-element rational arrays ["19/1", "4/1", "3210/100"], [19, 4, 32.1], [{num, den}, ...]
 *   - Comma / space delimited rational strings ("19/1,4/1,3210/100", "19, 4, 32.1")
 *   - Formatted DMS strings (19° 04' 32.10" N, 19 deg 4' 32.1" N, 19:04:32.10)
 *   - Direct binary JPEG APP1 segment parsing via FileSystem (works on content:// and file://)
 *   - MediaLibrary.getAssetInfoAsync fallback for Android MediaStore
 *   - Direction references (N/S/E/W, NORTH/SOUTH/EAST/WEST, 1/-1)
 *   - Strict coordinate validation (-90..90, -180..180, rejects 0,0 Null Island)
 *   - Standardized location source tagging (IMAGE_EXIF, LIVE_LOCATION, NOT_FOUND)
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Crypto from 'expo-crypto';
import { NativeModules, Platform } from 'react-native';
import { decode as decodeBase64 } from 'base64-arraybuffer';

const { MediaStoreResolver } = NativeModules;

// ─── Single Value / Rational Parser ──────────────────────────────────────────
/**
 * Parses a single numeric or rational representation (e.g., 19, "19/1", { numerator: 19, denominator: 1 })
 *
 * @param {number|string|object} item
 * @returns {number|null}
 */
export function parseSingleValue(item) {
    if (item === null || item === undefined) return null;
    if (typeof item === 'number') return isFinite(item) ? item : null;

    if (typeof item === 'object') {
        const num = item.numerator ?? item.num ?? item.n;
        const den = item.denominator ?? item.den ?? item.d;
        if (typeof num === 'number' && typeof den === 'number' && den !== 0) {
            return num / den;
        }
        if (typeof num === 'string' || typeof den === 'string') {
            const parsedNum = parseFloat(num);
            const parsedDen = parseFloat(den);
            if (isFinite(parsedNum) && isFinite(parsedDen) && parsedDen !== 0) {
                return parsedNum / parsedDen;
            }
        }
    }

    if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed.includes('/')) {
            const parts = trimmed.split('/');
            if (parts.length === 2) {
                const n = parseFloat(parts[0]);
                const d = parseFloat(parts[1]);
                if (isFinite(n) && isFinite(d) && d !== 0) {
                    return n / d;
                }
            }
        }
        const val = parseFloat(trimmed);
        return isFinite(val) ? val : null;
    }

    return null;
}

// ─── Coordinate Component Parser (DMS / Rational / Number -> Decimal) ─────────
/**
 * Parses any coordinate representation into decimal degrees:
 * - Direct number (19.075583)
 * - Array of 3 elements: [19, 4, 32.1] or ["19/1", "4/1", "3210/100"]
 * - Array of 6 elements: [19, 1, 4, 1, 3210, 100] (flat TIFF rational pairs: dNum, dDen, mNum, mDen, sNum, sDen)
 * - Comma/space separated strings: "19/1,4/1,3210/100" or "19, 4, 32.1"
 * - Formatted DMS strings: "19° 04' 32.10\" N", "19 deg 4 min 32.1 sec", "19:04:32.1"
 *
 * @param {number|string|array|object} val
 * @returns {number|null} Decimal degrees
 */
export function parseCoordinateComponent(val) {
    if (val === null || val === undefined) return null;

    // Direct numeric value
    if (typeof val === 'number') {
        return isFinite(val) ? val : null;
    }

    // Array representations
    if (Array.isArray(val)) {
        if (val.length === 0) return null;
        if (val.length === 1) return parseSingleValue(val[0]);

        // 6-element flat rational array: [degNum, degDen, minNum, minDen, secNum, secDen]
        if (val.length === 6) {
            const dNum = parseSingleValue(val[0]);
            const dDen = parseSingleValue(val[1]);
            const mNum = parseSingleValue(val[2]);
            const mDen = parseSingleValue(val[3]);
            const sNum = parseSingleValue(val[4]);
            const sDen = parseSingleValue(val[5]);
            if (dNum !== null && dDen !== null && dDen !== 0 &&
                mNum !== null && mDen !== null && mDen !== 0 &&
                sNum !== null && sDen !== null && sDen !== 0) {
                const d = dNum / dDen;
                const m = mNum / mDen;
                const s = sNum / sDen;
                const sign = d < 0 ? -1 : 1;
                const absD = Math.abs(d);
                return sign * (absD + m / 60 + s / 3600);
            }
        }

        // 3-element array: [d, m, s]
        if (val.length >= 3) {
            const d = parseSingleValue(val[0]);
            const m = parseSingleValue(val[1]);
            const s = parseSingleValue(val[2]);
            if (d !== null && m !== null && s !== null) {
                const sign = d < 0 ? -1 : 1;
                const absD = Math.abs(d);
                return sign * (absD + m / 60 + s / 3600);
            }
        }

        // 2-element array: [d, m]
        if (val.length === 2) {
            const d = parseSingleValue(val[0]);
            const m = parseSingleValue(val[1]);
            if (d !== null && m !== null) {
                const sign = d < 0 ? -1 : 1;
                const absD = Math.abs(d);
                return sign * (absD + m / 60);
            }
        }
    }

    // String formats
    if (typeof val === 'string') {
        const str = val.trim();
        if (!str) return null;

        // Comma-separated or space-separated Android EXIF string (e.g. "19/1,4/1,3210/100" or "19, 4, 32.1")
        if (str.includes(',') || (str.includes('/') && str.includes(' '))) {
            const parts = str.split(/[\s,]+/).filter(Boolean);
            if (parts.length === 6) {
                const dNum = parseSingleValue(parts[0]);
                const dDen = parseSingleValue(parts[1]);
                const mNum = parseSingleValue(parts[2]);
                const mDen = parseSingleValue(parts[3]);
                const sNum = parseSingleValue(parts[4]);
                const sDen = parseSingleValue(parts[5]);
                if (dNum !== null && dDen !== null && dDen !== 0 &&
                    mNum !== null && mDen !== null && mDen !== 0 &&
                    sNum !== null && sDen !== null && sDen !== 0) {
                    const d = dNum / dDen;
                    const m = mNum / mDen;
                    const s = sNum / sDen;
                    const sign = d < 0 ? -1 : 1;
                    const absD = Math.abs(d);
                    return sign * (absD + m / 60 + s / 3600);
                }
            }
            if (parts.length >= 3) {
                const d = parseSingleValue(parts[0]);
                const m = parseSingleValue(parts[1]);
                const s = parseSingleValue(parts[2]);
                if (d !== null && m !== null && s !== null) {
                    const sign = d < 0 ? -1 : 1;
                    const absD = Math.abs(d);
                    return sign * (absD + m / 60 + s / 3600);
                }
            }
            if (parts.length === 2) {
                const d = parseSingleValue(parts[0]);
                const m = parseSingleValue(parts[1]);
                if (d !== null && m !== null) {
                    const sign = d < 0 ? -1 : 1;
                    const absD = Math.abs(d);
                    return sign * (absD + m / 60);
                }
            }
        }

        // Formatted DMS strings with symbols (e.g., "19° 04' 32.10\" N", "19°4'32.1\"N", "19 deg 4' 33.59\"", "19:04:32.1")
        const dmsRegex = /^(-?[\d.]+)[°\sdeg:]+([\d.]+)?['\smin:]*([\d.]+)?["\ssec]*([NSEW])?$/i;
        const match = str.match(dmsRegex);
        if (match) {
            const d = parseFloat(match[1]);
            const m = match[2] ? parseFloat(match[2]) : 0;
            const s = match[3] ? parseFloat(match[3]) : 0;
            if (isFinite(d) && isFinite(m) && isFinite(s)) {
                const sign = d < 0 ? -1 : 1;
                const absD = Math.abs(d);
                let deg = sign * (absD + m / 60 + s / 3600);
                const ref = match[4]?.toUpperCase();
                if (ref === 'S' || ref === 'W') deg = -Math.abs(deg);
                if (ref === 'N' || ref === 'E') deg = Math.abs(deg);
                return deg;
            }
        }

        // Single string numeric or rational (e.g. "19.0760" or "19076/1000")
        return parseSingleValue(str);
    }

    // Object rational (e.g. { numerator: 19076, denominator: 1000 })
    if (typeof val === 'object') {
        return parseSingleValue(val);
    }

    return null;
}

// ─── Direction Reference Handler (N/S, E/W) ──────────────────────────────────
/**
 * Applies direction reference (N/S for Latitude, E/W for Longitude) to coordinate.
 *
 * @param {number} val
 * @param {string|number} ref
 * @returns {number|null}
 */
export function applyRef(val, ref) {
    if (val === null || val === undefined || !isFinite(val)) return null;
    let finalVal = val;
    if (ref !== undefined && ref !== null) {
        const refStr = String(ref).trim().toUpperCase();
        if (refStr === 'S' || refStr === 'SOUTH' || refStr === '-1') {
            finalVal = -Math.abs(finalVal);
        } else if (refStr === 'W' || refStr === 'WEST') {
            finalVal = -Math.abs(finalVal);
        } else if (refStr === 'N' || refStr === 'NORTH' || refStr === '1' || refStr === 'E' || refStr === 'EAST') {
            finalVal = Math.abs(finalVal);
        }
    }
    return finalVal;
}

// ─── Coordinate Bounds & Null Island Validator ───────────────────────────────
/**
 * Validates latitude (-90 to 90) and longitude (-180 to 180).
 * Rejects (0, 0) Null Island, NaN, Infinity, and out-of-bound values.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {{ latitude: number, longitude: number, lat: number, lng: number } | null}
 */
export function validateCoordinates(lat, lng) {
    if (
        lat === null || lng === null ||
        lat === undefined || lng === undefined ||
        !isFinite(lat) || !isFinite(lng) ||
        isNaN(lat) || isNaN(lng) ||
        (Number(lat) === 0 && Number(lng) === 0) ||
        Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180
    ) {
        return null;
    }
    const latitude = Number(lat);
    const longitude = Number(lng);
    return { latitude, longitude, lat: latitude, lng: longitude };
}

// ─── GPS Validity Gate ───────────────────────────────────────────────────────
/**
 * Validates raw GPS values extracted from an EXIF dictionary BEFORE parsing.
 *
 * Distinguishes:
 *   - GPS_FOUND: Genuine coordinates present
 *   - GPS_NOT_PRESENT: Keys missing from EXIF dict
 *   - GPS_UNAVAILABLE (reason: ANDROID_PHOTO_PICKER_REDACTION): Redacted 0,0 with empty refs
 *   - GPS_EXTRACTION_ERROR: Non-finite or invalid coordinate values
 *
 * @param {any} rawLat
 * @param {any} rawLng
 * @param {any} latRef
 * @param {any} lngRef
 * @returns {{ valid: boolean, state: string, reason: string, details: string }}
 */
export function hasValidGpsValues(rawLat, rawLng, latRef, lngRef) {
    if (rawLat === undefined || rawLat === null || rawLng === undefined || rawLng === null) {
        return {
            valid: false,
            state: 'GPS_NOT_PRESENT',
            reason: 'NO_GPS_TAGS',
            details: 'GPS latitude and longitude keys are missing from the EXIF dictionary',
        };
    }

    const latRefStr = String(latRef ?? '').trim().toUpperCase();
    const lngRefStr = String(lngRef ?? '').trim().toUpperCase();

    // Specific Android Photo Picker Redaction Signature:
    // When Android Photo Picker redacts GPS, it writes 0 for lat & lng and empty string "" for refs
    if (
        (rawLat === 0 && rawLng === 0 && (!latRef || latRefStr === '') && (!lngRef || lngRefStr === '')) ||
        (Number(rawLat) === 0 && Number(rawLng) === 0 && latRefStr === '' && lngRefStr === '')
    ) {
        return {
            valid: false,
            state: 'GPS_UNAVAILABLE',
            reason: 'ANDROID_PHOTO_PICKER_REDACTION',
            details: 'Android Photo Picker redacted GPS metadata in the cache copy (GPSLatitude=0, GPSLongitude=0, empty refs)',
        };
    }

    // For numeric values (direct Android flat EXIF), apply strict gate
    if (typeof rawLat === 'number' && typeof rawLng === 'number') {
        if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) {
            return {
                valid: false,
                state: 'GPS_EXTRACTION_ERROR',
                reason: 'NON_FINITE_COORDINATES',
                details: 'GPS latitude or longitude is NaN or Infinite',
            };
        }
        if (rawLat === 0 || rawLng === 0) {
            return {
                valid: false,
                state: 'GPS_UNAVAILABLE',
                reason: 'ANDROID_PHOTO_PICKER_REDACTION',
                details: 'GPS latitude or longitude is 0 — Android Photo Picker privacy redaction',
            };
        }
        if (latRefStr !== 'N' && latRefStr !== 'S') {
            return {
                valid: false,
                state: 'GPS_UNAVAILABLE',
                reason: 'INVALID_LATITUDE_REF',
                details: `latitudeRef "${latRef}" is not N or S`,
            };
        }
        if (lngRefStr !== 'E' && lngRefStr !== 'W') {
            return {
                valid: false,
                state: 'GPS_UNAVAILABLE',
                reason: 'INVALID_LONGITUDE_REF',
                details: `longitudeRef "${lngRef}" is not E or W`,
            };
        }
    }

    return {
        valid: true,
        state: 'GPS_FOUND',
        reason: 'VALID_GPS_TAGS',
        details: 'GPS values present and pass validity gate',
    };
}

// ─── EXIF GPS Parser ─────────────────────────────────────────────────────────
/**
 * Extracts, parses, normalizes, applies direction references, and validates EXIF GPS coordinates
 * from an EXIF dictionary object.
 *
 * @param {object} exif - Raw EXIF object from Expo ImagePicker, MediaLibrary, or react-native-exif
 * @returns {{ latitude: number, longitude: number, lat: number, lng: number } | null} Validated coordinates or null
 */
export function parseExifGPS(exif) {
    try {
        console.log('[RAW EXIF]', JSON.stringify(exif, null, 2));
    } catch {
        console.log('[RAW EXIF]', exif);
    }

    if (!exif || typeof exif !== 'object') {
        return null;
    }

    let rawLat, rawLng, latRef, lngRef;

    // 1. Android flat EXIF format (e.g. exif.GPSLatitude, exif.GPSLongitude)
    if (exif.GPSLatitude !== undefined || exif.GPSLongitude !== undefined) {
        rawLat = exif.GPSLatitude;
        rawLng = exif.GPSLongitude;
        latRef = exif.GPSLatitudeRef;
        lngRef = exif.GPSLongitudeRef;
    }

    // 2. iOS or standard nested {GPS} / GPS / gps / GPSInfo block format
    const gpsBlock = exif['{GPS}'] || exif['GPS'] || exif.gps || exif.Gps || exif.GPSInfo;
    if ((rawLat === undefined || rawLng === undefined) && gpsBlock && typeof gpsBlock === 'object') {
        rawLat = rawLat ?? gpsBlock.Latitude ?? gpsBlock.GPSLatitude;
        rawLng = rawLng ?? gpsBlock.Longitude ?? gpsBlock.GPSLongitude;
        latRef = latRef ?? gpsBlock.LatitudeRef ?? gpsBlock.GPSLatitudeRef;
        lngRef = lngRef ?? gpsBlock.LongitudeRef ?? gpsBlock.GPSLongitudeRef;
    }

    // 3. Lowercase & snake_case flat keys fallback
    if (rawLat === undefined || rawLng === undefined) {
        rawLat = rawLat ?? exif.latitude ?? exif.gpsLatitude ?? exif.gps_latitude ?? exif.lat;
        rawLng = rawLng ?? exif.longitude ?? exif.gpsLongitude ?? exif.gps_longitude ?? exif.lng ?? exif.lon;
        latRef = latRef ?? exif.latitudeRef ?? exif.gpsLatitudeRef ?? exif.gps_latitude_ref ?? exif.latRef;
        lngRef = lngRef ?? exif.longitudeRef ?? exif.gpsLongitudeRef ?? exif.gps_longitude_ref ?? exif.lngRef;
    }

    // 4. Colon-delimited EXIF tags (e.g. "GPS:GPSLatitude", "Exif.GPSInfo.GPSLatitude")
    if (rawLat === undefined || rawLng === undefined) {
        rawLat = rawLat ?? exif['GPS:GPSLatitude'] ?? exif['GPS:Latitude'] ?? exif['Exif.GPSInfo.GPSLatitude'];
        rawLng = rawLng ?? exif['GPS:GPSLongitude'] ?? exif['GPS:Longitude'] ?? exif['Exif.GPSInfo.GPSLongitude'];
        latRef = latRef ?? exif['GPS:GPSLatitudeRef'] ?? exif['GPS:LatitudeRef'] ?? exif['Exif.GPSInfo.GPSLatitudeRef'];
        lngRef = lngRef ?? exif['GPS:GPSLongitudeRef'] ?? exif['GPS:LongitudeRef'] ?? exif['Exif.GPSInfo.GPSLongitudeRef'];
    }

    console.log('[EXIF GPS] Raw Values:', {
        rawLat,
        rawLng,
        latRef,
        lngRef
    });

    // Step 0: null / undefined check
    if (rawLat === undefined || rawLng === undefined || rawLat === null || rawLng === null) {
        return null;
    }

    // ── GPS Validity Gate ────────────────────────────────────────────────────
    // Explicitly rejects Android Photo Picker's redacted 0,0 / empty-ref values
    // BEFORE wasting cycles on parseCoordinateComponent.
    const gpsValidity = hasValidGpsValues(rawLat, rawLng, latRef, lngRef);
    if (!gpsValidity.valid) {
        console.log(`[EXIF GPS] Validity gate → ${gpsValidity.state} (${gpsValidity.reason}):`, gpsValidity.details);
        return null;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Step A: Parse DMS or Numeric representation to Decimal
    const parsedLat = parseCoordinateComponent(rawLat);
    const parsedLng = parseCoordinateComponent(rawLng);

    console.log('[EXIF GPS] Normalized Decimal:', {
        parsedLat,
        parsedLng
    });

    if (parsedLat === null || parsedLng === null) {
        return null;
    }

    // Step B: Apply N/S and E/W Ref
    const finalLat = applyRef(parsedLat, latRef);
    const finalLng = applyRef(parsedLng, lngRef);

    console.log('[EXIF GPS] Final Coordinates:', {
        finalLat,
        finalLng
    });

    // Step C: Validate bounds (-90..90, -180..180, non-zero)
    return validateCoordinates(finalLat, finalLng);
}

// ─── Direct Binary JPEG APP1/EXIF Fallback Parser ─────────────────────────────
/**
 * Decodes base64 string into a Uint8Array byte buffer.
 */
function base64ToUint8Array(b64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const cleanB64 = (b64 || '').replace(/[^A-Za-z0-9+/=]/g, '');
    const bytes = [];
    let i = 0;
    while (i < cleanB64.length) {
        const b1 = chars.indexOf(cleanB64.charAt(i++));
        const b2 = chars.indexOf(cleanB64.charAt(i++));
        const b3 = chars.indexOf(cleanB64.charAt(i++));
        const b4 = chars.indexOf(cleanB64.charAt(i++));
        const c1 = (b1 << 2) | (b2 >> 4);
        const c2 = ((b2 & 15) << 4) | (b3 >> 2);
        const c3 = ((b3 & 3) << 6) | b4;
        bytes.push(c1);
        if (b3 !== 64 && b3 !== -1) bytes.push(c2);
        if (b4 !== 64 && b4 !== -1) bytes.push(c3);
    }
    return new Uint8Array(bytes);
}

/**
 * Pure JavaScript JPEG APP1/EXIF binary parser.
 * Reads TIFF header, IFD0, and GPS IFD (Tag 0x8825) directly from byte buffer.
 *
 * @param {Uint8Array} bytes
 * @returns {{ latitude: number, longitude: number, lat: number, lng: number } | null}
 */
export function parseJpegBinaryExif(bytes) {
    if (!bytes || bytes.length < 32) return null;

    // Check JPEG SOI marker (0xFF, 0xD8)
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return null;

    let offset = 2;
    let app1Offset = -1;

    // Scan for APP1 marker (0xFFE1)
    while (offset < bytes.length - 4) {
        if (bytes[offset] !== 0xFF) {
            offset++;
            continue;
        }
        const marker = bytes[offset + 1];
        if (marker === 0xE1) {
            app1Offset = offset;
            break;
        }
        // SOS or EOI means metadata section has ended
        if (marker === 0xDA || marker === 0xD9) break;

        const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
        if (length <= 0) break;
        offset += 2 + length;
    }

    if (app1Offset === -1) return null;

    // Check Exif header: 'E', 'x', 'i', 'f', 0, 0
    const exifHeaderOffset = app1Offset + 4;
    if (
        bytes[exifHeaderOffset] !== 0x45 || // 'E'
        bytes[exifHeaderOffset + 1] !== 0x78 || // 'x'
        bytes[exifHeaderOffset + 2] !== 0x69 || // 'i'
        bytes[exifHeaderOffset + 3] !== 0x66 || // 'f'
        bytes[exifHeaderOffset + 4] !== 0x00 ||
        bytes[exifHeaderOffset + 5] !== 0x00
    ) {
        return null;
    }

    const tiffOffset = exifHeaderOffset + 6;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    // Byte order: II (0x4949 = Little Endian) or MM (0x4D4D = Big Endian)
    const byteOrderMarker = view.getUint16(tiffOffset, false);
    let littleEndian = false;
    if (byteOrderMarker === 0x4949) {
        littleEndian = true;
    } else if (byteOrderMarker === 0x4D4D) {
        littleEndian = false;
    } else {
        return null;
    }

    // Check TIFF 42 marker
    const tag42 = view.getUint16(tiffOffset + 2, littleEndian);
    if (tag42 !== 0x002A) return null;

    // First IFD offset
    const ifd0OffsetRel = view.getUint32(tiffOffset + 4, littleEndian);
    const ifd0Offset = tiffOffset + ifd0OffsetRel;
    if (ifd0Offset >= bytes.length - 2) return null;

    const ifd0Entries = view.getUint16(ifd0Offset, littleEndian);
    let gpsIfdOffset = -1;

    for (let i = 0; i < ifd0Entries; i++) {
        const entryOffset = ifd0Offset + 2 + i * 12;
        if (entryOffset + 12 > bytes.length) break;
        const tag = view.getUint16(entryOffset, littleEndian);
        if (tag === 0x8825) { // GPS Info IFD Pointer
            const gpsOffsetRel = view.getUint32(entryOffset + 8, littleEndian);
            gpsIfdOffset = tiffOffset + gpsOffsetRel;
            break;
        }
    }

    if (gpsIfdOffset === -1 || gpsIfdOffset >= bytes.length - 2) return null;

    const gpsEntries = view.getUint16(gpsIfdOffset, littleEndian);
    let latRef = null;
    let rawLat = null;
    let lngRef = null;
    let rawLng = null;

    const readRational = (ptr) => {
        if (ptr + 8 > bytes.length) return null;
        const num = view.getUint32(ptr, littleEndian);
        const den = view.getUint32(ptr + 4, littleEndian);
        return den !== 0 ? num / den : 0;
    };

    for (let i = 0; i < gpsEntries; i++) {
        const entryOffset = gpsIfdOffset + 2 + i * 12;
        if (entryOffset + 12 > bytes.length) break;
        const tag = view.getUint16(entryOffset, littleEndian);

        if (tag === 0x0001) { // GPSLatitudeRef
            latRef = String.fromCharCode(bytes[entryOffset + 8]).toUpperCase();
        } else if (tag === 0x0002) { // GPSLatitude
            const valueOffsetRel = view.getUint32(entryOffset + 8, littleEndian);
            const valPtr = tiffOffset + valueOffsetRel;
            const d = readRational(valPtr);
            const m = readRational(valPtr + 8);
            const s = readRational(valPtr + 16);
            if (d !== null && m !== null && s !== null) {
                rawLat = d + m / 60 + s / 3600;
            }
        } else if (tag === 0x0003) { // GPSLongitudeRef
            lngRef = String.fromCharCode(bytes[entryOffset + 8]).toUpperCase();
        } else if (tag === 0x0004) { // GPSLongitude
            const valueOffsetRel = view.getUint32(entryOffset + 8, littleEndian);
            const valPtr = tiffOffset + valueOffsetRel;
            const d = readRational(valPtr);
            const m = readRational(valPtr + 8);
            const s = readRational(valPtr + 16);
            if (d !== null && m !== null && s !== null) {
                rawLng = d + m / 60 + s / 3600;
            }
        }
    }

    if (rawLat === null || rawLng === null) return null;

    const finalLat = applyRef(rawLat, latRef);
    const finalLng = applyRef(rawLng, lngRef);

    return validateCoordinates(finalLat, finalLng);
}

// ─── Diagnostic Logging ──────────────────────────────────────────────────────
/**
 * Prints structured [ORIGINAL MEDIA], [ORIGINAL EXIF], [SHA256], [GPS] diagnostic blocks.
 *
 * Requirements 12 & 13:
 *   - [ORIGINAL MEDIA] (pickerUri, originalContentUri, mediaStoreId, displayName, isOriginal, bytesRead)
 *   - [ORIGINAL EXIF] (exifFound, gpsFound, latitude, longitude, gpsSource)
 *   - Diagnostic distinction: PICKER_COPY, ORIGINAL_CONTENT_URI, ORIGINAL_FILE
 */
export function logExifDiagnostics({
    originalContentUri,
    originalUri,
    pickerUri,
    fileName,
    displayName,
    mimeType,
    fileSize,
    assetId,
    mediaStoreId,
    isOriginal,
    bytesRead,
    mediaPathType,
    exifExists,
    exifKeys = [],
    gpsTags = {},
    coordinates,
    gpsSource,
    reason,
    extractionMethod,
    sha256Result,
}) {
    if (!__DEV__) return;

    const latStr = coordinates?.latitude != null ? coordinates.latitude.toFixed(6) : 'None';
    const lngStr = coordinates?.longitude != null ? coordinates.longitude.toFixed(6) : 'None';
    const resolvedGpsFound = Boolean(coordinates);

    // ── [ORIGINAL MEDIA] (Requirement 13) ───────────────────────────────────
    console.log('[ORIGINAL MEDIA]');
    console.log(`  pickerUri:          ${pickerUri || 'None'}`);
    console.log(`  originalContentUri: ${originalContentUri || originalUri || 'None (Unavailable in Expo Go - Requires Development Build)'}`);
    console.log(`  mediaStoreId:       ${mediaStoreId || 'null'}`);
    console.log(`  displayName:        ${displayName || fileName || 'None'}`);
    console.log(`  isOriginal:         ${Boolean(isOriginal)}`);
    console.log(`  bytesRead:          ${bytesRead != null ? bytesRead + ' bytes' : (fileSize != null ? fileSize + ' bytes' : 'None')}`);
    console.log(`  mediaPathType:      ${mediaPathType || 'PICKER_COPY'}`);

    // ── [ORIGINAL EXIF] (Requirement 13) ────────────────────────────────────
    console.log('[ORIGINAL EXIF]');
    console.log(`  exifFound:          ${Boolean(exifExists)}`);
    console.log(`  gpsFound:           ${resolvedGpsFound}`);
    console.log(`  latitude:           ${latStr}`);
    console.log(`  longitude:          ${lngStr}`);
    console.log(`  gpsSource:          ${resolvedGpsFound ? (gpsSource || 'EXIF_ORIGINAL') : 'GPS_UNAVAILABLE'}`);
    if (reason) {
        console.log(`  reason:             ${reason}`);
    }

    // ── [SHA256] ────────────────────────────────────────────────────────────
    if (sha256Result) {
        console.log('[SHA256]');
        console.log(`  sourceUri:          ${sha256Result.sourceUri}`);
        console.log(`  fileSize:           ${sha256Result.fileSize} bytes`);
        console.log(`  sha256:             ${sha256Result.sha256}`);
        console.log(`  isOriginal:         ${sha256Result.isOriginal ? 'true (Original DCIM MediaStore file bytes)' : 'false (Photo Picker cache copy - Development Build required for original bytes)'}`);
    } else {
        console.log('[SHA256]  Not computed (file read failed or URI unavailable)');
    }

    // ── [GPS RAW METADATA] ───────────────────────────────────────────────────
    console.log('[GPS RAW METADATA]');
    console.log(`  rawLatitude:        ${gpsTags.GPSLatitude !== undefined ? JSON.stringify(gpsTags.GPSLatitude) : 'Not in EXIF dict'}`);
    console.log(`  rawLongitude:       ${gpsTags.GPSLongitude !== undefined ? JSON.stringify(gpsTags.GPSLongitude) : 'Not in EXIF dict'}`);
    console.log(`  latitudeRef:        ${gpsTags.GPSLatitudeRef !== undefined ? JSON.stringify(gpsTags.GPSLatitudeRef) : 'Not in EXIF dict'}`);
    console.log(`  longitudeRef:       ${gpsTags.GPSLongitudeRef !== undefined ? JSON.stringify(gpsTags.GPSLongitudeRef) : 'Not in EXIF dict'}`);
    console.log(`  layer:              ${extractionMethod || 'None'}`);
}

// ─── Internal SHA-256 helper ──────────────────────────────────────────────────
/**
 * Computes SHA-256 of the actual file bytes at the given URI.
 * Returns { sha256: string (64-char hex), fileSize: number, sourceUri: string } or null.
 */
async function _computeSha256ForPipeline(uri) {
    if (!uri) return null;
    const cleanUri = uri.split('?')[0];
    try {
        let base64;
        try {
            base64 = await FileSystem.readAsStringAsync(cleanUri, {
                encoding: FileSystem.EncodingType?.Base64 || 'base64',
            });
        } catch (readErr) {
            if (__DEV__) console.log('[SHA256] File read failed:', readErr.message);
            return null;
        }
        if (!base64) return null;

        // Decode base64 → ArrayBuffer (actual raw file bytes)
        const arrayBuffer = decodeBase64(base64);
        const fileSize = arrayBuffer.byteLength;

        let sha256 = null;
        // Primary: Crypto.digest with ArrayBuffer (hashes real bytes — same as sha256sum)
        try {
            const hashBuffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, arrayBuffer);
            sha256 = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (_) {
            // Fallback: hash base64 string
            sha256 = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                base64,
                { encoding: Crypto.CryptoEncoding.HEX }
            );
        }
        return { sha256, fileSize, sourceUri: cleanUri };
    } catch (err) {
        if (__DEV__) console.log('[SHA256] Unexpected error:', err.message);
        return null;
    }
}

// ─── Master Location Extractor (Multi-Layer Pipeline) ─────────────────────────
/**
 * Master function to extract GPS coordinates from original image evidence.
 *
 * Execution Order:
 *   1. Native ContentResolver / MediaStoreResolver module with ACCESS_MEDIA_LOCATION (Development Build)
 *      → Resolves ContentResolver content:// URI via MediaStore.setRequireOriginal()
 *      → Reads ORIGINAL DCIM file bytes directly from native InputStream
 *      → Calculates SHA-256 of ORIGINAL bytes
 *      → Parses ORIGINAL JPEG APP1 EXIF segment
 *      → MediaPathType: ORIGINAL_CONTENT_URI, Source: EXIF_ORIGINAL
 *   2. Expo MediaLibrary ACCESS_MEDIA_LOCATION fallback (Development Build)
 *      → MediaPathType: ORIGINAL_FILE, Source: EXIF_ORIGINAL
 *   3. If MediaStore resolution is unavailable (Expo Go sandbox):
 *      → Checks Photo Picker copy
 *      → MediaPathType: PICKER_COPY
 *      → Source: EXIF_PICKER_COPY or GPS_UNAVAILABLE
 *
 * @param {object|string} assetOrUri - ImagePicker asset object or URI string
 * @returns {Promise<{
 *   latitude: number|null,
 *   longitude: number|null,
 *   lat: number|null,
 *   lng: number|null,
 *   source: string,
 *   gpsSource: string,
 *   gpsFound: boolean,
 *   reason?: string,
 *   extractionMethod?: string,
 *   sha256?: string|null,
 *   pickerUri?: string,
 *   originalContentUri?: string|null,
 *   originalUri?: string|null,
 *   mediaStoreId?: string|null,
 *   displayName?: string|null,
 *   mediaPathType?: string,
 *   isOriginal: boolean,
 *   isOriginalBytes: boolean,
 *   rawExif?: object
 * } | null>}
 */
export async function extractImageLocation(assetOrUri) {
    if (!assetOrUri) return null;

    const uri = typeof assetOrUri === 'string' ? assetOrUri : assetOrUri?.uri;
    const cleanUri = uri ? uri.split('?')[0] : null;
    const assetExif = typeof assetOrUri === 'object' ? assetOrUri?.exif : null;
    const assetId = typeof assetOrUri === 'object' ? (assetOrUri?.assetId || assetOrUri?.id) : null;
    const mimeType = typeof assetOrUri === 'object' ? (assetOrUri?.mimeType || assetOrUri?.type) : null;
    const fileName = typeof assetOrUri === 'object' ? assetOrUri?.fileName : null;
    const fileSize = typeof assetOrUri === 'object' ? assetOrUri?.fileSize : null;
    const dimensions = (typeof assetOrUri === 'object' && assetOrUri?.width && assetOrUri?.height)
        ? { width: assetOrUri.width, height: assetOrUri.height }
        : null;

    let coords = null;
    let extractionMethod = null;
    let rawExif = assetExif;
    let originalContentUri = null;
    let originalUri = null;
    let mediaStoreId = null;
    let displayName = fileName || null;
    let isOriginal = false;
    let bytesRead = null;
    let mediaPathType = 'PICKER_COPY';
    let sha256Result = null;
    let exifExists = Boolean(assetExif);
    let gpsSource = 'GPS_UNAVAILABLE';
    let gpsUnavailableReason = null;

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 1A: Native Android ContentResolver Resolver (Development Build)
    // ─────────────────────────────────────────────────────────────────────────
    // In an Android Development Build, the native MediaStoreResolver module queries
    // MediaStore with ACCESS_MEDIA_LOCATION, calls MediaStore.setRequireOriginal(),
    // and streams unredacted original bytes directly.
    if (Platform.OS === 'android' && MediaStoreResolver?.resolveOriginalMedia) {
        try {
            // Pass contentUri (picker URI) as the first argument so the native module
            // can extract the MediaStore ID directly from a content://media/... URI,
            // bypassing filename/size queries entirely. This is the most reliable path.
            const nativeRes = await MediaStoreResolver.resolveOriginalMedia(
                cleanUri,            // contentUri — preferred for direct ID extraction
                fileName,            // fallback: display name for query-based matching
                fileSize,
                dimensions?.width,
                dimensions?.height
            );

            if (nativeRes && nativeRes.isOriginal) {
                originalContentUri = nativeRes.originalContentUri || nativeRes.uri;
                originalUri = originalContentUri;
                mediaStoreId = nativeRes.mediaStoreId;
                displayName = nativeRes.displayName || fileName;
                isOriginal = true;
                bytesRead = nativeRes.bytesRead;
                mediaPathType = 'ORIGINAL_CONTENT_URI';

                if (nativeRes.sha256) {
                    sha256Result = {
                        sha256: nativeRes.sha256,
                        fileSize: nativeRes.fileSize || nativeRes.bytesRead,
                        sourceUri: originalContentUri,
                        isOriginal: true,
                    };
                }

                // 1A.1: Parse binary from the original unredacted bytes
                // IMPORTANT: Only run JPEG binary parser for JPEG files.
                // PNG uses IHDR+tEXt/iTXt chunks, HEIC uses ISOBMFF boxes — neither
                // has a JPEG APP1/FFE1 header. Running parseJpegBinaryExif on them will
                // produce garbage or silently find nothing (safe), but we skip it
                // explicitly to avoid any false-positive GPS reads.
                const isJpegMime = !mimeType ||
                    mimeType === 'image/jpeg' ||
                    mimeType === 'image/jpg';
                const isUnsupportedBinaryFormat = mimeType === 'image/png' ||
                    mimeType === 'image/heic' ||
                    mimeType === 'image/heif' ||
                    mimeType === 'image/webp';

                if (nativeRes.bytesBase64 && isJpegMime && !isUnsupportedBinaryFormat) {
                    exifExists = true;
                    const rawBytes = base64ToUint8Array(nativeRes.bytesBase64);
                    const binaryResult = parseJpegBinaryExif(rawBytes);
                    if (binaryResult) {
                        coords = binaryResult;
                        extractionMethod = 'ORIGINAL_CONTENT_RESOLVER_BINARY';
                        gpsSource = 'EXIF_ORIGINAL';
                        gpsUnavailableReason = null;
                    }
                } else if (nativeRes.bytesBase64 && isUnsupportedBinaryFormat) {
                    // Non-JPEG format: binary JPEG parser skipped.
                    // GPS comes from native ExifInterface only (checked next step).
                    exifExists = true;
                    if (__DEV__) console.log(`[EXIF Extractor] Skipping JPEG binary parser for format: ${mimeType}`);
                }

                // 1A.2: Native ExifInterface GPS
                if (!coords && nativeRes.gpsFound && nativeRes.latitude != null && nativeRes.longitude != null) {
                    const validNativeCoords = validateCoordinates(nativeRes.latitude, nativeRes.longitude);
                    if (validNativeCoords) {
                        coords = validNativeCoords;
                        extractionMethod = 'ORIGINAL_CONTENT_RESOLVER_EXIF';
                        gpsSource = 'EXIF_ORIGINAL';
                        gpsUnavailableReason = null;
                    }
                }
            }
        } catch (nativeErr) {
            if (__DEV__) console.log('[EXIF Extractor] Native MediaStoreResolver skipped:', nativeErr.message);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 1B: Expo MediaLibrary ACCESS_MEDIA_LOCATION Fallback (Development Build)
    // ─────────────────────────────────────────────────────────────────────────
    if (!coords) {
        try {
            let perm = await MediaLibrary.getPermissionsAsync(false, ['photo', 'video']);
            if (!perm?.granted) {
                perm = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
            }

            if (perm?.granted) {
                let targetAssetId = assetId;

                if (!targetAssetId) {
                    try {
                        const recent = await MediaLibrary.getAssetsAsync({
                            mediaType: ['photo'],
                            first: 100,
                            sortBy: ['creationTime'],
                        });

                        if (recent?.assets?.length > 0) {
                            if (fileName) {
                                const fileMatch = recent.assets.find(
                                    a => a.filename === fileName || fileName.includes(a.filename) || (a.filename && a.filename.includes(fileName))
                                );
                                if (fileMatch) targetAssetId = fileMatch.id;
                            }

                            if (!targetAssetId && dimensions?.width && dimensions?.height) {
                                const dimMatch = recent.assets.find(
                                    a => a.width === dimensions.width && a.height === dimensions.height
                                );
                                if (dimMatch) targetAssetId = dimMatch.id;
                            }

                            // NOTE: Do NOT fall back to recent.assets[0].id when no filename/
                            // dimension match is found. That would associate EXIF metadata
                            // from a completely different photo with the selected image.
                            // Fail closed: if identity cannot be proven, skip this stage.
                        }
                    } catch (searchErr) {
                        if (__DEV__) console.log('[EXIF Extractor] MediaStore search skipped:', searchErr.message);
                    }
                }

                if (targetAssetId) {
                    mediaStoreId = targetAssetId;
                    const info = await MediaLibrary.getAssetInfoAsync(targetAssetId, { shouldDownloadFromNetwork: false });

                    if (info?.localUri || info?.uri) {
                        originalUri = info.localUri || info.uri;
                        originalContentUri = info.uri || originalUri;
                        displayName = info.filename || fileName;
                        isOriginal = true;
                        mediaPathType = 'ORIGINAL_FILE';

                        // Calculate SHA-256 of the ORIGINAL file bytes
                        if (!sha256Result) {
                            try {
                                const origSha = await _computeSha256ForPipeline(originalUri);
                                if (origSha) {
                                    sha256Result = { ...origSha, isOriginal: true };
                                }
                            } catch (origShaErr) {
                                if (__DEV__) console.log('[SHA256] Original DCIM hash failed:', origShaErr.message);
                            }
                        }

                        // Read ORIGINAL file bytes directly from MediaStore URI
                        try {
                            let rawBytesBase64 = null;
                            try {
                                rawBytesBase64 = await FileSystem.readAsStringAsync(originalUri, {
                                    encoding: FileSystem.EncodingType?.Base64 || 'base64',
                                    position: 0,
                                    length: 131072,
                                });
                            } catch (_) {
                                rawBytesBase64 = await FileSystem.readAsStringAsync(originalUri, {
                                    encoding: FileSystem.EncodingType?.Base64 || 'base64',
                                });
                            }

                            if (rawBytesBase64) {
                                exifExists = true;
                                const rawBytes = base64ToUint8Array(rawBytesBase64);
                                bytesRead = rawBytes.byteLength;
                                // Only run JPEG binary parser for JPEG — PNG/HEIC/HEIF/WebP
                                // do not have JPEG APP1 headers.
                                const isBinaryJpeg = !mimeType ||
                                    mimeType === 'image/jpeg' ||
                                    mimeType === 'image/jpg';
                                if (isBinaryJpeg) {
                                    const binaryResult = parseJpegBinaryExif(rawBytes);
                                    if (binaryResult) {
                                        coords = binaryResult;
                                        extractionMethod = 'ORIGINAL_DCIM_BINARY_APP1';
                                        gpsSource = 'EXIF_ORIGINAL';
                                        gpsUnavailableReason = null;
                                    }
                                } else if (__DEV__) {
                                    console.log(`[EXIF Extractor] Skipping JPEG binary parser for DCIM file: ${mimeType}`);
                                }
                            }
                        } catch (dcimErr) {
                            if (__DEV__) console.log('[EXIF Extractor] Original DCIM binary read failed:', dcimErr.message);
                        }

                        // MediaStore pre-indexed location
                        if (!coords && info?.location) {
                            const mlCoords = validateCoordinates(info.location.latitude, info.location.longitude);
                            if (mlCoords) {
                                coords = mlCoords;
                                extractionMethod = 'MEDIA_LIBRARY_LOCATION';
                                gpsSource = 'EXIF_ORIGINAL';
                                gpsUnavailableReason = null;
                            }
                        }

                        // MediaStore unredacted EXIF dictionary
                        if (!coords && info?.exif) {
                            exifExists = true;
                            const infoExifCoords = parseExifGPS(info.exif);
                            if (infoExifCoords) {
                                coords = infoExifCoords;
                                rawExif = info.exif;
                                extractionMethod = 'MEDIA_LIBRARY_EXIF';
                                gpsSource = 'EXIF_ORIGINAL';
                                gpsUnavailableReason = null;
                            }
                        }
                    }
                }
            }
        } catch (mlErr) {
            const isExpoGoRestriction = (
                mlErr.message?.includes('Expo Go') ||
                mlErr.message?.includes('ExpoMediaLibrary') ||
                mlErr.message?.includes('media library') ||
                mlErr.message?.includes('full access')
            );
            if (isExpoGoRestriction) {
                if (__DEV__) {
                    console.log('[EXIF Extractor] MediaStore ACCESS_MEDIA_LOCATION unavailable in Expo Go sandbox.');
                    console.log('  Original DCIM file requires a Development Build with ACCESS_MEDIA_LOCATION.');
                }
            } else {
                if (__DEV__) console.log('[EXIF Extractor] Stage 1B MediaStore unexpected error:', mlErr.message);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 2: Fallback to Photo Picker Copy (if original DCIM was inaccessible)
    // ─────────────────────────────────────────────────────────────────────────
    if (!coords) {
        mediaPathType = 'PICKER_COPY';

        // 2A: Check Photo Picker EXIF dictionary
        if (assetExif && typeof assetExif === 'object') {
            const rawLat = assetExif.GPSLatitude ?? assetExif['{GPS}']?.Latitude ?? assetExif.latitude;
            const rawLng = assetExif.GPSLongitude ?? assetExif['{GPS}']?.Longitude ?? assetExif.longitude;
            const latRef = assetExif.GPSLatitudeRef ?? assetExif['{GPS}']?.LatitudeRef ?? assetExif.latitudeRef;
            const lngRef = assetExif.GPSLongitudeRef ?? assetExif['{GPS}']?.LongitudeRef ?? assetExif.longitudeRef;

            const validity = hasValidGpsValues(rawLat, rawLng, latRef, lngRef);
            if (validity.valid) {
                const parsed = parseExifGPS(assetExif);
                if (parsed) {
                    coords = parsed;
                    extractionMethod = 'IMAGE_EXIF_OBJECT';
                    gpsSource = 'EXIF_PICKER_COPY';
                    isOriginal = false;
                    gpsUnavailableReason = null;
                }
            } else {
                gpsUnavailableReason = validity.reason;
            }
        }

        // 2B: Check Photo Picker binary APP1 header
        // Only for JPEG files — PNG/HEIC/HEIF/WebP do not have JPEG APP1 headers.
        // Attempting JPEG binary parsing on these formats will silently return null
        // (no crash), but we skip explicitly and record the reason.
        const pickerMimeIsJpeg = !mimeType ||
            mimeType === 'image/jpeg' ||
            mimeType === 'image/jpg';
        const pickerMimeUnsupported = mimeType === 'image/png' ||
            mimeType === 'image/heic' ||
            mimeType === 'image/heif' ||
            mimeType === 'image/webp';

        if (!coords && cleanUri && pickerMimeIsJpeg && !pickerMimeUnsupported) {
            try {
                let base64Chunk = null;
                try {
                    base64Chunk = await FileSystem.readAsStringAsync(cleanUri, {
                        encoding: FileSystem.EncodingType?.Base64 || 'base64',
                        position: 0,
                        length: 131072,
                    });
                } catch (_) {
                    base64Chunk = await FileSystem.readAsStringAsync(cleanUri, {
                        encoding: FileSystem.EncodingType?.Base64 || 'base64',
                    });
                }

                if (base64Chunk) {
                    exifExists = true;
                    const bytes = base64ToUint8Array(base64Chunk);
                    const binaryCoords = parseJpegBinaryExif(bytes);
                    if (binaryCoords) {
                        coords = binaryCoords;
                        extractionMethod = 'BINARY_APP1_HEADER';
                        gpsSource = 'EXIF_PICKER_COPY';
                        isOriginal = false;
                        gpsUnavailableReason = null;
                    }
                }
            } catch (readErr) {
                if (__DEV__) console.log('[EXIF Extractor] Picker copy binary read failed:', readErr.message);
            }
        } else if (!coords && pickerMimeUnsupported) {
            // Non-JPEG format from picker — GPS_UNAVAILABLE; no binary parsing attempted.
            // Native ExifInterface (Stage 1A) is the only supported path for these formats.
            gpsUnavailableReason = `UNSUPPORTED_FORMAT_FOR_PICKER_BINARY: ${mimeType}`;
            if (__DEV__) console.log(`[EXIF Extractor] Picker binary parse skipped for format: ${mimeType}. Use native MediaStoreResolver for GPS extraction.`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 3: Compute SHA-256 over Picker Copy (if original DCIM was inaccessible)
    // ─────────────────────────────────────────────────────────────────────────
    if (!sha256Result && cleanUri) {
        const cacheHash = await _computeSha256ForPipeline(cleanUri);
        if (cacheHash) {
            sha256Result = { ...cacheHash, isOriginal: false };
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 4: Diagnostic Logging (Requirements 12 & 13)
    // ─────────────────────────────────────────────────────────────────────────
    logExifDiagnostics({
        originalContentUri,
        originalUri,
        pickerUri: cleanUri,
        fileName,
        displayName,
        mimeType,
        fileSize,
        assetId,
        mediaStoreId,
        isOriginal,
        bytesRead,
        mediaPathType,
        exifExists,
        exifKeys: rawExif ? Object.keys(rawExif) : [],
        gpsTags: rawExif ? {
            GPSLatitude:    rawExif.GPSLatitude,
            GPSLatitudeRef: rawExif.GPSLatitudeRef,
            GPSLongitude:   rawExif.GPSLongitude,
            GPSLongitudeRef: rawExif.GPSLongitudeRef,
        } : {},
        coordinates: coords,
        gpsSource: coords ? gpsSource : 'GPS_UNAVAILABLE',
        reason: gpsUnavailableReason,
        extractionMethod,
        sha256Result,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 5: Structured Return Object
    // ─────────────────────────────────────────────────────────────────────────
    if (coords) {
        return {
            latitude: coords.latitude,
            longitude: coords.longitude,
            lat: coords.latitude,
            lng: coords.longitude,
            source: gpsSource,
            gpsSource: gpsSource,
            gpsFound: true,
            extractionMethod,
            sha256: sha256Result?.sha256 || null,
            pickerUri: cleanUri,
            originalContentUri: originalContentUri || originalUri || cleanUri,
            originalUri: originalUri || cleanUri,
            mediaStoreId: mediaStoreId || null,
            displayName: displayName || fileName,
            mediaPathType,
            isOriginal: Boolean(isOriginal),
            isOriginalBytes: Boolean(sha256Result?.isOriginal),
            rawExif,
        };
    }

    return {
        latitude: null,
        longitude: null,
        lat: null,
        lng: null,
        source: 'GPS_UNAVAILABLE',
        gpsSource: 'GPS_UNAVAILABLE',
        gpsFound: false,
        reason: gpsUnavailableReason,
        extractionMethod: null,
        sha256: sha256Result?.sha256 || null,
        pickerUri: cleanUri,
        originalContentUri: originalContentUri || originalUri || null,
        originalUri: originalUri || null,
        mediaStoreId: mediaStoreId || null,
        displayName: displayName || fileName,
        mediaPathType,
        isOriginal: Boolean(isOriginal),
        isOriginalBytes: Boolean(sha256Result?.isOriginal),
        rawExif,
    };
}




