import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SPEED_LIMITS } from '../../data/trafficData';

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
    border: '#E5E7EB',
    primarySurface: '#D7E2FF',
    success: '#059669',
    successSurface: '#D1FAE5',
};

export default function SpeedLimits({ navigation }) {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Speed Limit Guide</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* ── Warning Notice ── */}
                    <View style={styles.speedHero}>
                        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.heroInner}>
                            <View style={styles.heroContent}>
                                <Text style={styles.heroTitle}>Drive Safely</Text>
                                <Text style={styles.heroSubtitle}>Adhere to speed limits to prevent accidents & avoid penalties.</Text>
                            </View>
                            <Ionicons name="speedometer" size={100} color="rgba(255,255,255,0.15)" style={styles.heroIcon} />
                        </LinearGradient>
                    </View>

                    <Text style={styles.sectionTitle}>Zone Specific Limits (India)</Text>

                    {SPEED_LIMITS.map((zone, idx) => (
                        <View key={idx} style={styles.zoneCard}>
                            <View style={[styles.zoneIcon, { backgroundColor: idx % 2 === 0 ? '#EEF2FF' : '#FFF7ED' }]}>
                                <Ionicons name={zone.icon} size={28} color={idx % 2 === 0 ? '#4F46E5' : C.amber} />
                            </View>

                            <View style={styles.zoneInfo}>
                                <Text style={styles.zoneName}>{zone.zone}</Text>
                                <Text style={styles.zoneDesc}>{zone.desc}</Text>
                            </View>

                            <View style={styles.limitBadge}>
                                <Text style={styles.limitValue}>{zone.limit.split(' ')[0]}</Text>
                                <Text style={styles.limitUnit}>km/h</Text>
                            </View>
                        </View>
                    ))}

                    {/* ── Rules Board ── */}
                    <View style={styles.ruleBoard}>
                        <View style={styles.boardHeader}>
                            <Ionicons name="information-circle" size={20} color={C.amber} />
                            <Text style={styles.boardTitle}>Important Notes</Text>
                        </View>
                        <Text style={styles.boardItem}>• Overspeeding attracts a fine of up to ₹2,000.</Text>
                        <Text style={styles.boardItem}>• Speed limits may change based on specific signboards.</Text>
                        <Text style={styles.boardItem}>• Reducing speed in rain/fog is a mandatory safety practice.</Text>
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
    
    speedHero: { marginBottom: 28, borderRadius: 24, overflow: 'hidden', elevation: 6, shadowColor: '#4F46E5', shadowOpacity: 0.15, shadowRadius: 20 },
    heroInner: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroContent: { flex: 1 },
    heroTitle: { fontSize: 22, fontFamily: 'Nunito-ExtraBold', color: C.white, marginBottom: 4 },
    heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Nunito-Medium', lineHeight: 20, maxWidth: '85%' },
    heroIcon: { position: 'absolute', right: -20, bottom: -20 },

    sectionTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.navy, marginBottom: 16 },

    zoneCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
        padding: 16, borderRadius: 20, marginBottom: 16,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },
    zoneIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    zoneInfo: { flex: 1, marginLeft: 16 },
    zoneName: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    zoneDesc: { fontSize: 12, color: C.textTertiary, fontFamily: 'Nunito-Medium', marginTop: 2 },
    
    limitBadge: {
        width: 72, height: 72, borderRadius: 36, backgroundColor: C.white,
        borderWidth: 4, borderColor: '#BA1A1A', 
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#BA1A1A', shadowOpacity: 0.1, shadowRadius: 10, elevation: 1,
    },
    limitValue: { fontSize: 20, fontFamily: 'Nunito-ExtraBold', color: '#191C1E' },
    limitUnit: { fontSize: 8, fontFamily: 'Nunito-ExtraBold', color: '#747780', marginTop: -2 },

    ruleBoard: { marginTop: 12, padding: 20, backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#F2F4F6' },
    boardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    boardTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.navy },
    boardItem: { fontSize: 13, color: C.textSecondary, fontFamily: 'Nunito-Medium', marginBottom: 6, lineHeight: 18 },
});
