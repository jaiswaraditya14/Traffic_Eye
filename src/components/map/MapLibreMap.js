// src/components/map/MapLibreMap.js
// Reusable MapLibre component powered by OpenFreeMap vector tiles (zero API key)
// Supports tap-to-pin, draggable marker, Photon address search, and GPS location.

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
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { forwardGeocode, reverseGeocode, debounce } from '../../services/geoService';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../utils';

// OpenFreeMap vector tile style
export const OPEN_FREE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
export const OPEN_FREE_MAP_POSITRON = 'https://tiles.openfreemap.org/styles/positron';
export const OPEN_FREE_MAP_BRIGHT = 'https://tiles.openfreemap.org/styles/bright';

// Initialize MapLibre without Mapbox tokens
MapLibreGL.setAccessToken(null);

const DEFAULT_LAT = 19.0760; // Mumbai fallback
const DEFAULT_LNG = 72.8777;
const DEFAULT_ZOOM = 14;

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
    style,
    mapContainerStyle,
    children,
}) {
    const mapRef = useRef(null);
    const cameraRef = useRef(null);

    // Initial center
    const startLat = selectedCoordinate?.latitude || initialCoordinate?.latitude || DEFAULT_LAT;
    const startLng = selectedCoordinate?.longitude || initialCoordinate?.longitude || DEFAULT_LNG;

    const [currentCoord, setCurrentCoord] = useState(
        selectedCoordinate || (initialCoordinate ? { latitude: initialCoordinate.latitude, longitude: initialCoordinate.longitude } : null)
    );
    const [resolvedAddress, setResolvedAddress] = useState('');
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResultsList, setShowResultsList] = useState(false);

    // Sync if selectedCoordinate changes from parent
    useEffect(() => {
        if (selectedCoordinate && selectedCoordinate.latitude && selectedCoordinate.longitude) {
            setCurrentCoord(selectedCoordinate);
        }
    }, [selectedCoordinate]);

    // Reverse geocode whenever current coordinate changes
    const fetchAddressForCoord = useCallback(async (lat, lng) => {
        setIsResolvingAddress(true);
        try {
            const geo = await reverseGeocode(lat, lng);
            if (geo?.displayName) {
                setResolvedAddress(geo.displayName);
                return geo.displayName;
            }
        } catch (err) {
            console.warn('[MapLibreMap] Address lookup failed:', err.message);
        } finally {
            setIsResolvingAddress(false);
        }
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }, []);

    // Initial address lookup
    useEffect(() => {
        if (currentCoord?.latitude && currentCoord?.longitude) {
            fetchAddressForCoord(currentCoord.latitude, currentCoord.longitude);
        }
    }, []);

    // Debounced search handler
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
                    lat: currentCoord?.latitude || DEFAULT_LAT,
                    lon: currentCoord?.longitude || DEFAULT_LNG,
                    limit: 5,
                });
                setSearchResults(results || []);
                setShowResultsList(true);
            } catch (err) {
                console.warn('[MapLibreMap] Search error:', err.message);
            } finally {
                setIsSearching(false);
            }
        }, 400),
        [currentCoord]
    );

    const handleSearchChange = (text) => {
        setSearchQuery(text);
        if (text.trim().length >= 2) {
            debouncedSearch(text);
        } else {
            setSearchResults([]);
            setShowResultsList(false);
        }
    };

    const handleSelectSearchResult = (item) => {
        Keyboard.dismiss();
        setShowResultsList(false);
        setSearchQuery(item.displayName);

        const newCoord = { latitude: item.lat, longitude: item.lng };
        setCurrentCoord(newCoord);
        setResolvedAddress(item.displayName);

        if (cameraRef.current) {
            cameraRef.current.setCamera({
                centerCoordinate: [item.lng, item.lat],
                zoomLevel: 15,
                animationDuration: 1000,
            });
        }

        if (onLocationSelect) {
            onLocationSelect({
                latitude: item.lat,
                longitude: item.lng,
                address: item.displayName,
            });
        }
    };

    // Map Tap Handler
    const handleMapPress = async (feature) => {
        Keyboard.dismiss();
        setShowResultsList(false);

        if (!feature || !feature.geometry || !feature.geometry.coordinates) return;
        const [lng, lat] = feature.geometry.coordinates;

        const newCoord = { latitude: lat, longitude: lng };
        setCurrentCoord(newCoord);

        const addr = await fetchAddressForCoord(lat, lng);

        if (onLocationSelect) {
            onLocationSelect({
                latitude: lat,
                longitude: lng,
                address: addr,
            });
        }
    };

    // GPS My Location
    const handleLocateMe = async () => {
        try {
            let { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                const req = await Location.requestForegroundPermissionsAsync();
                status = req.status;
            }
            if (status !== 'granted') return;

            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (pos?.coords) {
                const { latitude, longitude } = pos.coords;
                const newCoord = { latitude, longitude };
                setCurrentCoord(newCoord);

                if (cameraRef.current) {
                    cameraRef.current.setCamera({
                        centerCoordinate: [longitude, latitude],
                        zoomLevel: 15,
                        animationDuration: 1000,
                    });
                }

                const addr = await fetchAddressForCoord(latitude, longitude);
                if (onLocationSelect) {
                    onLocationSelect({
                        latitude,
                        longitude,
                        address: addr,
                    });
                }
            }
        } catch (err) {
            console.warn('[MapLibreMap] Error getting GPS location:', err.message);
        }
    };

    return (
        <View style={[styles.container, mapContainerStyle]}>
            {/* MapLibre GL Map */}
            <MapLibreGL.MapView
                ref={mapRef}
                style={[styles.map, style]}
                styleURL={styleUrl}
                logoEnabled={false}
                attributionEnabled={true}
                attributionPosition={{ bottom: 8, right: 8 }}
                onPress={handleMapPress}
            >
                <MapLibreGL.Camera
                    ref={cameraRef}
                    defaultSettings={{
                        centerCoordinate: [startLng, startLat],
                        zoomLevel: DEFAULT_ZOOM,
                    }}
                />

                {showUserLocation && (
                    <MapLibreGL.UserLocation visible={true} showsUserHeadingIndicator={true} />
                )}

                {/* Selected Location Pin Marker */}
                {currentCoord && isFinite(currentCoord.latitude) && isFinite(currentCoord.longitude) && (
                    <MapLibreGL.PointAnnotation
                        id="selected-pin-marker"
                        coordinate={[currentCoord.longitude, currentCoord.latitude]}
                        draggable={true}
                        onDragEnd={async (e) => {
                            if (e?.geometry?.coordinates) {
                                const [lng, lat] = e.geometry.coordinates;
                                const updated = { latitude: lat, longitude: lng };
                                setCurrentCoord(updated);
                                const addr = await fetchAddressForCoord(lat, lng);
                                if (onLocationSelect) {
                                    onLocationSelect({ latitude: lat, longitude: lng, address: addr });
                                }
                            }
                        }}
                    >
                        <View style={styles.pinWrapper}>
                            <View style={styles.pinBubble}>
                                <Ionicons name="location" size={32} color="#EF4444" />
                            </View>
                            <View style={styles.pinDot} />
                        </View>
                    </MapLibreGL.PointAnnotation>
                )}

                {children}
            </MapLibreGL.MapView>

            {/* Address Search Header */}
            {showSearch && (
                <View style={styles.searchCard}>
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
                        {isSearching && <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 6 }} />}
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

                    {/* Autocomplete Dropdown */}
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
                                        <Ionicons name="location-outline" size={16} color="#2563EB" style={{ marginRight: 8, marginTop: 2 }} />
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

            {/* GPS Locate Me Floating Button */}
            <TouchableOpacity style={styles.locateBtn} onPress={handleLocateMe} activeOpacity={0.8}>
                <Ionicons name="locate" size={22} color="#0A1E3F" />
            </TouchableOpacity>

            {/* Bottom Address Banner */}
            <View style={styles.bottomBar}>
                <View style={styles.addressInfoBox}>
                    <Ionicons name="navigate-circle" size={20} color="#2563EB" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.addressLabel}>Selected Location</Text>
                        <Text style={styles.addressText} numberOfLines={2}>
                            {isResolvingAddress ? 'Resolving address...' : (resolvedAddress || 'Tap anywhere on map to set pin')}
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
                        <Ionicons name="checkmark-circle" size={18} color="#0A1E3F" style={{ marginLeft: 6 }} />
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
        top: Platform.OS === 'ios' ? 52 : 20,
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
        bottom: 140,
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
        paddingBottom: Platform.OS === 'ios' ? 32 : 18,
        ...SHADOWS.lg,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        zIndex: 5,
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
