/**
 * FineCalculator.js — Citizen screen
 *
 * Lets citizens estimate penalty amounts for traffic violations.
 * Data sourced from Maharashtra RTO schedule & MV Act 1988 (Amendment 2019).
 *
 * DISCLAIMER: This calculator is for awareness only. Actual fines are
 * determined by the enforcing authority and may vary by court order.
 */
import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { OFFENCES_FINES } from '../../data/trafficData';
import { FocusAwareStatusBar } from '../../components';

const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    amberSurface: '#FEF3C7',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    border: '#C4C6D0',
    borderLight: '#EAECEF',
    success: '#059669',
    successSurface: '#D1FAE5',
    error: '#BA1A1A',
    errorSurface: '#FEE2E2',
    primarySurface: '#EFF6FF',    // ← was missing, caused runtime warning
    infoBg: '#E0E7FF',
};

// All unique categories for filter
const CATEGORIES = ['All', ...Array.from(new Set(OFFENCES_FINES.map(o => o.category)))];

const SEVERITY_COLOR = {
    critical: '#B91C1C',
    high: '#EA580C',
    medium: '#D97706',
    low: '#059669',
};
const SEVERITY_BG = {
    critical: '#FEE2E2',
    high: '#FFEDD5',
    medium: '#FEF3C7',
    low: '#D1FAE5',
};

