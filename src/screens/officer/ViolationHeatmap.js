import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Platform,
    Modal,
    ScrollView,
    ActivityIndicator,
    Animated,
    Image,
    StatusBar,
} from 'react-native';
import {
    Map,
    Camera,
    GeoJSONSource,
    Layer,
} from '@maplibre/maplibre-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { fetchHeatmapPoints, subscribeToApprovedMapReports } from '../../services/reports';
import { FocusAwareStatusBar, PressableScale, FeedbackToast } from '../../components';
import useReducedMotion from '../../hooks/useReducedMotion';
import { filterHeatmapReports } from '../../utils/productExperience';
import { supabase } from '../../services/supabase';
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    BORDER_RADIUS,
    SHADOWS,
} from '../../utils';

// MapLibre OpenFreeMap style (zero API key)
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const { width } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────
// Target initial viewport: Mumbai Metropolitan Region
// (Mumbai, Thane, Navi Mumbai, Mira-Bhayandar, Panvel)
const MMR_BOUNDS = {
    southWest: [72.75, 18.99],
    northEast: [73.08, 19.32],
};

const INITIAL_CAMERA_VIEW = {
    bounds: [
        MMR_BOUNDS.southWest[0],
        MMR_BOUNDS.southWest[1],
        MMR_BOUNDS.northEast[0],
        MMR_BOUNDS.northEast[1],
    ],
    padding: { top: 210, bottom: 80, left: 20, right: 20 },
};

const BASE_LNG = 72.8777;
const BASE_LAT = 19.0760;

// Severity → visual mapping
const SEVERITY_CONFIG = {
    critical: {
        color: '#2563EB',
        glowOuter: 'rgba(37, 99, 235, 0.22)',
        glowInner: 'rgba(37, 99, 235, 0.45)',
        label: 'Critical',
        weight: 4,
        order: 4,
    },
    high: {
        color: '#EA580C',
        glowOuter: 'rgba(234, 88, 12, 0.22)',
        glowInner: 'rgba(234, 88, 12, 0.45)',
        label: 'High',
        weight: 3,
        order: 3,
    },
    medium: {
        color: COLORS.secondary,
        glowOuter: 'rgba(217, 119, 6, 0.25)',
        glowInner: 'rgba(217, 119, 6, 0.50)',
        label: 'Medium',
        weight: 2,
        order: 2,
    },
    low: {
        color: COLORS.successLight,
        glowOuter: 'rgba(22, 163, 74, 0.22)',
        glowInner: 'rgba(22, 163, 74, 0.45)',
        label: 'Low',
        weight: 1,
        order: 1,
    },
};

const TIME_FILTER_DAYS = { today: 1, '7_days': 7, '30_days': 30, all: 3650 };

// ─── Build GeoJSON FeatureCollection from valid report points ─────────────────
// IMPORTANT: Points with invalid or missing coordinates are OMITTED.
// We never fabricate/jitter coordinates.
function buildGeoJSON(points) {
    const features = [];
    for (const p of points) {
        const lat = typeof p.latitude === 'number' ? p.latitude : parseFloat(p.latitude);
        const lng = typeof p.longitude === 'number' ? p.longitude : parseFloat(p.longitude);

        // Skip if coordinate is missing or not a valid finite number in range
        if (!isFinite(lat) || !isFinite(lng) ||
            Math.abs(lat) > 90 || Math.abs(lng) > 180 ||
            (lat === 0 && lng === 0)) {
            if (__DEV__) console.log('[Heatmap] Omitting a point with invalid coordinates.');
            continue;
        }

        const severityKey = (p.severity || 'low').toLowerCase();
        const weight = SEVERITY_CONFIG[severityKey]?.weight ?? 1;

        features.push({
            type: 'Feature',
            id: p.id || `report_${lat}_${lng}`,
            geometry: {
                type: 'Point',
                coordinates: [lng, lat],
            },
            properties: {
                id: p.id,
                severity: severityKey,
                weight,
                violation_type: p.violation_type || '',
                submitted_at: p.submitted_at || null,
                reviewed_at: p.reviewed_at || null,
                image_url: p.image_url || null,
                officer_name: p.officer_name || p.officer_review?.[0]?.officer?.full_name || 'Verified Officer',
                officer_badge: p.officer_badge || p.officer_review?.[0]?.officer?.badge_id || '',
                officer_jurisdiction: p.officer_jurisdiction || '',
                location_address: p.location_address || '',
                // Encode topSeverity for cluster rendering — not available natively,
                // but clusterProperties allows custom aggregation
            },
        });
    }
    return {
        type: 'FeatureCollection',
        features,
    };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityLegend() {
    return (
        <View style={legendStyles.container}>
            {Object.entries(SEVERITY_CONFIG).reverse().map(([key, cfg]) => (
                <View key={key} style={legendStyles.item}>
                    <View style={[legendStyles.dot, { backgroundColor: cfg.color }]} />
                    <Text style={legendStyles.label}>{cfg.label}</Text>
                </View>
            ))}
        </View>
    );
}

const legendStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        gap: SPACING.md,
        ...SHADOWS.sm,
    },
    item:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dot:   { width: 10, height: 10, borderRadius: 5 },
    label: { fontFamily: 'Nunito-SemiBold', fontSize: 11, color: COLORS.textSecondary },
});

