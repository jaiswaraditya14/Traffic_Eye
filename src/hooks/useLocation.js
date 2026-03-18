// useLocation hook
// Encapsulates location detection and geocoding logic

import { useState } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export default function useLocation() {
    const [location, setLocation] = useState(null);
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);

    const detectLocation = async () => {
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

            setLocation(loc.coords);

            // Attempt reverse geocoding
            try {
                // Fetch extra details for more accurate naming
                const addressData = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
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

                    // Filter duplicates (sometimes street and name are the same)
                    const uniqueParts = [...new Set(parts)];
                    const addr = uniqueParts.join(', ');

                    setAddress(addr);
                    return { coords: loc.coords, address: addr };
                }
            } catch (geocodeError) {
                console.warn('Geocoding failed:', geocodeError);
            }

            const fallback = `${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`;
            setAddress(fallback);
            return { coords: loc.coords, address: fallback };
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

    return {
        location,
        address,
        loading,
        detectLocation,
        reverseGeocodeFromCoords,
        clearLocation,
        setAddress,
    };
}
