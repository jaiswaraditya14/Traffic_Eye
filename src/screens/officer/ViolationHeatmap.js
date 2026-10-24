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
    TextInput,
    useColorScheme,
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
    DARK_COLORS,
    MAP_SEVERITY_THEME,
    MAP_STATUS_THEME,
    SPACING,
    FONT_SIZES,
    BORDER_RADIUS,
    SHADOWS,
} from '../../utils/theme';

// MapLibre OpenFreeMap style (zero API key)
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const { width } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────
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
    padding: { top: 220, bottom: 80, left: 20, right: 20 },
};

const VIOLATION_TYPES = [
    'No Helmet',
    'Triple Riding',
    'Signal Jump',
    'Wrong Parking',
    'Using Mobile',
    'Over Speeding',
    'No Seatbelt',
    'Wrong Side',
];

// ─── Map Expressions (Fill = Severity, Border = Status) ──────────────────────
// User Requirement:
// "Pin fill = severity colour. Pin border/icon = status."
// Severity: Low #FACC15, Medium #F97316, High #DC2626
// Status: Pending #3B82F6, Verified #16A34A, Rejected #6B7280
const SEVERITY_COLOR_EXPR = [
    'match', ['get', 'severity'],
    'critical', MAP_SEVERITY_THEME.critical.color,
    'high',     MAP_SEVERITY_THEME.high.color,
    'medium',   MAP_SEVERITY_THEME.medium.color,
    'low',      MAP_SEVERITY_THEME.low.color,
    /* default */ MAP_SEVERITY_THEME.low.color,
];

const STATUS_BORDER_COLOR_EXPR = [
    'match', ['get', 'status'],
    'pending',  MAP_STATUS_THEME.pending.color,
    'approved', MAP_STATUS_THEME.approved.color,
    'verified', MAP_STATUS_THEME.approved.color,
    'rejected', MAP_STATUS_THEME.rejected.color,
    /* default */ MAP_STATUS_THEME.pending.color,
];

const CIRCLE_OPACITY_EXPR = [
    'case',
    ['==', ['get', 'location_source'], 'pincode_approx'], 0.60,
    0.95,
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
        12, 0.35,
    ],
    heatmapColor: [
        'interpolate', ['linear'],
        ['heatmap-density'],
        0,    'rgba(59,130,246,0)',
        0.2,  'rgba(250,204,21,0.5)',
        0.4,  'rgba(249,115,22,0.7)',
        0.8,  'rgba(220,38,38,0.85)',
        1,    'rgba(185,28,28,1)',
    ],
};

// Circle layer style for individual points (exact location, severity fill, status border)
const CIRCLE_LAYER_STYLE = {
    circleRadius: [
        'interpolate', ['linear'], ['zoom'],
        8,  6,
        14, 14,
    ],
    circleColor: SEVERITY_COLOR_EXPR,
    circleOpacity: CIRCLE_OPACITY_EXPR,
    circleStrokeWidth: 2.5,
    circleStrokeColor: STATUS_BORDER_COLOR_EXPR,
    circleStrokeOpacity: 1,
};

// Cluster circle style
const CLUSTER_CIRCLE_STYLE = {
    circleRadius: [
        'step', ['get', 'point_count'],
        18,
        5,  22,
        20, 28,
    ],
    circleColor: [
        'step', ['get', 'point_count'],
        MAP_SEVERITY_THEME.low.color,
        5,  MAP_SEVERITY_THEME.medium.color,
        20, MAP_SEVERITY_THEME.high.color,
    ],
    circleOpacity: 0.88,
    circleStrokeWidth: 2,
    circleStrokeColor: COLORS.surface,
};

const CLUSTER_COUNT_STYLE = {
    textField: '{point_count}',
    textFont: ['Open Sans Bold', 'Arial Unicode MS Bold'],
    textSize: 12,
    textColor: '#FFFFFF',
    textIgnorePlacement: true,
    textAllowOverlap: true,
};

// ─── Build GeoJSON FeatureCollection from valid report points ─────────────────
function buildGeoJSON(points) {
    const features = [];
    for (const p of points) {
        const lat = typeof p.latitude === 'number' ? p.latitude : parseFloat(p.latitude);
        const lng = typeof p.longitude === 'number' ? p.longitude : parseFloat(p.longitude);

        if (!isFinite(lat) || !isFinite(lng) ||
            Math.abs(lat) > 90 || Math.abs(lng) > 180 ||
            (lat === 0 && lng === 0)) {
            continue;
        }

        const severityKey = (p.severity || 'low').toLowerCase();
        const statusKey = (p.status || 'pending').toLowerCase();
        const weight = MAP_SEVERITY_THEME[severityKey]?.weight ?? 1;

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
                status: statusKey,
                location_source: p.location_source || 'device_gps',
                weight,
                violation_type: p.violation_type || 'Traffic Violation',
                submitted_at: p.submitted_at || null,
                reviewed_at: p.reviewed_at || null,
                image_url: p.image_url || null,
                officer_name: p.officer_name || p.officer_reviews?.[0]?.officer?.full_name || 'Verified Officer',
                officer_badge: p.officer_badge || p.officer_reviews?.[0]?.officer?.badge_id || '',
                officer_jurisdiction: p.officer_jurisdiction || '',
                location_address: p.location_address || '',
            },
        });
    }
    return {
        type: 'FeatureCollection',
        features,
    };
}

