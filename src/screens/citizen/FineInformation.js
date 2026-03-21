import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { OFFENCES_FINES } from '../../data/trafficData';

const C = {
    navy: '#002452', navyMid: '#1B3A6B', navyLight: '#2C4E80',
    amber: '#F59E0B', amberDark: '#D97706', amberSurface: '#FEF3C7',
    white: '#FFFFFF', offWhite: '#F8F9FB', surface: '#FFFFFF',
    textPrimary: '#191C1E', textSecondary: '#44474F', textTertiary: '#747780',
    border: '#EAECEF',
    success: '#059669', successSurface: '#D1FAE5',
    warning: '#D97706', warningSurface: '#FEF3C7',
    error: '#BA1A1A', errorSurface: '#FFDAD6',
    info: '#1D4ED8', infoSurface: '#DBEAFE',
    purple: '#7C3AED', purpleSurface: '#EDE9FE',
};

const SEVERITY = {
    low:      { label: 'Low',      color: C.success,  bg: C.successSurface,  bar: '#34D399' },
    medium:   { label: 'Moderate', color: C.warning,  bg: C.warningSurface,  bar: C.amber   },
    high:     { label: 'High',     color: '#EA580C',  bg: '#FFEDD5',         bar: '#F97316' },
    critical: { label: 'Critical', color: C.error,    bg: C.errorSurface,    bar: C.error   },
};

const CATEGORY_META = {
    All:        { icon: 'grid',            color: C.navy     },
    Safety:     { icon: 'shield-checkmark',color: C.success  },
    Speeding:   { icon: 'speedometer',     color: C.info     },
    Signals:    { icon: 'radio-button-on', color: C.amber    },
    Dangerous:  { icon: 'warning',         color: C.error    },
    Distraction:{ icon: 'phone-portrait',  color: '#7C3AED'  },
    Documents:  { icon: 'document-text',   color: C.navyMid  },
    Overloading:{ icon: 'people',          color: '#EA580C'  },
};

const CATEGORIES = ['All', ...Object.keys(CATEGORY_META).filter(k => k !== 'All')];

