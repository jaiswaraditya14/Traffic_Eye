/**
 * Location Resolver for Traffic Eye Report Submissions
 *
 * Implements strict 4-tier location resolution at report submission time:
 *   Priority 1: EXIF GPS from the photo
 *   Priority 2: Device GPS at report time
 *   Priority 3: Typed address geocoded to lat/lng (via Photon / Nominatim / Expo)
 *   Priority 4: Pincode centroid (last resort: location_source='pincode_approx')
 *
 * Resolves ONCE at submission. Never geocodes during map render.
 */

import { forwardGeocode } from '../geoService';

// Pincode centroids for Greater Mumbai & MMR districts
export const MUMBAI_PINCODE_CENTROIDS = {
    // South Mumbai
    '400001': { lat: 18.9322, lng: 72.8347, name: 'Fort / CST' },
    '400002': { lat: 18.9482, lng: 72.8258, name: 'Kalbadevi' },
    '400004': { lat: 18.9567, lng: 72.8197, name: 'Girgaon' },
    '400005': { lat: 18.9067, lng: 72.8147, name: 'Colaba' },
    '400006': { lat: 18.9550, lng: 72.7980, name: 'Malabar Hill' },
    '400007': { lat: 18.9633, lng: 72.8150, name: 'Grant Road' },
    '400008': { lat: 18.9692, lng: 72.8222, name: 'Mumbai Central' },
    '400011': { lat: 18.9817, lng: 72.8297, name: 'Jacob Circle / Mahalaxmi' },
    '400012': { lat: 18.9950, lng: 72.8400, name: 'Parel' },
    '400013': { lat: 18.9975, lng: 72.8300, name: 'Delisle Road / Lower Parel' },
    '400014': { lat: 19.0178, lng: 72.8478, name: 'Dadar East' },
    '400016': { lat: 19.0340, lng: 72.8410, name: 'Mahim' },
    '400018': { lat: 19.0067, lng: 72.8180, name: 'Worli' },
    '400019': { lat: 19.0269, lng: 72.8553, name: 'Matunga' },
    '400020': { lat: 18.9400, lng: 72.8250, name: 'Churchgate' },
    '400021': { lat: 18.9240, lng: 72.8220, name: 'Nariman Point' },
    '400022': { lat: 19.0390, lng: 72.8620, name: 'Sion' },
    '400025': { lat: 19.0180, lng: 72.8290, name: 'Prabhadevi' },
    '400028': { lat: 19.0240, lng: 72.8390, name: 'Shivaji Park / Dadar West' },
    '400030': { lat: 19.0010, lng: 72.8150, name: 'Worli Sea Face' },
    '400031': { lat: 19.0030, lng: 72.8520, name: 'Wadala' },
    '400037': { lat: 19.0220, lng: 72.8710, name: 'Antop Hill' },

    // Western Suburbs
    '400050': { lat: 19.0596, lng: 72.8295, name: 'Bandra West' },
    '400051': { lat: 19.0607, lng: 72.8644, name: 'Bandra Kurla Complex (BKC)' },
    '400052': { lat: 19.0720, lng: 72.8340, name: 'Khar West' },
    '400053': { lat: 19.1360, lng: 72.8290, name: 'Andheri West / Lokhandwala' },
    '400054': { lat: 19.0843, lng: 72.8360, name: 'Santacruz West' },
    '400055': { lat: 19.0833, lng: 72.8530, name: 'Vakola / Santacruz East' },
    '400056': { lat: 19.1025, lng: 72.8386, name: 'Vile Parle West' },
    '400057': { lat: 19.0968, lng: 72.8524, name: 'Vile Parle East' },
    '400058': { lat: 19.1197, lng: 72.8464, name: 'Andheri West' },
    '400059': { lat: 19.1130, lng: 72.8690, name: 'Andheri East / Marol' },
    '400060': { lat: 19.1320, lng: 72.8630, name: 'Jogeshwari East' },
    '400061': { lat: 19.1370, lng: 72.8120, name: 'Versova' },
    '400064': { lat: 19.1860, lng: 72.8480, name: 'Malad West' },
    '400067': { lat: 19.2060, lng: 72.8510, name: 'Kandivali West' },
    '400068': { lat: 19.2480, lng: 72.8580, name: 'Dahisar West' },
    '400092': { lat: 19.2310, lng: 72.8560, name: 'Borivali West' },
    '400093': { lat: 19.1220, lng: 72.8710, name: 'Chakala / Andheri East' },
    '400097': { lat: 19.1800, lng: 72.8650, name: 'Malad East' },
    '400101': { lat: 19.2090, lng: 72.8720, name: 'Kandivali East' },
    '400102': { lat: 19.1410, lng: 72.8420, name: 'Jogeshwari West' },
    '400104': { lat: 19.1670, lng: 72.8490, name: 'Goregaon West' },

    // Eastern Suburbs
    '400070': { lat: 19.0690, lng: 72.8797, name: 'Kurla West' },
    '400071': { lat: 19.0622, lng: 72.8997, name: 'Chembur' },
    '400072': { lat: 19.1075, lng: 72.8877, name: 'Saki Naka' },
    '400074': { lat: 19.0330, lng: 72.8950, name: 'Chembur / Mahul' },
    '400075': { lat: 19.0790, lng: 72.9150, name: 'Pant Nagar / Ghatkopar East' },
    '400076': { lat: 19.1257, lng: 72.9051, name: 'Powai / IIT' },
    '400077': { lat: 19.0860, lng: 72.9090, name: 'Ghatkopar East' },
    '400078': { lat: 19.1520, lng: 72.9360, name: 'Bhandup West' },
    '400080': { lat: 19.1730, lng: 72.9550, name: 'Mulund West' },
    '400083': { lat: 19.1120, lng: 72.9240, name: 'Vikhroli West' },
    '400084': { lat: 19.0530, lng: 72.9310, name: 'Barve Nagar / Ghatkopar' },
    '400086': { lat: 19.0910, lng: 72.9010, name: 'Ghatkopar West' },
    '400088': { lat: 19.0553, lng: 72.9150, name: 'Govandi' },
    '400089': { lat: 19.0680, lng: 72.8970, name: 'Tilak Nagar / Chembur' },

    // Navi Mumbai & Thane Hubs
    '400601': { lat: 19.1970, lng: 72.9770, name: 'Thane West' },
    '400703': { lat: 19.0720, lng: 72.9980, name: 'Vashi, Navi Mumbai' },
    '400705': { lat: 19.0170, lng: 73.0180, name: 'Sanpada / Nerul' },
    '400706': { lat: 19.0330, lng: 73.0290, name: 'Nerul, Navi Mumbai' },
};

