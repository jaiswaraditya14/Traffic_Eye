// useLocation hook
// Encapsulates location detection, reverse-geocoding, and location_source tracking.
//
// location_source values:
//   'IMAGE_EXIF'      — GPS parsed from image EXIF metadata
//   'MEDIA_LIBRARY'   — GPS retrieved from MediaLibrary asset info (Android fallback)
//   'DEVICE_LOCATION' — Live device GPS (fallback when EXIF unavailable)
//   'MANUAL'          — User typed or pinned on map
//   null              — Not yet determined

import { useState } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export default function useLocation() {
    const [location, setLocation] = useState(null);
    const [address, setAddress] = useState('');
    const [locationSource, setLocationSource] = useState(null);
    const [loading, setLoading] = useState(false);

    // ── Internal address-assembly helper ──────────────────────────────────────
    const buildAddress = (geocode) => {
        const parts = [
            geocode.name,
            geocode.street,
            geocode.district,
            geocode.city,
            geocode.subregion,
            geocode.region,
            geocode.postalCode,
        ].filter(Boolean);
        return [...new Set(parts)].join(', ');
    };

    /**
     * Bounds coordinates to an approximate location within at most a 10-meter
     * radius (≈ ±0.00009 degrees). Used when exact photo EXIF GPS is unavailable
     * so that the device-location fallback cannot pinpoint the user exactly.
     */
    const getApproximate10mCoords = (coords) => {
        if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') return coords;
        const latOffset = (Math.random() - 0.5) * 0.00009;
        const lngOffset = (Math.random() - 0.5) * 0.00009;
        return {
            ...coords,
            latitude: coords.latitude + latOffset,
            longitude: coords.longitude + lngOffset,
            accuracy: Math.min(coords.accuracy ?? 10, 10),
            isApproximate: true,
        };
    };

    /**
     * Request and use live device GPS.
     *
     * @param {boolean} isFallbackMode  — if true, adds ≤10m random offset
     * @param {boolean} guardUserInput  — if true, do NOT overwrite a non-empty address
     *                                    the user already typed (default: false)
     */
    const detectLocation = async (isFallbackMode = false, guardUserInput = false) => {
        try {
            setLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant location access to detect your location.');
                return null;
            }

            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
                timeout: 5000,
            });

            const finalCoords = isFallbackMode ? getApproximate10mCoords(loc.coords) : loc.coords;
            setLocation(finalCoords);

            // Attempt reverse geocoding
            try {
                const addressData = await Location.reverseGeocodeAsync({
                    latitude: finalCoords.latitude,
                    longitude: finalCoords.longitude,
                });

                if (addressData && addressData.length > 0) {
                    const addr = buildAddress(addressData[0]);
                    // Only overwrite if the user has not already typed something
                    if (!guardUserInput || !address.trim()) {
                        setAddress(addr);
                        setLocationSource('DEVICE_LOCATION');
                    }
                    return { coords: finalCoords, address: addr, source: 'DEVICE_LOCATION' };
                }
            } catch (geocodeError) {
                console.warn('[useLocation] Geocoding failed:', geocodeError.message);
            }

            const fallback = `${finalCoords.latitude.toFixed(6)}, ${finalCoords.longitude.toFixed(6)}`;
            if (!guardUserInput || !address.trim()) {
                setAddress(fallback);
                setLocationSource('DEVICE_LOCATION');
            }
            return { coords: finalCoords, address: fallback, source: 'DEVICE_LOCATION' };
        } catch (error) {
            console.error('[useLocation] Error detecting location:', error.message);
            Alert.alert('Error', 'Failed to detect your location.');
            return null;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Reverse-geocode a specific lat/lng pair (e.g. from image EXIF data).
     * Sets location_source to the provided source string.
     *
     * @param {number} latitude
     * @param {number} longitude
     * @param {string} source       — 'IMAGE_EXIF' | 'MEDIA_LIBRARY'
     * @param {boolean} guardUserInput — if true, do NOT overwrite non-empty user address
     */
    const reverseGeocodeFromCoords = async (latitude, longitude, source = 'IMAGE_EXIF', guardUserInput = false) => {
        try {
            setLoading(true);

            const addressData = await Location.reverseGeocodeAsync({ latitude, longitude });

            if (addressData && addressData.length > 0) {
                const addr = buildAddress(addressData[0]);
                if (!guardUserInput || !address.trim()) {
                    setAddress(addr);
                    setLocationSource(source);
                }
                setLocation({ latitude, longitude });
                return { coords: { latitude, longitude }, address: addr, source };
            }

            // Fallback to raw coordinates
            const fallback = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            if (!guardUserInput || !address.trim()) {
                setAddress(fallback);
                setLocationSource(source);
            }
            setLocation({ latitude, longitude });
            return { coords: { latitude, longitude }, address: fallback, source };
        } catch (error) {
            console.error('[useLocation] Error reverse geocoding from coords:', error.message);
            // Still set raw coordinates as fallback — don't leave the user with nothing
            const fallback = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            if (!guardUserInput || !address.trim()) {
                setAddress(fallback);
                setLocationSource(source);
            }
            setLocation({ latitude, longitude });
            return { coords: { latitude, longitude }, address: fallback, source };
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
     * Set location from the map pin picker (manual selection).
     * Always treats this as MANUAL regardless of where the pin lands.
     */
    const setManualLocation = async (coords) => {
        setLocation(coords);
        setLocationSource('MANUAL');
        try {
            const addressData = await Location.reverseGeocodeAsync({
                latitude: coords.latitude,
                longitude: coords.longitude,
            });

            if (addressData && addressData.length > 0) {
                const addr = buildAddress(addressData[0]);
                setAddress(addr);
                return;
            }
        } catch (geocodeError) {
            console.warn('[useLocation] Geocoding failed:', geocodeError.message);
        }

        const fallback = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
        setAddress(fallback);
    };

    return {
        location,
        setLocation,
        address,
        setAddress,
        locationSource,
        loading,
        detectLocation,
        reverseGeocodeFromCoords,
        clearLocation,
        setManualLocation,
    };
}
