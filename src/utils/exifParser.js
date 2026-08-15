/**
 * Robust EXIF GPS Parser & Normalizer for Android, iOS, Expo ImagePicker, and MediaLibrary.
 * Parses flat Android EXIF keys, nested iOS {GPS} blocks, rational arrays, DMS strings, and single numeric values.
 * Applies direction references (N/S/E/W) and validates coordinates within valid geographical bounds (-90..90, -180..180).
 */

/**
 * Parses a single numeric or rational representation (e.g., 19, "19/1", { numerator: 19, denominator: 1 })
 *
 * @param {number|string|object} item
 * @returns {number|null}
 */
function parseSingleValue(item) {
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

/**
 * Parses any coordinate representation (direct number, array of D/M/S, comma-separated string, formatted DMS string)
 * into a decimal degree value.
 *
 * @param {number|string|array|object} val
 * @returns {number|null}
 */
export function parseCoordinateComponent(val) {
    if (val === null || val === undefined) return null;

    // Direct numeric value
    if (typeof val === 'number') {
        return isFinite(val) ? val : null;
    }

    // Array of components (e.g. [19, 4, 33.59] or ["19/1", "4/1", "3359/100"] or [{numerator: 19, denominator: 1}, ...])
    if (Array.isArray(val)) {
        if (val.length === 0) return null;
        if (val.length === 1) return parseSingleValue(val[0]);
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

        // Comma-separated or space-separated Android EXIF string (e.g. "19/1, 4/1, 3359/100" or "19, 4, 33.59")
        if (str.includes(',') || (str.includes('/') && str.includes(' '))) {
            const parts = str.split(/[\s,]+/).filter(Boolean);
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
        }

        // Formatted DMS strings with symbols (e.g., "19 deg 4' 33.59\" N", "19° 4' 33.59\"", "19:4:33.59")
        const dmsRegex = /^(-?[\d\.]+)[°\sdeg:]+([\d\.]+)?['\smin:]*([\d\.]+)?["\ssec]*([NSEW])?$/i;
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

/**
 * Validates latitude (-90 to 90) and longitude (-180 to 180).
 * Rejects (0, 0) Null Island, NaN, Infinity, and out-of-bound values.
 * Returns { lat, lng } if valid, or null if invalid.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {{ lat: number, lng: number } | null}
 */
export function validateCoordinates(lat, lng) {
    if (
        lat === null || lng === null ||
        lat === undefined || lng === undefined ||
        !isFinite(lat) || !isFinite(lng) ||
        isNaN(lat) || isNaN(lng) ||
        (lat === 0 && lng === 0) ||
        Math.abs(lat) > 90 || Math.abs(lng) > 180
    ) {
        return null;
    }
    return { lat: Number(lat), lng: Number(lng) };
}

/**
 * Main EXIF GPS Extractor
 * Extracts, parses, normalizes, applies direction references, and validates EXIF GPS coordinates.
 *
 * @param {object} exif - Raw EXIF object from Expo ImagePicker, MediaLibrary, or react-native-exif
 * @returns {{ lat: number, lng: number } | null} Validated coordinates or null if missing/invalid (NEVER returns 0,0)
 */
export function parseExifGPS(exif) {
    if (!exif || typeof exif !== 'object') {
        console.log('[EXIF GPS] No EXIF object provided');
        return null;
    }

    console.log('[EXIF GPS] Extracting coordinates from raw EXIF keys:', Object.keys(exif).join(', '));

    let rawLat, rawLng, latRef, lngRef;

    // 1. Android flat EXIF format (e.g. exif.GPSLatitude, exif.GPSLongitude)
    if (exif.GPSLatitude !== undefined || exif.GPSLongitude !== undefined) {
        rawLat = exif.GPSLatitude;
        rawLng = exif.GPSLongitude;
        latRef = exif.GPSLatitudeRef;
        lngRef = exif.GPSLongitudeRef;
        console.log('[EXIF GPS] Format detected: Android flat keys');
    }

    // 2. iOS or standard nested {GPS} / GPS / gps block format
    const gpsBlock = exif['{GPS}'] || exif['GPS'] || exif.gps || exif.Gps;
    if ((rawLat === undefined || rawLng === undefined) && gpsBlock && typeof gpsBlock === 'object') {
        rawLat = rawLat ?? gpsBlock.Latitude ?? gpsBlock.GPSLatitude;
        rawLng = rawLng ?? gpsBlock.Longitude ?? gpsBlock.GPSLongitude;
        latRef = latRef ?? gpsBlock.LatitudeRef ?? gpsBlock.GPSLatitudeRef;
        lngRef = lngRef ?? gpsBlock.LongitudeRef ?? gpsBlock.GPSLongitudeRef;
        console.log('[EXIF GPS] Format detected: Nested GPS block');
    }

    // 3. Lowercase flat keys fallback (e.g. exif.latitude, exif.gpsLatitude)
    if (rawLat === undefined || rawLng === undefined) {
        rawLat = rawLat ?? exif.latitude ?? exif.gpsLatitude;
        rawLng = rawLng ?? exif.longitude ?? exif.gpsLongitude;
        latRef = latRef ?? exif.latitudeRef ?? exif.gpsLatitudeRef;
        lngRef = lngRef ?? exif.longitudeRef ?? exif.gpsLongitudeRef;
    }

    console.log('[EXIF GPS] Raw Values:', JSON.stringify({ rawLat, rawLng, latRef, lngRef }));

    if (rawLat === undefined || rawLng === undefined || rawLat === null || rawLng === null) {
        console.log('[EXIF GPS] GPS latitude or longitude is missing in EXIF data');
        return null;
    }

    // Step A: Parse DMS or Numeric representation to Decimal
    const parsedLat = parseCoordinateComponent(rawLat);
    const parsedLng = parseCoordinateComponent(rawLng);
    console.log('[EXIF GPS] Normalized Decimal (before Ref):', { parsedLat, parsedLng });

    if (parsedLat === null || parsedLng === null) {
        console.log('[EXIF GPS] Failed to parse DMS/Rational component to decimal');
        return null;
    }

    // Step B: Apply N/S and E/W Ref
    const finalLat = applyRef(parsedLat, latRef);
    const finalLng = applyRef(parsedLng, lngRef);
    console.log('[EXIF GPS] Converted Final Coordinates:', { finalLat, finalLng });

    // Step C: Validation (-90..90, -180..180, non-zero)
    const valid = validateCoordinates(finalLat, finalLng);
    if (valid) {
        console.log(`[EXIF GPS] ✅ SUCCESS: Valid EXIF GPS extracted: lat=${valid.lat}, lng=${valid.lng}`);
        return valid;
    } else {
        console.log(`[EXIF GPS] ❌ INVALID: Coordinates failed validation check (lat=${finalLat}, lng=${finalLng}) -> Returning null`);
        return null;
    }
}
