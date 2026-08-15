import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
    successSurface: '#D1FAE5',
    error: '#BA1A1A',
    errorSurface: '#FFDAD6',
};

export default function ReportVerification({ navigation }) {
    const [notes, setNotes] = useState('');

    const handleVerify = () => navigation.goBack();
    const handleReject = () => navigation.goBack();

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Review Report</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* ── Image ── */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={require('../../../assets/images/traffic_violation.jpg')}
                            style={styles.evidenceImage}
                            resizeMode="cover"
                        />
                        <View style={styles.imageOverlayTop}>
                            <View style={styles.priorityBadge}>
                                <Text style={styles.priorityText}>HIGH PRIORITY</Text>
                            </View>
                        </View>
                    </View>

                    {/* ── AI Insights Card ── */}
                    <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.aiCard}>
                        <View style={styles.aiCardHeader}>
                            <Ionicons name="sparkles" size={18} color={C.success} />
                            <Text style={styles.aiCardTitle}>AI Insights</Text>
                            <View style={styles.confidenceBadge}>
                                <Text style={styles.confidenceText}>95% Match</Text>
                            </View>
                        </View>
                        <View style={styles.aiRow}>
                            <Text style={styles.aiLabel}>Detected Plate</Text>
                            <Text style={styles.aiValuePlate}>MH12AB1234</Text>
                        </View>
                        <View style={styles.aiRow}>
                            <Text style={styles.aiLabel}>Violation Type</Text>
                            <Text style={styles.aiValue}>Speeding (78 km/h)</Text>
                        </View>
                    </LinearGradient>

                    {/* ── Details ── */}
                    <View style={styles.detailCard}>
                        <Text style={styles.cardSectionTitle}>Submission Details</Text>
                        
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Location</Text>
                            <Text style={styles.detailValue}>Main St & 5th Ave</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Date & Time</Text>
                            <Text style={styles.detailValue}>Today, 14:30 PM (2h ago)</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Reporter ID</Text>
                            <Text style={styles.detailValue}>CID-8849</Text>
                        </View>
                    </View>

                    {/* ── Notes ── */}
                    <Text style={styles.label}>Officer Notes</Text>
                    <View style={styles.notesBox}>
                        <TextInput
                            style={styles.notesInput}
                            placeholder="Add internal remarks..."
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                </ScrollView>

                {/* ── Action Footer ── */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.rejectBtn} onPress={handleReject} activeOpacity={0.8}>
                        <Ionicons name="close" size={20} color={C.error} />
                        <Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} activeOpacity={0.88}>
                        <LinearGradient colors={[C.success, '#047857']} style={styles.verifyGradient} start={{x:0,y:0}} end={{x:1,y:0}}>
                            <Ionicons name="checkmark" size={20} color={C.white} />
                            <Text style={styles.verifyText}>Verify & Proceed</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    },
    backButton: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.white },

    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

    // Image
    imageContainer: {
        width: '100%', height: 260, borderRadius: 16, overflow: 'hidden',
        marginBottom: 16, elevation: 4, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10,
    },
    evidenceImage: { width: '100%', height: '100%' },
    imageOverlayTop: { position: 'absolute', top: 12, left: 12 },
    priorityBadge: { backgroundColor: '#DC2626', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    priorityText: { color: C.white, fontSize: 10, fontFamily: 'Nunito-Bold', letterSpacing: 0.5 },

    // AI Card
    aiCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#BBF7D0' },
    aiCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    aiCardTitle: { fontSize: 15, fontFamily: 'Nunito-Bold', color: '#166534', marginLeft: 6, flex: 1 },
    confidenceBadge: { backgroundColor: '#166534', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    confidenceText: { fontSize: 11, fontFamily: 'Nunito-Bold', color: C.white },
    aiRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    aiLabel: { fontSize: 13, color: '#166534', fontFamily: 'Nunito-Medium' },
    aiValuePlate: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.navy, backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#166534' },
    aiValue: { fontSize: 14, fontFamily: 'Nunito-Bold', color: '#166534' },

    // Details Card
    detailCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 20, elevation: 2, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
    cardSectionTitle: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.navyMid, marginBottom: 16 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F2F4F6', paddingVertical: 10 },
    detailLabel: { fontSize: 13, color: C.textSecondary },
    detailValue: { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textPrimary },

    // Notes
    label: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.navyMid, marginBottom: 8 },
    notesBox: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12 },
    notesInput: { fontSize: 14, color: C.textPrimary, textAlignVertical: 'top', height: 80 },

    // Footer
    footer: { flexDirection: 'row', padding: 16, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: '#F2F4F6', gap: 12 },
    rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.error, backgroundColor: C.errorSurface },
    rejectText: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.error },
    verifyBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
    verifyGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
    verifyText: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.white },
});
