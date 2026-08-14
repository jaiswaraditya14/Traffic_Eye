import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, StatusBar, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services';
import { useAuth } from '../../context';
import { FocusAwareStatusBar } from '../../components';

const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    success: '#059669',
    successSurface: '#D1FAE5',
    border: '#E2E8F0',
    critical: '#2563EB',
    high: '#EA580C',
    medium: '#D97706',
    low: '#059669',
};

const SEV_CFG = {
    critical: { color: C.critical, bg: '#DBEAFE', label: 'CRITICAL', order: 0 },
    high:     { color: C.high,     bg: '#FFEDD5', label: 'HIGH',     order: 1 },
    medium:   { color: C.medium,   bg: '#FEF3C7', label: 'MEDIUM',   order: 2 },
    low:      { color: C.low,      bg: '#D1FAE5', label: 'LOW',      order: 3 },
};
const getSev = (s) => SEV_CFG[s] || SEV_CFG.medium;

export default function VerifiedReports({ route, navigation }) {
    const statusFilter = route?.params?.status || 'approved';
    const pageTitle = statusFilter === 'rejected' ? 'Rejected Queue' : 'Verified Queue';
    const emptyTitle = statusFilter === 'rejected' ? 'No Rejected Reports' : 'No Verified Reports';
    const emptySub = statusFilter === 'rejected' ? 'There are no rejected reports yet.' : 'There are no verified reports yet.';

    const { profile } = useAuth();
    const [verifiedReports, setVerifiedReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const hasLoadedRef = React.useRef(false);

    // Advanced Filtering States
    const [search, setSearch] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState(null);
    const [filterDateTo, setFilterDateTo] = useState(null);
    const [showDateFromPicker, setShowDateFromPicker] = useState(false);
    const [showDateToPicker, setShowDateToPicker] = useState(false);
    const [filterTypes, setFilterTypes] = useState([]);
    const [filterSeverity, setFilterSeverity] = useState([]);
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

    // Temp states for Modal so they don't apply until user hits "Apply"
    const [tmpDateFrom, setTmpDateFrom] = useState(null);
    const [tmpDateTo, setTmpDateTo] = useState(null);
    const [tmpTypes, setTmpTypes] = useState([]);
    const [tmpSeverity, setTmpSeverity] = useState([]);

    const availableTypes = [
        'Speeding', 'Red Light', 'No Helmet', 'Wrong Way', 'Illegal Parking', 
        'Phone Use', 'Triple Riding', 'No Seatbelt', 'Footpath Driving', 'Overloading'
    ];

    const loadReports = useCallback(async () => {
        if (!hasLoadedRef.current) setLoading(true);
        try {
            let query = supabase
                .from('image_reports')
                .select(`
                    id, violation_type, vehicle_number, location_address,
                    severity, reviewed_at, status, image_url, reward_amount,
                    officer_reviews ( officer_id, decision, remarks ),
                    submitter:user_id ( full_name )
                `)
                .eq('status', statusFilter);

            if (profile && profile.role === 'officer') {
                let filters = [];
                if (profile.badge_id) {
                    const digits = profile.badge_id.match(/\d+$/);
                    if (digits) {
                        const suffix = digits[0].padStart(3, '0');
                        filters.push(`location_address.ilike.%400${suffix}%`);
                    }
                }
                if (profile.jurisdiction) {
                    filters.push(`location_address.ilike.%${profile.jurisdiction}%`);
                }
                if (filters.length > 0) {
                    query = query.or(filters.join(','));
                }
            }

            const { data, error } = await query.order('reviewed_at', { ascending: false });
            
            if (!error) {
                setVerifiedReports(data || []);
                hasLoadedRef.current = true;
            }
        } catch (e) {
            console.error('Error fetching verified reports:', e);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useFocusEffect(
        useCallback(() => {
            loadReports();
        }, [loadReports])
    );

    useEffect(() => {
        if (isFilterModalVisible) {
            setTmpDateFrom(filterDateFrom);
            setTmpDateTo(filterDateTo);
            setTmpTypes(filterTypes);
            setTmpSeverity(filterSeverity);
        }
    }, [isFilterModalVisible, filterDateFrom, filterDateTo, filterTypes, filterSeverity]);

    const applyFilters = () => {
        setFilterDateFrom(tmpDateFrom);
        setFilterDateTo(tmpDateTo);
        setFilterTypes(tmpTypes);
        setFilterSeverity(tmpSeverity);
        setIsFilterModalVisible(false);
    };

    const resetFilters = () => {
        setTmpDateFrom(null);
        setTmpDateTo(null);
        setTmpTypes([]);
        setTmpSeverity([]);
    };

    const toggleType = (type) => {
        setTmpTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    const toggleSeverity = (sev) => {
        setTmpSeverity(prev => prev.includes(sev) ? prev.filter(s => s !== sev) : [...prev, sev]);
    };

    // Filter Logic
    const filteredReports = verifiedReports.filter(r => {
        if (search.trim()) {
            const q = search.toLowerCase();
            const rDate = r.reviewed_at ? new Date(r.reviewed_at) : null;
            
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
            const rDate = new Date(r.reviewed_at);
            if (filterDateFrom && rDate < filterDateFrom) return false;
            if (filterDateTo && rDate > filterDateTo) return false;
        }
        return true;
    });

    const activeFiltersCount = filterTypes.length + filterSeverity.length + (filterDateFrom ? 1 : 0) + (filterDateTo ? 1 : 0);

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={20} color={C.white} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>{pageTitle}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity 
                                style={styles.exportHeaderBtn}
                                onPress={() => navigation.navigate('OfficerReportExport')}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="download-outline" size={15} color={C.white} />
                                <Text style={styles.exportHeaderBtnText}>Export</Text>
                            </TouchableOpacity>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{filteredReports.length}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Search & Filter Bar */}
                    <View style={styles.searchFilterRow}>
                        <View style={styles.searchBox}>
                            <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.5)" />
                            <TextInput
                                style={styles.searchInput}
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
                        <TouchableOpacity style={styles.filterBtn} onPress={() => setIsFilterModalVisible(true)}>
                            <Ionicons name="options-outline" size={20} color={C.white} />
                            {activeFiltersCount > 0 && (
                                <View style={styles.filterBadge}>
                                    <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <ActivityIndicator size="large" color={C.navyMid} style={{ marginTop: 60 }} />
                    ) : filteredReports.length === 0 ? (
                        <View style={styles.empty}>
                            <Ionicons name="checkmark-done-circle-outline" size={52} color={C.textTertiary} />
                            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                            <Text style={styles.emptySub}>{(search || activeFiltersCount > 0) ? 'No reports match your filters.' : emptySub}</Text>
                        </View>
                    ) : (
                        filteredReports.map((report) => {
                            const dateApproved = report.reviewed_at
                                ? new Date(report.reviewed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '—';
                            const sev = getSev(report.severity);
                            
                            return (
                                <TouchableOpacity
                                    key={report.id}
                                    style={styles.reportCard}
                                    onPress={() => navigation.navigate('VerifiedReportDetail', { reportId: report.id })}
                                    activeOpacity={0.82}
                                >
                                    {/* Success/Severity Left Bar */}
                                    <View style={[styles.cardBar, { backgroundColor: sev.color }]} />

                                    {/* Thumbnail */}
                                    {report.image_url ? (
                                        <Image
                                            source={{ uri: report.image_url }}
                                            style={styles.thumbnail}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={[styles.thumbnail, { justifyContent: 'center', alignItems: 'center', backgroundColor: C.offWhite }]}>
                                            <Ionicons name="image-outline" size={24} color={C.textTertiary} />
                                        </View>
                                    )}

                                    <View style={styles.cardContent}>
                                        <View style={styles.cardTopRow}>
                                            <Text style={styles.reportType}>{report.violation_type || 'Traffic Violation'}</Text>
                                            <View style={[styles.sevChip, { backgroundColor: sev.bg }]}>
                                                <Text style={[styles.sevText, { color: sev.color }]}>{sev.label}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.vehicleRow}>
                                            <Ionicons name="person-outline" size={12} color={C.navyMid} />
                                            <Text style={styles.vehicleText}>{report.submitter?.full_name || 'Anonymous'}</Text>
                                        </View>

                                        {report.location_address && (
                                            <View style={styles.metaRow}>
                                                <Ionicons name="location-outline" size={12} color={C.textTertiary} />
                                                <Text style={styles.metaText} numberOfLines={1}>{report.location_address}</Text>
                                            </View>
                                        )}
                                        
                                        <View style={styles.bottomRow}>
                                            <View style={styles.metaRow}>
                                                <Ionicons name="calendar-outline" size={12} color={C.textTertiary} />
                                                <Text style={styles.metaText}>{dateApproved}</Text>
                                            </View>
                                            <View style={styles.officerBadge}>
                                                <Ionicons name="trophy-outline" size={10} color={C.success} />
                                                <Text style={styles.officerText}>{report.reward_amount || 0} pts</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Tap arrow */}
                                    <View style={styles.tapArrow}>
                                        <Ionicons name="chevron-forward" size={16} color={C.navyMid} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            </SafeAreaView>

            {/* Filter Modal */}
            <Modal visible={isFilterModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setIsFilterModalVisible(false)} />
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Filter Results</Text>
                            <TouchableOpacity onPress={resetFilters}>
                                <Text style={styles.modalResetText}>Reset</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
                            {/* Date Time */}
                            <Text style={styles.modalSectionLabel}>TIME RANGE</Text>
                            <View style={styles.modalDateGroup}>
                                <TouchableOpacity style={styles.modalDateBox} onPress={() => setShowDateFromPicker(true)}>
                                    <Ionicons name="calendar-outline" size={14} color={C.textSecondary} />
                                    <Text style={styles.modalDateText}>{tmpDateFrom ? tmpDateFrom.toLocaleDateString() : 'From Date'}</Text>
                                </TouchableOpacity>
                                <Text style={{ color: C.border }}>—</Text>
                                <TouchableOpacity style={styles.modalDateBox} onPress={() => setShowDateToPicker(true)}>
                                    <Ionicons name="calendar-outline" size={14} color={C.textSecondary} />
                                    <Text style={styles.modalDateText}>{tmpDateTo ? tmpDateTo.toLocaleDateString() : 'To Date'}</Text>
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

                            {/* Severities */}
                            <Text style={styles.modalSectionLabel}>SEVERITY LEVEL</Text>
                            <View style={styles.modalPillGroup}>
                                {['critical', 'high', 'medium', 'low'].map(sev => {
                                    const active = tmpSeverity.includes(sev);
                                    let activeColor = C.navyMid;
                                    if (active) activeColor = getSev(sev).color;
                                    return (
                                        <TouchableOpacity key={sev} onPress={() => toggleSeverity(sev)} style={[styles.modalPill, active && { backgroundColor: activeColor, borderColor: activeColor }]}>
                                            <Text style={[styles.modalPillText, active && styles.modalPillTextActive]}>{sev.charAt(0).toUpperCase() + sev.slice(1)}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Types */}
                            {availableTypes.length > 0 && (
                                <>
                                    <Text style={styles.modalSectionLabel}>VIOLATION TYPE</Text>
                                    <View style={styles.modalPillGroup}>
                                        {availableTypes.map(type => {
                                            const active = tmpTypes.includes(type);
                                            return (
                                                <TouchableOpacity key={type} onPress={() => toggleType(type)} style={[styles.modalPill, active && styles.modalPillActive]}>
                                                    <Text style={[styles.modalPillText, active && styles.modalPillTextActive]}>{type}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        <TouchableOpacity style={styles.modalApplyBtn} onPress={applyFilters}>
                            <Text style={styles.modalApplyBtnText}>Show Results</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Header updates to accommodate filters
    header: {
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    },
    headerTopRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16
    },
    backButton: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.white },
    badge: { backgroundColor: C.successSurface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
    badgeText: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.success },

    exportHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    exportHeaderBtnText: {
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },

    // Search and filter styles (copied from PendingQueue)
    searchFilterRow: { flexDirection: 'row', gap: 10 },
    searchBox:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    searchInput: { flex: 1, fontSize: 13, fontFamily: 'Nunito-Medium', color: C.white },
    filterBtn:   { width: 44, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: C.critical, borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.navy },
    filterBadgeText: { fontSize: 9, fontFamily: 'Nunito-Bold', color: C.white },

    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

    empty:      { alignItems: 'center', paddingTop: 80, gap: 10 },
    emptyTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    emptySub:   { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary, textAlign: 'center' },

    // Card
    reportCard: {
        flexDirection: 'row', backgroundColor: C.surface, borderRadius: 16, marginBottom: 12, overflow: 'hidden', alignItems: 'center',
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardBar: { width: 4, alignSelf: 'stretch', backgroundColor: C.success },
    thumbnail: { width: 72, height: 96 },
    cardContent: { flex: 1, padding: 12 },
    
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    reportType: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textPrimary, flex: 1 },
    
    sevChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    sevText: { fontSize: 9, fontFamily: 'Nunito-ExtraBold', letterSpacing: 0.4 },

    vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    vehicleText: { fontSize: 12, color: C.navyMid, fontFamily: 'Nunito-Bold', letterSpacing: 0.5 },
    
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
    metaText: { fontSize: 11, color: C.textSecondary },

    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    officerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.successSurface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    officerText: { fontSize: 10, fontFamily: 'Nunito-Bold', color: C.success },
    tapArrow: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 10 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
    modalHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    modalTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    modalResetText: { fontSize: 14, fontFamily: 'Nunito-SemiBold', color: C.navyMid },
    modalSectionLabel: { fontSize: 11, fontFamily: 'Nunito-ExtraBold', letterSpacing: 1, color: C.textTertiary, marginBottom: 12, marginTop: 6 },
    
    modalDateGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    modalDateBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, padding: 12, borderRadius: 10 },
    modalDateText: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textPrimary },

    modalPillGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    modalPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.offWhite, borderWidth: 1, borderColor: C.border },
    modalPillActive: { backgroundColor: C.navyMid, borderColor: C.navyMid },
    modalPillText: { fontSize: 12, fontFamily: 'Nunito-Medium', color: C.textSecondary },
    modalPillTextActive: { color: C.white },

    modalApplyBtn: { backgroundColor: C.amber, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10 },
    modalApplyBtnText: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.navy },
});