export const MUMBAI_DEFAULT_CENTROID = {
    lat: 19.0760,
    lng: 72.8777,
    name: 'Mumbai Central District',
};

/**
 * Validates coordinate pair
 */
function isValidCoord(lat, lng) {
    return typeof lat === 'number' && typeof lng === 'number' &&
        isFinite(lat) && isFinite(lng) &&
        Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
        !(lat === 0 && lng === 0);
}

/**
 * Extracts 6-digit Indian pincode from an address string
 */
export function extractPincode(address) {
    if (!address || typeof address !== 'string') return null;
    const match = address.match(/\b(4\d{5})\b/);
    return match ? match[1] : null;
}

/**
 * Resolves location according to 4-tier priority:
 *   1. EXIF GPS from photo
 *   2. Device GPS at report time
 *   3. Typed address geocoded to lat/lng
 *   4. Pincode centroid, last resort only (location_source='pincode_approx')
 *
 * @param {object} params
 * @param {object|null} params.exifLocation   - { latitude, longitude }
 * @param {object|null} params.deviceLocation - { latitude, longitude }
 * @param {string}      params.address        - user typed or reverse-geocoded address
 * @param {string|null} params.existingSource - any already assigned source (e.g. LIVE_LOCATION)
 * @returns {Promise<{ latitude: number, longitude: number, address: string, locationSource: string }>}
 */
export async function resolveReportLocation({
    exifLocation = null,
    deviceLocation = null,
    address = '',
    existingSource = null,
} = {}) {
    // ── Tier 1: EXIF GPS from original photo ───────────────────────────
    if (exifLocation && isValidCoord(Number(exifLocation.latitude), Number(exifLocation.longitude))) {
        return {
            latitude: Number(exifLocation.latitude),
            longitude: Number(exifLocation.longitude),
            address: address || '',
            locationSource: 'exif',
        };
    }

    // ── Tier 2: Device GPS at report time ──────────────────────────────
    if (deviceLocation && isValidCoord(Number(deviceLocation.latitude), Number(deviceLocation.longitude))) {
        return {
            latitude: Number(deviceLocation.latitude),
            longitude: Number(deviceLocation.longitude),
            address: address || '',
            locationSource: 'device_gps',
        };
    }

    // ── Tier 3: Typed address geocoded to lat/lng ──────────────────────
    const trimmedAddress = (address || '').trim();
    if (trimmedAddress.length > 3) {
        try {
            const geocoded = await forwardGeocode(trimmedAddress, { limit: 1 });
            if (geocoded && geocoded.length > 0) {
                const first = geocoded[0];
                if (isValidCoord(first.lat, first.lng)) {
                    return {
                        latitude: first.lat,
                        longitude: first.lng,
                        address: trimmedAddress,
                        locationSource: 'geocoded_address',
                    };
                }
            }
        } catch (err) {
            if (__DEV__) console.warn('[LocationResolver] Forward geocoding failed; falling back to pincode centroid.');
        }
    }

    // ── Tier 4: Pincode centroid (last resort only) ────────────────────
    const pincode = extractPincode(trimmedAddress);
    if (pincode && MUMBAI_PINCODE_CENTROIDS[pincode]) {
        const centroid = MUMBAI_PINCODE_CENTROIDS[pincode];
        return {
            latitude: centroid.lat,
            longitude: centroid.lng,
            address: trimmedAddress || `${centroid.name}, Mumbai ${pincode}`,
            locationSource: 'pincode_approx',
        };
    }

    // Fallback to general Mumbai centroid if no coordinates at all
    return {
        latitude: MUMBAI_DEFAULT_CENTROID.lat,
        longitude: MUMBAI_DEFAULT_CENTROID.lng,
        address: trimmedAddress || 'Mumbai, Maharashtra',
        locationSource: 'pincode_approx',
    };
}

export default {
    resolveReportLocation,
    extractPincode,
    MUMBAI_PINCODE_CENTROIDS,
    MUMBAI_DEFAULT_CENTROID,
};
