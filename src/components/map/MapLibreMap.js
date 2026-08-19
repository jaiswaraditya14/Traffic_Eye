// src/components/map/MapLibreMap.js
//
// Reusable MapLibre location-picker map powered by OpenFreeMap vector tiles.
// Uses the @maplibre/maplibre-react-native v11 flat API:
//   Map, Camera, Marker, UserLocation, GeoJSONSource, Layer
//
// NOTE: v11 API changes from the old MapLibreGL.* namespace:
//  - Component: Map  (not MapLibreGL.MapView)
//  - Prop: mapStyle  (not styleURL)
//  - Camera methods: flyTo/easeTo/jumpTo/fitBounds take { center: [lng, lat] }
//  - Marker: lngLat={[lng, lat]}  (not coordinate={{latitude, longitude}})
//  - Map press event: event.nativeEvent.coordinate: { longitude, latitude }
//  - No built-in drag on Marker in v11 — handled via onDragEnd on Marker

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    FlatList,
    Platform,
    Keyboard,
    Alert,
} from 'react-native';
import {
    Map,
    Camera,
    Marker,
    UserLocation,
} from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { forwardGeocode, reverseGeocode, debounce } from '../../services/geoService';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../utils';

// OpenFreeMap vector tile style (zero API key required)
export const OPEN_FREE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
export const OPEN_FREE_MAP_POSITRON = 'https://tiles.openfreemap.org/styles/positron';
export const OPEN_FREE_MAP_BRIGHT = 'https://tiles.openfreemap.org/styles/bright';

// Mumbai fallback — used only when GPS cannot be obtained
const DEFAULT_LAT = 19.0760; // Mumbai
const DEFAULT_LNG = 72.8777;
const DEFAULT_ZOOM = 13;
const LOCATING_ZOOM = 15;

/**
 * MapLibreMap — reusable location picker
 *
 * Props:
 *   initialCoordinate    { latitude, longitude } — initial camera center if no selection
 *   selectedCoordinate   { latitude, longitude } — externally controlled selection
 *   onLocationSelect     ({ latitude, longitude, address }) — called on tap, drag, search, GPS
 *   styleUrl             map style URL (defaults to OpenFreeMap Liberty)
 *   showSearch           show address search bar (default true)
 *   showUserLocation     show blue GPS dot (default true)
 *   showConfirmButton    show Confirm button in bottom bar (default false)
 *   onConfirm            ({ coordinate: { latitude, longitude }, address }) — called on Confirm
 *   confirmText          label for confirm button
 *   autoLocateOnMount    auto-request GPS and center the map on open (default true)
 *   style                style for the map itself
 *   mapContainerStyle    style for the outer container
 *   children             additional MapLibre children (layers, sources)
 */