// ─── Popup Sheet ──────────────────────────────────────────────────────────────
function PopupSheet({ item, onClose }) {
    if (!item) return null;

    const isCluster = !!item.cluster;
    const severityKey = (item.severity || 'low').toLowerCase();
    const cfg = SEVERITY_CONFIG[severityKey] ?? SEVERITY_CONFIG.low;

    const formatDate = (ts) => {
        if (!ts) return '—';
        return new Date(ts).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
        });
    };

    return (
        <View style={sheetStyles.container}>
            {/* Grabber */}
            <View style={sheetStyles.grabber} />

            {/* Header */}
            <View style={sheetStyles.header}>
                <View style={sheetStyles.titleRow}>
                    <View style={[sheetStyles.severityPill, { backgroundColor: cfg.color }]}>
                        <Text style={sheetStyles.severityText}>{cfg.label.toUpperCase()}</Text>
                    </View>
                    <View style={sheetStyles.statusPill}>
                        <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                        <Text style={sheetStyles.statusText}>Approved</Text>
                    </View>
                </View>

                {isCluster ? (
                    <>
                        <Text style={sheetStyles.titleMain}>{item.point_count} Violations in Area</Text>
                        <Text style={sheetStyles.subtitle}>Tap to zoom in and view individually</Text>
                    </>
                ) : (
                    <Text style={sheetStyles.titleMain}>{item.violation_type || 'Unknown Violation'}</Text>
                )}
            </View>

            <View style={sheetStyles.divider} />

            {/* Detail rows */}
            <View style={sheetStyles.rows}>
                {isCluster ? (
                    <>
                        <DetailRow icon="stats-chart" label="Report Count" value={`${item.point_count} approved reports`} />
                        <DetailRow icon="location" label="Area" value="Approximate location (privacy protected)" />
                    </>
                ) : (
                    <>
                        <DetailRow icon="car-sport"   label="Violation"  value={item.violation_type || '—'} />
                        <DetailRow icon="flame"        label="Severity"   value={cfg.label} color={cfg.color} />
                        <DetailRow icon="calendar"    label="Date"       value={formatDate(item.reviewed_at || item.submitted_at)} />
                        <DetailRow icon="location"    label="Location"   value={item.location_address || 'Approximate (privacy protected)'} />
                        <DetailRow
                            icon="person-circle"
                            label="Approved By"
                            value={item.officer_name || 'Verified Officer'}
                            color={COLORS.primary}
                        />
                        {item.officer_jurisdiction ? (
                            <DetailRow icon="business" label="Station" value={item.officer_jurisdiction} />
                        ) : null}
                        <DetailRow icon="checkmark-done-circle" label="Status" value="Approved" color={COLORS.success} />
                    </>
                )}
            </View>

            {/* Evidence photo */}
            {!isCluster && item.image_url && (
                <View style={sheetStyles.imageSection}>
                    <View style={sheetStyles.imageSectionHeader}>
                        <Ionicons name="camera" size={13} color={COLORS.textTertiary} />
                        <Text style={sheetStyles.imageSectionTitle}>Violation Evidence Photo</Text>
                    </View>
                    <Image
                        source={{ uri: item.image_url }}
                        style={sheetStyles.evidenceImage}
                        resizeMode="cover"
                    />
                </View>
            )}

            <TouchableOpacity style={sheetStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={sheetStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
        </View>
    );
}

function DetailRow({ icon, label, value, color }) {
    return (
        <View style={sheetStyles.row}>
            <Ionicons name={icon + '-outline'} size={18} color={COLORS.textTertiary} />
            <View style={sheetStyles.rowText}>
                <Text style={sheetStyles.rowLabel}>{label}</Text>
                <Text style={[sheetStyles.rowValue, color && { color }]}>{value}</Text>
            </View>
        </View>
    );
}

const sheetStyles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: SPACING.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
        paddingTop: SPACING.md,
        maxHeight: '85%',
        ...SHADOWS.xl,
    },
    grabber: { width: 40, height: 5, backgroundColor: COLORS.borderLight, borderRadius: 3, alignSelf: 'center', marginBottom: SPACING.md },
    header: { marginBottom: SPACING.md },
    titleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm, alignItems: 'center' },
    severityPill: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
    severityText: { fontFamily: 'Nunito-Bold', fontSize: 11, color: COLORS.surface },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.successSurface, paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
    statusText: { fontFamily: 'Nunito-SemiBold', fontSize: 11, color: COLORS.success },
    titleMain: { fontFamily: 'Nunito-Bold', fontSize: FONT_SIZES.xl, color: COLORS.textPrimary, marginBottom: 2 },
    subtitle:  { fontFamily: 'Nunito-Medium', fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    divider:   { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.md },
    rows:      { gap: SPACING.sm, marginBottom: SPACING.md },
    row:       { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
    rowText:   { flex: 1 },
    rowLabel:  { fontFamily: 'Nunito-SemiBold', fontSize: 11, color: COLORS.textTertiary, textTransform: 'uppercase', marginBottom: 1 },
    rowValue:  { fontFamily: 'Nunito-Medium', fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
    imageSection: { marginBottom: SPACING.lg },
    imageSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.xs },
    imageSectionTitle: { fontFamily: 'Nunito-Bold', fontSize: 11, color: COLORS.textTertiary, textTransform: 'uppercase' },
    evidenceImage: { width: '100%', height: 170, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderLight },
    closeBtn:  { backgroundColor: COLORS.primary, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.full, alignItems: 'center' },
    closeBtnText: { fontFamily: 'Nunito-Bold', fontSize: FONT_SIZES.md, color: COLORS.surface },
});

