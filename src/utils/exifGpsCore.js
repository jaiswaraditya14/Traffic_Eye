/* Single, platform-independent parser shared by the app and inspection tools. */
const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
function decimal(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || !NUMBER.test(value.trim())) return null;
    const number = Number(value.trim());
    return Number.isFinite(number) ? number : null;
}
function parseSingleValue(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const numerator = decimal(value.numerator ?? value.num ?? value.n);
        const denominator = decimal(value.denominator ?? value.den ?? value.d);
        if (numerator === null || denominator === null || denominator === 0) return null;
        const result = numerator / denominator;
        return Number.isFinite(result) ? result : null;
    }
    if (typeof value === 'string' && value.includes('/')) {
        const parts = value.split('/');
        if (parts.length !== 2) return null;
        return parseSingleValue({ numerator: parts[0], denominator: parts[1] });
    }
    return decimal(value);
}
function normalizeRef(ref) {
    if (ref == null || ref === '') return null;
    const normalized = String(ref).trim().toUpperCase().replace(/\0/g, '');
    return ({ NORTH: 'N', SOUTH: 'S', EAST: 'E', WEST: 'W', '1': '+', '-1': '-' })[normalized] || normalized;
}
function applyRef(value, ref) {
    if (!Number.isFinite(value)) return null;
    const direction = normalizeRef(ref);
    if (direction == null) return value;
    if (['S', 'W', '-'].includes(direction)) return -Math.abs(value);
    if (['N', 'E', '+'].includes(direction)) return value < 0 ? null : value;
    return null;
}
function parseCoordinateComponent(value) {
    if (Array.isArray(value)) {
        if (value.length === 6) {
            value = [0, 2, 4].map(i => parseSingleValue({ numerator: value[i], denominator: value[i + 1] }));
        }
        if (value.length !== 3) return null;
        const [degrees, minutes, seconds] = value.map(parseSingleValue);
        if ([degrees, minutes, seconds].includes(null) || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null;
        const result = Math.abs(degrees) + minutes / 60 + seconds / 3600;
        return (degrees < 0 || Object.is(degrees, -0)) ? -result : result;
    }
    if (typeof value === 'string') {
        const direct = parseSingleValue(value);
        if (direct !== null) return direct;
        let text = value.trim();
        const suffix = text.match(/\s*([NSEW])$/i);
        if (suffix) text = text.slice(0, suffix.index).trim();
        const formatted = text.match(/^([+-]?\d+)\s*(?:°|deg)\s*(\d+(?:\.\d+)?)\s*(?:'|′|min)\s*(\d+(?:\.\d+)?)\s*(?:"|″|sec)$/i);
        const parts = formatted ? formatted.slice(1) : text.split(/[,:\s]+/);
        if (parts.length !== 3 && parts.length !== 6) return null;
        const parsed = parseCoordinateComponent(parts);
        return suffix ? applyRef(parsed, suffix[1]) : parsed;
    }
    return parseSingleValue(value);
}
function validateCoordinates(latitude, longitude) {
    const lat = decimal(latitude), lng = decimal(longitude);
    if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { latitude: lat, longitude: lng, lat, lng };
}
function hasValidGpsValues(latitude, longitude, latitudeRef, longitudeRef) {
    if (latitude == null && longitude == null) return { valid: false, state: 'GPS_NOT_PRESENT', reason: 'NO_GPS_TAGS' };
    const suffix = value => typeof value === 'string' ? value.trim().match(/([NSEW])$/i)?.[1]?.toUpperCase() : null;
    const embeddedLat = suffix(latitude), embeddedLng = suffix(longitude);
    const latRef = normalizeRef(latitudeRef) || embeddedLat, lngRef = normalizeRef(longitudeRef) || embeddedLng;
    if ((embeddedLat && latRef !== embeddedLat) || (embeddedLng && lngRef !== embeddedLng)) {
        return { valid: false, state: 'INVALID_GPS', reason: 'CONFLICTING_HEMISPHERE' };
    }
    if ((latRef && !['N', 'S', '+', '-'].includes(latRef)) || (lngRef && !['E', 'W', '+', '-'].includes(lngRef))) {
        return { valid: false, state: 'INVALID_GPS', reason: 'INVALID_HEMISPHERE' };
    }
    const coords = validateCoordinates(applyRef(parseCoordinateComponent(latitude), latRef), applyRef(parseCoordinateComponent(longitude), lngRef));
    return coords ? { valid: true, state: 'GPS_VALID', coordinates: coords } : { valid: false, state: 'INVALID_GPS', reason: 'INVALID_GPS_VALUES' };
}
const LAT_KEYS = ['GPSLatitude', 'Latitude', 'latitude', 'lat', 'gpsLatitude', 'gps_latitude', 'GPS:Latitude'];
const LNG_KEYS = ['GPSLongitude', 'Longitude', 'longitude', 'lng', 'lon', 'gpsLongitude', 'gps_longitude', 'GPS:Longitude'];
const LAT_REFS = ['GPSLatitudeRef', 'LatitudeRef', 'latitudeRef', 'gpsLatitudeRef', 'gps_latitude_ref', 'GPS:LatitudeRef'];
const LNG_REFS = ['GPSLongitudeRef', 'LongitudeRef', 'longitudeRef', 'gpsLongitudeRef', 'gps_longitude_ref', 'GPS:LongitudeRef'];
const first = (object, keys) => keys.map(key => object[key]).find(value => value != null);
function inspectExifGPS(exif) {
    if (!exif || typeof exif !== 'object' || !Object.keys(exif).length) return { hasExif: false, hasGpsTags: false, coordinates: null };
    let hasGpsTags = false;
    for (const candidate of [exif, ...['{GPS}', 'GPS', 'gps', 'Gps', 'GPSInfo'].map(key => exif[key])]) {
        if (!candidate || typeof candidate !== 'object') continue;
        const lat = first(candidate, LAT_KEYS), lng = first(candidate, LNG_KEYS);
        hasGpsTags ||= lat != null || lng != null;
        // Never complete a partial GPS pair with values from a different block.
        const result = hasValidGpsValues(lat, lng, first(candidate, LAT_REFS), first(candidate, LNG_REFS));
        if (result.valid) return { hasExif: true, hasGpsTags: true, coordinates: result.coordinates };
    }
    return { hasExif: true, hasGpsTags, coordinates: null };
}
function parseExifGPS(exif) { return inspectExifGPS(exif).coordinates; }

function inspectJpegExif(input) {
    const result = { hasExif: false, hasGpsTags: false, coordinates: null, status: 'NO_EXIF_DATA' };
    if (!(input instanceof Uint8Array) || input.length < 2 || input[0] !== 255 || input[1] !== 216) return { ...result, status: 'UNSUPPORTED_FORMAT' };
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    let position = 2;
    try {
        while (position < input.length) {
            if (input[position++] !== 255) throw new Error('marker');
            while (input[position] === 255) position++;
            const marker = input[position++];
            if (marker === 218 || marker === 217) return result;
            if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
            if (position + 2 > input.length) throw new Error('truncated');
            const length = view.getUint16(position, false);
            if (length < 2 || position + length > input.length) throw new Error('segment');
            const payload = position + 2, end = position + length;
            position = end;
            if (marker !== 225 || end - payload < 6 || String.fromCharCode(...input.subarray(payload, payload + 6)) !== 'Exif\0\0') continue;
            result.hasExif = true;
            const start = payload + 6;
            const requireRange = (offset, size) => {
                if (!Number.isSafeInteger(offset) || offset < start || offset + size > end) throw new Error('TIFF bounds');
            };
            requireRange(start, 8);
            const order = view.getUint16(start, false);
            if (order !== 0x4949 && order !== 0x4d4d) throw new Error('byte order');
            const little = order === 0x4949;
            const u16 = offset => { requireRange(offset, 2); return view.getUint16(offset, little); };
            const u32 = offset => { requireRange(offset, 4); return view.getUint32(offset, little); };
            if (u16(start + 2) !== 42) throw new Error('TIFF signature');
            const readIfd = (offset, visit) => {
                requireRange(offset, 2);
                const count = u16(offset);
                requireRange(offset + 2, count * 12 + 4);
                for (let i = 0; i < count; i++) visit(offset + 2 + i * 12);
            };
            let gpsOffset = null;
            readIfd(start + u32(start + 4), entry => {
                if (u16(entry) === 0x8825) {
                    if (u16(entry + 2) !== 4 || u32(entry + 4) !== 1) throw new Error('GPS pointer');
                    gpsOffset = start + u32(entry + 8);
                }
            });
            const tags = {};
            if (gpsOffset !== null) readIfd(gpsOffset, entry => {
                const tag = u16(entry), type = u16(entry + 2), count = u32(entry + 4);
                if (tag === 1 || tag === 3) {
                    if (type !== 2 || count !== 2) throw new Error('GPS ref');
                    tags[tag === 1 ? 'GPSLatitudeRef' : 'GPSLongitudeRef'] = String.fromCharCode(input[entry + 8]);
                } else if (tag === 2 || tag === 4) {
                    result.hasGpsTags = true;
                    if (type !== 5 || count !== 3) throw new Error('GPS rationals');
                    const offset = start + u32(entry + 8);
                    requireRange(offset, 24);
                    tags[tag === 2 ? 'GPSLatitude' : 'GPSLongitude'] = [0, 8, 16].map(i => ({ numerator: u32(offset + i), denominator: u32(offset + i + 4) }));
                }
            });
            // TIFF unsigned DMS needs explicit refs to establish hemispheres.
            const inspected = inspectExifGPS(tags);
            result.coordinates = tags.GPSLatitudeRef && tags.GPSLongitudeRef ? inspected.coordinates : null;
            result.status = result.coordinates ? 'GPS_FOUND' : (result.hasGpsTags ? 'INVALID_GPS' : 'NO_GPS_DATA');
            return result;
        }
        return { ...result, status: 'CORRUPT_METADATA' };
    } catch (_) { return { ...result, coordinates: null, status: 'CORRUPT_METADATA' }; }
}
function parseJpegBinaryExif(bytes) { return inspectJpegExif(bytes).coordinates; }
module.exports = { parseSingleValue, parseCoordinateComponent, applyRef, validateCoordinates, hasValidGpsValues, parseExifGPS, inspectExifGPS, inspectJpegExif, parseJpegBinaryExif };