// ─── Popup Callout Sheet ───────────────────────────────────────────────────────
function PopupSheet({ item, onClose, isDark }) {
    if (!item) return null;

    const isCluster = !!item.cluster;
    const severityKey = (item.severity || 'low').toLowerCase();
    const statusKey = (item.status || 'pending').toLowerCase();
    const sevTheme = MAP_SEVERITY_THEME[severityKey] ?? MAP_SEVERITY_THEME.low;
    const statTheme = MAP_STATUS_THEME[statusKey] ?? MAP_STATUS_THEME.pending;

    const isApprox = item.location_source === 'pincode_approx';

    const formatDate = (ts) => {
        if (!ts) return '—';
        return new Date(ts).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <View style={[sheetStyles.container, isDark && sheetStyles.containerDark]}>
            <View style={sheetStyles.grabber} />

            {/* Header */}
            <View style={sheetStyles.header}>
                <View style={sheetStyles.titleRow}>
                    <View style={[sheetStyles.pill, { backgroundColor: sevTheme.color }]}>
                        <Text style={sheetStyles.pillTextWhite}>{sevTheme.label.toUpperCase()}</Text>
                    </View>
                    <View style={[sheetStyles.pill, { backgroundColor: statTheme.lightBg, borderColor: statTheme.border, borderWidth: 1 }]}>
                        <Ionicons name={statTheme.icon} size={13} color={statTheme.color} />
                        <Text style={[sheetStyles.pillText, { color: statTheme.color }]}>{statTheme.label}</Text>
                    </View>
                    {isApprox && (
                        <View style={[sheetStyles.pill, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB', borderWidth: 1 }]}>
                            <Ionicons name="information-circle" size={13} color="#4B5563" />
                            <Text style={[sheetStyles.pillText, { color: '#4B5563' }]}>Approximate location</Text>
                        </View>
                    )}
                </View>

                {isCluster ? (
                    <>
                        <Text style={[sheetStyles.titleMain, isDark && sheetStyles.textWhite]}>{item.point_count} Violations in Area</Text>
                        <Text style={sheetStyles.subtitle}>Tap to zoom in and inspect individual reports</Text>
                    </>
                ) : (
                    <Text style={[sheetStyles.titleMain, isDark && sheetStyles.textWhite]}>{item.violation_type || 'Violation Report'}</Text>
                )}
            </View>

            <View style={sheetStyles.divider} />

            {/* Detail Rows */}
            <View style={sheetStyles.rows}>
                {isCluster ? (
                    <>
                        <DetailRow icon="stats-chart" label="Total in cluster" value={`${item.point_count} reports`} isDark={isDark} />
                        <DetailRow icon="location" label="Area" value="Cluster center" isDark={isDark} />
                    </>
                ) : (
                    <>
                        <DetailRow icon="location" label="Incident Location" value={item.location_address || 'Mumbai, Maharashtra'} isDark={isDark} />
                        <DetailRow icon="calendar" label="Date & Time" value={formatDate(item.submitted_at || item.reviewed_at)} isDark={isDark} />
                        <DetailRow icon="speedometer" label="Severity" value={sevTheme.label} color={sevTheme.color} isDark={isDark} />
                        <DetailRow icon="shield-checkmark" label="Status" value={statTheme.label} color={statTheme.color} isDark={isDark} />
                        {item.officer_name && item.officer_name !== 'Verified Officer' && (
                            <DetailRow icon="person" label="Reviewed by" value={`${item.officer_name} (${item.officer_badge || 'Officer'})`} isDark={isDark} />
                        )}
                        <DetailRow
                            icon="navigate-circle"
                            label="Coordinate Source"
                            value={
                                item.location_source === 'exif' ? 'Original Photo GPS' :
                                item.location_source === 'geocoded_address' ? 'Geocoded Address' :
                                item.location_source === 'pincode_approx' ? 'Pincode Centroid (Approximate)' :
                                'Live Device GPS'
                            }
                            isDark={isDark}
                        />
                    </>
                )}
            </View>

            {/* Evidence Image */}
            {!isCluster && item.image_url ? (
                <View style={sheetStyles.imageSection}>
                    <Text style={sheetStyles.imageSectionTitle}>Evidence Photo</Text>
                    <Image source={{ uri: item.image_url }} style={sheetStyles.evidenceImage} resizeMode="cover" />
                </View>
            ) : null}

            {/* Close Button */}
            <TouchableOpacity style={sheetStyles.closeBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={sheetStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
        </View>
    );
}

function DetailRow({ icon, label, value, color, isDark }) {
    return (
        <View style={sheetStyles.row}>
            <Ionicons name={icon} size={16} color={color || (isDark ? '#94A3B8' : COLORS.textTertiary)} style={{ marginTop: 2 }} />
            <View style={sheetStyles.rowText}>
                <Text style={sheetStyles.rowLabel}>{label}</Text>
                <Text style={[sheetStyles.rowValue, color && { color }, isDark && !color && sheetStyles.textWhite]}>{value}</Text>
            </View>
        </View>
    );
}

// ─── Filter Bottom Sheet Modal ────────────────────────────────────────────────
function FilterBottomSheet({
    visible,
    onClose,
    onApply,
    onReset,
    filters,
    setFilters,
    matchingCount,
    isDark,
}) {
    const [localFilters, setLocalFilters] = useState(filters);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters, visible]);

    const toggleStatus = (st) => {
        setLocalFilters(prev => {
            const has = prev.statuses.includes(st);
            const statuses = has ? prev.statuses.filter(s => s !== st) : [...prev.statuses, st];
            return { ...prev, statuses };
        });
    };

    const toggleSeverity = (sv) => {
        setLocalFilters(prev => {
            const has = prev.severities.includes(sv);
            const severities = has ? prev.severities.filter(s => s !== sv) : [...prev.severities, sv];
            return { ...prev, severities };
        });
    };

    const toggleViolationType = (vt) => {
        setLocalFilters(prev => {
            const has = prev.violationTypes.includes(vt);
            const violationTypes = has ? prev.violationTypes.filter(v => v !== vt) : [...prev.violationTypes, vt];
            return { ...prev, violationTypes };
        });
    };

    const setDateRange = (range) => {
        setLocalFilters(prev => ({ ...prev, range }));
    };

    const activeCount = useMemo(() => {
        let count = 0;
        if (localFilters.statuses.length > 0 && localFilters.statuses.length < 3) count += localFilters.statuses.length;
        if (localFilters.severities.length > 0 && localFilters.severities.length < 3) count += localFilters.severities.length;
        if (localFilters.violationTypes.length > 0) count += localFilters.violationTypes.length;
        if (localFilters.range !== 'all') count += 1;
        if (localFilters.area && localFilters.area.trim()) count += 1;
        return count;
    }, [localFilters]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={modalStyles.overlay}>
                <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[modalStyles.sheet, isDark && modalStyles.sheetDark]}>
                    <View style={modalStyles.grabber} />

                    {/* Header */}
                    <View style={modalStyles.headerRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[modalStyles.headerTitle, isDark && modalStyles.textWhite]}>Filters</Text>
                            {activeCount > 0 && (
                                <View style={modalStyles.activeBadge}>
                                    <Text style={modalStyles.activeBadgeText}>{activeCount}</Text>
                                </View>
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <TouchableOpacity onPress={() => { onReset(); onClose(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={modalStyles.clearAllText}>Clear all</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClose} style={modalStyles.closeIcon}>
                                <Ionicons name="close" size={20} color={isDark ? '#FFF' : COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={modalStyles.scrollBody} showsVerticalScrollIndicator={false}>
                        {/* 1. Status Filter */}
                        <Text style={modalStyles.sectionTitle}>STATUS</Text>
                        <View style={modalStyles.chipContainer}>
                            {Object.entries(MAP_STATUS_THEME).map(([key, cfg]) => {
                                const selected = localFilters.statuses.includes(key);
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            modalStyles.chip,
                                            { borderColor: cfg.border },
                                            selected
                                                ? { backgroundColor: cfg.color, borderColor: cfg.color }
                                                : { backgroundColor: cfg.lightBg }
                                        ]}
                                        onPress={() => toggleStatus(key)}
                                        activeOpacity={0.75}
                                    >
                                        <Ionicons
                                            name={cfg.icon}
                                            size={14}
                                            color={selected ? '#FFFFFF' : cfg.color}
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={[modalStyles.chipText, { color: selected ? '#FFFFFF' : cfg.color }]}>
                                            {cfg.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* 2. Severity Filter */}
                        <Text style={modalStyles.sectionTitle}>SEVERITY</Text>
                        <View style={modalStyles.chipContainer}>
                            {['low', 'medium', 'high'].map(key => {
                                const cfg = MAP_SEVERITY_THEME[key];
                                const selected = localFilters.severities.includes(key);
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            modalStyles.chip,
                                            { borderColor: cfg.border },
                                            selected
                                                ? { backgroundColor: cfg.color, borderColor: cfg.color }
                                                : { backgroundColor: cfg.lightBg }
                                        ]}
                                        onPress={() => toggleSeverity(key)}
                                        activeOpacity={0.75}
                                    >
                                        <View style={[modalStyles.dot, { backgroundColor: selected ? '#FFFFFF' : cfg.color }]} />
                                        <Text style={[modalStyles.chipText, { color: selected ? '#FFFFFF' : cfg.color }]}>
                                            {cfg.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* 3. Date Range Filter */}
                        <Text style={modalStyles.sectionTitle}>TIME RANGE</Text>
                        <View style={modalStyles.chipContainer}>
                            {[
                                { key: 'all', label: 'All Time' },
                                { key: 'today', label: 'Today' },
                                { key: 'week', label: 'Last 7 Days' },
                                { key: 'month', label: 'Last 30 Days' },
                            ].map(item => {
                                const selected = localFilters.range === item.key;
                                return (
                                    <TouchableOpacity
                                        key={item.key}
                                        style={[
                                            modalStyles.chip,
                                            selected
                                                ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                                                : { backgroundColor: isDark ? '#1E293B' : COLORS.surfaceContainerLow, borderColor: isDark ? '#334155' : COLORS.borderLight }
                                        ]}
                                        onPress={() => setDateRange(item.key)}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[modalStyles.chipText, { color: selected ? '#FFFFFF' : (isDark ? '#E2E8F0' : COLORS.textSecondary) }]}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* 4. Violation Type */}
                        <Text style={modalStyles.sectionTitle}>VIOLATION TYPE</Text>
                        <View style={modalStyles.chipContainer}>
                            {VIOLATION_TYPES.map(vt => {
                                const selected = localFilters.violationTypes.includes(vt);
                                return (
                                    <TouchableOpacity
                                        key={vt}
                                        style={[
                                            modalStyles.chip,
                                            selected
                                                ? { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary }
                                                : { backgroundColor: isDark ? '#1E293B' : COLORS.surfaceContainerLow, borderColor: isDark ? '#334155' : COLORS.borderLight }
                                        ]}
                                        onPress={() => toggleViolationType(vt)}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[modalStyles.chipText, { color: selected ? '#FFFFFF' : (isDark ? '#E2E8F0' : COLORS.textSecondary) }]}>
                                            {vt}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* 5. Area / Pincode (Optional) */}
                        <Text style={modalStyles.sectionTitle}>AREA / PINCODE (OPTIONAL)</Text>
                        <View style={[modalStyles.searchBox, isDark && modalStyles.searchBoxDark]}>
                            <Ionicons name="search" size={16} color={isDark ? '#94A3B8' : COLORS.textTertiary} />
                            <TextInput
                                style={[modalStyles.searchInput, isDark && modalStyles.textWhite]}
                                placeholder="e.g. Vakola, Chembur, 400055, Bandra..."
                                placeholderTextColor={isDark ? '#64748B' : COLORS.textTertiary}
                                value={localFilters.area}
                                onChangeText={text => setLocalFilters(prev => ({ ...prev, area: text }))}
                                returnKeyType="done"
                            />
                            {localFilters.area ? (
                                <TouchableOpacity onPress={() => setLocalFilters(prev => ({ ...prev, area: '' }))}>
                                    <Ionicons name="close-circle" size={16} color={COLORS.textTertiary} />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </ScrollView>

                    {/* Apply Button */}
                    <View style={modalStyles.footer}>
                        <TouchableOpacity
                            style={modalStyles.applyButton}
                            onPress={() => {
                                onApply(localFilters);
                                onClose();
                            }}
                            activeOpacity={0.85}
                        >
                            <Text style={modalStyles.applyButtonText}>
                                Apply Filters ({matchingCount} visible)
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Main ViolationHeatmap Screen ─────────────────────────────────────────────
export default function ViolationHeatmap({ navigation }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const reduced = useReducedMotion();

    // Filters state
    const [filters, setFilters] = useState({
        statuses: ['approved', 'pending', 'rejected'],
        severities: ['low', 'medium', 'high'],
        violationTypes: [],
        range: 'all',
        area: '',
    });

    const [filterSheetVisible, setFilterSheetVisible] = useState(false);
    const [toast, setToast] = useState(null);
    const sequence = useRef(0);
    const [points, setPoints]             = useState([]);
    const [loading, setLoading]           = useState(true);
    const [refreshing, setRefreshing]     = useState(false);
    const [lastUpdated, setLastUpdated]   = useState(null);
    const [showHeatmap, setShowHeatmap]   = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);

    const cameraRef = useRef(null);
    const bboxRef = useRef(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const isMounted = useRef(true);

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
    const loadData = useCallback(async (showSpinner = true, currentFilters = filters) => {
        if (!isMounted.current) return;
        if (showSpinner) setLoading(true);
        else             setRefreshing(true);

        const request = ++sequence.current;
        let data, error;
        try {
            const daysBack = currentFilters.range === 'today' ? 1 :
                             currentFilters.range === 'week' ? 7 :
                             currentFilters.range === 'month' ? 30 : 3650;

            ({ data, error } = await fetchHeatmapPoints({
                bbox: bboxRef.current,
                daysBack,
                statuses: currentFilters.statuses,
                severities: currentFilters.severities,
                violationTypes: currentFilters.violationTypes,
                searchArea: currentFilters.area,
            }));
        } catch (failure) {
            error = failure;
        }

        if (!isMounted.current || request !== sequence.current) return;

        if (error) {
            setToast('Could not refresh map data. Tap refresh to retry.');
        } else if (data) {
            const processed = [];
            for (const p of data) {
                const lat = typeof p.latitude === 'number' ? p.latitude : parseFloat(p.latitude);
                const lng = typeof p.longitude === 'number' ? p.longitude : parseFloat(p.longitude);

                if (!isFinite(lat) || !isFinite(lng) ||
                    Math.abs(lat) > 90 || Math.abs(lng) > 180 ||
                    (lat === 0 && lng === 0)) {
                    continue;
                }

                const sv = (p.severity || 'low').toLowerCase();
                const st = (p.status || 'pending').toLowerCase();
                processed.push({
                    ...p,
                    latitude: lat,
                    longitude: lng,
                    severity: sv,
                    status: st,
                    location_source: p.location_source || 'device_gps',
                    weight: MAP_SEVERITY_THEME[sv]?.weight ?? 1,
                    officer_name: p.officer_name || p.officer_reviews?.[0]?.officer?.full_name || 'Verified Officer',
                    officer_badge: p.officer_badge || p.officer_reviews?.[0]?.officer?.badge_id || '',
                    officer_jurisdiction: p.officer_jurisdiction || '',
                });
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
    }, [filters]);

    // Initial load & mount guard
    useEffect(() => {
        isMounted.current = true;
        loadData(true);
        return () => { isMounted.current = false; };
    }, []);

    // Real-time subscription: refresh on new reports / reviews
    useEffect(() => {
        const channel = subscribeToApprovedMapReports(() => {
            if (__DEV__) console.log('[Heatmap] Report update detected — refreshing map...');
            loadData(false);
        });
        return () => supabase.removeChannel(channel);
    }, [loadData]);

    // Viewport pan/zoom debounce
    const regionChangeTimeout = useRef(null);
    const onRegionDidChange = useCallback((event) => {
        const ne = event?.nativeEvent?.bounds?.ne;
        const sw = event?.nativeEvent?.bounds?.sw;
        if (!ne || !sw) return;

        bboxRef.current = {
            minLat: sw[1],
            maxLat: ne[1],
            minLng: sw[0],
            maxLng: ne[0],
        };

        clearTimeout(regionChangeTimeout.current);
        regionChangeTimeout.current = setTimeout(() => {
            if (isMounted.current) loadData(false);
        }, 900);
    }, [loadData]);

    // ── Filtered points (Multi-select within category = OR, across categories = AND) ──
    const filteredPoints = useMemo(() => {
        return filterHeatmapReports(points, {
            severities: filters.severities,
            statuses: filters.statuses,
            violationTypes: filters.violationTypes,
            area: filters.area,
            range: filters.range,
        });
    }, [points, filters]);

    const geoJSON = useMemo(() => buildGeoJSON(filteredPoints), [filteredPoints]);

    // Total active filters count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.statuses.length > 0 && filters.statuses.length < 3) count += filters.statuses.length;
        if (filters.severities.length > 0 && filters.severities.length < 3) count += filters.severities.length;
        if (filters.violationTypes.length > 0) count += filters.violationTypes.length;
        if (filters.range !== 'all') count += 1;
        if (filters.area && filters.area.trim()) count += 1;
        return count;
    }, [filters]);

    const handleResetFilters = () => {
        const reset = {
            statuses: ['approved', 'pending', 'rejected'],
            severities: ['low', 'medium', 'high'],
            violationTypes: [],
            range: 'all',
            area: '',
        };
        setFilters(reset);
        loadData(false, reset);
    };

    // Quick filter toggle from chip bar
    const toggleQuickStatus = (st) => {
        const has = filters.statuses.includes(st);
        const updated = has
            ? filters.statuses.filter(s => s !== st)
            : [...filters.statuses, st];
        // Ensure at least one or toggles
        const newFilters = { ...filters, statuses: updated };
        setFilters(newFilters);
        loadData(false, newFilters);
    };

    const toggleQuickSeverity = (sv) => {
        const has = filters.severities.includes(sv);
        const updated = has
            ? filters.severities.filter(s => s !== sv)
            : [...filters.severities, sv];
        const newFilters = { ...filters, severities: updated };
        setFilters(newFilters);
        loadData(false, newFilters);
    };

    const handleSourcePress = useCallback((event) => {
        const feature = event?.nativeEvent?.payload || event?.nativeEvent?.features?.[0] || event?.features?.[0];
        if (!feature?.properties) return;

        const props = feature.properties;
        if (props.cluster) {
            const coords = feature.geometry?.coordinates;
            if (coords && cameraRef.current) {
                cameraRef.current.flyTo({ center: coords, duration: 600 });
                cameraRef.current.easeTo({ center: coords, zoom: (props.cluster_expansion_zoom ?? 10) + 1, duration: reduced ? 0 : 600 });
            }
            setSelectedItem({ ...props, cluster: true });
        } else {
            setSelectedItem(props);
        }
    }, [reduced]);

    const handleMyLocation = async () => {
        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (!permission.granted) {
                if (isMounted.current) setToast('Location permission denied.');
                return;
            }
            const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (isMounted.current && cameraRef.current) {
                cameraRef.current.flyTo({ center: [position.coords.longitude, position.coords.latitude], duration: reduced ? 0 : 600 });
            }
        } catch {
            if (isMounted.current) setToast('Location unavailable.');
        }
    };

    const handleFitReports = useCallback(() => {
        if (!cameraRef.current || filteredPoints.length === 0) return;
        const lngs = filteredPoints.map(p => p.longitude);
        const lats = filteredPoints.map(p => p.latitude);
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
                { padding: { top: 220, bottom: 90, left: 30, right: 30 }, duration: 600 }
            );
        } catch (err) {
            if (__DEV__) console.warn('[Heatmap] Report framing unavailable.');
        }
    }, [filteredPoints]);

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <FocusAwareStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} statusBgColor={isDark ? DARK_COLORS.background : COLORS.background} />

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

                <GeoJSONSource
                    id="violations"
                    data={geoJSON}
                    cluster={true}
                    clusterRadius={50}
                    clusterMaxZoom={14}
                    onPress={handleSourcePress}
                >
                    {showHeatmap && (
                        <Layer
                            id="violations-heatmap"
                            type="heatmap"
                            filter={['!', ['has', 'point_count']]}
                            style={HEATMAP_LAYER_STYLE}
                        />
                    )}

                    <Layer
                        id="violations-cluster-circle"
                        type="circle"
                        filter={['has', 'point_count']}
                        style={CLUSTER_CIRCLE_STYLE}
                    />

                    <Layer
                        id="violations-cluster-count"
                        type="symbol"
                        filter={['has', 'point_count']}
                        style={CLUSTER_COUNT_STYLE}
                    />

                    {/* Exact individual pins: fill = severity, border = status */}
                    <Layer
                        id="violations-circles"
                        type="circle"
                        filter={['!', ['has', 'point_count']]}
                        style={CIRCLE_LAYER_STYLE}
                    />
                </GeoJSONSource>
            </Map>

            {/* ── Top Floating Header & Filter Bar ── */}
            <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
                <View style={[styles.headerCard, isDark && styles.headerCardDark]}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={[styles.headerTitle, isDark && styles.textWhite]}>Live Violation Map</Text>
                            <Text style={styles.headerSub}>True location coordinates · Live reports</Text>
                        </View>
                        <Animated.View style={[styles.liveIndicator, { opacity: pulseAnim }]}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>{refreshing ? 'UPDATING' : 'LIVE'}</Text>
                        </Animated.View>
                    </View>

                    {/* Horizontal Scrollable Quick Chip Bar */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.quickBarContainer}
                    >
                        {/* Filters Button */}
                        <TouchableOpacity
                            style={[
                                styles.filterModalBtn,
                                activeFilterCount > 0 && styles.filterModalBtnActive
                            ]}
                            onPress={() => setFilterSheetVisible(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name="options-outline"
                                size={15}
                                color={activeFilterCount > 0 ? '#FFFFFF' : COLORS.primary}
                            />
                            <Text style={[styles.filterModalBtnText, activeFilterCount > 0 && { color: '#FFFFFF' }]}>
                                Filters
                            </Text>
                            {activeFilterCount > 0 && (
                                <View style={styles.modalBtnBadge}>
                                    <Text style={styles.modalBtnBadgeText}>{activeFilterCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Status Quick Chips */}
                        {Object.entries(MAP_STATUS_THEME).map(([key, cfg]) => {
                            const isSelected = filters.statuses.includes(key);
                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.quickChip,
                                        { borderColor: cfg.border },
                                        isSelected
                                            ? { backgroundColor: cfg.color, borderColor: cfg.color }
                                            : { backgroundColor: cfg.lightBg }
                                    ]}
                                    onPress={() => toggleQuickStatus(key)}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name={cfg.icon} size={12} color={isSelected ? '#FFFFFF' : cfg.color} style={{ marginRight: 3 }} />
                                    <Text style={[styles.quickChipText, { color: isSelected ? '#FFFFFF' : cfg.color }]}>
                                        {cfg.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Severity Quick Chips */}
                        {['high', 'medium', 'low'].map(key => {
                            const cfg = MAP_SEVERITY_THEME[key];
                            const isSelected = filters.severities.includes(key);
                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.quickChip,
                                        { borderColor: cfg.border },
                                        isSelected
                                            ? { backgroundColor: cfg.color, borderColor: cfg.color }
                                            : { backgroundColor: cfg.lightBg }
                                    ]}
                                    onPress={() => toggleQuickSeverity(key)}
                                    activeOpacity={0.75}
                                >
                                    <View style={[styles.dot, { backgroundColor: isSelected ? '#FFFFFF' : cfg.color }]} />
                                    <Text style={[styles.quickChipText, { color: isSelected ? '#FFFFFF' : cfg.color }]}>
                                        {cfg.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Result count & Clear All banner */}
                    <View style={styles.resultsRow}>
                        <Text style={[styles.resultCountText, isDark && { color: '#94A3B8' }]}>
                            <Text style={[styles.resultCountBold, isDark && { color: '#F8FAFC' }]}>{filteredPoints.length}</Text> violations displayed
                        </Text>
                        {activeFilterCount > 0 && (
                            <TouchableOpacity onPress={handleResetFilters} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                                <Text style={styles.clearAllLink}>Clear all</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </SafeAreaView>

            {/* ── Floating Action Buttons (FABs) ── */}
            {filteredPoints.length > 0 && (
                <TouchableOpacity
                    style={[styles.fab, styles.fabFitReports, isDark && styles.fabDark]}
                    onPress={handleFitReports}
                    accessibilityRole="button"
                    accessibilityLabel="Fit all violations into view"
                    activeOpacity={0.85}
                >
                    <Ionicons name="expand" size={20} color={isDark ? '#FFF' : COLORS.primary} />
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={[styles.fab, styles.fabResetMMR, isDark && styles.fabDark]}
                onPress={handleMyLocation}
                accessibilityRole="button"
                accessibilityLabel="Center on my location"
                activeOpacity={0.85}
            >
                <Ionicons name="locate" size={20} color={isDark ? '#FFF' : COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.fab, styles.fabRefresh, isDark && styles.fabDark]}
                onPress={() => loadData(false)}
                activeOpacity={0.85}
                disabled={refreshing}
            >
                {refreshing
                    ? <ActivityIndicator size="small" color={isDark ? '#FFF' : COLORS.primary} />
                    : <Ionicons name="refresh" size={20} color={isDark ? '#FFF' : COLORS.primary} />
                }
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.fab, styles.fabLayers, isDark && styles.fabDark]}
                onPress={() => setShowHeatmap(h => !h)}
                activeOpacity={0.85}
            >
                <Ionicons name="layers" size={22} color={showHeatmap ? COLORS.primary : COLORS.textTertiary} />
                {showHeatmap && <View style={styles.fabActiveDot} />}
            </TouchableOpacity>

            {/* ── Compact Legend ── */}
            <View style={[styles.legendCard, isDark && styles.legendCardDark]}>
                <View style={styles.legendSection}>
                    <Text style={styles.legendTitle}>SEVERITY (PIN FILL):</Text>
                    <View style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: MAP_SEVERITY_THEME.low.color }]} />
                        <Text style={styles.legendLabel}>Low</Text>
                        <View style={[styles.legendDot, { backgroundColor: MAP_SEVERITY_THEME.medium.color }]} />
                        <Text style={styles.legendLabel}>Med</Text>
                        <View style={[styles.legendDot, { backgroundColor: MAP_SEVERITY_THEME.high.color }]} />
                        <Text style={styles.legendLabel}>High</Text>
                    </View>
                </View>
                <View style={styles.legendDivider} />
                <View style={styles.legendSection}>
                    <Text style={styles.legendTitle}>STATUS (PIN BORDER):</Text>
                    <View style={styles.legendRow}>
                        <View style={[styles.legendRing, { borderColor: MAP_STATUS_THEME.pending.color }]} />
                        <Text style={styles.legendLabel}>Pending</Text>
                        <View style={[styles.legendRing, { borderColor: MAP_STATUS_THEME.approved.color }]} />
                        <Text style={styles.legendLabel}>Verified</Text>
                        <View style={[styles.legendRing, { borderColor: MAP_STATUS_THEME.rejected.color }]} />
                        <Text style={styles.legendLabel}>Rejected</Text>
                    </View>
                </View>
            </View>

            {/* ── Loading Overlay ── */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={[styles.loadingCard, isDark && styles.loadingCardDark]}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={[styles.loadingText, isDark && styles.textWhite]}>Loading violation reports…</Text>
                    </View>
                </View>
            )}

            {/* ── Empty State ── */}
            {!loading && filteredPoints.length === 0 && (
                <View style={styles.emptyOverlay} pointerEvents="box-none">
                    <View style={[styles.emptyCard, isDark && styles.emptyCardDark]}>
                        <Ionicons name="filter-circle-outline" size={36} color={COLORS.textTertiary} />
                        <Text style={[styles.emptyTitle, isDark && styles.textWhite]}>No violations match filters</Text>
                        <Text style={styles.emptySub}>
                            {activeFilterCount > 0
                                ? 'Try removing some filters to see more reports.'
                                : 'No violation reports exist in the selected area.'}
                        </Text>
                        {activeFilterCount > 0 && (
                            <TouchableOpacity style={styles.emptyResetBtn} onPress={handleResetFilters} activeOpacity={0.85}>
                                <Text style={styles.emptyResetBtnText}>Reset all filters</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* ── Filter Bottom Sheet Modal ── */}
            <FilterBottomSheet
                visible={filterSheetVisible}
                onClose={() => setFilterSheetVisible(false)}
                filters={filters}
                setFilters={setFilters}
                onApply={(applied) => {
                    setFilters(applied);
                    loadData(false, applied);
                }}
                onReset={handleResetFilters}
                matchingCount={filteredPoints.length}
                isDark={isDark}
            />

            {/* ── Popup Details Sheet ── */}
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
                        <PopupSheet item={selectedItem} onClose={() => setSelectedItem(null)} isDark={isDark} />
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
    containerDark: { backgroundColor: '#0B0F19' },
    map: { ...StyleSheet.absoluteFillObject },
    textWhite: { color: '#FFFFFF' },

    // Top overlay
    topOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0,
    },
    headerCard: {
        marginHorizontal: SPACING.md,
        marginTop: SPACING.xs,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderRadius: BORDER_RADIUS.xl,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xs,
        ...SHADOWS.md,
    },
    headerCardDark: {
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        borderColor: '#1E293B',
        borderWidth: 1,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    headerTitle: { fontFamily: 'Nunito-Bold', fontSize: FONT_SIZES.md + 1, color: COLORS.primary },
    headerSub: { fontFamily: 'Nunito-Medium', fontSize: 11, color: COLORS.textTertiary, marginTop: 1 },

    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF2F2', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
    liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.errorLight },
    liveText: { fontFamily: 'Nunito-Bold', fontSize: 10, color: COLORS.errorLight, letterSpacing: 0.8 },

    // Quick filter chip bar
    quickBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        gap: 6,
    },
    filterModalBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceContainerLow,
        borderColor: COLORS.primaryBorder,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 4,
    },
    filterModalBtnActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterModalBtnText: {
        fontFamily: 'Nunito-Bold',
        fontSize: 12,
        color: COLORS.primary,
    },
    modalBtnBadge: {
        backgroundColor: COLORS.secondary,
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
    },
    modalBtnBadgeText: {
        fontFamily: 'Nunito-Bold',
        fontSize: 10,
        color: '#FFFFFF',
    },
    quickChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        paddingHorizontal: 9,
        paddingVertical: 5,
    },
    quickChipText: {
        fontFamily: 'Nunito-Bold',
        fontSize: 11,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },

    resultsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4,
        paddingBottom: 2,
    },
    resultCountText: {
        fontFamily: 'Nunito-Medium',
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    resultCountBold: {
        fontFamily: 'Nunito-Bold',
        color: COLORS.primary,
    },
    clearAllLink: {
        fontFamily: 'Nunito-Bold',
        fontSize: 11,
        color: COLORS.errorLight,
    },

    // Legend Card
    legendCard: {
        position: 'absolute',
        bottom: 16,
        left: SPACING.md,
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: SPACING.xs + 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        ...SHADOWS.sm,
    },
    legendCardDark: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderColor: '#1E293B',
        borderWidth: 1,
    },
    legendSection: {
        gap: 2,
    },
    legendTitle: {
        fontFamily: 'Nunito-Bold',
        fontSize: 8.5,
        color: COLORS.textTertiary,
        letterSpacing: 0.5,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendRing: {
        width: 9,
        height: 9,
        borderRadius: 4.5,
        borderWidth: 2,
        backgroundColor: '#FFFFFF',
    },
    legendLabel: {
        fontFamily: 'Nunito-SemiBold',
        fontSize: 10,
        color: COLORS.textSecondary,
        marginRight: 2,
    },
    legendDivider: {
        width: 1,
        height: 20,
        backgroundColor: COLORS.borderLight,
    },

    // FABs
    fab: {
        position: 'absolute', right: SPACING.md,
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: COLORS.surface,
        justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.md,
    },
    fabDark: {
        backgroundColor: '#1E293B',
    },
    fabLayers:     { bottom: 95 },
    fabRefresh:    { bottom: 147 },
    fabResetMMR:   { bottom: 199 },
    fabFitReports: { bottom: 251 },
    fabActiveDot: {
        position: 'absolute', top: 9, right: 9,
        width: 7, height: 7, borderRadius: 3.5,
        backgroundColor: COLORS.primary,
        borderWidth: 1.5, borderColor: COLORS.surface,
    },

    // Loading & Empty
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(248,249,251,0.65)',
    },
    loadingCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center', gap: SPACING.md,
        ...SHADOWS.lg,
    },
    loadingCardDark: {
        backgroundColor: '#1E293B',
    },
    loadingText: { fontFamily: 'Nunito-SemiBold', fontSize: FONT_SIZES.md, color: COLORS.textSecondary },

    emptyOverlay: {
        position: 'absolute', bottom: 160, left: 0, right: 0,
        alignItems: 'center',
    },
    emptyCard: {
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center', gap: SPACING.xs,
        marginHorizontal: SPACING.xl,
        ...SHADOWS.md,
    },
    emptyCardDark: {
        backgroundColor: '#1E293B',
    },
    emptyTitle: { fontFamily: 'Nunito-Bold', fontSize: FONT_SIZES.md, color: COLORS.textPrimary },
    emptySub: { fontFamily: 'Nunito-Medium', fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, textAlign: 'center', marginBottom: 6 },
    emptyResetBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
    },
    emptyResetBtnText: {
        fontFamily: 'Nunito-Bold',
        fontSize: 12,
        color: '#FFFFFF',
    },

    modalOverlay: {
        flex: 1, justifyContent: 'flex-end',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
});

// ─── Bottom Sheet Modal Styles ────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        ...SHADOWS.lg,
    },
    sheetDark: {
        backgroundColor: '#0F172A',
        borderColor: '#1E293B',
        borderWidth: 1,
    },
    grabber: {
        width: 38,
        height: 4,
        backgroundColor: '#CBD5E1',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: {
        fontFamily: 'Nunito-Bold',
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
    },
    activeBadge: {
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    activeBadgeText: {
        fontFamily: 'Nunito-Bold',
        fontSize: 11,
        color: '#FFFFFF',
    },
    clearAllText: {
        fontFamily: 'Nunito-Bold',
        fontSize: 13,
        color: COLORS.errorLight,
    },
    closeIcon: {
        padding: 4,
    },
    scrollBody: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
    },
    sectionTitle: {
        fontFamily: 'Nunito-Bold',
        fontSize: 11,
        color: COLORS.textTertiary,
        letterSpacing: 0.8,
        marginTop: SPACING.md,
        marginBottom: SPACING.xs + 2,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    chipText: {
        fontFamily: 'Nunito-Bold',
        fontSize: 12,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        marginRight: 5,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: Platform.OS === 'ios' ? 10 : 4,
        gap: 8,
        marginBottom: SPACING.md,
    },
    searchBoxDark: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Nunito-Medium',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    footer: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    applyButton: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.full,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    applyButtonText: {
        fontFamily: 'Nunito-Bold',
        fontSize: FONT_SIZES.md,
        color: '#FFFFFF',
    },
    textWhite: {
        color: '#FFFFFF',
    },
});

// ─── Popup Details Sheet Styles ───────────────────────────────────────────────
const sheetStyles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: BORDER_RADIUS.xxl,
        borderTopRightRadius: BORDER_RADIUS.xxl,
        padding: SPACING.lg,
        paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.lg,
        ...SHADOWS.lg,
    },
    containerDark: {
        backgroundColor: '#0F172A',
        borderColor: '#1E293B',
        borderWidth: 1,
    },
    textWhite: { color: '#FFFFFF' },
    grabber: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: COLORS.border,
        alignSelf: 'center', marginBottom: SPACING.md,
    },
    header: { marginBottom: SPACING.xs },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs + 2, marginBottom: SPACING.xs },
    pill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full,
    },
    pillText: { fontFamily: 'Nunito-Bold', fontSize: 11 },
    pillTextWhite: { fontFamily: 'Nunito-Bold', fontSize: 11, color: '#FFFFFF' },
    titleMain: { fontFamily: 'Nunito-Bold', fontSize: FONT_SIZES.lg + 1, color: COLORS.textPrimary, marginBottom: 2 },
    subtitle: { fontFamily: 'Nunito-Medium', fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.sm },
    rows: { gap: 8, marginBottom: SPACING.sm },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs + 2 },
    rowText: { flex: 1 },
    rowLabel: { fontFamily: 'Nunito-SemiBold', fontSize: 10, color: COLORS.textTertiary, textTransform: 'uppercase', marginBottom: 1 },
    rowValue: { fontFamily: 'Nunito-Medium', fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
    imageSection: { marginBottom: SPACING.md },
    imageSectionTitle: { fontFamily: 'Nunito-Bold', fontSize: 10, color: COLORS.textTertiary, textTransform: 'uppercase', marginBottom: 4 },
    evidenceImage: { width: '100%', height: 160, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderLight },
    closeBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: BORDER_RADIUS.full, alignItems: 'center' },
    closeBtnText: { fontFamily: 'Nunito-Bold', fontSize: FONT_SIZES.md, color: COLORS.surface },
});