// ─── Layer style expressions ───────────────────────────────────────────────────
//
// Severity color interpolation for circle layer (individual points)
const SEVERITY_COLOR_EXPR = [
    'match', ['get', 'severity'],
    'critical', '#2563EB',
    'high',     '#EA580C',
    'medium',   COLORS.secondary,
    'low',      COLORS.successLight,
    /* default */ COLORS.successLight,
];

// Heatmap layer style — weight driven by 'weight' property
const HEATMAP_LAYER_STYLE = {
    heatmapWeight: [
        'interpolate', ['linear'], ['get', 'weight'],
        1, 0.25,
        4, 1.0,
    ],
    heatmapIntensity: [
        'interpolate', ['linear'], ['zoom'],
        0, 0.4,
        9, 1.2,
    ],
    heatmapRadius: [
        'interpolate', ['linear'], ['zoom'],
        0, 18,
        9, 40,
    ],
    heatmapOpacity: [
        'interpolate', ['linear'], ['zoom'],
        7, 0.85,
        12, 0.4,
    ],
    heatmapColor: [
        'interpolate', ['linear'],
        ['heatmap-density'],
        0,    'rgba(33,102,172,0)',
        0.2,  'rgba(103,169,207,0.6)',
        0.4,  'rgba(209,229,240,0.75)',
        0.6,  'rgba(253,219,199,0.85)',
        0.8,  'rgba(239,138,98,0.9)',
        1,    'rgba(178,24,43,1)',
    ],
};

