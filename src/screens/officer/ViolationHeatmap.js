import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Platform,
    Modal,
    Image,
    ActivityIndicator,
    Alert
} from 'react-native';
import MapView, { Heatmap, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApprovedMapReports, subscribeToApprovedMapReports } from '../../services/reports';
import { supabase } from '../../services/supabase';
import * as Location from 'expo-location';
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    BORDER_RADIUS,
    SHADOWS,
} from '../../utils';

const { width, height } = Dimensions.get('window');

// Base location for map initialization (Mumbai City)
const BASE_LAT = 19.0760;
const BASE_LNG = 72.8777;

export default function ViolationHeatmap({ navigation }) {
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('30_days'); // 'today', '7_days', '30_days'
    
    const mapRef = useRef(null);
    
    // Toggle for Heatmap Layer
    const [showHeatmap, setShowHeatmap] = useState(false);
    
    // Zoom control
    const [isZoomedIn, setIsZoomedIn] = useState(false);
    
    // Details Sheet
    const [selectedMarker, setSelectedMarker] = useState(null);

    // Fetch on mount and subscribe to realtime updates
    useEffect(() => {
        loadData();

        const channel = subscribeToApprovedMapReports(() => {
            console.log('[Live Map] Received update from DB, refreshing map...');
            loadData(false); // Refresh without showing main loading spinner
        });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadData = async (showSpinner = true) => {
        if (showSpinner) setLoading(true);
        const { data, error } = await fetchApprovedMapReports();
        if (error) {
            console.error("Failed to fetch live map reports", error);
            Alert.alert("Error", "Could not load live reports on map.");
        } else if (data) {
            let processedData = [];
            
            // Process the data to add 'weight' for the heatmap and fallback to geocoding if coordinates are missing
            for (let v of data) {
                let lat = v.latitude;
                let lng = v.longitude;
                
                // If missing coordinates but has an address, try to forward-geocode
                if ((lat == null || lng == null) && v.location_address) {
                    try {
                        const geo = await Location.geocodeAsync(v.location_address);
                        if (geo && geo.length > 0) {
                            lat = geo[0].latitude;
                            lng = geo[0].longitude;
                        }
                    } catch (err) {
                        console.log("Geocode failed for", v.location_address);
                    }
                }
                
                // Only keep reports with valid coordinates
                if (lat != null && lng != null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
                    const sv = (v.severity || '').toLowerCase();
                    let weight = 1;
                    if (sv === 'critical' || sv === 'high') weight = 3;
                    else if (sv === 'medium') weight = 2;
                    
                    // Add random jitter (~5-10 meters) so overlapping markers separate visually
                    const jitterLat = (Math.random() - 0.5) * 0.00015;
                    const jitterLng = (Math.random() - 0.5) * 0.00015;

                    processedData.push({ 
                        ...v, 
                        latitude: parseFloat(lat) + jitterLat, 
                        longitude: parseFloat(lng) + jitterLng, 
                        weight 
                    });
                }
            }
                
            setViolations(processedData);

            // Auto-fit to new coordinates if there are any
            if (processedData.length > 0 && mapRef.current) {
                setTimeout(() => {
                    mapRef.current?.fitToCoordinates(
                        processedData.map(v => ({ latitude: v.latitude, longitude: v.longitude })),
                        { edgePadding: { top: 100, right: 80, bottom: 80, left: 80 }, animated: true }
                    );
                }, 500);
            }
        }
        if (showSpinner) setLoading(false);
    };

    // Derived filtered data based on selected time window
    const displayViolations = useMemo(() => {
        if (!violations) return [];
        const now = new Date().getTime();
        let daysCutoff = 30;
        if (timeFilter === 'today') daysCutoff = 1;
        else if (timeFilter === '7_days') daysCutoff = 7;

        const cutoffTime = now - (daysCutoff * 86400000);

        return violations.filter(v => {
            const vTime = new Date(v.reviewed_at || v.submitted_at).getTime();
            return vTime >= cutoffTime;
        });
    }, [violations, timeFilter]);

    // Prepare Heatmap Data
    const heatmapPoints = useMemo(() => {
        return displayViolations.map(v => ({
            latitude: v.latitude,
            longitude: v.longitude,
            weight: v.weight,
        }));
    }, [displayViolations]);

    // Track Zoom level
    const onRegionChangeComplete = useCallback((region) => {
        // latitudeDelta determines the vertical zoom level. 
        // smaller number = more zoomed in.
        const ZOOM_THRESHOLD = 0.035; 
        if (region.latitudeDelta < ZOOM_THRESHOLD && !isZoomedIn) {
            setIsZoomedIn(true);
        } else if (region.latitudeDelta >= ZOOM_THRESHOLD && isZoomedIn) {
            setIsZoomedIn(false);
        }
    }, [isZoomedIn]);

    const handleMarkerPress = (violation) => {
        setSelectedMarker(violation);
    };

    const getSeverityColor = (severity) => {
        const sv = (severity || '').toLowerCase();
        switch (sv) {
            case 'critical':
            case 'high': return COLORS.error || COLORS.danger;
            case 'medium': return COLORS.amber || COLORS.warning;
            case 'low': return COLORS.success || COLORS.info;
            default: return COLORS.textSecondary;
        }
    };

    const renderFilterButton = (label, value) => {
        const isActive = timeFilter === value;
        return (
            <TouchableOpacity
                style={[styles.filterButton, isActive && styles.filterButtonActive]}
                onPress={() => setTimeFilter(value)}
            >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Map View */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={{
                    latitude: BASE_LAT,
                    longitude: BASE_LNG,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                }}
                onRegionChangeComplete={onRegionChangeComplete}
                mapType="standard"
                customMapStyle={[]} // Can add custom dark theme map styles if desired
            >
                {/* Render Heatmap only when layer is toggled and we are zoomed out */}
                {showHeatmap && !isZoomedIn && heatmapPoints.length > 0 && (
                    <Heatmap
                        points={heatmapPoints}
                        radius={Platform.OS === 'ios' ? 40 : 40}
                        opacity={0.8}
                        gradient={{
                            colors: ['transparent', '#00ff00', '#ffff00', '#ff0000'],
                            startPoints: [0.0, 0.1, 0.4, 1.0],
                            colorMapSize: 256
                        }}
                    />
                )}

                {/* Render Markers when heatmap is off OR we have zoomed in */}
                {(!showHeatmap || isZoomedIn) && displayViolations.map(v => (
                    <Marker
                        key={v.id}
                        coordinate={{ latitude: v.latitude, longitude: v.longitude }}
                        onPress={() => handleMarkerPress(v)}
                    >
                        <View style={[styles.markerBody, { backgroundColor: getSeverityColor(v.severity) }]}>
                            <Ionicons name="warning" size={14} color={COLORS.white} />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* Map Layers Tool (Floating Action Button) */}
            <TouchableOpacity 
                style={styles.floatingLayersBtn}
                activeOpacity={0.9}
                onPress={() => setShowHeatmap(!showHeatmap)}
            >
                <Ionicons name="layers" size={24} color={showHeatmap ? COLORS.primary : COLORS.textSecondary} />
                {showHeatmap && <View style={styles.activeDot} />}
            </TouchableOpacity>

            {/* Top Bar Overflow Overlay */}
            <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>Live Map</Text>
                    
                    <View style={styles.filterContainer}>
                        {renderFilterButton('Today', 'today')}
                        {renderFilterButton('7 Days', '7_days')}
                        {renderFilterButton('30 Days', '30_days')}
                    </View>
                </View>

                {/* Zoom/Layer Hint Tooltip */}
                <View style={styles.zoomHintContainer} pointerEvents="none">
                    <View style={styles.zoomHint}>
                        <Ionicons 
                            name={showHeatmap && !isZoomedIn ? "flame" : "search"} 
                            size={16} 
                            color={COLORS.textSecondary} 
                        />
                        <Text style={styles.zoomHintText}>
                            {showHeatmap && !isZoomedIn ? "Heatmap View active. Zoom for details." : "Showing individual markers"}
                        </Text>
                    </View>
                </View>
            </SafeAreaView>

            {/* Loading Indicator */}
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            )}

            {/* Marker Details Bottom Sheet / Modal */}
            <Modal
                visible={!!selectedMarker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedMarker(null)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setSelectedMarker(null)}
                >
                    <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
                        {selectedMarker && (
                            <>
                                <View style={styles.sheetHeader}>
                                    <View style={styles.sheetGrabber} />
                                    <View style={styles.sheetTopRow}>
                                        <View style={styles.typeContainer}>
                                            <Ionicons name="car-sport" size={24} color={COLORS.primary} />
                                            <Text style={styles.sheetTitle}>{selectedMarker.violation_type}</Text>
                                        </View>
                                        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(selectedMarker.severity) }]}>
                                            <Text style={styles.severityText}>{String(selectedMarker.severity).toUpperCase()}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.sheetContent}>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
                                        <Text style={styles.detailText}>
                                            Verified by: {selectedMarker.officer_review?.[0]?.officer?.full_name || 'System'} ({selectedMarker.officer_review?.[0]?.officer?.badge_id || 'AUTO'})
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="time-outline" size={20} color={COLORS.textTertiary} />
                                        <Text style={styles.detailText}>
                                            {new Date(selectedMarker.reviewed_at || selectedMarker.submitted_at).toLocaleString()}
                                        </Text>
                                    </View>
                                    
                                    {selectedMarker.image_url && (
                                        <Image 
                                            source={{ uri: selectedMarker.image_url }} 
                                            style={styles.thumbnail} 
                                            resizeMode="cover"
                                        />
                                    )}
                                </View>

                                <View style={styles.sheetFooter}>
                                    <TouchableOpacity style={styles.actionButton} onPress={() => {
                                        const markerData = { ...selectedMarker };
                                        setSelectedMarker(null);
                                        // Optional: Navigate to Full Report view if needed
                                        // navigation.navigate('VerifiedReportDetail', { reportData: markerData });
                                    }}>
                                        <Text style={styles.actionButtonText}>Close Overlay</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    floatingLayersBtn: {
        position: 'absolute',
        right: SPACING.md,
        bottom: 100, // keep clear of bottom sheet/tab bar
        backgroundColor: COLORS.surface,
        width: 50,
        height: 50,
        borderRadius: BORDER_RADIUS.full,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.md,
    },
    activeDot: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
        borderWidth: 2,
        borderColor: COLORS.surface,
    },
    topOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    headerContainer: {
        marginHorizontal: SPACING.md,
        marginTop: SPACING.xs,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        ...SHADOWS.md,
    },
    headerTitle: {
        fontFamily: 'Nunito-Bold',
        fontSize: FONT_SIZES.xl,
        color: COLORS.primary,
        marginBottom: SPACING.sm,
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surfaceContainerLow,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.xxs,
    },
    filterButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
    },
    filterButtonActive: {
        backgroundColor: COLORS.surface,
        ...SHADOWS.xs,
    },
    filterText: {
        fontFamily: 'Nunito-Medium',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textTertiary,
    },
    filterTextActive: {
        fontFamily: 'Nunito-Bold',
        color: COLORS.primary,
    },
    zoomHintContainer: {
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    zoomHint: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
        ...SHADOWS.sm,
    },
    zoomHintText: {
        fontFamily: 'Nunito-Medium',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        marginLeft: SPACING.xs,
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    markerBody: {
        padding: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.white,
        ...SHADOWS.sm,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: COLORS.overlayLight,
    },
    bottomSheet: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: BORDER_RADIUS.xxxl,
        borderTopRightRadius: BORDER_RADIUS.xxxl,
        padding: SPACING.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
        ...SHADOWS.xl,
    },
    sheetHeader: {
        marginBottom: SPACING.lg,
    },
    sheetGrabber: {
        width: 40,
        height: 5,
        backgroundColor: COLORS.borderLight,
        borderRadius: BORDER_RADIUS.full,
        alignSelf: 'center',
        marginBottom: SPACING.md,
    },
    sheetTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    typeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sheetTitle: {
        fontFamily: 'Nunito-Bold',
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
        marginLeft: SPACING.sm,
    },
    severityBadge: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xxs,
        borderRadius: BORDER_RADIUS.full,
    },
    severityText: {
        fontFamily: 'Nunito-Bold',
        fontSize: FONT_SIZES.xs,
        color: COLORS.white,
    },
    sheetContent: {
        marginBottom: SPACING.lg,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    detailText: {
        fontFamily: 'Nunito-Medium',
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        marginLeft: SPACING.sm,
    },
    thumbnail: {
        width: '100%',
        height: 180,
        borderRadius: BORDER_RADIUS.lg,
        marginTop: SPACING.md,
    },
    sheetFooter: {
        alignItems: 'center',
    },
    actionButton: {
        backgroundColor: COLORS.primary,
        width: '100%',
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.full,
        alignItems: 'center',
    },
    actionButtonText: {
        fontFamily: 'Nunito-Bold',
        fontSize: FONT_SIZES.md,
        color: COLORS.white,
    },
});
