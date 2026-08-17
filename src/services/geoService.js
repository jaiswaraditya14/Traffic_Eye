// src/services/geoService.js
// High-performance, zero-API-key geocoding service.
// Primary: Photon (Komoot / OpenStreetMap)
// Fallback 1: Nominatim (OpenStreetMap)
// Fallback 2: expo-location native geocoding

import * as Location from 'expo-location';

const PHOTON_FORWARD_URL = 'https://photon.komoot.io/api/';
const PHOTON_REVERSE_URL = 'https://photon.komoot.io/reverse';
const NOMINATIM_FORWARD_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

const REQUEST_TIMEOUT_MS = 6000;
const USER_AGENT = 'TrafficEye/1.0 (com.anonymous.TrafficEye; support@trafficeye.local)';

// ── In-Memory Cache (LRU-like with max items) ─────────────────────────────────
const MAX_CACHE_SIZE = 150;
const forwardCache = new Map();
const reverseCache = new Map();

// ── In-Flight Request Deduplication Map ───────────────────────────────────────
const inFlightRequests = new Map();

/**
 * Round coordinates to 5 decimal places (~1.1m precision) for cache keys
 */
const getCoordCacheKey = (lat, lng) => {
    return `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
};

/**
 * Trim cache to max size
 */
const setCacheItem = (cacheMap, key, value) => {
    if (cacheMap.size >= MAX_CACHE_SIZE) {
        const firstKey = cacheMap.keys().next().value;
        if (firstKey !== undefined) cacheMap.delete(firstKey);
    }
    cacheMap.set(key, value);
};

/**
 * Fetch helper with timeout and custom headers
 */
const fetchWithTimeout = async (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'User-Agent': USER_AGENT,
                ...(options.headers || {}),
            },
        });
        clearTimeout(timer);
        return response;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
};

/**
 * Normalize Photon feature into standardized address object
 */
const normalizePhotonFeature = (feature) => {
    if (!feature || !feature.properties) return null;
    const p = feature.properties;
    const coords = feature.geometry?.coordinates || []; // [lng, lat]

    const street = [p.housenumber, p.street || p.name].filter(Boolean).join(' ').trim() || p.name || '';
    const city = p.city || p.town || p.village || p.district || p.locality || p.county || '';
    const state = p.state || '';
    const postal_code = p.postcode || '';
    const country = p.country || '';

    const parts = [
        street,
        p.district && p.district !== city ? p.district : null,
        city,
        state,
        postal_code,
        country,
    ].filter(Boolean);

    const displayName = [...new Set(parts)].join(', ');

    return {
        street,
        city,
        state,
        postal_code,
        country,
        lat: typeof coords[1] === 'number' ? coords[1] : (typeof p.lat === 'number' ? p.lat : null),
        lng: typeof coords[0] === 'number' ? coords[0] : (typeof p.lon === 'number' ? p.lon : null),
        displayName: displayName || p.name || 'Unknown Location',
        raw: feature,
    };
};

/**
 * Normalize Nominatim result into standardized address object
 */
const normalizeNominatimResult = (item) => {
    if (!item) return null;
    const addr = item.address || {};
    const street = [addr.house_number, addr.road || addr.pedestrian || addr.street].filter(Boolean).join(' ').trim() || '';
    const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || '';
    const state = addr.state || '';
    const postal_code = addr.postcode || '';
    const country = addr.country || '';

    const parts = [
        street,
        addr.suburb && addr.suburb !== city ? addr.suburb : null,
        city,
        state,
        postal_code,
        country,
    ].filter(Boolean);

    const displayName = item.display_name || [...new Set(parts)].join(', ');

    return {
        street,
        city,
        state,
        postal_code,
        country,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: displayName || 'Unknown Location',
        raw: item,
    };
};

/**
 * Normalize expo-location reverse geocode result into standardized address object
 */
const normalizeExpoResult = (expoItem, lat, lng) => {
    if (!expoItem) return null;
    const street = [expoItem.name, expoItem.street].filter(Boolean).join(' ').trim();
    const city = expoItem.city || expoItem.district || expoItem.subregion || '';
    const state = expoItem.region || '';
    const postal_code = expoItem.postalCode || '';
    const country = expoItem.country || '';

    const parts = [
        street,
        expoItem.district && expoItem.district !== city ? expoItem.district : null,
        city,
        state,
        postal_code,
        country,
    ].filter(Boolean);

    const displayName = [...new Set(parts)].join(', ');

    return {
        street,
        city,
        state,
        postal_code,
        country,
        lat: Number(lat),
        lng: Number(lng),
        displayName: displayName || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        raw: expoItem,
    };
};

// ── Service Methods ───────────────────────────────────────────────────────────

/**
 * Forward Geocoding: Converts an address search query into coordinates & normalized suggestions.
 *
 * @param {string} query
 * @param {object} [options]
 * @param {number} [options.limit=5]
 * @param {number} [options.lat]
 * @param {number} [options.lon]
 * @returns {Promise<Array<object>>}
 */
export const forwardGeocode = async (query, options = {}) => {
    if (!query || typeof query !== 'string' || !query.trim()) {
        return [];
    }

    const trimmedQuery = query.trim();
    const cacheKey = `fwd:${trimmedQuery.toLowerCase()}`;

    if (forwardCache.has(cacheKey)) {
        return forwardCache.get(cacheKey);
    }

    if (inFlightRequests.has(cacheKey)) {
        return inFlightRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
        const limit = options.limit || 5;

        // 1. Try Photon
        try {
            let photonUrl = `${PHOTON_FORWARD_URL}?q=${encodeURIComponent(trimmedQuery)}&limit=${limit}`;
            if (options.lat && options.lon) {
                photonUrl += `&lat=${options.lat}&lon=${options.lon}`;
            }

            const response = await fetchWithTimeout(photonUrl);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.features) && data.features.length > 0) {
                    const normalized = data.features
                        .map(normalizePhotonFeature)
                        .filter((item) => item && item.lat !== null && item.lng !== null);

                    if (normalized.length > 0) {
                        setCacheItem(forwardCache, cacheKey, normalized);
                        return normalized;
                    }
                }
            }
        } catch (photonErr) {
            console.warn('[geoService] Photon forward geocode failed, trying Nominatim fallback:', photonErr.message);
        }

        // 2. Fallback to Nominatim
        try {
            const nominatimUrl = `${NOMINATIM_FORWARD_URL}?format=json&addressdetails=1&limit=${limit}&q=${encodeURIComponent(trimmedQuery)}`;
            const response = await fetchWithTimeout(nominatimUrl);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    const normalized = data
                        .map(normalizeNominatimResult)
                        .filter((item) => item && !isNaN(item.lat) && !isNaN(item.lng));

                    if (normalized.length > 0) {
                        setCacheItem(forwardCache, cacheKey, normalized);
                        return normalized;
                    }
                }
            }
        } catch (nomErr) {
            console.warn('[geoService] Nominatim forward geocode failed, trying expo-location fallback:', nomErr.message);
        }

        // 3. Fallback to native expo-location geocodeAsync
        try {
            const expoResults = await Location.geocodeAsync(trimmedQuery);
            if (Array.isArray(expoResults) && expoResults.length > 0) {
                const normalized = expoResults.map((res) => ({
                    street: '',
                    city: '',
                    state: '',
                    postal_code: '',
                    country: '',
                    lat: res.latitude,
                    lng: res.longitude,
                    displayName: trimmedQuery,
                    raw: res,
                }));
                setCacheItem(forwardCache, cacheKey, normalized);
                return normalized;
            }
        } catch (expoErr) {
            console.warn('[geoService] expo-location forward geocode failed:', expoErr.message);
        }

        return [];
    })();

    inFlightRequests.set(cacheKey, requestPromise);
    try {
        const results = await requestPromise;
        return results;
    } finally {
        inFlightRequests.delete(cacheKey);
    }
};

/**
 * Reverse Geocoding: Converts lat/lng coordinates into a normalized address.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<object>}
 */
export const reverseGeocode = async (latitude, longitude) => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
        return {
            street: '',
            city: '',
            state: '',
            postal_code: '',
            country: '',
            lat: 0,
            lng: 0,
            displayName: 'Invalid Coordinates',
            raw: null,
        };
    }

    const cacheKey = getCoordCacheKey(lat, lng);

    if (reverseCache.has(cacheKey)) {
        return reverseCache.get(cacheKey);
    }

    if (inFlightRequests.has(cacheKey)) {
        return inFlightRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
        // 1. Try Photon
        try {
            const photonUrl = `${PHOTON_REVERSE_URL}?lat=${lat}&lon=${lng}`;
            const response = await fetchWithTimeout(photonUrl);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.features) && data.features.length > 0) {
                    const normalized = normalizePhotonFeature(data.features[0]);
                    if (normalized) {
                        normalized.lat = lat;
                        normalized.lng = lng;
                        setCacheItem(reverseCache, cacheKey, normalized);
                        return normalized;
                    }
                }
            }
        } catch (photonErr) {
            console.warn('[geoService] Photon reverse geocode failed, trying Nominatim fallback:', photonErr.message);
        }

        // 2. Fallback to Nominatim
        try {
            const nominatimUrl = `${NOMINATIM_REVERSE_URL}?format=json&addressdetails=1&lat=${lat}&lon=${lng}`;
            const response = await fetchWithTimeout(nominatimUrl);
            if (response.ok) {
                const data = await response.json();
                if (data && !data.error) {
                    const normalized = normalizeNominatimResult(data);
                    if (normalized) {
                        normalized.lat = lat;
                        normalized.lng = lng;
                        setCacheItem(reverseCache, cacheKey, normalized);
                        return normalized;
                    }
                }
            }
        } catch (nomErr) {
            console.warn('[geoService] Nominatim reverse geocode failed, trying expo-location fallback:', nomErr.message);
        }

        // 3. Fallback to native expo-location reverseGeocodeAsync
        try {
            const expoResults = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (Array.isArray(expoResults) && expoResults.length > 0) {
                const normalized = normalizeExpoResult(expoResults[0], lat, lng);
                if (normalized) {
                    setCacheItem(reverseCache, cacheKey, normalized);
                    return normalized;
                }
            }
        } catch (expoErr) {
            console.warn('[geoService] expo-location reverse geocode failed:', expoErr.message);
        }

        // Final safe fallback
        const fallback = {
            street: '',
            city: '',
            state: '',
            postal_code: '',
            country: '',
            lat,
            lng,
            displayName: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            raw: null,
        };
        setCacheItem(reverseCache, cacheKey, fallback);
        return fallback;
    })();

    inFlightRequests.set(cacheKey, requestPromise);
    try {
        const result = await requestPromise;
        return result;
    } finally {
        inFlightRequests.delete(cacheKey);
    }
};

/**
 * Utility debounce helper for forward geocode inputs
 */
export const debounce = (func, wait = 400) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        return new Promise((resolve) => {
            timeout = setTimeout(async () => {
                const result = await func(...args);
                resolve(result);
            }, wait);
        });
    };
};

export default {
    forwardGeocode,
    reverseGeocode,
    debounce,
};
