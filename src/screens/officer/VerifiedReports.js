import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services';

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
    const [verifiedReports, setVerifiedReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const hasLoadedRef = React.useRef(false);

    const loadReports = useCallback(async () => {
        if (!hasLoadedRef.current) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('image_reports')
                .select(`
                    id, violation_type, vehicle_number, location_address,
                    severity, reviewed_at, status, image_url, reward_amount,
                    officer_reviews ( officer_id, decision, remarks ),
                    submitter:user_id ( full_name )
                `)
                .eq('status', 'approved')
                .order('reviewed_at', { ascending: false });
            
            if (!error) {
                setVerifiedReports(data || []);
                hasLoadedRef.current = true;
            }
        } catch (e) {
            console.error('Error fetching verified reports:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadReports();
        }, [loadReports])
    );


    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
                    {loading ? (
                        <ActivityIndicator size="large" color={C.navyMid} style={{ marginTop: 60 }} />
                    ) : verifiedReports.length === 0 ? (
                        <View style={{alignItems: 'center', marginTop: 60}}>
                            <Ionicons name="document-text-outline" size={48} color={C.textTertiary} />
                            <Text style={{color: C.textSecondary, marginTop: 12, fontFamily: 'Nunito-Medium'}}>No verified reports history.</Text>
                        </View>
                    ) : (
                        verifiedReports.map((report) => {
                            const dateApproved = report.reviewed_at
                                ? new Date(report.reviewed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '—';
                            
                            return (
                                <TouchableOpacity
                                    key={report.id}
                                    style={styles.reportCard}
                                    onPress={() => navigation.navigate('VerifiedReportDetail', { reportId: report.id })}
                                    activeOpacity={0.82}
                                >
                                    {/* Success Left Bar */}
                                    <View style={styles.cardBar} />

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
                                            <Ionicons name="checkmark-circle" size={16} color={C.success} />
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
    badge: { backgroundColor: C.successSurface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
    badgeText: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.success },

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
    reportType: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textPrimary, flex: 1 },
    
    vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    vehicleText: { fontSize: 12, color: C.navyMid, fontFamily: 'Nunito-Bold', letterSpacing: 0.5 },
    
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
    metaText: { fontSize: 11, color: C.textSecondary },

    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    officerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.successSurface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    officerText: { fontSize: 10, fontFamily: 'Nunito-Bold', color: C.success },
    tapArrow: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.successSurface, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
});
