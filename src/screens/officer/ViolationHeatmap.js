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
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { fetchHeatmapPoints, subscribeToApprovedMapReports } from '../../services/reports';
import { FocusAwareStatusBar } from '../../components';
import { supabase } from '../../services/supabase';
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    BORDER_RADIUS,
    SHADOWS,
} from '../../utils';

const { width } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_LAT = 19.0760;
const BASE_LNG = 72.8777;

// Severity → visual mapping (Single-color concentric circular heat halos)
const SEVERITY_CONFIG = {
    critical: { 
        color: '#2563EB', 
        glowOuter: 'rgba(37, 99, 235, 0.22)', 
        glowInner: 'rgba(37, 99, 235, 0.45)', 
        label: 'Critical', 
        weight: 4, 
        order: 4 
    },
    high: { 
        color: '#EA580C', 
        glowOuter: 'rgba(234, 88, 12, 0.22)', 
        glowInner: 'rgba(234, 88, 12, 0.45)', 
        label: 'High', 
        weight: 3, 
        order: 3 
    },
    medium: { 
        color: '#D97706', 
        glowOuter: 'rgba(217, 119, 6, 0.25)', 
        glowInner: 'rgba(217, 119, 6, 0.50)', 
        label: 'Medium', 
        weight: 2, 
        order: 2 
    },
    low: { 
        color: '#16A34A', 
        glowOuter: 'rgba(22, 163, 74, 0.22)', 
        glowInner: 'rgba(22, 163, 74, 0.45)', 
        label: 'Low', 
        weight: 1, 
        order: 1 
    },
};

// Days back per filter
const TIME_FILTER_DAYS = { today: 1, '7_days': 7, '30_days': 30, all: 3650 };

// ─── JS Clustering helpers ────────────────────────────────────────────────────
// Groups nearby points into clusters based on a grid cell size (in degrees).
// No external package needed.
const CLUSTER_GRID_DEG = 0.008; // ~800m radius at equator

