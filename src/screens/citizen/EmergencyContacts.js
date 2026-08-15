/**
 * EmergencyContacts.js — SOS Emergency Services
 * All numbers verified against Government of India / Maharashtra sources.
 * Last verified: August 2026.
 */
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { EMERGENCY_CONTACTS } from '../../data/trafficData';
import { FocusAwareStatusBar } from '../../components';

const C = {
    navy: '#0A1E3F',
    navyMid: '#0F2C59',
    amber: '#F59E0B',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: '#E5E7EB',
    error: '#B91C1C',
    errorSurface: '#FFDAD6',
};

// Category configuration for colour and label
const CATEGORY_CONFIG = {
    police: { label: 'Police & Traffic', color: '#1D4ED8', bg: '#DBEAFE' },
    medical: { label: 'Medical', color: '#DC2626', bg: '#FEE2E2' },
    rescue: { label: 'Fire & Rescue', color: '#EA580C', bg: '#FFEDD5' },
    highway: { label: 'Highway / Road', color: '#D97706', bg: '#FEF3C7' },
    helpline: { label: 'Helplines', color: '#7C3AED', bg: '#F3E8FF' },
};

const FILTER_TABS = ['All', 'Police', 'Medical', 'Rescue', 'Highway', 'Helplines'];
const FILTER_KEYS = ['all', 'police', 'medical', 'rescue', 'highway', 'helpline'];

// SOS quick-dials — the 3 most critical numbers always shown at top
const SOS_NUMBERS = [
    { label: 'Police', number: '100', icon: 'shield-sharp', color: '#1D4ED8' },
    { label: 'Ambulance', number: '108', icon: 'medical', color: '#DC2626' },
    { label: 'Fire', number: '101', icon: 'flame', color: '#EA580C' },
];