export default function FineCalculator({ navigation }) {
    const [selectedOffence, setSelectedOffence] = useState(OFFENCES_FINES[0]);
    const [count, setCount] = useState('1');
    const [showPicker, setShowPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    // Filter offences by search query + category
    const filteredOffences = useMemo(() => {
        let list = OFFENCES_FINES;
        if (activeCategory !== 'All') {
            list = list.filter(o => o.category === activeCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(o =>
                o.offence.toLowerCase().includes(q) ||
                o.section.toLowerCase().includes(q)
            );
        }
        return list;
    }, [searchQuery, activeCategory]);

    const calculateTotal = () => {
        const raw = selectedOffence.fine.replace(/[^\d]/g, '');
        const fineValue = parseInt(raw, 10) || 0;
        const instances = parseInt(count, 10) || 0;
        return fineValue * instances;
    };

    const isCourt = selectedOffence.fine === 'Court';
    const total = calculateTotal();

    const handleSelectOffence = (item) => {
        setSelectedOffence(item);
        setShowPicker(false);
        setSearchQuery('');
        setCount('1');
    };

    const sevColor = SEVERITY_COLOR[selectedOffence.severity] || C.amber;
    const sevBg = SEVERITY_BG[selectedOffence.severity] || C.amberSurface;

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Fine Calculator</Text>
                        <Text style={styles.headerSub}>Maharashtra RTO penalty schedule</Text>
                    </View>
                    <View style={styles.headerBadge}>
                        <Text style={styles.headerBadgeText}>{OFFENCES_FINES.length}</Text>
                        <Text style={styles.headerBadgeSub}>offences</Text>
                    </View>
                </LinearGradient>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Total Display ── */}
                    <View style={styles.calcHero}>
                        <Text style={styles.totalLabel}>ESTIMATED FINE</Text>
                        {isCourt ? (
                            <View style={styles.courtRow}>
                                <Ionicons name="hammer" size={28} color={C.amber} />
                                <Text style={styles.courtText}>Court Fine</Text>
                            </View>
                        ) : (
                            <Text style={styles.totalAmount}>
                                ₹{total > 0 ? total.toLocaleString('en-IN') : '0'}
                            </Text>
                        )}
                        <View style={styles.summaryBadge}>
                            <Ionicons name="receipt" size={14} color={C.white} />
                            <Text style={styles.summaryText}>
                                {isCourt ? 'Determined by Magistrate/Court' : 'Based on current RTO schedule'}
                            </Text>
                        </View>
                    </View>

                    {/* ── Selected Offence Details ── */}
                    <View style={styles.selectedCard}>
                        <View style={styles.selectedTop}>
                            <View style={[styles.sevBadge, { backgroundColor: sevBg }]}>
                                <View style={[styles.sevDot, { backgroundColor: sevColor }]} />
                                <Text style={[styles.sevText, { color: sevColor }]}>
                                    {selectedOffence.severity?.toUpperCase()}
                                </Text>
                            </View>
                            <Text style={[styles.selectedFine, { color: isCourt ? C.error : C.success }]}>
                                {selectedOffence.fine}
                            </Text>
                        </View>
                        <Text style={styles.selectedOffenceName}>{selectedOffence.offence}</Text>
                        <Text style={styles.selectedDesc}>{selectedOffence.description}</Text>
                        <View style={styles.sectionBadge}>
                            <Ionicons name="document-text-outline" size={11} color={C.navyMid} />
                            <Text style={styles.sectionText}>{selectedOffence.section}</Text>
                        </View>
                    </View>

                    {/* ── Violation Picker ── */}
                    <View style={styles.formCard}>
                        <Text style={styles.label}>Select Violation</Text>

                        <TouchableOpacity
                            style={[styles.pickerTrigger, showPicker && styles.pickerTriggerOpen]}
                            onPress={() => setShowPicker(!showPicker)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.pickerRow}>
                                <Ionicons name="warning-outline" size={18} color={C.navy} />
                                <Text style={styles.pickerText} numberOfLines={1}>
                                    {selectedOffence.offence}
                                </Text>
                            </View>
                            <Ionicons
                                name={showPicker ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={C.textTertiary}
                            />
                        </TouchableOpacity>

                        {showPicker && (
                            <View style={styles.pickerDropdown}>
                                {/* Search */}
                                <View style={styles.searchBar}>
                                    <Ionicons name="search" size={16} color={C.textTertiary} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search offence or section..."
                                        placeholderTextColor={C.textTertiary}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        autoFocus
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                                            <Ionicons name="close-circle" size={16} color={C.textTertiary} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Category Filter Chips */}
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.categoryScroll}
                                >
                                    {CATEGORIES.map(cat => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[
                                                styles.catChip,
                                                activeCategory === cat && styles.catChipActive,
                                            ]}
                                            onPress={() => setActiveCategory(cat)}
                                        >
                                            <Text style={[
                                                styles.catChipText,
                                                activeCategory === cat && styles.catChipTextActive,
                                            ]}>
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* Result count */}
                                <View style={styles.resultCountRow}>
                                    <Text style={styles.resultCount}>
                                        {filteredOffences.length} of {OFFENCES_FINES.length} offences
                                    </Text>
                                </View>

                                {/* Offence List */}
                                <View style={styles.offenceList}>
                                    {filteredOffences.length === 0 ? (
                                        <View style={styles.noResult}>
                                            <Ionicons name="search-outline" size={28} color={C.border} />
                                            <Text style={styles.noResultText}>No offences found</Text>
                                        </View>
                                    ) : (
                                        filteredOffences.map((item, idx) => {
                                            const isSelected = selectedOffence.offence === item.offence;
                                            const sc = SEVERITY_COLOR[item.severity] || C.amber;
                                            const sb = SEVERITY_BG[item.severity] || C.amberSurface;
                                            return (
                                                <TouchableOpacity
                                                    key={`${item.section}-${idx}`}
                                                    style={[
                                                        styles.dropdownItem,
                                                        isSelected && styles.selectedItem,
                                                        idx === filteredOffences.length - 1 && { borderBottomWidth: 0 },
                                                    ]}
                                                    onPress={() => handleSelectOffence(item)}
                                                    activeOpacity={0.75}
                                                >
                                                    <View style={styles.dropdownLeft}>
                                                        <Text style={[
                                                            styles.dropdownText,
                                                            isSelected && styles.selectedText,
                                                        ]}>
                                                            {item.offence}
                                                        </Text>
                                                        <View style={styles.dropdownMeta}>
                                                            <View style={[styles.sevPill, { backgroundColor: sb }]}>
                                                                <Text style={[styles.sevPillText, { color: sc }]}>
                                                                    {item.severity}
                                                                </Text>
                                                            </View>
                                                            <Text style={styles.sectionPill}>{item.section}</Text>
                                                        </View>
                                                    </View>
                                                    <Text style={[
                                                        styles.dropdownFine,
                                                        { color: item.fine === 'Court' ? C.error : C.success },
                                                    ]}>
                                                        {item.fine}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Instance count */}
                        {!isCourt && (
                            <View style={{ marginTop: 20 }}>
                                <Text style={styles.label}>Number of Instances</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="repeat" size={18} color={C.textTertiary} />
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={count}
                                        onChangeText={v => setCount(v.replace(/[^0-9]/g, ''))}
                                        placeholder="1"
                                        placeholderTextColor={C.textTertiary}
                                        maxLength={3}
                                    />
                                    <View style={styles.countControls}>
                                        <TouchableOpacity
                                            style={styles.countBtn}
                                            onPress={() => setCount(c => String(Math.max(1, parseInt(c, 10) - 1)))}
                                        >
                                            <Ionicons name="remove" size={16} color={C.navy} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.countBtn}
                                            onPress={() => setCount(c => String(Math.min(99, parseInt(c, 10) + 1)))}
                                        >
                                            <Ionicons name="add" size={16} color={C.navy} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ── Calculation Breakdown ── */}
                    {!isCourt && total > 0 && (
                        <View style={styles.breakdownCard}>
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Base fine per instance</Text>
                                <Text style={styles.breakdownValue}>
                                    ₹{parseInt(selectedOffence.fine.replace(/[^\d]/g, ''), 10).toLocaleString('en-IN')}
                                </Text>
                            </View>
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Number of instances</Text>
                                <Text style={styles.breakdownValue}>× {parseInt(count, 10) || 0}</Text>
                            </View>
                            <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                                <Text style={styles.breakdownTotalLabel}>Total Estimated Fine</Text>
                                <Text style={styles.breakdownTotalValue}>
                                    ₹{total.toLocaleString('en-IN')}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* ── Court Fine Info ── */}
                    {isCourt && (
                        <View style={styles.courtInfoCard}>
                            <Ionicons name="hammer" size={18} color={C.navyMid} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.courtInfoTitle}>Court-Determined Fine</Text>
                                <Text style={styles.courtInfoText}>
                                    This violation is cognisable and the fine is determined by a Judicial Magistrate. The penalty can include both monetary fine and imprisonment depending on severity and prior offences.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* ── Legal Disclaimer ── */}
                    <View style={styles.disclaimer}>
                        <Ionicons name="information-circle-outline" size={14} color={C.textTertiary} />
                        <Text style={styles.disclaimerText}>
                            Disclaimer: Fine amounts are indicative, based on the Maharashtra RTO schedule and MV Act 1988 (Amendment 2019). Actual penalties are determined by the Traffic Police/RTO and may differ. For court-challan cases, the Magistrate sets the final amount. This calculator is for awareness only.
                        </Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20,
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
        gap: 14,
    },
    backButton: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 19, fontFamily: 'Nunito-Bold', color: C.white, letterSpacing: -0.3 },
    headerSub: { fontSize: 11, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.65)', marginTop: 1 },
    headerBadge: {
        alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    },
    headerBadgeText: { fontSize: 16, fontFamily: 'Nunito-ExtraBold', color: C.amber },
    headerBadgeSub: { fontSize: 9, fontFamily: 'Nunito-SemiBold', color: 'rgba(255,255,255,0.6)' },

    scrollContent: { paddingHorizontal: 18, paddingTop: 20 },

    // Hero total display
    calcHero: {
        backgroundColor: C.navy, borderRadius: 24, padding: 28, alignItems: 'center',
        shadowColor: C.navy, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
        marginBottom: 18,
    },
    totalLabel: { fontSize: 11, fontFamily: 'Nunito-ExtraBold', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.8 },
    totalAmount: { fontSize: 46, fontFamily: 'Nunito-ExtraBold', color: C.white, marginVertical: 6, letterSpacing: -1 },
    courtRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
    courtText: { fontSize: 28, fontFamily: 'Nunito-ExtraBold', color: C.amber },
    summaryBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    },
    summaryText: { fontSize: 11, fontFamily: 'Nunito-SemiBold', color: C.white },

    // Selected offence card
    selectedCard: {
        backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 18,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    },
    selectedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sevBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    sevDot: { width: 6, height: 6, borderRadius: 3 },
    sevText: { fontSize: 10, fontFamily: 'Nunito-ExtraBold', letterSpacing: 0.4 },
    selectedFine: { fontSize: 18, fontFamily: 'Nunito-ExtraBold' },
    selectedOffenceName: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginBottom: 6, lineHeight: 20 },
    selectedDesc: { fontSize: 12, fontFamily: 'Nunito-Medium', color: C.textSecondary, lineHeight: 18, marginBottom: 10 },
    sectionBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
        backgroundColor: C.primarySurface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    sectionText: { fontSize: 10, fontFamily: 'Nunito-SemiBold', color: C.navyMid },

    // Form card
    formCard: {
        backgroundColor: C.white, borderRadius: 20, padding: 18,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
        marginBottom: 18,
    },
    label: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginBottom: 10 },

    pickerTrigger: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: C.offWhite, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.borderLight,
    },
    pickerTriggerOpen: { borderColor: C.navyMid, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    pickerText: { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, flex: 1 },

    pickerDropdown: {
        backgroundColor: C.white, borderRadius: 14, borderTopLeftRadius: 0, borderTopRightRadius: 0,
        borderWidth: 1.5, borderTopWidth: 0, borderColor: C.navyMid,
        maxHeight: 420,
    },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderBottomWidth: 1, borderBottomColor: C.borderLight,
        paddingHorizontal: 14, paddingVertical: 10,
    },
    searchInput: {
        flex: 1, fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textPrimary,
        paddingVertical: Platform.OS === 'ios' ? 4 : 0,
    },
    categoryScroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
    catChip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        backgroundColor: C.offWhite, borderWidth: 1, borderColor: C.borderLight,
    },
    catChipActive: { backgroundColor: C.navy, borderColor: C.navy },
    catChipText: { fontSize: 11, fontFamily: 'Nunito-Bold', color: C.textTertiary },
    catChipTextActive: { color: C.white },
    resultCountRow: {
        paddingHorizontal: 14, paddingBottom: 6,
        borderBottomWidth: 1, borderBottomColor: C.borderLight,
    },
    resultCount: { fontSize: 10, fontFamily: 'Nunito-SemiBold', color: C.textTertiary },

    offenceList: {},
    dropdownItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: C.borderLight,
    },
    selectedItem: { backgroundColor: C.primarySurface },
    dropdownLeft: { flex: 1, paddingRight: 8 },
    dropdownText: { fontSize: 12, fontFamily: 'Nunito-Medium', color: C.textPrimary, marginBottom: 4, lineHeight: 17 },
    selectedText: { fontFamily: 'Nunito-Bold', color: C.navy },
    dropdownMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    sevPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    sevPillText: { fontSize: 9, fontFamily: 'Nunito-ExtraBold' },
    sectionPill: { fontSize: 9, fontFamily: 'Nunito-Medium', color: C.textTertiary },
    dropdownFine: { fontSize: 12, fontFamily: 'Nunito-ExtraBold', flexShrink: 0 },

    noResult: { alignItems: 'center', paddingVertical: 30, gap: 8 },
    noResultText: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary },

    // Count input
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: C.offWhite, paddingHorizontal: 14, borderRadius: 14,
        borderWidth: 1.5, borderColor: C.borderLight,
    },
    input: { flex: 1, height: 48, fontSize: 18, fontFamily: 'Nunito-ExtraBold', color: C.navy },
    countControls: { flexDirection: 'row', gap: 4 },
    countBtn: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: C.primarySurface, justifyContent: 'center', alignItems: 'center',
    },

    // Breakdown card
    breakdownCard: {
        backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    breakdownRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.borderLight,
    },
    breakdownLabel: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textSecondary },
    breakdownValue: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    breakdownTotal: { borderBottomWidth: 0, paddingTop: 12, marginTop: 4 },
    breakdownTotalLabel: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.navy },
    breakdownTotalValue: { fontSize: 20, fontFamily: 'Nunito-ExtraBold', color: C.navy },

    // Court info
    courtInfoCard: {
        flexDirection: 'row', gap: 12, alignItems: 'flex-start',
        backgroundColor: C.infoBg, borderRadius: 16, padding: 16, marginBottom: 14,
    },
    courtInfoTitle: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.navy, marginBottom: 4 },
    courtInfoText: { fontSize: 12, fontFamily: 'Nunito-Medium', color: '#1E293B', lineHeight: 18 },

    // Disclaimer
    disclaimer: {
        flexDirection: 'row', gap: 8, alignItems: 'flex-start',
        backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: C.borderLight,
    },
    disclaimerText: {
        flex: 1, fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textTertiary, lineHeight: 16,
    },
});
