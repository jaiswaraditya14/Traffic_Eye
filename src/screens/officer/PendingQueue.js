/**
 * PendingQueue.js  (Officer Screen — advanced filtering & bulk triage)
 *
 * • Fetches pending image_reports from Supabase in real time
 * • Advanced Filtering (Type, Date range, Location strings)
 * • Sorting (Severity, Newest chronological, Oldest chronological)
 * • Bulk Selection Mode for rapid queue processing.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SectionList, FlatList,
    Image, StatusBar, ActivityIndicator, Animated, RefreshControl,
    TextInput, Modal, Alert, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FocusAwareStatusBar } from '../../components';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { fetchPendingReports, subscribeToOfficerQueue, submitOfficerDecision } from '../../services/reports';
import { useAuth } from '../../context';

// ── Tokens ────────────────────────────────────────────────────────────────
const C = {
    navy:     '#0A1E3F',
    navyMid:  '#0F2C59',
    amber:    '#D97706',
    white:    '#FFFFFF',
    offWhite: '#F4F6F9',
    surface:  '#FFFFFF',
    textPrimary:   '#0F172A',
    textSecondary: '#475569',
    textTertiary:  '#64748B',
    border:   '#CBD5E1',
    critical: '#1E3A8A',
    high:     '#C2410C',
    medium:   '#B45309',
    low:      '#15803D',
};

const SEV_CFG = {
    critical: { color: C.critical, bg: '#DBEAFE', label: 'CRITICAL', order: 0 },
    high:     { color: C.high,     bg: '#FFEDD5', label: 'HIGH',     order: 1 },
    medium:   { color: C.medium,   bg: '#FEF3C7', label: 'MEDIUM',   order: 2 },
    low:      { color: C.low,      bg: '#D1FAE5', label: 'LOW',      order: 3 },
};
const getSev = (s) => SEV_CFG[s] || SEV_CFG.medium;

// ── Live dot ─────────────────────────────────────────────────────────────
function LiveDot() {
    const pulse = useRef(new Animated.Value(0.5)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        ])).start();
    }, []);
    return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80', opacity: pulse }} />;
}

// ── Report card ──────────────────────────────────────────────────────────
function ReportCard({ report, onPress, onLongPress, isSelectionMode, isSelected }) {
    const sev      = getSev(report.severity);
    const submitted = report.submitted_at
        ? new Date(report.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        : '—';
    const name = report.submitter?.full_name || 'Anonymous';

    const hasLowConf = (report.ai_confidence ?? 1) < 0.70;
    const authCheck = report.authenticity_check;
    const hasAuthFlag = authCheck && (authCheck.authentic === false || (authCheck.flags && authCheck.flags.length > 0));
    const hasFraudRisk = hasLowConf || hasAuthFlag;

    return (
        <TouchableOpacity style={rc.card} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.82}>
            {isSelectionMode && (
                <View style={rc.checkboxContainer}>
                    <View style={[rc.checkbox, isSelected && rc.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color={C.white} />}
                    </View>
                </View>
            )}
            <View style={[rc.bar, { backgroundColor: sev.color }]} />

            {/* Image */}
            {report.image_url ? (
                <Image source={{ uri: report.image_url }} style={rc.thumb} resizeMode="cover" />
            ) : (
                <View style={[rc.thumb, rc.thumbPlaceholder]}>
                    <Ionicons name="image-outline" size={22} color={C.textTertiary} />
                </View>
            )}

            {/* Content */}
            <View style={rc.content}>
                <View style={rc.topRow}>
                    <Text style={rc.type} numberOfLines={1}>{report.violation_type || 'Traffic Violation'}</Text>
                    {hasFraudRisk && (
                        <View style={{ backgroundColor: '#FEF2F2', borderColor: '#EF4444', borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Ionicons name="warning" size={10} color="#DC2626" />
                            <Text style={{ fontSize: 9, fontFamily: 'Nunito-Bold', color: '#DC2626' }}>FRAUD FLAG</Text>
                        </View>
                    )}
                    <View style={[rc.sevChip, { backgroundColor: sev.bg }]}>
                        <Text style={[rc.sevText, { color: sev.color }]}>{sev.label}</Text>
                    </View>
                </View>

                {report.vehicle_number && (
                    <View style={rc.infoRow}>
                        <Ionicons name="car-outline" size={11} color={C.navyMid} />
                        <Text style={rc.infoText}>{report.vehicle_number}</Text>
                    </View>
                )}
                <View style={rc.infoRow}>
                    <Ionicons name="person-outline" size={11} color={C.textTertiary} />
                    <Text style={rc.infoText}>{name}</Text>
                </View>
                {report.location_address && (
                    <View style={rc.infoRow}>
                        <Ionicons name="location-outline" size={11} color={C.textTertiary} />
                        <Text style={rc.infoText} numberOfLines={1}>{report.location_address}</Text>
                    </View>
                )}
                <View style={rc.infoRow}>
                    <Ionicons name="time-outline" size={11} color={C.textTertiary} />
                    <Text style={rc.infoText}>{submitted}</Text>
                </View>
            </View>
            
            {!isSelectionMode && (
                <Ionicons name="chevron-forward" size={16} color={C.navyMid} style={{ marginRight: 12 }} />
            )}
        </TouchableOpacity>
    );
}

