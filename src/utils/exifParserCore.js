/**
 * exifParserCore.js — Pure JavaScript EXIF GPS Parser & Core Algorithms
 * Zero native dependencies. Usable in Node.js unit tests and React Native runtime.
 */

// ─── Single Value / Rational Parser ──────────────────────────────────────────
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
 * Validates raw GPS values from an EXIF dict BEFORE parsing.
 * Catches Android Photo Picker's redacted 0,0 + empty-ref pattern.
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

    // Specific Android Photo Picker Redaction Signature
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
        console.log('[EXIF GPS] Validity gate → GPS_NOT_FOUND:', gpsValidity.reason, '|', {
            rawLat, rawLng, latRef, lngRef,
        });
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

    // Step C: Validate bounds
    return validateCoordinates(finalLat, finalLng);
}

// ─── Direct Binary JPEG APP1/EXIF Fallback Parser ─────────────────────────────
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
