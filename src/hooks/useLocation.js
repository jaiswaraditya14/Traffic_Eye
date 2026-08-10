// useLocation hook
// Encapsulates location detection and geocoding logic

import { useState } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export default function useLocation() {
    const [location, setLocation] = useState(null);
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);

    /**
     * Bounds coordinates to an approximate location within at most a 10-meter radius (approx ±0.00009 degrees).
     * Used when exact photo EXIF GPS is unavailable.
     */
    const getApproximate10mCoords = (coords) => {
        if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') return coords;
        // Bounded random offset <= 10m (0.00009 degrees ~ 10 meters)
        const latOffset = (Math.random() - 0.5) * 0.00009;
        const lngOffset = (Math.random() - 0.5) * 0.00009;
        return {
            ...coords,
            latitude: coords.latitude + latOffset,
            longitude: coords.longitude + lngOffset,
            accuracy: Math.min(coords.accuracy ?? 10, 10), // Bounded to 10m
            isApproximate: true,
        };
    };

    const detectLocation = async (isFallbackMode = false) => {
        try {
            setLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant location access to detect your location.');
                return null;
            }

            // Use Highest accuracy for better precision
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
                timeout: 5000, // Wait up to 5 seconds
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
                    const geocode = addressData[0];
                    const parts = [
                        geocode.name,       // Building name/number
                        geocode.street,
                        geocode.district,   // Neighborhood/Sub-locality
                        geocode.city,
                        geocode.subregion,  // Sub-district
                        geocode.region,     // State
                        geocode.postalCode,
                    ].filter(Boolean);

                    const uniqueParts = [...new Set(parts)];
                    const addr = uniqueParts.join(', ');

                    setAddress(addr);
                    return { coords: finalCoords, address: addr };
                }
            } catch (geocodeError) {
                console.warn('Geocoding failed:', geocodeError);
            }

            const fallback = `${finalCoords.latitude.toFixed(6)}, ${finalCoords.longitude.toFixed(6)}`;
            setAddress(fallback);
            return { coords: finalCoords, address: fallback };
        } catch (error) {
            console.error('Error detecting location:', error);
            Alert.alert('Error', 'Failed to detect your location.');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Reverse geocode from arbitrary coordinates (e.g., from image EXIF data)
    const reverseGeocodeFromCoords = async (latitude, longitude) => {
        try {
            setLoading(true);

            const addressData = await Location.reverseGeocodeAsync({
                latitude,
                longitude,
            });

            if (addressData && addressData.length > 0) {
                const geocode = addressData[0];
                const parts = [
                    geocode.name,
                    geocode.street,
                    geocode.district,
                    geocode.city,
                    geocode.subregion,
                    geocode.region,
                    geocode.postalCode,
                ].filter(Boolean);

                const uniqueParts = [...new Set(parts)];
                const addr = uniqueParts.join(', ');

                setAddress(addr);
                setLocation({ latitude, longitude });
                return { coords: { latitude, longitude }, address: addr };
            }

            // Fallback to raw coordinates
            const fallback = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setAddress(fallback);
            setLocation({ latitude, longitude });
            return { coords: { latitude, longitude }, address: fallback };
        } catch (error) {
            console.error('Error reverse geocoding from coords:', error);
            // Still set the raw coordinates as fallback
            const fallback = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setAddress(fallback);
            setLocation({ latitude, longitude });
            return { coords: { latitude, longitude }, address: fallback };
        } finally {
            setLoading(false);
        }
    };

    const clearLocation = () => {
        setLocation(null);
        setAddress('');
    };

    const setManualLocation = async (coords) => {
        setLocation(coords);
        try {
            const addressData = await Location.reverseGeocodeAsync({
                latitude: coords.latitude,
                longitude: coords.longitude,
            });

            if (addressData && addressData.length > 0) {
                const geocode = addressData[0];
                const parts = [
                    geocode.name,
                    geocode.street,
                    geocode.district,
                    geocode.city,
                    geocode.subregion,
                    geocode.region,
                    geocode.postalCode,
                ].filter(Boolean);

                const uniqueParts = [...new Set(parts)];
                const addr = uniqueParts.join(', ');
                setAddress(addr);
                return;
            }
        } catch (geocodeError) {
            console.warn('Geocoding failed:', geocodeError);
        }
        
        const fallback = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
        setAddress(fallback);
    };

    return {
        location,
        setLocation,
        address,
        loading,
        detectLocation,
        reverseGeocodeFromCoords,
        clearLocation,
        setAddress,
        setManualLocation,
    };
}