export default function MapLibreMap({
    initialCoordinate = null,
    selectedCoordinate = null,
    onLocationSelect,
    styleUrl = OPEN_FREE_MAP_STYLE,
    showSearch = true,
    showUserLocation = true,
    showConfirmButton = false,
    onConfirm,
    confirmText = 'Confirm Location',
    autoLocateOnMount = true,
    style,
    mapContainerStyle,
    children,
}) {
    const cameraRef = useRef(null);
    const insets = useSafeAreaInsets();

    // Measured height of the bottom bar — updated via onLayout on every render.
    // Starts at a reasonable estimate so the button is not at y=0 on first paint.
    const [bottomBarHeight, setBottomBarHeight] = useState(showConfirmButton ? 168 : 112);

    // Derive initial center from props
    const startLng = selectedCoordinate?.longitude ?? initialCoordinate?.longitude ?? DEFAULT_LNG;
    const startLat = selectedCoordinate?.latitude ?? initialCoordinate?.latitude ?? DEFAULT_LAT;

    const [currentCoord, setCurrentCoord] = useState(
        selectedCoordinate ?? initialCoordinate ?? null
    );
    const [resolvedAddress, setResolvedAddress] = useState('');
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [isAutoLocating, setIsAutoLocating] = useState(false);
    const [locationError, setLocationError] = useState(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResultsList, setShowResultsList] = useState(false);

    // Sync if parent updates selectedCoordinate
    useEffect(() => {
        if (
            selectedCoordinate &&
            isFinite(selectedCoordinate.latitude) &&
            isFinite(selectedCoordinate.longitude)
        ) {
            setCurrentCoord(selectedCoordinate);
        }
    }, [selectedCoordinate]);

    // Reverse geocode helper — called after tap, drag, GPS, search
    const fetchAddressForCoord = useCallback(async (lat, lng) => {
        setIsResolvingAddress(true);
        try {
            const geo = await reverseGeocode(lat, lng);
            if (geo?.displayName) {
                setResolvedAddress(geo.displayName);
                return geo.displayName;
            }
        } catch (err) {
            if (__DEV__) console.warn('[MapLibreMap] Address lookup failed:', err.message);
        } finally {
            setIsResolvingAddress(false);
        }
        const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setResolvedAddress(fallback);
        return fallback;
    }, []);

    // Initial address lookup when there is a pre-selected coordinate
    useEffect(() => {
        if (currentCoord?.latitude && currentCoord?.longitude) {
            fetchAddressForCoord(currentCoord.latitude, currentCoord.longitude);
        }
    }, []);

    // Move camera to coordinate (called after tap/drag/search/GPS)
    const flyToCoord = useCallback((lat, lng, zoom = DEFAULT_ZOOM) => {
        if (!cameraRef.current) return;
        if (!isFinite(lat) || !isFinite(lng)) return;
        cameraRef.current.flyTo({ center: [lng, lat], duration: 600 });
    }, []);

    // ── Auto-locate on mount ──────────────────────────────────────────────────
    // Called after map finishes loading. Requests current GPS and centers the map.
    // Only runs when: autoLocateOnMount=true AND no explicit initialCoordinate given.
    const handleAutoLocate = useCallback(async () => {
        // If the parent gave us an explicit starting coordinate, respect it
        if (initialCoordinate && isFinite(initialCoordinate.latitude)) return;
        if (!autoLocateOnMount) return;

        try {
            setIsAutoLocating(true);
            setLocationError(null);

            let { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                const req = await Location.requestForegroundPermissionsAsync();
                status = req.status;
            }

            if (status !== 'granted') {
                // Permission denied — show Mumbai fallback with a note
                setLocationError('Location permission not granted. Showing Mumbai as default.');
                flyToCoord(DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM);
                return;
            }

            // Try current position first (with timeout)
            let pos = null;
            try {
                pos = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                    timeout: 8000,
                });
            } catch (_) {
                // Fallback to last known
            }

            if (!pos?.coords) {
                try {
                    pos = await Location.getLastKnownPositionAsync();
                } catch (_) {}
            }

            if (!pos?.coords) {
                // Could not get location — show Mumbai fallback
                setLocationError('Unable to get current location. Showing Mumbai as default.');
                flyToCoord(DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM);
                return;
            }

            const { latitude, longitude } = pos.coords;

            // Validate coordinates are realistic (not 0,0 Null Island)
            if (
                !isFinite(latitude) ||
                !isFinite(longitude) ||
                (Math.abs(latitude) < 0.001 && Math.abs(longitude) < 0.001)
            ) {
                setLocationError('Invalid GPS coordinates. Showing Mumbai as default.');
                flyToCoord(DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM);
                return;
            }

            const newCoord = { latitude, longitude };
            setCurrentCoord(newCoord);
            flyToCoord(latitude, longitude, LOCATING_ZOOM);

            const addr = await fetchAddressForCoord(latitude, longitude);
            if (onLocationSelect) {
                onLocationSelect({ latitude, longitude, address: addr });
            }
        } catch (err) {
            console.warn('[MapLibreMap] Auto-locate error:', err?.message);
            setLocationError('Unable to determine your current location. Showing Mumbai as default.');
            flyToCoord(DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM);
        } finally {
            setIsAutoLocating(false);
        }
    }, [initialCoordinate, autoLocateOnMount, fetchAddressForCoord, flyToCoord, onLocationSelect]);

    // Trigger auto-locate when map finishes loading
    useEffect(() => {
        if (mapReady) {
            handleAutoLocate();
        }
    }, [mapReady]);

    // Map tap — v11: event.nativeEvent.coordinate: { longitude, latitude }
    const handleMapPress = useCallback(async (event) => {
        Keyboard.dismiss();
        setShowResultsList(false);

        const coord = event?.nativeEvent?.coordinate;
        if (!coord || !isFinite(coord.latitude) || !isFinite(coord.longitude)) return;

        const { latitude, longitude } = coord;
        const newCoord = { latitude, longitude };
        setCurrentCoord(newCoord);
        setLocationError(null);

        const addr = await fetchAddressForCoord(latitude, longitude);
        if (onLocationSelect) {
            onLocationSelect({ latitude, longitude, address: addr });
        }
    }, [fetchAddressForCoord, onLocationSelect]);

    // Marker drag end — v11 Marker onDragEnd
    const handleMarkerDragEnd = useCallback(async (event) => {
        const coord = event?.nativeEvent?.coordinate;
        if (!coord || !isFinite(coord.latitude) || !isFinite(coord.longitude)) return;

        const { latitude, longitude } = coord;
        const newCoord = { latitude, longitude };
        setCurrentCoord(newCoord);
        setLocationError(null);

        const addr = await fetchAddressForCoord(latitude, longitude);
        if (onLocationSelect) {
            onLocationSelect({ latitude, longitude, address: addr });
        }
    }, [fetchAddressForCoord, onLocationSelect]);

    // GPS — "Use My Current Location" button
    const handleLocateMe = useCallback(async () => {
        try {
            setIsAutoLocating(true);
            setLocationError(null);

            let { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                const req = await Location.requestForegroundPermissionsAsync();
                status = req.status;
            }
            if (status !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'Please enable location permission in your device settings to use this feature.',
                    [{ text: 'OK' }]
                );
                return;
            }

            let pos = null;
            try {
                pos = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                    timeout: 8000,
                });
            } catch (_) {}

            if (!pos?.coords) {
                try {
                    pos = await Location.getLastKnownPositionAsync();
                } catch (_) {}
            }

            if (!pos?.coords) {
                Alert.alert(
                    'Location Unavailable',
                    'Unable to determine your current location. Please enable GPS in your device settings.'
                );
                return;
            }

            const { latitude, longitude } = pos.coords;
            if (
                !isFinite(latitude) ||
                !isFinite(longitude) ||
                (Math.abs(latitude) < 0.001 && Math.abs(longitude) < 0.001)
            ) {
                Alert.alert('Location Error', 'Received invalid GPS coordinates from your device.');
                return;
            }

            const newCoord = { latitude, longitude };
            setCurrentCoord(newCoord);
            flyToCoord(latitude, longitude, LOCATING_ZOOM);

            const addr = await fetchAddressForCoord(latitude, longitude);
            if (onLocationSelect) {
                onLocationSelect({ latitude, longitude, address: addr });
            }
        } catch (err) {
            console.warn('[MapLibreMap] GPS error:', err?.message);
            Alert.alert('Location Error', 'Failed to get your current location. Please try again.');
        } finally {
            setIsAutoLocating(false);
        }
    }, [fetchAddressForCoord, flyToCoord, onLocationSelect]);

    // Debounced forward search
    const debouncedSearch = useCallback(
        debounce(async (text) => {
            if (!text || text.trim().length < 2) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }
            setIsSearching(true);
            try {
                const results = await forwardGeocode(text, {
                    lat: currentCoord?.latitude ?? DEFAULT_LAT,
                    lon: currentCoord?.longitude ?? DEFAULT_LNG,
                    limit: 5,
                });
                setSearchResults(results || []);
                setShowResultsList(true);
            } catch (err) {
                if (__DEV__) console.warn('[MapLibreMap] Search error:', err.message);
            } finally {
                setIsSearching(false);
            }
        }, 400),
        [currentCoord?.latitude, currentCoord?.longitude]
    );

    const handleSearchChange = useCallback((text) => {
        setSearchQuery(text);
        if (text.trim().length >= 2) {
            debouncedSearch(text);
        } else {
            setSearchResults([]);
            setShowResultsList(false);
        }
    }, [debouncedSearch]);

    const handleSelectSearchResult = useCallback((item) => {
        Keyboard.dismiss();
        setShowResultsList(false);
        setSearchQuery(item.displayName);
        setLocationError(null);

        const newCoord = { latitude: item.lat, longitude: item.lng };
        setCurrentCoord(newCoord);
        setResolvedAddress(item.displayName);
        flyToCoord(item.lat, item.lng, LOCATING_ZOOM);

        if (onLocationSelect) {
            onLocationSelect({
                latitude: item.lat,
                longitude: item.lng,
                address: item.displayName,
            });
        }
    }, [flyToCoord, onLocationSelect]);

    // ── Bottom bar height — measured via onLayout (see bottomBar View below) ──
    // Do NOT use a fixed pixel estimate; the bar height varies with:
    //   • address text length (wraps to 2 lines on narrow screens)
    //   • presence of the location error banner
    //   • presence of the confirm button
    //   • the system navigation inset (gesture vs 3-button nav)
    // The useState initial value is a reasonable first-paint estimate only.

    return (
        <View style={[styles.container, mapContainerStyle]}>
            {/* MapLibre v11 Map */}
            <Map
                style={[styles.map, style]}
                mapStyle={styleUrl}
                logo={false}
                attribution={true}
                attributionPosition={{ bottom: bottomBarHeight + 4, right: 8 }}
                onPress={handleMapPress}
                onDidFinishLoadingMap={() => setMapReady(true)}
            >
                <Camera
                    ref={cameraRef}
                    defaultSettings={{
                        centerCoordinate: [startLng, startLat],
                        zoomLevel: DEFAULT_ZOOM,
                    }}
                />

                {showUserLocation && (
                    <UserLocation visible={true} showsUserHeadingIndicator={true} />
                )}

                {/* Selected location pin — draggable */}
                {currentCoord &&
                    isFinite(currentCoord.latitude) &&
                    isFinite(currentCoord.longitude) && (
                        <Marker
                            id="selected-pin"
                            lngLat={[currentCoord.longitude, currentCoord.latitude]}
                            draggable={true}
                            onDragEnd={handleMarkerDragEnd}
                        >
                            <View style={styles.pinWrapper}>
                                <View style={styles.pinBubble}>
                                    <Ionicons name="location" size={36} color="#EF4444" />
                                </View>
                                <View style={styles.pinDot} />
                            </View>
                        </Marker>
                    )}

                {children}
            </Map>

            {/* Address search bar — positioned below status bar using insets.top */}
            {showSearch && (
                <View style={[styles.searchCard, { top: insets.top + 12 }]}>
                    <View style={styles.searchInputRow}>
                        <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search address or area..."
                            placeholderTextColor="#94A3B8"
                            value={searchQuery}
                            onChangeText={handleSearchChange}
                            onFocus={() => {
                                if (searchResults.length > 0) setShowResultsList(true);
                            }}
                            returnKeyType="search"
                        />
                        {isSearching && (
                            <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 6 }} />
                        )}
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => {
                                    setSearchQuery('');
                                    setSearchResults([]);
                                    setShowResultsList(false);
                                }}
                            >
                                <Ionicons name="close-circle" size={18} color="#94A3B8" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Autocomplete dropdown */}
                    {showResultsList && searchResults.length > 0 && (
                        <View style={styles.dropdown}>
                            <FlatList
                                data={searchResults}
                                keyExtractor={(item, index) => `${item.lat}_${item.lng}_${index}`}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.dropdownItem}
                                        onPress={() => handleSelectSearchResult(item)}
                                    >
                                        <Ionicons
                                            name="location-outline"
                                            size={16}
                                            color="#2563EB"
                                            style={{ marginRight: 8, marginTop: 2 }}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.dropdownTitle} numberOfLines={1}>
                                                {item.street || item.city || item.displayName}
                                            </Text>
                                            <Text style={styles.dropdownSubtitle} numberOfLines={1}>
                                                {item.displayName}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    )}
                </View>
            )}

            {/* GPS locate-me / "Use My Current Location" button */}
            {/* Bottom offset uses the measured bar height so it always floats above the bar */}
            <TouchableOpacity
                style={[styles.locateBtn, { bottom: bottomBarHeight + 12 }]}
                onPress={handleLocateMe}
                activeOpacity={0.8}
                disabled={isAutoLocating}
            >
                {isAutoLocating ? (
                    <ActivityIndicator size="small" color="#0A1E3F" />
                ) : (
                    <Ionicons name="locate" size={22} color="#0A1E3F" />
                )}
            </TouchableOpacity>

            {/* Bottom bar — shows resolved address and optional confirm button */}
            {/* onLayout measures the actual rendered height so the GPS button stays above it */}
            <View
                style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}
                onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}
            >
                {/* Auto-locating spinner row */}
                {isAutoLocating && (
                    <View style={styles.locatingRow}>
                        <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 8 }} />
                        <Text style={styles.locatingText}>Getting your current location…</Text>
                    </View>
                )}

                {/* Location permission/GPS error message */}
                {locationError && !isAutoLocating && (
                    <View style={styles.locationErrorRow}>
                        <Ionicons name="alert-circle-outline" size={14} color="#B45309" style={{ marginRight: 6 }} />
                        <Text style={styles.locationErrorText} numberOfLines={2}>
                            {locationError}
                        </Text>
                    </View>
                )}

                <View style={styles.addressInfoBox}>
                    <Ionicons
                        name="navigate-circle"
                        size={20}
                        color="#2563EB"
                        style={{ marginRight: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.addressLabel}>Selected Location</Text>
                        <Text style={styles.addressText} numberOfLines={2}>
                            {isResolvingAddress
                                ? 'Resolving address...'
                                : resolvedAddress || 'Tap anywhere on the map to set a pin'}
                        </Text>
                        {currentCoord && (
                            <Text style={styles.coordsText}>
                                {currentCoord.latitude.toFixed(6)}, {currentCoord.longitude.toFixed(6)}
                            </Text>
                        )}
                    </View>
                </View>

                {showConfirmButton && (
                    <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={() => {
                            if (onConfirm) {
                                onConfirm({
                                    coordinate: currentCoord,
                                    address: resolvedAddress,
                                });
                            }
                        }}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.confirmBtnText}>{confirmText}</Text>
                        <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#0A1E3F"
                            style={{ marginLeft: 6 }}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    map: {
        flex: 1,
    },
    pinWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pinBubble: {
        transform: [{ translateY: -14 }],
    },
    pinDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#EF4444',
        position: 'absolute',
        bottom: 0,
    },
    searchCard: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 10,
    },
    searchInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        ...SHADOWS.md,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#0F172A',
        paddingVertical: 0,
    },
    dropdown: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginTop: 6,
        maxHeight: 200,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...SHADOWS.lg,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    dropdownTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A',
    },
    dropdownSubtitle: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 1,
    },
    locateBtn: {
        position: 'absolute',
        right: 16,
        backgroundColor: '#FFFFFF',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.md,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        zIndex: 5,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 16,
        // paddingBottom set dynamically via insets.bottom — no hardcoded value
        ...SHADOWS.lg,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        zIndex: 5,
    },
    locatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: '#EFF6FF',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    locatingText: {
        fontSize: 13,
        color: '#1E40AF',
        fontWeight: '500',
    },
    locationErrorRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
        backgroundColor: '#FEF3C7',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    locationErrorText: {
        flex: 1,
        fontSize: 12,
        color: '#92400E',
    },
    addressInfoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    addressLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    addressText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A',
        marginTop: 2,
    },
    coordsText: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    confirmBtn: {
        backgroundColor: '#F59E0B',
        borderRadius: 12,
        height: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0A1E3F',
    },
});
