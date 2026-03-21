import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

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
};

export default function VerifiedReports({ navigation }) {
    const verifiedReports = [
        { id: 1, type: 'Speeding', location: 'Main St & 5th Ave', date: '2024-01-20', officer: 'Badge #1234', plate: 'MH12AB1234' },
        { id: 2, type: 'Red Light', location: 'Oak Rd & Elm St', date: '2024-01-19', officer: 'Badge #1234', plate: 'MH01CD5678' },
        { id: 3, type: 'Parking', location: 'Park Ave', date: '2024-01-18', officer: 'Badge #5678', plate: 'MH08EF9012' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Verified Queue</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{verifiedReports.length}</Text>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {verifiedReports.map((report) => (
                        <View key={report.id} style={styles.reportCard}>
                            {/* Success Left Bar */}
                            <View style={styles.cardBar} />

                            {/* Thumbnail */}
                            <Image
                                source={require('../../../assets/images/traffic_violation.jpg')}
                                style={styles.thumbnail}
                                resizeMode="cover"
                            />

                            <View style={styles.cardContent}>
                                <View style={styles.cardTopRow}>
                                    <Text style={styles.reportType}>{report.type}</Text>
                                    <Ionicons name="checkmark-circle" size={16} color={C.success} />
                                </View>

                                <View style={styles.vehicleRow}>
                                    <Ionicons name="car-outline" size={12} color={C.navyMid} />
                                    <Text style={styles.vehicleText}>{report.plate}</Text>
                                </View>

                                <View style={styles.metaRow}>
                                    <Ionicons name="location-outline" size={12} color={C.textTertiary} />
                                    <Text style={styles.metaText}>{report.location}</Text>
                                </View>
                                
                                <View style={styles.bottomRow}>
                                    <View style={styles.metaRow}>
                                        <Ionicons name="calendar-outline" size={12} color={C.textTertiary} />
                                        <Text style={styles.metaText}>{report.date}</Text>
                                    </View>
                                    <View style={styles.officerBadge}>
                                        <Ionicons name="shield-checkmark" size={10} color={C.success} />
                                        <Text style={styles.officerText}>{report.officer}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>
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
    headerTitle: { fontSize: 20, fontWeight: '700', color: C.white },
    badge: { backgroundColor: C.successSurface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
    badgeText: { fontSize: 14, fontWeight: '800', color: C.success },

    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

    // Card
    reportCard: {
        flexDirection: 'row', backgroundColor: C.surface, borderRadius: 16, marginBottom: 12, overflow: 'hidden', alignItems: 'center',
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardBar: { width: 4, alignSelf: 'stretch', backgroundColor: C.success },
    thumbnail: { width: 72, height: 96 },
    cardContent: { flex: 1, padding: 12 },
    
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    reportType: { fontSize: 14, fontWeight: '700', color: C.textPrimary, flex: 1 },
    
    vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    vehicleText: { fontSize: 12, color: C.navyMid, fontWeight: '700', letterSpacing: 0.5 },
    
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
    metaText: { fontSize: 11, color: C.textSecondary },

    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    officerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.successSurface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    officerText: { fontSize: 10, fontWeight: '700', color: C.success },
});