const rc = StyleSheet.create({
    card:    { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 16, marginBottom: 10, overflow: 'hidden', alignItems: 'center', shadowColor: C.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    checkboxContainer: { paddingLeft: 16, paddingRight: 8, justifyContent: 'center', alignItems: 'center' },
    checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
    checkboxSelected: { backgroundColor: C.navyMid, borderColor: C.navyMid },
    bar:     { width: 4, alignSelf: 'stretch' },
    thumb:   { width: 76, height: 88, backgroundColor: '#F2F4F6' },
    thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, padding: 12, gap: 4 },
    topRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 6 },
    type:    { flex: 1, fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    sevChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    sevText: { fontSize: 9, fontFamily: 'Nunito-ExtraBold', letterSpacing: 0.4 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoText: { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textSecondary },
});

// ── Main screen ───────────────────────────────────────────────────────────
export default function PendingQueue({ navigation }) {
    const { profile } = useAuth();
    
    // Core List States
    const [reports,    setReports]    = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search,     setSearch]     = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const hasLoadedRef = useRef(false);  

    // Advanced Filtering States
    const [sortMode, setSortMode] = useState('severity'); // severity, newest, oldest
    const [filterDateFrom, setFilterDateFrom] = useState(null);
    const [filterDateTo, setFilterDateTo] = useState(null);
    const [showDateFromPicker, setShowDateFromPicker] = useState(false);
    const [showDateToPicker, setShowDateToPicker] = useState(false);
    const [filterTypes, setFilterTypes] = useState([]);
    const [filterSeverity, setFilterSeverity] = useState([]);
    const [filterLocation, setFilterLocation] = useState('');
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

    // Temp states for Modal so they don't apply until user hits "Apply"
    const [tmpSortMode, setTmpSortMode] = useState('severity');
    const [tmpDateFrom, setTmpDateFrom] = useState(null);
    const [tmpDateTo, setTmpDateTo] = useState(null);
    const [tmpTypes, setTmpTypes] = useState([]);
    const [tmpSeverity, setTmpSeverity] = useState([]);
    const [tmpLocation, setTmpLocation] = useState('');

    // Bulk Triage States
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);

    // Scope filter: false = All Locations (Testing), true = My Jurisdiction
    const [filterByArea, setFilterByArea] = useState(false);

    const load = useCallback(async (isRefresh = false) => {
        if (!hasLoadedRef.current && !isRefresh) setLoading(true);
        const { data, error } = await fetchPendingReports(profile, filterByArea);
        if (!error && data) {
            setReports(data);
            hasLoadedRef.current = true;
        }
        setLoading(false);
        setRefreshing(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }, [profile, filterByArea, fadeAnim]);

    useEffect(() => {
        load(true);
    }, [filterByArea]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    useFocusEffect(
        useCallback(() => {
            const ch = subscribeToOfficerQueue(() => load(true), () => load(true));
            return () => { if (ch) ch.unsubscribe(); };
        }, [load])
    );

    // Provide dynamic list of violation types from the currently fetched reports
    const availableTypes = [
        'Speeding', 'Red Light', 'No Helmet', 'Wrong Way', 'Illegal Parking', 
        'Phone Use', 'Triple Riding', 'No Seatbelt', 'Footpath Driving', 'Overloading'
    ];

    useEffect(() => {
        if (isFilterModalVisible) {
            setTmpSortMode(sortMode);
            setTmpDateFrom(filterDateFrom);
            setTmpDateTo(filterDateTo);
            setTmpTypes(filterTypes);
            setTmpSeverity(filterSeverity);
            setTmpLocation(filterLocation);
        }
    }, [isFilterModalVisible]);

    const applyFilters = () => {
        setSortMode(tmpSortMode);
        setFilterDateFrom(tmpDateFrom);
        setFilterDateTo(tmpDateTo);
        setFilterTypes(tmpTypes);
        setFilterSeverity(tmpSeverity);
        setFilterLocation(tmpLocation);
        setIsFilterModalVisible(false);
    };

    const resetFilters = () => {
        setTmpSortMode('severity');
        setTmpDateFrom(null);
        setTmpDateTo(null);
        setTmpTypes([]);
        setTmpSeverity([]);
        setTmpLocation('');
    };

    const toggleType = (type) => {
        setTmpTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    const toggleSeverity = (sev) => {
        setTmpSeverity(prev => prev.includes(sev) ? prev.filter(s => s !== sev) : [...prev, sev]);
    };

    // Filter Logic
    const filtered = reports.filter(r => {
        if (search.trim()) {
            const q = search.toLowerCase();
            const rDate = r.submitted_at ? new Date(r.submitted_at) : null;
            
            // Format multiple variations for search matching
            let dateMatches = false;
            if (rDate) {
                const day = rDate.getDate();
                const month = rDate.getMonth() + 1;
                const year = rDate.getFullYear();
                const monthName = rDate.toLocaleString('en-IN', { month: 'short' }).toLowerCase();
                const fullMonthName = rDate.toLocaleString('en-IN', { month: 'long' }).toLowerCase();
                
                const formats = [
                    `${day}/${month}/${year}`,
                    `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`,
                    `${day} ${monthName}`,
                    `${day} ${fullMonthName}`
                ];
                dateMatches = formats.some(f => f.includes(q));
            }

            const matches = (
                (r.violation_type?.toLowerCase().includes(q)) ||
                (r.vehicle_number?.toLowerCase().includes(q)) ||
                (r.location_address?.toLowerCase().includes(q)) ||
                (r.submitter?.full_name?.toLowerCase().includes(q)) ||
                dateMatches
            );
            if (!matches) return false;
        }
        if (filterLocation.trim()) {
            if (!r.location_address?.toLowerCase().includes(filterLocation.toLowerCase())) {
                return false;
            }
        }
        if (filterTypes.length > 0) {
            if (!r.violation_type || !filterTypes.includes(r.violation_type)) {
                return false;
            }
        }
        if (filterSeverity.length > 0) {
            if (!r.severity || !filterSeverity.includes(r.severity)) {
                return false;
            }
        }
        if (filterDateFrom || filterDateTo) {
            const rDate = new Date(r.submitted_at);
            if (filterDateFrom && rDate < filterDateFrom) return false;
            if (filterDateTo && rDate > filterDateTo) return false;
        }
        return true;
    });

    const counts = {
        critical: reports.filter(r => r.severity === 'critical').length,
        high:     reports.filter(r => r.severity === 'high').length,
        medium:   reports.filter(r => r.severity === 'medium').length,
        low:      reports.filter(r => r.severity === 'low').length,
    };

    // Selection Mode Interaction
    const handleLongPress = (id) => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
            setSelectedIds([id]);
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const navigateToReview = (report) => {
        navigation.getParent()?.navigate('ImageReportReview', { reportId: report.id })
            ?? navigation.navigate('ImageReportReview', { reportId: report.id });
    };

    // Processing the Actions
    const handleBulkAction = async (decision) => {
        if (!selectedIds.length) return;
        
        Alert.alert(
            `Bulk ${decision === 'approved' ? 'Approve' : 'Reject'}`,
            `Are you sure you want to ${decision} ${selectedIds.length} reports? This cannot be easily undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Confirm', 
                    style: decision === 'approved' ? 'default' : 'destructive',
                    onPress: async () => {
                        setBulkProcessing(true);
                        try {
                            const promises = selectedIds.map(id => 
                                submitOfficerDecision(id, profile?.id, decision, 'Bulk processed by officer via Triage Screen.', null)
                            );
                            await Promise.all(promises);
                            
                            // Exit selection mode
                            setSelectedIds([]);
                            setIsSelectionMode(false);
                            
                            // Load heavily overrides cached local list and ensures parity
                            load(true); 
                        } catch (err) {
                            Alert.alert('Processing Error', 'Some reports failed to update correctly.');
                        } finally {
                            setBulkProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    let displayData = [];
    let isSectionList = false;

    if (sortMode === 'severity') {
        isSectionList = true;
        const GROUPS = ['critical', 'high', 'medium', 'low'];
        displayData = GROUPS
            .map(sev => ({ title: sev, data: filtered.filter(r => (r.severity || 'medium') === sev) }))
            .filter(s => s.data.length > 0);
    } else {
        isSectionList = false;
        displayData = [...filtered].sort((a, b) => {
            const dA = new Date(a.submitted_at).getTime();
            const dB = new Date(b.submitted_at).getTime();
            return sortMode === 'newest' ? dB - dA : dA - dB;
        });
    }

    const activeFiltersCount = filterTypes.length + filterSeverity.length + (filterDateFrom ? 1 : 0) + (filterDateTo ? 1 : 0) + (filterLocation ? 1 : 0) + (sortMode !== 'severity' ? 1 : 0);

    return (
        <View style={s.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={s.header}>
                    <View style={s.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerTitle}>Pending Queue</Text>
                            <View style={s.liveRow}>
                                <LiveDot />
                                <Text style={s.headerSub}>Live • {reports.length} awaiting review</Text>
                            </View>
                        </View>
                        {isSelectionMode ? (
                            <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedIds([]); }} style={s.selectBtn}>
                                <Text style={s.selectBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => setIsSelectionMode(true)} style={s.selectBtn}>
                                <Text style={s.selectBtnText}>Select</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Priority stats */}
                    <View style={s.statsRow}>
                        {[
                            { label: 'Critical', count: counts.critical, color: C.critical },
                            { label: 'High',     count: counts.high,     color: C.high     },
                            { label: 'Medium',   count: counts.medium,   color: C.medium   },
                            { label: 'Low',      count: counts.low,      color: C.low      },
                        ].map(({ label, count, color }) => (
                            <View key={label} style={s.statItem}>
                                <View style={[s.statDot, { backgroundColor: color }]} />
                                <Text style={s.statCount}>{count}</Text>
                                <Text style={s.statLabel}>{label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Search & Filter Bar */}
                    <View style={s.searchFilterRow}>
                        <View style={s.searchBox}>
                            <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.5)" />
                            <TextInput
                                style={s.searchInput}
                                placeholder="Search by type, plate…"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={search}
                                onChangeText={setSearch}
                            />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch('')}>
                                    <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity style={s.filterBtn} onPress={() => setIsFilterModalVisible(true)}>
                            <Ionicons name="options-outline" size={20} color={C.white} />
                            {activeFiltersCount > 0 && (
                                <View style={s.filterBadge}>
                                    <Text style={s.filterBadgeText}>{activeFiltersCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Area Scope Selector */}
                    <View style={s.scopeRow}>
                        <TouchableOpacity
                            style={[s.scopePill, !filterByArea && s.scopePillActive]}
                            onPress={() => setFilterByArea(false)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="globe-outline" size={13} color={!filterByArea ? C.navy : 'rgba(255,255,255,0.7)'} />
                            <Text style={[s.scopeText, !filterByArea && s.scopeTextActive]}>All Locations (Testing)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.scopePill, filterByArea && s.scopePillActive]}
                            onPress={() => setFilterByArea(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="location" size={13} color={filterByArea ? C.navy : 'rgba(255,255,255,0.7)'} />
                            <Text style={[s.scopeText, filterByArea && s.scopeTextActive]}>
                                {profile?.badge_id ? `My Area (${profile.badge_id.match(/\d+$/)?.[0] ? `400${profile.badge_id.match(/\d+$/)[0].padStart(3,'0')}` : profile.badge_id})` : 'My Area'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* List */}
                {loading && !refreshing ? (
                    <View style={s.centered}>
                        <ActivityIndicator size="large" color={C.navyMid} />
                        <Text style={s.loadingText}>Loading reports…</Text>
                    </View>
                ) : (
                    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                        {!isSectionList ? (
                            <FlatList
                                data={displayData}
                                keyExtractor={item => item.id}
                                contentContainerStyle={s.list}
                                showsVerticalScrollIndicator={false}
                                refreshControl={<RefreshControl refreshing={refreshing} colors={[C.navyMid]} onRefresh={() => { setRefreshing(true); load(true); }} />}
                                renderItem={({ item }) => (
                                    <ReportCard 
                                        report={item} 
                                        isSelectionMode={isSelectionMode}
                                        isSelected={selectedIds.includes(item.id)}
                                        onPress={() => isSelectionMode ? toggleSelection(item.id) : navigateToReview(item)} 
                                        onLongPress={() => handleLongPress(item.id)}
                                    />
                                )}
                                ListEmptyComponent={
                                    <View style={s.empty}>
                                        <Ionicons name="checkmark-done-circle-outline" size={52} color={C.textTertiary} />
                                        <Text style={s.emptyTitle}>Queue Clear!</Text>
                                        <Text style={s.emptySub}>{(search || activeFiltersCount > 0) ? 'No reports match your filters.' : 'No pending reports. Check back later.'}</Text>
                                    </View>
                                }
                            />
                        ) : (
                            <SectionList
                                sections={displayData}
                                keyExtractor={item => item.id}
                                contentContainerStyle={s.list}
                                showsVerticalScrollIndicator={false}
                                refreshControl={<RefreshControl refreshing={refreshing} colors={[C.navyMid]} onRefresh={() => { setRefreshing(true); load(true); }} />}
                                renderSectionHeader={({ section: { title, data } }) => {
                                    const cfg = getSev(title);
                                    return (
                                        <View style={s.sectionHeader}>
                                            <View style={[s.sectionDot, { backgroundColor: cfg.color }]} />
                                            <Text style={[s.sectionLabel, { color: cfg.color }]}>{cfg.label}</Text>
                                            <View style={[s.sectionBadge, { backgroundColor: cfg.bg }]}>
                                                <Text style={[s.sectionBadgeText, { color: cfg.color }]}>{data.length}</Text>
                                            </View>
                                        </View>
                                    );
                                }}
                                renderItem={({ item }) => (
                                    <ReportCard 
                                        report={item} 
                                        isSelectionMode={isSelectionMode}
                                        isSelected={selectedIds.includes(item.id)}
                                        onPress={() => isSelectionMode ? toggleSelection(item.id) : navigateToReview(item)} 
                                        onLongPress={() => handleLongPress(item.id)}
                                    />
                                )}
                                ListEmptyComponent={
                                    <View style={s.empty}>
                                        <Ionicons name="checkmark-done-circle-outline" size={52} color={C.textTertiary} />
                                        <Text style={s.emptyTitle}>Queue Clear!</Text>
                                        <Text style={s.emptySub}>{(search || activeFiltersCount > 0) ? 'No reports match your filters.' : 'No pending reports. Check back later.'}</Text>
                                    </View>
                                }
                            />
                        )}
                    </Animated.View>
                )}
            </SafeAreaView>
            
            {/* Bulk Action Bottom Bar */}
            {isSelectionMode && (
                <View style={[s.bulkActionBar, { paddingBottom: 30 }]}>
                    <Text style={s.bulkSelectedText}>
                        <Text style={{ fontFamily: 'Nunito-ExtraBold' }}>{selectedIds.length}</Text> reports selected
                    </Text>
                    <View style={s.bulkRow}>
                        <TouchableOpacity 
                            style={[s.bulkActionBtn, s.bulkRejectBtn]} 
                            activeOpacity={0.8}
                            disabled={!selectedIds.length || bulkProcessing}
                            onPress={() => handleBulkAction('rejected')}
                        >
                            <Ionicons name="close-circle" size={20} color={C.white} />
                            <Text style={s.bulkBtnText}>Reject All</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[s.bulkActionBtn, s.bulkApproveBtn]} 
                            activeOpacity={0.8}
                            disabled={!selectedIds.length || bulkProcessing}
                            onPress={() => handleBulkAction('approved')}
                        >
                            {bulkProcessing ? (
                                <ActivityIndicator size="small" color={C.white} />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color={C.white} />
                                    <Text style={s.bulkBtnText}>Approve All</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Filter Modal */}
            <Modal visible={isFilterModalVisible} animationType="slide" transparent>
                <View style={m.overlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setIsFilterModalVisible(false)} />
                    <View style={m.sheet}>
                        <View style={m.handle} />
                        <View style={m.headerRow}>
                            <Text style={m.title}>Filter & Sort</Text>
                            <TouchableOpacity onPress={resetFilters}>
                                <Text style={m.resetText}>Reset</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
                            {/* Sort */}
                            <Text style={m.sectionLabel}>SORT BY</Text>
                            <View style={m.radioGroup}>
                                {['severity', 'newest', 'oldest'].map(mode => (
                                    <TouchableOpacity key={mode} onPress={() => setTmpSortMode(mode)} style={[m.radioBtn, tmpSortMode === mode && m.radioBtnActive]}>
                                        <Text style={[m.radioText, tmpSortMode === mode && m.radioTextActive]}>
                                            {mode === 'severity' ? 'Severity (Default)' : mode === 'newest' ? 'Newest First' : 'Oldest First'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Date Time */}
                            <Text style={m.sectionLabel}>TIME RANGE</Text>
                            <View style={m.dateGroup}>
                                <TouchableOpacity style={m.dateBox} onPress={() => setShowDateFromPicker(true)}>
                                    <Ionicons name="calendar-outline" size={14} color={C.textSecondary} />
                                    <Text style={m.dateText}>{tmpDateFrom ? tmpDateFrom.toLocaleDateString() : 'From Date'}</Text>
                                </TouchableOpacity>
                                <Text style={{ color: C.border }}>—</Text>
                                <TouchableOpacity style={m.dateBox} onPress={() => setShowDateToPicker(true)}>
                                    <Ionicons name="calendar-outline" size={14} color={C.textSecondary} />
                                    <Text style={m.dateText}>{tmpDateTo ? tmpDateTo.toLocaleDateString() : 'To Date'}</Text>
                                </TouchableOpacity>
                            </View>

                            {showDateFromPicker && (
                                <DateTimePicker
                                    value={tmpDateFrom || new Date()}
                                    mode="date"
                                    onChange={(ev, date) => {
                                        setShowDateFromPicker(false);
                                        if (date) {
                                            const normalized = new Date(date);
                                            normalized.setHours(0, 0, 0, 0);
                                            setTmpDateFrom(normalized);
                                        }
                                    }}
                                />
                            )}
                            {showDateToPicker && (
                                <DateTimePicker
                                    value={tmpDateTo || new Date()}
                                    mode="date"
                                    onChange={(ev, date) => {
                                        setShowDateToPicker(false);
                                        if (date) {
                                            const normalized = new Date(date);
                                            normalized.setHours(23, 59, 59, 999);
                                            setTmpDateTo(normalized);
                                        }
                                    }}
                                />
                            )}

                            {/* Location */}
                            <Text style={m.sectionLabel}>SPECIFIC LOCATION</Text>
                            <TextInput
                                style={m.textInput}
                                placeholder="Enter street, city, or zip…"
                                placeholderTextColor={C.textTertiary}
                                value={tmpLocation}
                                onChangeText={setTmpLocation}
                            />

                            {/* Severities */}
                            <Text style={m.sectionLabel}>SEVERITY LEVEL</Text>
                            <View style={m.pillGroup}>
                                {['critical', 'high', 'medium', 'low'].map(sev => {
                                    const active = tmpSeverity.includes(sev);
                                    let activeColor = C.navyMid;
                                    if (active) activeColor = getSev(sev).color;
                                    return (
                                        <TouchableOpacity key={sev} onPress={() => toggleSeverity(sev)} style={[m.pill, active && { backgroundColor: activeColor, borderColor: activeColor }]}>
                                            <Text style={[m.pillText, active && m.pillTextActive]}>{sev.charAt(0).toUpperCase() + sev.slice(1)}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Types */}
                            {availableTypes.length > 0 && (
                                <>
                                    <Text style={m.sectionLabel}>VIOLATION TYPE</Text>
                                    <View style={m.pillGroup}>
                                        {availableTypes.map(type => {
                                            const active = tmpTypes.includes(type);
                                            return (
                                                <TouchableOpacity key={type} onPress={() => toggleType(type)} style={[m.pill, active && m.pillActive]}>
                                                    <Text style={[m.pillText, active && m.pillTextActive]}>{type}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        <TouchableOpacity style={m.applyBtn} onPress={applyFilters}>
                            <Text style={m.applyBtnText}>Show Results</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },

    header:     { paddingTop: 8, paddingBottom: 16, paddingHorizontal: 20 },
    headerRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    liveRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    headerTitle: { fontSize: 22, fontFamily: 'Nunito-ExtraBold', color: C.white, letterSpacing: -0.4 },
    headerSub:   { fontSize: 12, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.6)' },
    
    selectBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    selectBtnText: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.white },

    statsRow:  { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, gap: 4, marginBottom: 14 },
    statItem:  { flex: 1, alignItems: 'center', gap: 3 },
    statDot:   { width: 8, height: 8, borderRadius: 4 },
    statCount: { fontSize: 16, fontFamily: 'Nunito-ExtraBold', color: C.white },
    statLabel: { fontSize: 9, fontFamily: 'Nunito-SemiBold', color: 'rgba(255,255,255,0.55)' },

    searchFilterRow: { flexDirection: 'row', gap: 10 },
    searchBox:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    searchInput: { flex: 1, fontSize: 13, fontFamily: 'Nunito-Medium', color: C.white },
    filterBtn:   { width: 44, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: C.critical, borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.navy },
    filterBadgeText: { fontSize: 9, fontFamily: 'Nunito-Bold', color: C.white },

    scopeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    scopePill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'transparent' },
    scopePillActive: { backgroundColor: C.amber, borderColor: C.amber },
    scopeText: { fontSize: 11, fontFamily: 'Nunito-SemiBold', color: 'rgba(255,255,255,0.85)' },
    scopeTextActive: { color: C.navy, fontFamily: 'Nunito-Bold' },

    list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 110 }, // Extra padding for selection bar

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 },
    sectionDot:    { width: 8, height: 8, borderRadius: 4 },
    sectionLabel:  { fontSize: 11, fontFamily: 'Nunito-ExtraBold', letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 },
    sectionBadge:  { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    sectionBadgeText: { fontSize: 11, fontFamily: 'Nunito-Bold' },

    centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    loadingText: { fontSize: 14, fontFamily: 'Nunito-Medium', color: C.textSecondary },

    empty:      { alignItems: 'center', paddingTop: 80, gap: 10 },
    emptyTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    emptySub:   { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary, textAlign: 'center' },
    
    // Bulk Triage Bottom Bar
    bulkActionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, padding: 20, shadowColor: C.navy, shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 20 },
    bulkRow: { flexDirection: 'row', gap: 12 },
    bulkSelectedText: { fontSize: 14, fontFamily: 'Nunito-Medium', color: C.navyMid, marginBottom: 12, textAlign: 'center' },
    bulkActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
    bulkRejectBtn: { backgroundColor: C.critical },
    bulkApproveBtn: { backgroundColor: C.low },
    bulkBtnText: { color: C.white, fontSize: 15, fontFamily: 'Nunito-Bold' }
});

const m = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
    handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    title: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    resetText: { fontSize: 14, fontFamily: 'Nunito-SemiBold', color: C.navyMid },
    sectionLabel: { fontSize: 11, fontFamily: 'Nunito-ExtraBold', letterSpacing: 1, color: C.textTertiary, marginBottom: 12, marginTop: 6 },
    
    radioGroup: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 20 },
    radioBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
    radioBtnActive: { borderColor: C.navyMid, backgroundColor: '#EFF4FF' },
    radioText: { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textSecondary },
    radioTextActive: { color: C.navyMid },

    dateGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    dateBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, padding: 12, borderRadius: 10 },
    dateText: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textPrimary },

    textInput: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: 'Nunito-Medium', color: C.textPrimary, marginBottom: 20 },

    pillGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.offWhite, borderWidth: 1, borderColor: C.border },
    pillActive: { backgroundColor: C.navyMid, borderColor: C.navyMid },
    pillText: { fontSize: 12, fontFamily: 'Nunito-Medium', color: C.textSecondary },
    pillTextActive: { color: C.white },

    applyBtn: { backgroundColor: C.amber, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10 },
    applyBtnText: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.navy },
});
