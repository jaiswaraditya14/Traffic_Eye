import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar,
} from 'react-native';
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
    border: '#C4C6D0',
    success: '#059669',
    successSurface: '#D1FAE5',
    warning: '#D97706',
    warningSurface: '#FEF3C7',
    error: '#BA1A1A',
    errorSurface: '#FFDAD6',
};

export default function ReportDetail({ navigation, route }) {
    const report = route.params?.report || {};
    const isOfficerMode = route.params?.isOfficerMode;

    const getStatusConfig = (status) => ({
        completed: { icon: 'checkmark-circle', color: C.success, bg: C.successSurface, label: 'Verified' },
        pending: { icon: 'time', color: C.warning, bg: C.warningSurface, label: 'Pending Review' },
        processing: { icon: 'sync', color: '#3B82F6', bg: '#EFF6FF', label: 'Processing' },
        failed: { icon: 'close-circle', color: C.error, bg: C.errorSurface, label: 'Rejected' },
    }[status] || { icon: 'information-circle', color: C.navyMid, bg: '#F2F4F6', label: 'Unknown' });

    const statusConfig = getStatusConfig(report.status || 'pending');

    // Dynamic data
    const violationType = report.ai_verdict || 'Unknown';
    const confidence = report.ai_confidence_score ? `${Math.round(report.ai_confidence_score * 100)}% Confidence` : 'AI Analyzed';
    const submittedAt = report.submitted_at 
        ? new Date(report.submitted_at).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
        : 'Just now';
    
    let locationStr = 'Unknown Location';
    if (report.ai_result?.location) locationStr = report.ai_result.location;
    if (report.location_lat && report.location_lng) {
        locationStr = `${report.location_lat.toFixed(4)}, ${report.location_lng.toFixed(4)}`;
    }

    const hasImage = report.images && report.images.length > 0 && report.images[0].public_url;
    const imageUrl = hasImage ? { uri: report.images[0].public_url } : require('../../../assets/images/traffic_violation.jpg');

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Navy Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Report Details</Text>
                    <TouchableOpacity style={styles.backButton}>
                        <Ionicons name="share-social-outline" size={20} color={C.white} />
                    </TouchableOpacity>
                </LinearGradient>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* ── Evidence Image ── */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={imageUrl}
                            style={styles.evidenceImage}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.85)']}
                            style={styles.imageOverlay}
                        >
                            <View style={styles.imageTag}>
                                <Ionicons name="camera" size={12} color={C.navy} />
                                <Text style={styles.imageTagText}>{confidence}</Text>
                            </View>
                            <Text style={styles.imageDate}>{submittedAt}</Text>
                        </LinearGradient>
                    </View>

                    {/* ── Status Row ── */}
                    <View style={styles.statusSection}>
                        <Text style={styles.statusLabel}>Current Status</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                            <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
                            <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                {statusConfig.label}
                            </Text>
                        </View>
                    </View>

                    {/* ── Details Card ── */}
                    <View style={styles.detailCard}>
                        <View style={styles.detailCardHeader}>
                            <Ionicons name="document-text-outline" size={18} color={C.navyMid} />
                            <Text style={styles.detailCardTitle}>Violation Record</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Violation Type</Text>
                            <Text style={styles.detailValue}>{violationType}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Location</Text>
                            <Text style={styles.detailValue}>{locationStr}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Vehicle Reg.</Text>
                            <Text style={styles.vehiclePlate}>{report.ai_result?.vehicle_number || report.ai_result?.vehicleNumber || 'N/A'}</Text>
                        </View>
                        {!isOfficerMode && (
                            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                                <Text style={styles.detailLabel}>Points Earned</Text>
                                <View style={styles.pointsBadge}>
                                    <Ionicons name="trophy" size={12} color={C.amberDark} />
                                    <Text style={styles.pointsValue}>{report.status === 'completed' ? '+50 pts' : 'Pending'}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                    
                    {report.ai_result && report.status === 'completed' && (
                        <View style={[styles.detailCard, { marginTop: 16 }]}>
                            <View style={styles.detailCardHeader}>
                                <Ionicons name="analytics" size={18} color={C.navyMid} />
                                <Text style={styles.detailCardTitle}>AI Confidence Analysis</Text>
                            </View>
                            <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: 'Nunito-Medium', lineHeight: 22 }}>
                                {typeof report.ai_result === 'string' ? report.ai_result : JSON.stringify(report.ai_result, null, 2)}
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.3,
    },

    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },

    // Image
    imageContainer: {
        width: '100%',
        height: 260,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    evidenceImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 40,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    imageTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: C.amber,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    imageTagText: {
        fontSize: 11,
        color: C.navy,
        fontFamily: 'Nunito-Bold',
        letterSpacing: 0.2,
    },
    imageDate: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        fontFamily: 'Nunito-Medium',
    },

    // Status
    statusSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    statusLabel: {
        fontSize: 15,
        fontFamily: 'Nunito-SemiBold',
        color: C.textPrimary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 13,
        fontFamily: 'Nunito-Bold',
    },

    // Details Card
    detailCard: {
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 20,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    detailCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F4F6',
    },
    detailCardTitle: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.navyMid,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F4F6',
    },
    detailLabel: {
        fontSize: 14,
        color: C.textSecondary,
        fontFamily: 'Nunito-Medium',
    },
    detailValue: {
        fontSize: 14,
        fontFamily: 'Nunito-SemiBold',
        color: C.textPrimary,
    },
    vehiclePlate: {
        fontSize: 13,
        fontFamily: 'Nunito-Bold',
        color: C.navyMid,
        letterSpacing: 0.5,
        backgroundColor: '#F2F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    pointsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    pointsValue: {
        fontSize: 13,
        fontFamily: 'Nunito-Bold',
        color: C.amberDark,
    },
});
