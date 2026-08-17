// useLocation hook
// Encapsulates location detection, reverse-geocoding, and locationSource tracking.
//
// Standard locationSource values:
//   'IMAGE_EXIF'    — GPS extracted from image metadata / EXIF tags
//   'LIVE_LOCATION' — High-accuracy live device GPS provided by user
//   'MANUAL'        — User typed address or selected pin on map
//   'NOT_FOUND'     — No location available

import { useState } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { validateCoordinates } from '../utils/exifParser';
import { reverseGeocode } from '../services/geoService';

export default function useLocation() {
    const [location, setLocation] = useState(null);
    const [address, setAddress] = useState('');
    const [locationSource, setLocationSource] = useState(null);
    const [loading, setLoading] = useState(false);

    /**
     * Request and acquire current live device GPS coordinates.
     * Marks locationSource as 'LIVE_LOCATION'.
     *
     * @param {boolean} guardUserInput — if true, do not overwrite non-empty user address
     * @param {boolean} silent — if true, suppress blocking permission alerts on background/fallback calls
     * @returns {Promise<{ coords: { latitude: number, longitude: number }, address: string, source: string } | null>}
     */
    const detectLocation = async (guardUserInput = false, silent = false) => {
        try {
            setLoading(true);
            let { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                const permRes = await Location.requestForegroundPermissionsAsync();
                status = permRes.status;
            }
            if (status !== 'granted') {
                if (!silent) {
                    Alert.alert(
                        'Location Permission Required',
                        'Traffic Eye needs location access to verify incident locations. Please enable location permission in your device settings.'
                    );
                }
                return null;
            }

            let loc = null;

            // Tier 1: Try high/balanced accuracy with a short timeout
            try {
                loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                    timeout: 6000,
                });
            } catch (pErr) {
                // Tier 1 timeout/error - fallback to last known
            }

            // Tier 2: Fallback to last known position (instant on Android/iOS)
            if (!loc?.coords) {
                try {
                    loc = await Location.getLastKnownPositionAsync();
                } catch (lastErr) {
                    // Ignore and try lowest accuracy
                }
            }

            // Tier 3: Fallback to lowest accuracy
            if (!loc?.coords) {
                try {
                    loc = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Lowest,
                        timeout: 5000,
                    });
                } catch (lowErr) {
                    // Provider unavailable
                }
            }

            if (!loc?.coords) {
                if (!silent) {
                    Alert.alert('Location Error', 'Failed to detect current device location. Please ensure device GPS is turned on.');
                }
                return null;
            }

            const valid = validateCoordinates(loc.coords.latitude, loc.coords.longitude);
            if (!valid) {
                if (!silent) {
                    Alert.alert('Location Error', 'Received invalid coordinates from device GPS.');
                }
                return null;
            }

            const finalCoords = { latitude: valid.latitude, longitude: valid.longitude };
            setLocation(finalCoords);
            setLocationSource('LIVE_LOCATION');

            // Attempt reverse geocoding via geoService (Photon -> Nominatim -> expo-location)
            let resolvedAddress = `${valid.latitude.toFixed(6)}, ${valid.longitude.toFixed(6)}`;
            try {
                const geoResult = await reverseGeocode(valid.latitude, valid.longitude);
                if (geoResult?.displayName && geoResult.displayName.trim()) {
                    resolvedAddress = geoResult.displayName.trim();
                }
            } catch (geocodeError) {
                console.warn('[useLocation] Reverse geocoding failed (using coords):', geocodeError.message);
            }

            if (!guardUserInput || !address.trim()) {
                setAddress(resolvedAddress);
            }

            return { coords: finalCoords, address: resolvedAddress, source: 'LIVE_LOCATION' };
        } catch (error) {
            console.error('[useLocation] Error detecting live location:', error.message);
            if (!silent) {
                Alert.alert('Location Error', 'Failed to detect current device location. Please ensure GPS is turned on.');
            }
            return null;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Reverse-geocode specific coordinates (e.g. from image EXIF metadata).
     * Retains the coordinates as authoritative even if geocoding fails.
     *
     * @param {number} latitude
     * @param {number} longitude
     * @param {string} source — 'IMAGE_EXIF' | 'LIVE_LOCATION' | 'MANUAL'
     * @param {boolean} guardUserInput — if true, do not overwrite non-empty user address
     * @returns {Promise<{ coords: { latitude: number, longitude: number }, address: string, source: string } | null>}
     */
    const reverseGeocodeFromCoords = async (latitude, longitude, source = 'IMAGE_EXIF', guardUserInput = false) => {
        const valid = validateCoordinates(latitude, longitude);
        if (!valid) {
            console.warn('[useLocation] Invalid coordinates passed to reverseGeocodeFromCoords:', { latitude, longitude });
            return null;
        }

        const finalCoords = { latitude: valid.latitude, longitude: valid.longitude };
        setLocation(finalCoords);
        setLocationSource(source);

        try {
            setLoading(true);
            let resolvedAddress = `${valid.latitude.toFixed(6)}, ${valid.longitude.toFixed(6)}`;

            try {
                const geoResult = await reverseGeocode(valid.latitude, valid.longitude);
                if (geoResult?.displayName && geoResult.displayName.trim()) {
                    resolvedAddress = geoResult.displayName.trim();
                }
            } catch (geocodeError) {
                console.warn('[useLocation] Reverse geocode network error (preserving coords):', geocodeError.message);
            }

            if (!guardUserInput || !address.trim()) {
                setAddress(resolvedAddress);
            }

            return { coords: finalCoords, address: resolvedAddress, source };
        } finally {
            setLoading(false);
        }
    };

    const clearLocation = () => {
        setLocation(null);
        setAddress('');
        setLocationSource(null);
    };

    /**
     * Set location from manual pin on map.
     *
     * @param {{ latitude: number, longitude: number }} coords
     * @param {string} [presetAddress]
     */
    const setManualLocation = async (coords, presetAddress = null) => {
        const valid = validateCoordinates(coords?.latitude, coords?.longitude);
        if (!valid) return;

        const finalCoords = { latitude: valid.latitude, longitude: valid.longitude };
        setLocation(finalCoords);
        setLocationSource('MANUAL');

        if (presetAddress && typeof presetAddress === 'string' && presetAddress.trim()) {
            setAddress(presetAddress.trim());
            return;
        }

        let fallbackAddr = `${valid.latitude.toFixed(6)}, ${valid.longitude.toFixed(6)}`;
        try {
            const geoResult = await reverseGeocode(valid.latitude, valid.longitude);
            if (geoResult?.displayName && geoResult.displayName.trim()) {
                setAddress(geoResult.displayName.trim());
                return;
            }
        } catch (geocodeError) {
            console.warn('[useLocation] Manual pin geocoding failed:', geocodeError.message);
        }
        setAddress(fallbackAddr);
    };

    return {
        location,
        setLocation,
        address,
        setAddress,
        locationSource,
        setLocationSource,
        loading,
        detectLocation,
        reverseGeocodeFromCoords,
        clearLocation,
        setManualLocation,
    };
}
