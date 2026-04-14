import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Platform,
    Modal,
    Image,
    ActivityIndicator
} from 'react-native';
import MapView, { Heatmap, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    BORDER_RADIUS,
    SHADOWS,
} from '../../utils';

const { width, height } = Dimensions.get('window');

// Base location for mock data (Mumbai City)
const BASE_LAT = 19.0760;
const BASE_LNG = 72.8777;

const VEHICLE_IMAGES = [
    'https://images.unsplash.com/photo-1549317661-bc32c58a1ce7?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1510166089176-b57564a5f782?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1544620347-19eb79f42b3b?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1544160455-ce711ac3cc3d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1511216335778-7cb8f49fa7a3?auto=format&fit=crop&w=400&q=80',
];

const generateMockData = (count) => {
    const types = ['Speeding', 'Red Light', 'Wrong Way', 'No Helmet', 'Illegal Parking'];
    const severities = ['High', 'Medium', 'Low'];
    const data = [];
    
    // Define some "hotspots" or busy intersections to make density realistic
    const hotspots = [
        { lat: BASE_LAT, lng: BASE_LNG },
        { lat: BASE_LAT + 0.05, lng: BASE_LNG - 0.02 },
        { lat: BASE_LAT - 0.03, lng: BASE_LNG + 0.04 },
        { lat: BASE_LAT + 0.08, lng: BASE_LNG + 0.01 },
    ];

    for (let i = 0; i < count; i++) {
        // 70% of points around hotspots, 30% random
        const isHotspot = Math.random() < 0.7;
        let lat, lng;
        
        if (isHotspot) {
            const spot = hotspots[Math.floor(Math.random() * hotspots.length)];
            // Cluster tightly around the hotspot
            lat = spot.lat + (Math.random() - 0.5) * 0.03;
            lng = spot.lng + (Math.random() - 0.5) * 0.03;
        } else {
            // Randomly scattered
            lat = BASE_LAT + (Math.random() - 0.5) * 0.28;
            lng = BASE_LNG + (Math.random() - 0.5) * 0.12;
        }

        const severity = severities[Math.floor(Math.random() * severities.length)];
        
        // Weight determines heat. Avoid random 0-100 so individual points don't max the color gradient.
        let weight = 1;
        if (severity === 'High') weight = 3;
        else if (severity === 'Medium') weight = 2;

        data.push({
            id: `v-${i}`,
            latitude: lat,
            longitude: lng,
            violationType: types[Math.floor(Math.random() * types.length)],
            timestamp: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
            severity: severity,
            imageUrl: VEHICLE_IMAGES[Math.floor(Math.random() * VEHICLE_IMAGES.length)],
            weight: weight
        });
    }
    return data;
};

const ALL_MOCK_DATA = generateMockData(800);

export default function ViolationHeatmap({ navigation }) {
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('30_days'); // 'today', '7_days', '30_days'
    
    // Toggle for Heatmap Layer
    const [showHeatmap, setShowHeatmap] = useState(false);
    
    // Zoom control
    const [isZoomedIn, setIsZoomedIn] = useState(false);
    
    // Details Sheet
    const [selectedMarker, setSelectedMarker] = useState(null);

    // Initial load
    useEffect(() => {
        fetchViolations(timeFilter);
    }, [timeFilter]);

    // Data fetching wrapper (easy to replace with Supabase)
    const fetchViolations = async (filter) => {
        setLoading(true);
        try {
            // Mocking network delay
            await new Promise(resolve => setTimeout(resolve, 600));
            
            const now = new Date().getTime();
            let daysCutoff = 30;
            if (filter === 'today') daysCutoff = 1;
            else if (filter === '7_days') daysCutoff = 7;

            const cutoffTime = now - (daysCutoff * 86400000);

            const filteredData = ALL_MOCK_DATA.filter(v => {
                const vTime = new Date(v.timestamp).getTime();
                return vTime >= cutoffTime;
            });

            setViolations(filteredData);
        } catch (error) {
            console.error("Failed to fetch violations", error);
        } finally {
            setLoading(false);
        }
    };

    // Prepare Heatmap Data
    const heatmapPoints = useMemo(() => {
        return violations.map(v => ({
            latitude: v.latitude,
            longitude: v.longitude,
            weight: v.weight,
        }));
    }, [violations]);

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
        switch (severity) {
            case 'High': return COLORS.danger;
            case 'Medium': return COLORS.warning;
            default: return COLORS.success;
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
                {(!showHeatmap || isZoomedIn) && violations.map(v => (
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
                                            <Text style={styles.sheetTitle}>{selectedMarker.violationType}</Text>
                                        </View>
                                        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(selectedMarker.severity) }]}>
                                            <Text style={styles.severityText}>{selectedMarker.severity}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.sheetContent}>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="time-outline" size={20} color={COLORS.textTertiary} />
                                        <Text style={styles.detailText}>
                                            {new Date(selectedMarker.timestamp).toLocaleString()}
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="location-outline" size={20} color={COLORS.textTertiary} />
                                        <Text style={styles.detailText}>
                                            {selectedMarker.latitude.toFixed(5)}, {selectedMarker.longitude.toFixed(5)}
                                        </Text>
                                    </View>
                                    
                                    {selectedMarker.imageUrl && (
                                        <Image 
                                            source={{ uri: selectedMarker.imageUrl }} 
                                            style={styles.thumbnail} 
                                            resizeMode="cover"
                                        />
                                    )}
                                </View>

                                <View style={styles.sheetFooter}>
                                    <TouchableOpacity style={styles.actionButton} onPress={() => {
                                        const mockReportDetails = {
                                            id: selectedMarker.id,
                                            violation_type: selectedMarker.violationType,
                                            vehicle_number: "TEST-1234",
                                            location_address: "Live Map Hotspot",
                                            latitude: selectedMarker.latitude,
                                            longitude: selectedMarker.longitude,
                                            submitted_at: selectedMarker.timestamp,
                                            reviewed_at: new Date().toISOString(),
                                            severity: selectedMarker.severity.toLowerCase(),
                                            image_url: selectedMarker.imageUrl,
                                            reward_amount: 15,
                                            submitter: { full_name: "Hotspot Tracker", email: "system@trafficeye.gov", phone: "—" },
                                            officer_review: {
                                                officer: { full_name: "System Auto-Flag" },
                                                remarks: "This is a virtual hotspot alert representing a cluster of violations in this area."
                                            }
                                        };
                                        setSelectedMarker(null);
                                        navigation.navigate('VerifiedReportDetail', { mockData: mockReportDetails });
                                    }}>
                                        <Text style={styles.actionButtonText}>View Full Report</Text>
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