export default function EmergencyContacts({ navigation }) {
    const [activeFilter, setActiveFilter] = useState('all');

    const handleCall = (number, name) => {
        Alert.alert(
            `Call ${name}`,
            `Dial ${number} now?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: `Call ${number}`,
                    style: 'destructive',
                    onPress: () => Linking.openURL(`tel:${number}`),
                },
            ]
        );
    };

    const filtered = activeFilter === 'all'
        ? EMERGENCY_CONTACTS
        : EMERGENCY_CONTACTS.filter(c => c.category === activeFilter);

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>

                {/* Header */}
                <LinearGradient colors={['#7F1D1D', '#B91C1C']} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Emergency Services</Text>
                        <Text style={styles.headerSub}>Tap any number to call immediately</Text>
                    </View>
                    <View style={styles.sosIcon}>
                        <Ionicons name="alert-circle" size={22} color={C.white} />
                    </View>
                </LinearGradient>

                {/* SOS Quick-dial strip */}
                <View style={styles.sosStrip}>
                    <Text style={styles.sosStripLabel}>QUICK SOS DIAL</Text>
                    <View style={styles.sosRow}>
                        {SOS_NUMBERS.map(s => (
                            <TouchableOpacity
                                key={s.number}
                                style={[styles.sosBtn, { backgroundColor: s.color }]}
                                activeOpacity={0.8}
                                onPress={() => handleCall(s.number, s.label)}
                            >
                                <Ionicons name={s.icon} size={18} color={C.white} />
                                <Text style={styles.sosNum}>{s.number}</Text>
                                <Text style={styles.sosLabel}>{s.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Warning */}
                <View style={styles.warningBox}>
                    <Ionicons name="warning" size={16} color={C.error} />
                    <Text style={styles.warningText}>
                        Use only for genuine emergencies. Misuse of emergency numbers is a punishable offence under Sec 66A/507 IPC.
                    </Text>
                </View>

                {/* Filter tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScroll}
                    style={styles.filterScrollContainer}
                >
                    {FILTER_TABS.map((tab, idx) => {
                        const key = FILTER_KEYS[idx];
                        const active = activeFilter === key;
                        return (
                            <TouchableOpacity
                                key={key}
                                style={[styles.filterChip, active && styles.filterChipActive]}
                                onPress={() => setActiveFilter(key)}
                            >
                                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Contact List */}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {filtered.map((contact, idx) => {
                        const cfg = CATEGORY_CONFIG[contact.category] || CATEGORY_CONFIG.helpline;
                        return (
                            <TouchableOpacity
                                key={idx}
                                style={styles.contactCard}
                                activeOpacity={0.8}
                                onPress={() => handleCall(contact.number, contact.name)}
                            >
                                {/* Category colour strip */}
                                <View style={[styles.cardStrip, { backgroundColor: cfg.color }]} />

                                <View style={[styles.contactIconFrame, { backgroundColor: cfg.bg }]}>
                                    <Ionicons name={contact.icon} size={24} color={cfg.color} />
                                </View>

                                <View style={styles.contactInfo}>
                                    <Text style={styles.contactName}>{contact.name}</Text>
                                    <Text style={styles.contactDesc}>{contact.desc}</Text>
                                    <View style={[styles.categoryTag, { backgroundColor: cfg.bg }]}>
                                        <Text style={[styles.categoryTagText, { color: cfg.color }]}>
                                            {cfg.label}
                                        </Text>
                                        <Text style={[styles.availText, { color: cfg.color }]}>
                                            · {contact.availability}
                                        </Text>
                                    </View>
                                </View>

                                {/* Call button */}
                                <View style={[styles.callCircle, { backgroundColor: cfg.color }]}>
                                    <Ionicons name="call" size={18} color={C.white} />
                                    <Text style={styles.numberText}>{contact.number}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    {/* Regional note */}
                    <View style={styles.helpBoard}>
                        <Ionicons name="information-circle" size={18} color={C.amber} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.boardTitle}>Regional & State Helplines</Text>
                            <Text style={styles.boardText}>
                                For NH breakdowns, dial 1033 (NHAI). For state highways, contact the District SP control room. Mumbai traffic issues: 1095. All numbers are toll-free and operate 24/7.
                            </Text>
                        </View>
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
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 19, fontFamily: 'Nunito-Bold', color: C.white, letterSpacing: -0.3 },
    headerSub: { fontSize: 11, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    sosIcon: {
        width: 38, height: 38, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
    },

    // SOS Quick Dial
    sosStrip: {
        marginHorizontal: 18, marginTop: 18, marginBottom: 14,
        backgroundColor: C.surface, borderRadius: 18, padding: 16,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4,
    },
    sosStripLabel: {
        fontSize: 9, fontFamily: 'Nunito-ExtraBold', color: C.textTertiary,
        letterSpacing: 1, marginBottom: 12,
    },
    sosRow: { flexDirection: 'row', gap: 10 },
    sosBtn: {
        flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14,
        borderRadius: 14,
    },
    sosNum: { fontSize: 20, fontFamily: 'Nunito-ExtraBold', color: C.white },
    sosLabel: { fontSize: 10, fontFamily: 'Nunito-SemiBold', color: 'rgba(255,255,255,0.8)' },

    warningBox: {
        flexDirection: 'row', gap: 10, alignItems: 'flex-start',
        marginHorizontal: 18, marginBottom: 14,
        backgroundColor: C.errorSurface, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: '#FFCFCC',
    },
    warningText: { flex: 1, fontSize: 11, color: C.error, fontFamily: 'Nunito-SemiBold', lineHeight: 17 },

    // Filters
    filterScrollContainer: { maxHeight: 48 },
    filterScroll: { paddingHorizontal: 18, gap: 8, alignItems: 'center' },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    },
    filterChipActive: { backgroundColor: C.navy, borderColor: C.navy },
    filterText: { fontSize: 12, fontFamily: 'Nunito-Bold', color: C.textTertiary },
    filterTextActive: { color: C.white },

    scrollContent: { paddingHorizontal: 18, paddingTop: 14 },

    contactCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
        borderRadius: 18, marginBottom: 12, overflow: 'hidden',
        shadowColor: C.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
    },
    cardStrip: { width: 4, alignSelf: 'stretch' },
    contactIconFrame: {
        width: 50, height: 50, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center', margin: 14,
    },
    contactInfo: { flex: 1, paddingVertical: 14, paddingRight: 8 },
    contactName: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    contactDesc: { fontSize: 11, color: C.textTertiary, fontFamily: 'Nunito-Medium', marginTop: 2, lineHeight: 16 },
    categoryTag: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    categoryTagText: { fontSize: 9, fontFamily: 'Nunito-ExtraBold' },
    availText: { fontSize: 9, fontFamily: 'Nunito-SemiBold', marginLeft: 2 },

    callCircle: {
        alignItems: 'center', gap: 3,
        paddingHorizontal: 14, paddingVertical: 10, marginRight: 14,
        borderRadius: 14,
    },
    numberText: { fontSize: 11, fontFamily: 'Nunito-ExtraBold', color: C.white },

    // Help board
    helpBoard: {
        flexDirection: 'row', gap: 12, alignItems: 'flex-start',
        backgroundColor: C.navyMid, borderRadius: 20, padding: 18, marginTop: 4,
    },
    boardTitle: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.white, marginBottom: 6 },
    boardText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: 'Nunito-Medium', lineHeight: 18 },
});
