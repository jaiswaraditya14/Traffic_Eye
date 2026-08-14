import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { OFFENCES_FINES } from '../../data/trafficData';
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
    border: '#C4C6D0',
    success: '#059669',
    error: '#BA1A1A',
};

export default function FineCalculator({ navigation }) {
    const [selectedOffence, setSelectedOffence] = useState(OFFENCES_FINES[0]);
    const [count, setCount] = useState('1');
    const [showPicker, setShowPicker] = useState(false);

    const calculateTotal = () => {
        // Simple regex to extract number from fine string like "₹1,000"
        const fineValue = parseInt(selectedOffence.fine.replace(/[^\d]/g, ''), 10) || 0;
        return fineValue * (parseInt(count, 10) || 0);
    };

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Fine Calculator</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* ── Calculator Hero ── */}
                    <View style={styles.calcHero}>
                        <Text style={styles.totalLabel}>ESTIMATED TOTAL</Text>
                        <Text style={styles.totalAmount}>₹{calculateTotal().toLocaleString()}</Text>
                        <View style={styles.summaryBadge}>
                            <Ionicons name="receipt" size={14} color={C.white} />
                            <Text style={styles.summaryText}>Based on current RTO rules</Text>
                        </View>
                    </View>

                    {/* ── Input Section ── */}
                    <View style={styles.formCard}>
                        {/* Offence Selection */}
                        <Text style={styles.label}>Select Violation Type</Text>
                        <TouchableOpacity 
                            style={styles.pickerTrigger} 
                            onPress={() => setShowPicker(!showPicker)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.pickerRow}>
                                <Ionicons name="warning-outline" size={20} color={C.navy} />
                                <Text style={styles.pickerText} numberOfLines={1}>{selectedOffence.offence}</Text>
                            </View>
                            <Ionicons name={showPicker ? "chevron-up" : "chevron-down"} size={20} color={C.textTertiary} />
                        </TouchableOpacity>

                        {showPicker && (
                            <View style={styles.pickerDropdown}>
                                {OFFENCES_FINES.slice(0, 10).map((item, idx) => (
                                    <TouchableOpacity 
                                        key={idx} 
                                        style={[styles.dropdownItem, selectedOffence.offence === item.offence && styles.selectedItem]}
                                        onPress={() => {
                                            setSelectedOffence(item);
                                            setShowPicker(false);
                                        }}
                                    >
                                        <Text style={[styles.dropdownText, selectedOffence.offence === item.offence && styles.selectedText]}>{item.offence}</Text>
                                        <Text style={styles.dropdownFine}>{item.fine}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Frequency / Count */}
                        <View style={{ marginTop: 20 }}>
                            <Text style={styles.label}>Number of Instances</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="repeat" size={20} color={C.textTertiary} />
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={count}
                                    onChangeText={setCount}
                                    placeholder="e.g. 1"
                                />
                            </View>
                        </View>
                    </View>

                    {/* ── Explanation Board ── */}
                    <View style={styles.infoBoard}>
                        <View style={styles.infoHead}>
                            <Ionicons name="information-circle" size={18} color={C.navy} />
                            <Text style={styles.infoTitle}>Calculation Detail</Text>
                        </View>
                        <Text style={styles.infoText}>
                            The calculator uses standard penalty rates for {selectedOffence.category.toLowerCase()}. 
                            Repeated offences may attract higher penalties or license suspension as per Section 183 of the MV Act.
                        </Text>
                        <View style={styles.penaltyChip}>
                            <Text style={styles.penaltyText}>ADDITIONAL PENALTY: {selectedOffence.penalty || 'None'}</Text>
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
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    },
    backButton: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.white },

    scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
    
    calcHero: { 
        backgroundColor: C.navy, borderRadius: 24, padding: 32, alignItems: 'center',
        shadowColor: C.navy, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
        marginBottom: 28,
    },
    totalLabel: { fontSize: 13, fontFamily: 'Nunito-ExtraBold', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
    totalAmount: { fontSize: 44, fontFamily: 'Nunito-ExtraBold', color: C.white, marginVertical: 8 },
    summaryBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    summaryText: { fontSize: 11, fontFamily: 'Nunito-Bold', color: C.white },

    formCard: { backgroundColor: C.white, borderRadius: 24, padding: 20, elevation: 4, shadowColor: C.navy, shadowOpacity: 0.1, shadowRadius: 16 },
    label: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginBottom: 12 },
    pickerTrigger: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: C.offWhite, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border
    },
    pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    pickerText: { fontSize: 14, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, flex: 1 },

    pickerDropdown: { 
        backgroundColor: C.white, borderRadius: 16, marginTop: 10,
        borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    },
    dropdownItem: { 
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#F2F4F6', 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' 
    },
    selectedItem: { backgroundColor: C.primarySurface },
    dropdownText: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textPrimary, flex: 1 },
    selectedText: { fontFamily: 'Nunito-Bold', color: C.navy },
    dropdownFine: { fontSize: 12, fontFamily: 'Nunito-Bold', color: C.success },

    inputWrapper: { 
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.offWhite, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border
    },
    input: { flex: 1, height: 52, fontSize: 16, fontFamily: 'Nunito-Bold', color: C.navy },

    infoBoard: { marginTop: 28, padding: 20, backgroundColor: '#E0E7FF', borderRadius: 24 },
    infoHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    infoTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.navy },
    infoText: { fontSize: 13, color: '#1E293B', fontFamily: 'Nunito-Medium', lineHeight: 20 },
    penaltyChip: { marginTop: 14, padding: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8 },
    penaltyText: { fontSize: 10, fontFamily: 'Nunito-ExtraBold', color: C.error, letterSpacing: 0.5 },
});