function buildClusters(points, latitudeDelta) {
    // Scale cluster radius with zoom level
    const gridSize = Math.max(CLUSTER_GRID_DEG, latitudeDelta * 0.15);

    const cells = {};
    for (const pt of points) {
        const cellLat = Math.floor(pt.latitude  / gridSize);
        const cellLng = Math.floor(pt.longitude / gridSize);
        const key = `${cellLat}:${cellLng}`;
        if (!cells[key]) cells[key] = [];
        cells[key].push(pt);
    }

    return Object.values(cells).map(group => {
        // Average position of group
        const lat = group.reduce((s, p) => s + p.latitude,  0) / group.length;
        const lng = group.reduce((s, p) => s + p.longitude, 0) / group.length;

        // Highest severity in group
        const topSeverity = group.reduce((best, p) => {
            const cur = SEVERITY_CONFIG[p.severity?.toLowerCase()] ?? SEVERITY_CONFIG.low;
            const b   = SEVERITY_CONFIG[best?.toLowerCase()] ?? SEVERITY_CONFIG.low;
            return cur.order > b.order ? p.severity : best;
        }, group[0].severity);

        // Unique violation types
        const types = [...new Set(group.map(p => p.violation_type).filter(Boolean))];

        return {
            id:            `cluster_${lat.toFixed(5)}_${lng.toFixed(5)}`,
            latitude:      lat,
            longitude:     lng,
            count:         group.length,
            topSeverity:   (topSeverity || 'low').toLowerCase(),
            types,
            points:        group,
            isCluster:     group.length > 1,
            // For single points, expose details
            ...(group.length === 1 ? group[0] : {}),
        };
    });
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

function ClusterMarker({ cluster, onPress }) {
    const severityKey = (cluster.topSeverity || cluster.severity || 'low').toLowerCase();
    const cfg = SEVERITY_CONFIG[severityKey] ?? SEVERITY_CONFIG.low;

    if (!cluster.isCluster) {
        // Single violation marker with concentric single-color heat halo circle
        return (
            <TouchableOpacity style={markerStyles.haloWrapper} onPress={onPress} activeOpacity={0.8}>
                <View style={[markerStyles.glowOuter, { backgroundColor: cfg.glowOuter }]}>
                    <View style={[markerStyles.glowInner, { backgroundColor: cfg.glowInner }]}>
                        <View style={[markerStyles.singleCore, { backgroundColor: cfg.color }]}>
                            <Ionicons name="warning" size={12} color="#fff" />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    // Cluster with single-color circular heat halo
    const outerSize = cluster.count >= 20 ? 64 : cluster.count >= 5 ? 54 : 44;
    const innerSize = cluster.count >= 20 ? 48 : cluster.count >= 5 ? 40 : 32;
    const coreSize  = cluster.count >= 20 ? 34 : cluster.count >= 5 ? 28 : 22;

    return (
        <TouchableOpacity style={markerStyles.haloWrapper} onPress={onPress} activeOpacity={0.85}>
            <View style={[
                markerStyles.glowOuter,
                { width: outerSize, height: outerSize, borderRadius: outerSize / 2, backgroundColor: cfg.glowOuter }
            ]}>
                <View style={[
                    markerStyles.glowInner,
                    { width: innerSize, height: innerSize, borderRadius: innerSize / 2, backgroundColor: cfg.glowInner }
                ]}>
                    <View style={[
                        markerStyles.clusterCore,
                        { width: coreSize, height: coreSize, borderRadius: coreSize / 2, backgroundColor: cfg.color }
                    ]}>
                        <Text style={markerStyles.clusterCount}>{cluster.count}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const markerStyles = StyleSheet.create({
    haloWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowOuter: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowInner: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    singleCore: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#ffffff',
        ...SHADOWS.sm,
    },
    clusterCore: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#ffffff',
        ...SHADOWS.sm,
    },
    clusterCount: {
        fontFamily: 'Nunito-Bold',
        fontSize: 11,
        color: '#ffffff',
    },
});

// ─── Popup Sheet ──────────────────────────────────────────────────────────────
function PopupSheet({ item, onClose }) {
    if (!item) return null;

    const isCluster = item.isCluster && item.count > 1;
    const cfg = SEVERITY_CONFIG[(item.topSeverity || item.severity || 'low').toLowerCase()] ?? SEVERITY_CONFIG.low;

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
                        <Text style={sheetStyles.titleMain}>{item.count} Violations in Area</Text>
                        <Text style={sheetStyles.subtitle}>Highest severity: {cfg.label}</Text>
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
                        <DetailRow icon="list" label="Violation Types" value={item.types.slice(0, 3).join(', ') + (item.types.length > 3 ? ` +${item.types.length - 3} more` : '')} />
                        <DetailRow icon="stats-chart" label="Report Count" value={`${item.count} approved reports`} />
                        <DetailRow icon="location" label="Area" value="Approximate location (privacy protected)" />
                    </>
                ) : (
                    <>
                        <DetailRow icon="car-sport"   label="Violation"  value={item.violation_type || '—'} />
                        <DetailRow icon="flame"        label="Severity"   value={cfg.label} color={cfg.color} />
                        <DetailRow icon="calendar"    label="Date"       value={formatDate(item.reviewed_at || item.submitted_at)} />
                        <DetailRow icon="location"    label="Location"   value="Approximate (privacy protected)" />
                        <DetailRow 
                            icon="person-circle" 
                            label="Approved By"
                            value={
                                (item.officer_name || item.officer_review?.[0]?.officer?.full_name)
                                    ? `${item.officer_name || item.officer_review?.[0]?.officer?.full_name}${item.officer_badge || item.officer_review?.[0]?.officer?.badge_id ? ` · Badge #${item.officer_badge || item.officer_review?.[0]?.officer?.badge_id}` : ''}`
                                    : 'Verified Officer'
                            } 
                            color={COLORS.primary} 
                        />
                        {(item.officer_jurisdiction) ? (
                            <DetailRow icon="business" label="Station" value={item.officer_jurisdiction} />
                        ) : null}
                        <DetailRow icon="checkmark-done-circle" label="Status" value="Approved" color={COLORS.success} />
                    </>
                )}
            </View>

            {/* Violation Evidence Photo */}
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
    severityText: { fontFamily: 'Nunito-Bold', fontSize: 11, color: '#fff' },
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
    imageSection: {
        marginBottom: SPACING.lg,
    },
    imageSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: SPACING.xs,
    },
    imageSectionTitle: {
        fontFamily: 'Nunito-Bold',
        fontSize: 11,
        color: COLORS.textTertiary,
        textTransform: 'uppercase',
    },
    evidenceImage: {
        width: '100%',
        height: 170,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    closeBtn:  { backgroundColor: COLORS.primary, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.full, alignItems: 'center' },
    closeBtnText: { fontFamily: 'Nunito-Bold', fontSize: FONT_SIZES.md, color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ViolationHeatmap({ navigation }) {
    const [points, setPoints]             = useState([]);
    const [loading, setLoading]           = useState(true);
    const [refreshing, setRefreshing]     = useState(false);
    const [lastUpdated, setLastUpdated]   = useState(null);
    const [timeFilter, setTimeFilter]     = useState('all');
    const [showHeatmap, setShowHeatmap]   = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [latDelta, setLatDelta]         = useState(0.1);

    const mapRef    = useRef(null);
    const bboxRef   = useRef(null);   // current visible bounding box
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation for the live indicator
    useEffect(() => {
        if (refreshing) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
        }
    }, [refreshing]);

    // ── Load data from Supabase ──────────────────────────────────────────────
    const loadData = useCallback(async (showSpinner = true, bbox = null) => {
        if (showSpinner) setLoading(true);
        else             setRefreshing(true);

        const days = TIME_FILTER_DAYS[timeFilter] ?? 3650;
        const { data, error } = await fetchHeatmapPoints(bbox || bboxRef.current, days);

        if (error) {
            console.warn('[Heatmap] Load error:', error.message);
        } else if (data) {
            let processed = [];
            for (let p of data) {
                let lat = p.latitude;
                let lng = p.longitude;

                // Fallback 1: Geocode location_address if lat/lng is missing
                if ((lat == null || lng == null || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) && p.location_address) {
                    try {
                        const geo = await Location.geocodeAsync(p.location_address);
                        if (geo && geo.length > 0) {
                            lat = geo[0].latitude;
                            lng = geo[0].longitude;
                        }
                    } catch (err) {
                        console.log('[Heatmap] Geocode fallback failed for address:', p.location_address);
                    }
                }

                // Fallback 2: Default city location with small jitter if coordinates still missing
                if (lat == null || lng == null || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
                    lat = BASE_LAT + (Math.random() - 0.5) * 0.01;
                    lng = BASE_LNG + (Math.random() - 0.5) * 0.01;
                }

                const sv = (p.severity || 'low').toLowerCase();
                const weight = SEVERITY_CONFIG[sv]?.weight ?? 1;

                processed.push({
                    ...p,
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lng),
                    weight,
                    officer_name: p.officer_name || p.officer_review?.[0]?.officer?.full_name || 'Verified Officer',
                    officer_badge: p.officer_badge || p.officer_review?.[0]?.officer?.badge_id || '',
                });
            }

            setPoints(processed);
            setLastUpdated(new Date());

            // Auto-fit map to loaded points on first load
            if (showSpinner && processed.length > 0 && mapRef.current) {
                setTimeout(() => {
                    mapRef.current?.fitToCoordinates(
                        processed.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
                        { edgePadding: { top: 120, right: 60, bottom: 120, left: 60 }, animated: true }
                    );
                }, 600);
            }
        }

        setLoading(false);
        setRefreshing(false);
    }, [timeFilter]);

    // Re-fetch when time filter changes
    useEffect(() => {
        loadData(true);
    }, [timeFilter]);

    // Real-time subscription: refresh on new approvals
    useEffect(() => {
        const channel = subscribeToApprovedMapReports(() => {
            console.log('[Heatmap] New approval detected — refreshing map...');
            loadData(false);
        });
        return () => supabase.removeChannel(channel);
    }, [loadData]);

    // ── Bounding box handler: re-fetch on significant pan/zoom ────────────────
    const regionChangeTimeout = useRef(null);
    const onRegionChangeComplete = useCallback((region) => {
        setLatDelta(region.latitudeDelta);

        const newBbox = {
            minLat: region.latitude - region.latitudeDelta,
            maxLat: region.latitude + region.latitudeDelta,
            minLng: region.longitude - region.longitudeDelta,
            maxLng: region.longitude + region.longitudeDelta,
        };
        bboxRef.current = newBbox;

        // Debounce: only re-fetch after user stops panning for 800ms
        clearTimeout(regionChangeTimeout.current);
        regionChangeTimeout.current = setTimeout(() => {
            loadData(false, newBbox);
        }, 800);
    }, [loadData]);

    // ── Build clusters from current points ────────────────────────────────────
    const clusters = useMemo(() => buildClusters(points, latDelta), [points, latDelta]);

    // ── Heatmap points (weighted) ─────────────────────────────────────────────
    const heatmapPoints = useMemo(() =>
        points.map(p => ({
            latitude:  p.latitude,
            longitude: p.longitude,
            weight:    p.weight ?? 1,
        })),
    [points]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const criticalCount = points.filter(p => p.severity?.toLowerCase() === 'critical').length;
        const highCount     = points.filter(p => p.severity?.toLowerCase() === 'high').length;
        return { total: points.length, critical: criticalCount, high: highCount };
    }, [points]);

    const formatLastUpdated = () => {
        if (!lastUpdated) return '';
        const diffSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
        if (diffSec < 10) return 'just now';
        if (diffSec < 60) return `${diffSec}s ago`;
        return `${Math.floor(diffSec / 60)}m ago`;
    };

    // ── Render time filter pill ───────────────────────────────────────────────
    const renderFilter = (label, value) => {
        const active = timeFilter === value;
        return (
            <TouchableOpacity
                key={value}
                style={[styles.filterBtn, active && styles.filterBtnActive]}
                onPress={() => setTimeFilter(value)}
                activeOpacity={0.7}
            >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="dark-content" statusBgColor="#F4F6F9" />

            {/* ── Map ── */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={{ latitude: BASE_LAT, longitude: BASE_LNG, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
                onRegionChangeComplete={onRegionChangeComplete}
                mapType="standard"
                showsUserLocation={false}
                showsMyLocationButton={false}
            >
                {/* Single-color circular heat zones when layer is toggled */}
                {showHeatmap && clusters.map(cluster => {
                    const severityKey = (cluster.topSeverity || cluster.severity || 'low').toLowerCase();
                    const cfg = SEVERITY_CONFIG[severityKey] ?? SEVERITY_CONFIG.low;
                    const radiusMeters = Math.max(120, Math.min(700, cluster.count * 90));
                    return (
                        <Circle
                            key={`heat_circle_${cluster.id}`}
                            center={{ latitude: cluster.latitude, longitude: cluster.longitude }}
                            radius={radiusMeters}
                            fillColor={cfg.glowOuter}
                            strokeColor={cfg.glowInner}
                            strokeWidth={1.5}
                        />
                    );
                })}

                {/* Clustered markers (always visible for interactivity) */}
                {clusters.map(cluster => (
                    <Marker
                        key={cluster.id}
                        coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
                        onPress={() => setSelectedItem(cluster)}
                        tracksViewChanges={false}
                    >
                        <ClusterMarker cluster={cluster} onPress={() => setSelectedItem(cluster)} />
                    </Marker>
                ))}
            </MapView>

            {/* ── Top overlay ── */}
            <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">

                {/* Header card */}
                <View style={styles.headerCard}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.headerTitle}>Live Violation Map</Text>
                            <Text style={styles.headerSub}>Approved reports only · Location protected</Text>
                        </View>
                        {/* Live indicator */}
                        <Animated.View style={[styles.liveIndicator, { opacity: pulseAnim }]}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>LIVE</Text>
                        </Animated.View>
                    </View>

                    {/* Time filters */}
                    <View style={styles.filterRow}>
                        {renderFilter('Today', 'today')}
                        {renderFilter('7 Days', '7_days')}
                        {renderFilter('30 Days', '30_days')}
                        {renderFilter('All', 'all')}
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
            {/* Layer toggle */}
            <TouchableOpacity
                style={[styles.fab, styles.fabLayers]}
                onPress={() => setShowHeatmap(h => !h)}
                activeOpacity={0.85}
            >
                <Ionicons name="layers" size={22} color={showHeatmap ? COLORS.primary : COLORS.textTertiary} />
                {showHeatmap && <View style={styles.fabActiveDot} />}
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
                        <Text style={styles.emptyTitle}>No approved reports</Text>
                        <Text style={styles.emptySub}>Approved reports will appear here automatically.</Text>
                    </View>
                </View>
            )}

            {/* ── Popup bottom sheet ── */}
            <Modal
                visible={!!selectedItem}
                transparent
                animationType="slide"
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
    liveDot:       { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#DC2626' },
    liveText:      { fontFamily: 'Nunito-Bold', fontSize: 10, color: '#DC2626', letterSpacing: 1 },

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
    fabLayers:    { bottom: 110 },
    fabRefresh:   { bottom: 166 },
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