export default function FineInformation({ navigation }) {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }, []);

    const filtered = OFFENCES_FINES.filter(item => {
        const matchCat = activeCategory === 'All' || item.category === activeCategory;
        const q = search.toLowerCase();
        const matchSearch = !q || item.offence.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.section.toLowerCase().includes(q);
        return matchCat && matchSearch;
    });

    return (
        <View style={s.root}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
            <SafeAreaView style={s.safe} edges={['top']}>

                {/* Header */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <View style={s.headerCenter}>
                        <Text style={s.headerTitle}>Offences &amp; Fines</Text>
                        <Text style={s.headerSub}>Motor Vehicles Act, Maharashtra</Text>
                    </View>
                    <View style={s.headerBadge}>
                        <Text style={s.headerBadgeText}>{OFFENCES_FINES.length}</Text>
                        <Text style={s.headerBadgeLabel}>Listed</Text>
                    </View>
                </LinearGradient>

                {/* Search */}
                <View style={s.searchWrap}>
                    <View style={s.searchBox}>
                        <Ionicons name="search" size={18} color={C.textTertiary} />
                        <TextInput
                            style={s.searchInput}
                            placeholder="Search offence, section, category…"
                            placeholderTextColor={C.textTertiary}
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <Ionicons name="close-circle" size={18} color={C.textTertiary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Category Chips */}
                <View style={s.chipRow}>
                    <View style={s.chipContent}>
                        {CATEGORIES.map(cat => {
                            const meta = CATEGORY_META[cat] || CATEGORY_META.All;
                            const active = cat === activeCategory;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    style={[s.chip, active && { backgroundColor: meta.color, borderColor: meta.color }]}
                                    onPress={() => setActiveCategory(cat)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name={meta.icon} size={13} color={active ? C.white : meta.color} />
                                    <Text style={[s.chipText, active && { color: C.white }]}>{cat}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Results count */}
                <Text style={s.resultCount}>{filtered.length} {filtered.length === 1 ? 'offence' : 'offences'} found</Text>

                {/* List */}
                <Animated.ScrollView
                    style={{ opacity: fadeAnim }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.listContent}
                >
                    {filtered.map((item, idx) => {
                        const sev = SEVERITY[item.severity] || SEVERITY.medium;
                        const catMeta = CATEGORY_META[item.category] || CATEGORY_META.All;
                        return (
                            <View key={idx} style={s.card}>
                                {/* Severity bar */}
                                <View style={[s.severityBar, { backgroundColor: sev.bar }]} />

                                <View style={s.cardInner}>
                                    {/* Top row */}
                                    <View style={s.cardTop}>
                                        <View style={[s.catIconBox, { backgroundColor: catMeta.color + '18' }]}>
                                            <Ionicons name={catMeta.icon} size={16} color={catMeta.color} />
                                        </View>
                                        <View style={s.cardTopMid}>
                                            <Text style={s.sectionCode}>{item.section}</Text>
                                            <View style={[s.severityChip, { backgroundColor: sev.bg }]}>
                                                <Text style={[s.severityText, { color: sev.color }]}>{sev.label}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Offence name */}
                                    <Text style={s.offenceName}>{item.offence}</Text>
                                    <Text style={s.offenceDesc}>{item.description}</Text>

                                    {/* Footer */}
                                    <View style={s.cardFooter}>
                                        <View style={s.fineRow}>
                                            <Text style={s.fineLabel}>FINE</Text>
                                            <Text style={s.fineAmount}>{item.fine}</Text>
                                        </View>
                                        {item.penalty && (
                                            <View style={s.penaltyRow}>
                                                <Ionicons name="alert-circle-outline" size={13} color={C.error} />
                                                <Text style={s.penaltyText}>{item.penalty}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    })}

                    {filtered.length === 0 && (
                        <View style={s.empty}>
                            <Ionicons name="search-outline" size={44} color={C.border} />
                            <Text style={s.emptyTitle}>No offences found</Text>
                            <Text style={s.emptySub}>Try a different search term or category</Text>
                        </View>
                    )}
                    <View style={{ height: 40 }} />
                </Animated.ScrollView>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.offWhite },
    safe: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        gap: 12,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerCenter: { flex: 1 },
    headerTitle: { fontSize: 19, fontFamily: 'Nunito-Bold', color: C.white, letterSpacing: -0.3 },
    headerSub: { fontSize: 11, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.65)', marginTop: 2 },
    headerBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    headerBadgeText: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.amber, lineHeight: 22 },
    headerBadgeLabel: { fontSize: 9, fontFamily: 'Nunito-Bold', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },

    // Search
    searchWrap: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: C.surface, borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 12,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    searchInput: { flex: 1, fontSize: 14, fontFamily: 'Nunito-Medium', color: C.textPrimary },

    // Chips
    chipRow: { marginTop: 10 },
    chipContent: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 18, gap: 8, paddingBottom: 4 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: C.surface,
        borderWidth: 1.5, borderColor: C.border,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20,
    },
    chipText: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.textSecondary },

    resultCount: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.textTertiary },

    // List
    listContent: { paddingHorizontal: 18, paddingTop: 8 },

    card: {
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderRadius: 18,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: C.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    severityBar: { width: 5 },
    cardInner: { flex: 1, padding: 14 },

    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    catIconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    cardTopMid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionCode: { fontSize: 11, fontFamily: 'Nunito-Bold', color: C.navyMid },
    severityChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    severityText: { fontSize: 10, fontFamily: 'Nunito-ExtraBold', letterSpacing: 0.3 },

    offenceName: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.textPrimary, lineHeight: 21 },
    offenceDesc: { fontSize: 12, fontFamily: 'Nunito-Medium', color: C.textSecondary, marginTop: 4, lineHeight: 17 },

    cardFooter: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, gap: 6 },
    fineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fineLabel: { fontSize: 10, fontFamily: 'Nunito-ExtraBold', color: C.textTertiary, letterSpacing: 0.5 },
    fineAmount: { fontSize: 17, fontFamily: 'Nunito-Bold', color: C.success },
    penaltyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: C.errorSurface, padding: 8, borderRadius: 8 },
    penaltyText: { flex: 1, fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.error, lineHeight: 16 },

    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 17, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginTop: 12 },
    emptySub: { fontSize: 13, color: C.textTertiary, marginTop: 6, fontFamily: 'Nunito-Medium' },
});
