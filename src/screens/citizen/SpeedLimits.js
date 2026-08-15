/**
 * SpeedLimits.js — Indian Speed Limit Guide
 * Source: MoRTH Notification SO 5505(E), CMVR, State Rules.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SPEED_LIMITS, SPEED_LIMITS_BY_VEHICLE } from '../../data/trafficData';
import { FocusAwareStatusBar } from '../../components';

const C = {
    navy: '#0A1E3F',
    navyMid: '#0F2C59',
    amber: '#F59E0B',
    amberSurface: '#FEF3C7',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: '#E5E7EB',
    borderLight: '#F0F2F5',
    redSign: '#B91C1C',
};

const ZONE_COLORS = [
    '#4F46E5', '#1D4ED8', '#7C3AED', '#059669', '#D97706', '#F59E0B', '#B91C1C',
];

const TABS = ['Zone Limits', 'By Vehicle Type'];

// Column headers for vehicle table
const TABLE_COLS = [
    { key: 'expressway', label: 'Express\nway', short: 'Exp.' },
    { key: 'nh', label: 'National\nHighway', short: 'NH' },
    { key: 'sh', label: 'State\nHighway', short: 'SH' },
    { key: 'city', label: 'City\nRoads', short: 'City' },
];

export default function SpeedLimits({ navigation }) {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>

                {/* Header */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Speed Limit Guide</Text>
                        <Text style={styles.headerSub}>MoRTH SO 5505(E) · CMVR · State Rules</Text>
                    </View>
                </LinearGradient>

                {/* Tab Toggle */}
                <View style={styles.tabRow}>
                    {TABS.map((tab, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={[styles.tab, activeTab === idx && styles.tabActive]}
                            onPress={() => setActiveTab(idx)}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name={idx === 0 ? 'map' : 'car'}
                                size={15}
                                color={activeTab === idx ? C.navy : C.textTertiary}
                            />
                            <Text style={[styles.tabText, activeTab === idx && styles.tabTextActive]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    {activeTab === 0 ? (
                        // ── Zone Limits Tab ──
                        <>
                            {/* Speed hero */}
                            <View style={styles.speedHero}>
                                <LinearGradient colors={['#4F46E5', '#3730A3']} style={styles.heroInner}>
                                    <View style={styles.heroContent}>
                                        <Text style={styles.heroTitle}>Drive Safe, Drive Legal</Text>
                                        <Text style={styles.heroSubtitle}>
                                            Speed limits in India vary by road type, zone, time of day and vehicle class. Always obey the posted sign — it overrides general limits.
                                        </Text>
                                    </View>
                                    <Ionicons name="speedometer" size={90} color="rgba(255,255,255,0.12)" style={styles.heroIcon} />
                                </LinearGradient>
                            </View>

                            <Text style={styles.sectionTitle}>Zone-Specific Limits</Text>

                            {SPEED_LIMITS.map((zone, idx) => (
                                <View key={idx} style={styles.zoneCard}>
                                    <View style={[styles.zoneIcon, { backgroundColor: ZONE_COLORS[idx] + '18' }]}>
                                        <Ionicons name={zone.icon} size={26} color={ZONE_COLORS[idx]} />
                                    </View>
                                    <View style={styles.zoneInfo}>
                                        <Text style={styles.zoneName}>{zone.zone}</Text>
                                        <Text style={styles.zoneDesc}>{zone.desc}</Text>
                                    </View>
                                    <View style={[styles.limitBadge, { borderColor: ZONE_COLORS[idx] }]}>
                                        <Text style={[styles.limitValue, { color: ZONE_COLORS[idx] }]}>
                                            {zone.limit.split(' ')[0]}
                                        </Text>
                                        <Text style={styles.limitUnit}>km/h</Text>
                                    </View>
                                </View>
                            ))}

                            {/* Overspeeding fine note */}
                            <View style={styles.fineNote}>
                                <View style={styles.fineNoteHeader}>
                                    <Ionicons name="alert-circle" size={17} color={C.amber} />
                                    <Text style={styles.fineNoteTitle}>Overspeeding Penalties</Text>
                                </View>
                                <Text style={styles.fineNoteRow}>• 2/3-wheelers: ₹1,000 fine  (Sec 183 MVA)</Text>
                                <Text style={styles.fineNoteRow}>• LMV (cars): ₹2,000 fine</Text>
                                <Text style={styles.fineNoteRow}>• HMV (trucks/buses): ₹4,000 fine</Text>
                                <Text style={styles.fineNoteRow}>• Racing / speed contest: ₹5,000 + imprisonment</Text>
                                <Text style={styles.fineNoteRow}>• Posted sign always overrides general zone limit.</Text>
                            </View>
                        </>
                    ) : (
                        // ── Vehicle-Type Tab ──
                        <>
                            <View style={styles.vehicleHero}>
                                <Ionicons name="information-circle" size={16} color={C.navyMid} />
                                <Text style={styles.vehicleHeroText}>
                                    Speed limits differ by vehicle class under MoRTH SO 5505(E), 2018. All values are in km/h. "—" means the vehicle is not permitted on that road type.
                                </Text>
                            </View>

                            {/* Table */}
                            <View style={styles.table}>
                                {/* Header row */}
                                <View style={[styles.tableRow, styles.tableHeader]}>
                                    <View style={styles.vehicleCol}>
                                        <Text style={styles.tableHeaderText}>Vehicle Type</Text>
                                    </View>
                                    {TABLE_COLS.map(col => (
                                        <View key={col.key} style={styles.speedCol}>
                                            <Text style={styles.tableHeaderText}>{col.label}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Data rows */}
                                {SPEED_LIMITS_BY_VEHICLE.map((row, idx) => (
                                    <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                                        <View style={styles.vehicleCol}>
                                            <Ionicons name={row.icon} size={14} color={C.navyMid} />
                                            <Text style={styles.vehicleText}>{row.vehicle}</Text>
                                        </View>
                                        {TABLE_COLS.map(col => {
                                            const val = row[col.key];
                                            const isNA = val === '—';
                                            return (
                                                <View key={col.key} style={styles.speedCol}>
                                                    <Text style={[
                                                        styles.speedVal,
                                                        isNA && styles.speedValNA,
                                                    ]}>
                                                        {val}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>

                            {/* Per-row notes */}
                            <Text style={styles.notesTitle}>Special Notes</Text>
                            {SPEED_LIMITS_BY_VEHICLE.filter(r => r.note).map((row, idx) => (
                                <View key={idx} style={styles.noteCard}>
                                    <Ionicons name={row.icon} size={14} color={C.navyMid} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.noteVehicle}>{row.vehicle}</Text>
                                        <Text style={styles.noteText}>{row.note}</Text>
                                    </View>
                                </View>
                            ))}
                        </>
                    )}

                    {/* Common disclaimer */}
                    <View style={styles.disclaimer}>
                        <Ionicons name="document-text-outline" size={13} color={C.textTertiary} />
                        <Text style={styles.disclaimerText}>
                            Source: MoRTH Notification SO 5505(E) (2018), CMVR Rules 1989, Maharashtra Motor Vehicles Rules. Always follow posted signs — local speed limits supersede general limits. Data is for awareness only.
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
        paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22,
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 14,
    },
    backButton: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 19, fontFamily: 'Nunito-Bold', color: C.white, letterSpacing: -0.3 },
    headerSub: { fontSize: 10, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.65)', marginTop: 2 },

    tabRow: {
        flexDirection: 'row', marginHorizontal: 18, marginTop: 16, marginBottom: 2,
        backgroundColor: C.surface, borderRadius: 14, padding: 4,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, gap: 6, borderRadius: 11,
    },
    tabActive: { backgroundColor: C.offWhite },
    tabText: { fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.textTertiary },
    tabTextActive: { color: C.navy, fontFamily: 'Nunito-Bold' },

    scrollContent: { paddingHorizontal: 18, paddingTop: 16 },

    // Zone tab
    speedHero: { marginBottom: 24, borderRadius: 24, overflow: 'hidden', elevation: 6, shadowColor: '#4F46E5', shadowOpacity: 0.18, shadowRadius: 20 },
    heroInner: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 130 },
    heroContent: { flex: 1 },
    heroTitle: { fontSize: 20, fontFamily: 'Nunito-ExtraBold', color: C.white, marginBottom: 6 },
    heroSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: 'Nunito-Medium', lineHeight: 18, maxWidth: '85%' },
    heroIcon: { position: 'absolute', right: -18, bottom: -18 },

    sectionTitle: { fontSize: 17, fontFamily: 'Nunito-Bold', color: C.navy, marginBottom: 14 },

    zoneCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
        padding: 16, borderRadius: 18, marginBottom: 12,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },
    zoneIcon: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    zoneInfo: { flex: 1, marginLeft: 14 },
    zoneName: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    zoneDesc: { fontSize: 11, color: C.textTertiary, fontFamily: 'Nunito-Medium', marginTop: 2, lineHeight: 16 },

    limitBadge: {
        width: 66, height: 66, borderRadius: 33, backgroundColor: C.white,
        borderWidth: 3.5, justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
    },
    limitValue: { fontSize: 19, fontFamily: 'Nunito-ExtraBold' },
    limitUnit: { fontSize: 7, fontFamily: 'Nunito-ExtraBold', color: C.textTertiary, marginTop: -2 },

    fineNote: {
        marginTop: 6, padding: 18, backgroundColor: C.white, borderRadius: 20,
        borderWidth: 1.5, borderColor: C.amberSurface,
    },
    fineNoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    fineNoteTitle: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.navy },
    fineNoteRow: { fontSize: 12, color: C.textSecondary, fontFamily: 'Nunito-Medium', marginBottom: 5, lineHeight: 18 },

    // Vehicle type tab
    vehicleHero: {
        flexDirection: 'row', gap: 8, alignItems: 'flex-start',
        backgroundColor: '#EEF2FF', borderRadius: 14, padding: 14, marginBottom: 18,
    },
    vehicleHeroText: { flex: 1, fontSize: 12, fontFamily: 'Nunito-Medium', color: C.navyMid, lineHeight: 18 },

    table: {
        backgroundColor: C.white, borderRadius: 18, overflow: 'hidden',
        shadowColor: C.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
        marginBottom: 20,
    },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderLight },
    tableRowAlt: { backgroundColor: '#FAFBFD' },
    tableHeader: { backgroundColor: C.navy, borderBottomWidth: 0 },
    tableHeaderText: { fontSize: 9, fontFamily: 'Nunito-ExtraBold', color: 'rgba(255,255,255,0.75)', textAlign: 'center', letterSpacing: 0.3, lineHeight: 13 },

    vehicleCol: {
        flex: 2.5, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
        borderRightWidth: 1, borderRightColor: C.borderLight,
    },
    vehicleText: { flex: 1, fontSize: 11, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, lineHeight: 15 },
    speedCol: {
        flex: 1, padding: 10, alignItems: 'center', justifyContent: 'center',
        borderRightWidth: 1, borderRightColor: C.borderLight,
    },
    speedVal: { fontSize: 13, fontFamily: 'Nunito-ExtraBold', color: C.navy, textAlign: 'center' },
    speedValNA: { fontSize: 16, color: C.textTertiary, fontFamily: 'Nunito-Bold' },

    notesTitle: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.navy, marginBottom: 12 },
    noteCard: {
        flexDirection: 'row', gap: 10, alignItems: 'flex-start',
        backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 10,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    },
    noteVehicle: { fontSize: 12, fontFamily: 'Nunito-Bold', color: C.navy, marginBottom: 2 },
    noteText: { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textSecondary, lineHeight: 17 },

    disclaimer: {
        flexDirection: 'row', gap: 6, alignItems: 'flex-start',
        backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: C.borderLight, marginTop: 8,
    },
    disclaimerText: { flex: 1, fontSize: 10, fontFamily: 'Nunito-Medium', color: C.textTertiary, lineHeight: 15 },
});