// Circle layer style for individual points (shown at high zoom)
const CIRCLE_LAYER_STYLE = {
    circleRadius: [
        'interpolate', ['linear'], ['zoom'],
        8,  4,
        14, 12,
    ],
    circleColor: SEVERITY_COLOR_EXPR,
    circleOpacity: [
        'interpolate', ['linear'], ['zoom'],
        7,  0,
        9,  0.85,
    ],
    circleStrokeWidth: 1.5,
    circleStrokeColor: COLORS.surface,
    circleStrokeOpacity: [
        'interpolate', ['linear'], ['zoom'],
        7,  0,
        9,  0.9,
    ],
};

// Cluster circle style
const CLUSTER_CIRCLE_STYLE = {
    circleRadius: [
        'step', ['get', 'point_count'],
        18,   // default radius for small clusters
        5,  22,
        20, 28,
    ],
    circleColor: [
        'step', ['get', 'point_count'],
        COLORS.successLight,  // <= 4
        5,  COLORS.secondary,
        20, '#EA580C',
    ],
    circleOpacity: 0.85,
    circleStrokeWidth: 2,
    circleStrokeColor: COLORS.surface,
};

// Cluster count text style
const CLUSTER_COUNT_STYLE = {
    textField: '{point_count}',
    textFont: ['Open Sans Bold', 'Arial Unicode MS Bold'],
    textSize: 12,
    textColor: COLORS.surface,
    textIgnorePlacement: true,
    textAllowOverlap: true,
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ViolationHeatmap({ navigation }) {
    const reduced = useReducedMotion();
    const [severities, setSeverities] = useState(['low', 'medium', 'high', 'critical']);
    const [toast, setToast] = useState(null);
    const sequence = useRef(0);
    const [points, setPoints]             = useState([]);
    const [loading, setLoading]           = useState(true);
    const [refreshing, setRefreshing]     = useState(false);
    const [lastUpdated, setLastUpdated]   = useState(null);
    const [timeFilter, setTimeFilter]     = useState('all');
    const [showHeatmap, setShowHeatmap]   = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);

    const cameraRef  = useRef(null);
    const bboxRef    = useRef(null);
    const pulseAnim  = useRef(new Animated.Value(1)).current;
    const isMounted  = useRef(true);

    // Pulse animation for live indicator
    useEffect(() => {
        if (refreshing && !reduced) {
            const animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
                ])
            );
            animation.start();
            return () => animation.stop();
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
        }
    }, [refreshing, reduced, pulseAnim]);

    // ── Load data from Supabase ────────────────────────────────────────────────
    const loadData = useCallback(async (showSpinner = true, bbox = null) => {
        if (!isMounted.current) return;
        if (showSpinner) setLoading(true);
        else             setRefreshing(true);

        const request = ++sequence.current;
        let data, error;
        try { ({ data, error } = await fetchHeatmapPoints(bbox || bboxRef.current, 3650)); }
        catch (failure) { error = failure; }
        if (!isMounted.current || request !== sequence.current) return;

        if (error) {
            setToast('Could not refresh map data. Tap refresh to retry.');
        } else if (data) {
            let validPoints = 0;
            let omittedPoints = 0;
            const processed = [];

            for (const p of data) {
                const lat = typeof p.latitude === 'number' ? p.latitude : parseFloat(p.latitude);
                const lng = typeof p.longitude === 'number' ? p.longitude : parseFloat(p.longitude);

                // Never invent evidence coordinates from an address or approximate geocode.
                const resolvedLat = lat;
                const resolvedLng = lng;

                // Final validity check — no fabrication allowed
                if (!isFinite(resolvedLat) || !isFinite(resolvedLng) ||
                    Math.abs(resolvedLat) > 90 || Math.abs(resolvedLng) > 180 ||
                    (resolvedLat === 0 && resolvedLng === 0)) {
                    omittedPoints++;
                    continue;
                }

                validPoints++;
                const sv = (p.severity || 'low').toLowerCase();
                processed.push({
                    ...p,
                    latitude: resolvedLat,
                    longitude: resolvedLng,
                    severity: sv,
                    weight: SEVERITY_CONFIG[sv]?.weight ?? 1,
                    officer_name: p.officer_name || p.officer_review?.[0]?.officer?.full_name || 'Verified Officer',
                    officer_badge: p.officer_badge || p.officer_review?.[0]?.officer?.badge_id || '',
                });
            }

            if (__DEV__ && omittedPoints > 0) {
                console.warn(`[Heatmap] Omitted ${omittedPoints} points with invalid coordinates (${validPoints} valid)`);
            }

            if (isMounted.current) {
                setPoints(processed);
                setLastUpdated(new Date());
            }
        }

        if (isMounted.current) {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Mount/unmount guard
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // Fetch the available viewport dataset once; chips filter it locally.
    useEffect(() => {
        loadData(true);
    }, [loadData]);

    // Real-time subscription: refresh on new approvals
    useEffect(() => {
        const channel = subscribeToApprovedMapReports(() => {
            if (__DEV__) console.log('[Heatmap] New approval detected — refreshing map...');
            loadData(false);
        });
        return () => supabase.removeChannel(channel);
    }, [loadData]);

    // ── Bounding box: re-fetch on pan/zoom (debounced) ────────────────────────
    const regionChangeTimeout = useRef(null);

    const onRegionDidChange = useCallback((event) => {
        // v11: event.nativeEvent = { center: [lng, lat], zoom, bounds: { ne, sw }, ... }
        const ne = event?.nativeEvent?.bounds?.ne;
        const sw = event?.nativeEvent?.bounds?.sw;
        if (!ne || !sw) return;

        const newBbox = {
            minLat: sw[1],
            maxLat: ne[1],
            minLng: sw[0],
            maxLng: ne[0],
        };
        bboxRef.current = newBbox;

        clearTimeout(regionChangeTimeout.current);
        regionChangeTimeout.current = setTimeout(() => {
            if (isMounted.current) loadData(false, newBbox);
        }, 800);
    }, [loadData]);

    useEffect(() => {
        return () => { clearTimeout(regionChangeTimeout.current); };
    }, []);

    // ── GeoJSON data ──────────────────────────────────────────────────────────
    const filteredPoints = useMemo(() => filterHeatmapReports(points, severities, ({ today: 'today', '7_days': 'week', '30_days': 'month', all: 'all' })[timeFilter]), [points, severities, timeFilter]);
    useEffect(() => { setSelectedItem(null); }, [timeFilter, severities]);
    const geoJSON = useMemo(() => buildGeoJSON(filteredPoints), [filteredPoints]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const critical = filteredPoints.filter(p => p.severity === 'critical').length;
        const high     = filteredPoints.filter(p => p.severity === 'high').length;
        return { total: filteredPoints.length, critical, high };
    }, [filteredPoints]);

    const formatLastUpdated = () => {
        if (!lastUpdated) return '';
        const diffSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
        if (diffSec < 10) return 'just now';
        if (diffSec < 60) return `${diffSec}s ago`;
        return `${Math.floor(diffSec / 60)}m ago`;
    };

    // ── Handle press on GeoJSONSource (cluster or individual point) ────────────
    const handleSourcePress = useCallback((event) => {
        const feature = event?.nativeEvent?.payload || event?.nativeEvent?.features?.[0] || event?.features?.[0];
        if (!feature?.properties) return;

        const props = feature.properties;

        if (props.cluster) {
            // Cluster tapped — zoom in
            const coords = feature.geometry?.coordinates;
            if (coords && cameraRef.current) {
                cameraRef.current.flyTo({ center: coords, duration: 600 });
                // Attempt to expand cluster by zooming
                cameraRef.current.easeTo({ center: coords, zoom: (props.cluster_expansion_zoom ?? 10) + 1, duration: reduced ? 0 : 600 });
            }
            // Show cluster summary in popup
            setSelectedItem({ ...props, cluster: true });
        } else {
            setSelectedItem(props);
        }
    }, []);

    const handleResetToMMR = useCallback(() => {
        if (!cameraRef.current) return;
        try {
            cameraRef.current.fitBounds(
                [
                    MMR_BOUNDS.southWest[0],
                    MMR_BOUNDS.southWest[1],
                    MMR_BOUNDS.northEast[0],
                    MMR_BOUNDS.northEast[1],
                ],
                {
                    padding: { top: 210, bottom: 80, left: 20, right: 20 },
                    duration: 600,
                }
            );
        } catch (err) {
            if (__DEV__) console.warn('[Heatmap] Default-area framing unavailable.');
        }
    }, []);

    const handleFitReports = useCallback(() => {
        if (!cameraRef.current || points.length === 0) return;
        const lngs = points.map(p => p.longitude);
        const lats = points.map(p => p.latitude);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);

        const delta = 0.015;
        const bounds = (minLng === maxLng && minLat === maxLat)
            ? [minLng - delta, minLat - delta, maxLng + delta, maxLat + delta]
            : [minLng, minLat, maxLng, maxLat];

        try {
            cameraRef.current.fitBounds(
                bounds,
                {
                    padding: { top: 220, bottom: 90, left: 30, right: 30 },
                    duration: 600,
                }
            );
        } catch (err) {
            if (__DEV__) console.warn('[Heatmap] Report framing unavailable.');
        }
    }, [points]);

    const handleMyLocation = async () => {
        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (!permission.granted) { if (isMounted.current) setToast('Location permission denied. Enable it in device settings.'); return; }
            const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (isMounted.current) cameraRef.current?.flyTo({ center: [position.coords.longitude, position.coords.latitude], duration: reduced ? 0 : 600 });
        } catch { if (isMounted.current) setToast('Location unavailable. Check GPS and try again.'); }
    };
    const renderFilter = (label, value) => {
        const active = timeFilter === value;
        return (
            <TouchableOpacity
                key={value}
                style={[styles.filterBtn, active && styles.filterBtnActive]}
                accessibilityRole="button" accessibilityLabel={label + ' time range'} accessibilityState={{ selected: active }}
                onPress={() => setTimeFilter(value)}
                activeOpacity={0.7}
            >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="dark-content" statusBgColor={COLORS.background} />

            {/* ── Map (MapLibre v11) ── */}
            <Map
                style={styles.map}
                mapStyle={MAP_STYLE}
                logo={false}
                attribution={true}
                attributionPosition={{ bottom: 8, left: 8 }}
                onRegionDidChange={onRegionDidChange}
            >
                <Camera
                    ref={cameraRef}
                    initialViewState={INITIAL_CAMERA_VIEW}
                />

                {/* GeoJSON source with native clustering */}
                <GeoJSONSource
                    id="violations"
                    data={geoJSON}
                    cluster={true}
                    clusterRadius={50}
                    clusterMaxZoom={14}
                    onPress={handleSourcePress}
                >
                    {/* Heatmap layer — visible at low zoom, fades out at high zoom */}
                    {showHeatmap && (
                        <Layer
                            id="violations-heatmap"
                            type="heatmap"
                            filter={['!', ['has', 'point_count']]}
                            style={HEATMAP_LAYER_STYLE}
                        />
                    )}

                    {/* Cluster circle layer */}
                    <Layer
                        id="violations-cluster-circle"
                        type="circle"
                        filter={['has', 'point_count']}
                        style={CLUSTER_CIRCLE_STYLE}
                    />

                    {/* Cluster count text */}
                    <Layer
                        id="violations-cluster-count"
                        type="symbol"
                        filter={['has', 'point_count']}
                        style={CLUSTER_COUNT_STYLE}
                    />

                    {/* Individual point circles (visible at high zoom) */}
                    <Layer
                        id="violations-circles"
                        type="circle"
                        filter={['!', ['has', 'point_count']]}
                        style={CIRCLE_LAYER_STYLE}
                    />
                </GeoJSONSource>
            </Map>

            {/* ── Top overlay ── */}
            <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">

                {/* Header card */}
                <View style={styles.headerCard}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.headerTitle}>Live Violation Map</Text>
                            <Text style={styles.headerSub}>Approved reports · Available viewport data</Text>
                        </View>
                        {/* Live indicator */}
                        <Animated.View style={[styles.liveIndicator, { opacity: pulseAnim }]}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>{refreshing ? 'UPDATING' : 'MAP'}</Text>
                        </Animated.View>
                    </View>

                    {/* Time filters */}
                    <View style={styles.filterRow}>
                        {renderFilter('Today', 'today')}
                        {renderFilter('Week', '7_days')}
                        {renderFilter('Month', '30_days')}
                        {renderFilter('All', 'all')}
                    </View>
                    <View style={[styles.filterRow, { flexWrap: 'wrap' }]}>
                        {['low', 'medium', 'high', 'critical'].map(severity => <PressableScale key={severity} accessibilityLabel={severity + ' severity'} accessibilityState={{ selected: severities.includes(severity) }} onPress={() => setSeverities(previous => previous.includes(severity) ? previous.filter(value => value !== severity) : [...previous, severity])} style={[styles.filterBtn, { minHeight: 44 }, severities.includes(severity) && styles.filterBtnActive]}><Text style={styles.filterText}>{severities.includes(severity) ? '✓ ' : ''}{SEVERITY_CONFIG[severity].label}</Text></PressableScale>)}
                    </View>
                </View>

                {/* Stats bar */}
                {!loading && stats.total > 0 && (
                    <View style={styles.statsBar}>
                        <View style={styles.statItem}>
                            <Ionicons name="location" size={14} color={COLORS.primary} />
                            <Text style={styles.statText}><Text style={styles.statNum}>{stats.total}</Text> violations</Text>
                        </View>
                        {stats.critical > 0 && (
                            <View style={styles.statItem}>
                                <Ionicons name="alert-circle" size={14} color={SEVERITY_CONFIG.critical.color} />
                                <Text style={styles.statText}><Text style={[styles.statNum, { color: SEVERITY_CONFIG.critical.color }]}>{stats.critical}</Text> critical</Text>
                            </View>
                        )}
                        {lastUpdated && (
                            <Text style={styles.statUpdated}>Updated {formatLastUpdated()}</Text>
                        )}
                    </View>
                )}

                {/* Legend */}
                <View style={styles.legendRow} pointerEvents="none">
                    <SeverityLegend />
                </View>
            </SafeAreaView>

            {/* ── Floating action buttons ── */}
            {/* Fit Reports button (explicit user action, never automatic) */}
            {points.length > 0 && (
                <TouchableOpacity
                    style={[styles.fab, styles.fabFitReports]}
                    onPress={handleFitReports}
                    activeOpacity={0.85}
                >
                    <Ionicons name="expand" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            )}

            {/* Reset to MMR Region */}
            <TouchableOpacity
                style={[styles.fab, styles.fabResetMMR]}
                onPress={handleMyLocation}
                accessibilityRole="button" accessibilityLabel="Center on my location"
                activeOpacity={0.85}
            >
                <Ionicons name="locate" size={20} color={COLORS.primary} />
            </TouchableOpacity>

            {/* Refresh button */}
            <TouchableOpacity
                style={[styles.fab, styles.fabRefresh]}
                onPress={() => loadData(false)}
                activeOpacity={0.85}
                disabled={refreshing}
            >
                {refreshing
                    ? <ActivityIndicator size="small" color={COLORS.primary} />
                    : <Ionicons name="refresh" size={20} color={COLORS.primary} />
                }
            </TouchableOpacity>

            {/* Layer toggle */}
            <TouchableOpacity
                style={[styles.fab, styles.fabLayers]}
                onPress={() => setShowHeatmap(h => !h)}
                activeOpacity={0.85}
            >
                <Ionicons name="layers" size={22} color={showHeatmap ? COLORS.primary : COLORS.textTertiary} />
                {showHeatmap && <View style={styles.fabActiveDot} />}
            </TouchableOpacity>

            {/* ── Loading overlay ── */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading map data…</Text>
                    </View>
                </View>
            )}

            {/* ── No data state ── */}
            {!loading && stats.total === 0 && (
                <View style={styles.emptyOverlay} pointerEvents="none">
                    <View style={styles.emptyCard}>
                        <Ionicons name="map-outline" size={36} color={COLORS.textTertiary} />
                        <Text style={styles.emptyTitle}>No reports match your filters</Text>
                        <Text style={styles.emptySub}>Try another severity or time range, or refresh the map.</Text>
                    </View>
                </View>
            )}

            {/* ── Popup bottom sheet ── */}
            <Modal
                visible={!!selectedItem}
                transparent
                animationType={reduced ? 'none' : 'slide'}
                onRequestClose={() => setSelectedItem(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedItem(null)}
                >
                    <View onStartShouldSetResponder={() => true}>
                        <PopupSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
                    </View>
                </TouchableOpacity>
            </Modal>
            <FeedbackToast visible={!!toast} message={toast || ''} variant="warning" onDismiss={() => setToast(null)} />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    map:       { ...StyleSheet.absoluteFillObject },

    // Top overlay
    topOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0,
    },
    headerCard: {
        marginHorizontal: SPACING.md,
        marginTop: SPACING.xs,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        ...SHADOWS.md,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
    headerTitle: { fontFamily: 'Nunito-Bold', fontSize: FONT_SIZES.lg, color: COLORS.primary },
    headerSub:   { fontFamily: 'Nunito-Medium', fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },

    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF2F2', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
    liveDot:       { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.errorLight },
    liveText:      { fontFamily: 'Nunito-Bold', fontSize: 10, color: COLORS.errorLight, letterSpacing: 1 },

    filterRow:       { flexDirection: 'row', backgroundColor: COLORS.surfaceContainerLow, borderRadius: BORDER_RADIUS.md, padding: 3 },
    filterBtn:       { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: BORDER_RADIUS.sm },
    filterBtnActive: { backgroundColor: COLORS.surface, ...SHADOWS.xs },
    filterText:      { fontFamily: 'Nunito-Medium', fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
    filterTextActive:{ fontFamily: 'Nunito-Bold', color: COLORS.primary },

    // Stats bar
    statsBar: {
        marginHorizontal: SPACING.md,
        marginTop: SPACING.sm,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        ...SHADOWS.sm,
    },
    statItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText:   { fontFamily: 'Nunito-Medium', fontSize: 12, color: COLORS.textSecondary },
    statNum:    { fontFamily: 'Nunito-Bold', color: COLORS.primary },
    statUpdated:{ fontFamily: 'Nunito-Medium', fontSize: 11, color: COLORS.textTertiary, marginLeft: 'auto' },

    // Legend row
    legendRow: {
        alignItems: 'center',
        marginTop: SPACING.sm,
    },

    // FABs
    fab: {
        position: 'absolute', right: SPACING.md,
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: COLORS.surface,
        justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.md,
    },
    fabLayers:     { bottom: 110 },
    fabRefresh:    { bottom: 166 },
    fabResetMMR:   { bottom: 222 },
    fabFitReports: { bottom: 278 },
    fabActiveDot: {
        position: 'absolute', top: 10, right: 10,
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: COLORS.primary,
        borderWidth: 1.5, borderColor: COLORS.surface,
    },

    // Loading
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(248,249,251,0.75)',
    },
    loadingCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center', gap: SPACING.md,
        ...SHADOWS.lg,
    },
    loadingText: { fontFamily: 'Nunito-SemiBold', fontSize: FONT_SIZES.md, color: COLORS.textSecondary },

    // Empty state
    emptyOverlay: {
        position: 'absolute', bottom: 160, left: 0, right: 0,
        alignItems: 'center',
    },
    emptyCard: {
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center', gap: SPACING.sm,
        marginHorizontal: SPACING.xl,
        ...SHADOWS.md,
    },
    emptyTitle: { fontFamily: 'Nunito-Bold', fontSize: FONT_SIZES.lg, color: COLORS.textPrimary },
    emptySub:   { fontFamily: 'Nunito-Medium', fontSize: FONT_SIZES.sm, color: COLORS.textTertiary, textAlign: 'center' },

    // Modal
    modalOverlay: {
        flex: 1, justifyContent: 'flex-end',
        backgroundColor: 'rgba(25,28,30,0.4)',
    },
});
