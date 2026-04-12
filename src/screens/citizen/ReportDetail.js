/**
 * ReportDetail.js  –  Citizen report detail view with media gallery
 *
 * Shows all report fields, inline image/video previews,
 * officer review status, and reward earned.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
    StatusBar, ActivityIndicator, Dimensions, Modal,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchReportById } from '../../services/reports';
import { rewardService } from '../../services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const C = {
    navy: '#002452',
    navyDeep: '#00102B',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    amberDark: '#D97706',
    amberSurface: '#FEF3C7',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    surfaceLow: '#F2F4F6',
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

const SEVERITY_MAP = {
    low:      { color: '#059669', bg: '#D1FAE5', label: 'Low',      icon: 'shield-outline' },
    medium:   { color: '#D97706', bg: '#FEF3C7', label: 'Medium',   icon: 'warning-outline' },
    high:     { color: '#DC2626', bg: '#FEE2E2', label: 'High',     icon: 'alert-circle-outline' },
    critical: { color: '#DC2626', bg: '#FEE2E2', label: 'High',     icon: 'flame-outline' },
};

export default function ReportDetail({ navigation, route }) {
    const reportId = route.params?.reportId;
    const insets = useSafeAreaInsets();

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fullscreenImage, setFullscreenImage] = useState(null);

    useEffect(() => {
        loadReport();
    }, [reportId]);

    const loadReport = async () => {
        if (!reportId) return;
        setLoading(true);
        const { data, error } = await fetchReportById(reportId);
        if (!error && data) setReport(data);
        setLoading(false);
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={C.navyMid} />
                <Text style={{ marginTop: 12, fontFamily: 'Nunito-Medium', color: C.textSecondary }}>Loading report…</Text>
            </View>
        );
    }

    if (!report) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="alert-circle-outline" size={48} color={C.textTertiary} />
                <Text style={{ marginTop: 12, fontFamily: 'Nunito-SemiBold', color: C.textSecondary }}>Report not found</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: C.navyMid, borderRadius: 12 }}>
                    <Text style={{ color: C.white, fontFamily: 'Nunito-Bold' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const getStatusConfig = (status) => ({
        approved:  { icon: 'checkmark-circle', color: C.success, bg: C.successSurface, label: 'Approved' },
        pending:   { icon: 'time', color: C.warning, bg: C.warningSurface, label: 'Pending Review' },
        rejected:  { icon: 'close-circle', color: C.error, bg: C.errorSurface, label: 'Rejected' },
    }[status] || { icon: 'information-circle', color: C.navyMid, bg: '#F2F4F6', label: 'Unknown' });

    const statusConfig = getStatusConfig(report.status);
    const sevCfg = SEVERITY_MAP[report.severity] || SEVERITY_MAP.medium;
    const review = Array.isArray(report.officer_review) ? report.officer_review[0] : report.officer_review;
    const hasMainImage = !!report.image_url;
    const allMedia = report.media || [];
    // Include all media in gallery; main image shown above, report_media for extra evidence
    const images = allMedia.filter(m => m.file_type === 'image');
    const videos = allMedia.filter(m => m.file_type === 'video');
    // Extra gallery images are those whose URL differs from main image_url
    const galleryImages = images.filter(m => m.file_url !== report.image_url);
    const rewardAmount = report.status === 'approved'
        ? (report.reward_amount || rewardService.getPointsForViolation(report.violation_type))
        : 0;

    const submitted = report.submitted_at
        ? new Date(report.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Just now';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Navy Header ── */}
                <LinearGradient colors={[C.navyDeep, C.navy, C.navyMid]} style={[styles.header, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Report Details</Text>
                        <Text style={styles.headerSub}>#{report.id?.slice(0, 8).toUpperCase()}</Text>
                    </View>
                    <View style={[styles.sevChip, { backgroundColor: sevCfg.bg }]}>
                        <Ionicons name={sevCfg.icon} size={13} color={sevCfg.color} />
                        <Text style={[styles.sevChipText, { color: sevCfg.color }]}>{sevCfg.label}</Text>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                    {/* ── Main Evidence Image ── */}
                    {hasMainImage && (
                        <TouchableOpacity onPress={() => setFullscreenImage(report.image_url)} activeOpacity={0.9}>
                            <View style={styles.imageContainer}>
                                <Image source={{ uri: report.image_url }} style={styles.evidenceImage} resizeMode="cover" />
                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.imageOverlay}>
                                    <View style={styles.imageTag}>
                                        <Ionicons name="camera" size={12} color={C.navy} />
                                        <Text style={styles.imageTagText}>
                                            {report.ai_confidence ? `${Math.round(report.ai_confidence * 100)}% Confidence` : 'AI Analyzed'}
                                        </Text>
                                    </View>
                                    <Text style={styles.imageDate}>{submitted}</Text>
                                </LinearGradient>
                                <View style={styles.expandBtn}>
                                    <Ionicons name="expand" size={16} color={C.navyMid} />
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* ── Status + Reward Row ── */}
                    <View style={styles.statusSection}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statusLabel}>Current Status</Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                                <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
                                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                    {statusConfig.label}
                                </Text>
                            </View>
                        </View>
                        {rewardAmount > 0 && (
                            <View style={styles.rewardBox}>
                                <Ionicons name="trophy" size={20} color={C.amberDark} />
                                <View>
                                    <Text style={styles.rewardLabel}>REWARD EARNED</Text>
                                    <Text style={styles.rewardValue}>+{rewardAmount} pts</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ── Details Card ── */}
                    <View style={styles.detailCard}>
                        <View style={styles.detailCardHeader}>
                            <Ionicons name="document-text-outline" size={18} color={C.navyMid} />
                            <Text style={styles.detailCardTitle}>Violation Record</Text>
                        </View>
                        <DetailRow label="Violation Type" value={report.violation_type || 'Unknown'} />
                        <DetailRow label="Location" value={report.location_address || 'Unknown'} />
                        <DetailRow label="Vehicle Reg." value={report.vehicle_number} mono />
                        <DetailRow label="Severity" value={sevCfg.label} />
                        <DetailRow label="Reported At" value={submitted} />
                        {report.violation_description && (
                            <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start', borderBottomWidth: 0 }]}>
                                <Text style={styles.detailLabel}>AI Description</Text>
                                <Text style={[styles.detailValue, { marginTop: 4, lineHeight: 20 }]}>{report.violation_description}</Text>
                            </View>
                        )}
                    </View>

                    {/* ── Media Gallery (additional evidence beyond main photo) ── */}
                    {(galleryImages.length > 0 || videos.length > 0) && (
                        <View style={styles.detailCard}>
                            <View style={styles.detailCardHeader}>
                                <Ionicons name="images-outline" size={18} color={C.navyMid} />
                                <Text style={styles.detailCardTitle}>Evidence Media</Text>
                                <View style={styles.mediaBadge}>
                                    <Text style={styles.mediaBadgeText}>{galleryImages.length + videos.length + (hasMainImage ? 1 : 0)} file{(galleryImages.length + videos.length + (hasMainImage ? 1 : 0)) > 1 ? 's' : ''}</Text>
                                </View>
                            </View>

                            {/* Additional Images */}
                            {galleryImages.map((img) => (
                                <TouchableOpacity key={img.id} onPress={() => setFullscreenImage(img.file_url)} activeOpacity={0.9}>
                                    <View style={styles.mediaImageContainer}>
                                        <Image source={{ uri: img.file_url }} style={styles.mediaImage} resizeMode="cover" />
                                        <View style={styles.mediaImageOverlay}>
                                            <Ionicons name="expand" size={18} color={C.white} />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}

                            {/* Videos */}
                            {videos.map((vid) => (
                                <View key={vid.id} style={styles.videoContainer}>
                                    <Video
                                        source={{ uri: vid.file_url }}
                                        style={styles.videoPlayer}
                                        useNativeControls
                                        resizeMode={ResizeMode.CONTAIN}
                                        shouldPlay={false}
                                    />
                                </View>
                            ))}
                        </View>
                    )}

                    {/* ── Officer Review ── */}
                    {review && (
                        <View style={styles.detailCard}>
                            <View style={styles.detailCardHeader}>
                                <Ionicons name="person-circle-outline" size={18} color={statusConfig.color} />
                                <Text style={styles.detailCardTitle}>Officer Decision</Text>
                            </View>
                            <View style={[styles.decisionBanner, { backgroundColor: statusConfig.bg }]}>
                                <Ionicons name={statusConfig.icon} size={22} color={statusConfig.color} />
                                <Text style={[styles.decisionText, { color: statusConfig.color }]}>
                                    {review.decision === 'approved' ? 'Approved ✓' : 'Rejected ✗'}
                                </Text>
                            </View>
                            {review.remarks && (
                                <View style={styles.remarksBox}>
                                    <Ionicons name="chatbubble-outline" size={14} color={C.navyMid} />
                                    <Text style={styles.remarksText}>{review.remarks}</Text>
                                </View>
                            )}
                            <View style={styles.reviewMeta}>
                                {review.officer?.full_name && (
                                    <Text style={styles.reviewMetaText}>Officer: {review.officer.full_name}</Text>
                                )}
                                {review.review_timestamp && (
                                    <Text style={styles.reviewMetaText}>
                                        Reviewed: {new Date(review.review_timestamp).toLocaleString('en-IN', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                        })}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Pending Banner */}
                    {report.status === 'pending' && !review && (
                        <View style={styles.pendingBanner}>
                            <ActivityIndicator size="small" color={C.amber} />
                            <Text style={styles.pendingText}>Awaiting officer review…</Text>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>

            {/* Fullscreen Image Modal */}
            <Modal visible={!!fullscreenImage} transparent={true} animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
                <View style={styles.modalBg}>
                    <TouchableOpacity style={styles.modalClose} onPress={() => setFullscreenImage(null)}>
                        <Ionicons name="close" size={28} color={C.white} />
                    </TouchableOpacity>
                    {fullscreenImage && (
                        <Image source={{ uri: fullscreenImage }} style={styles.modalImg} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </View>
    );
}

function DetailRow({ label, value, mono }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={[styles.detailValue, mono && styles.monoValue]}>{value || '—'}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 16, gap: 12,
    },
    backButton: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.white },
    headerSub: { fontSize: 12, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.6)' },
    sevChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
    sevChipText: { fontSize: 11, fontFamily: 'Nunito-Bold' },

    content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

    // Image
    imageContainer: {
        width: '100%', height: 260, borderRadius: 20, overflow: 'hidden',
        marginBottom: 16, shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15,
        shadowRadius: 10, elevation: 6,
    },
    evidenceImage: { width: '100%', height: '100%' },
    imageOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingTop: 40, paddingBottom: 16, paddingHorizontal: 16,
    },
    imageTag: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: C.amber, paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 12, alignSelf: 'flex-start', marginBottom: 8,
    },
    imageTagText: { fontSize: 11, color: C.navy, fontFamily: 'Nunito-Bold', letterSpacing: 0.2 },
    imageDate: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontFamily: 'Nunito-Medium' },
    expandBtn: {
        position: 'absolute', top: 12, right: 12,
        backgroundColor: 'rgba(255,255,255,0.92)', padding: 8, borderRadius: 10,
    },

    // Status + Reward
    statusSection: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.surface, borderRadius: 16, padding: 16,
        marginBottom: 16, shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
        shadowRadius: 6, elevation: 2,
    },
    statusLabel: { fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.textTertiary, marginBottom: 6 },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start',
    },
    statusText: { fontSize: 13, fontFamily: 'Nunito-Bold' },
    rewardBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#FFFBEB', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    },
    rewardLabel: { fontSize: 9, fontFamily: 'Nunito-ExtraBold', color: C.textTertiary, letterSpacing: 1 },
    rewardValue: { fontSize: 20, fontFamily: 'Nunito-ExtraBold', color: C.amberDark, marginTop: -2 },

    // Details Card
    detailCard: {
        backgroundColor: C.surface, borderRadius: 16, padding: 20, marginBottom: 16,
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    detailCardHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F2F4F6',
    },
    detailCardTitle: { flex: 1, fontSize: 16, fontFamily: 'Nunito-Bold', color: C.navyMid },
    mediaBadge: { backgroundColor: C.surfaceLow, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    mediaBadgeText: { fontSize: 11, fontFamily: 'Nunito-Bold', color: C.textSecondary },
    detailRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F2F4F6',
    },
    detailLabel: { fontSize: 13, color: C.textSecondary, fontFamily: 'Nunito-Medium' },
    detailValue: { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, flex: 1, textAlign: 'right' },
    monoValue: {
        fontFamily: 'Nunito-Bold', color: C.navyMid, letterSpacing: 0.5,
        backgroundColor: '#F2F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    },

    // Media gallery
    mediaImageContainer: {
        width: '100%', height: 200, borderRadius: 14, overflow: 'hidden',
        marginBottom: 12, backgroundColor: C.surfaceLow,
    },
    mediaImage: { width: '100%', height: '100%' },
    mediaImageOverlay: {
        position: 'absolute', bottom: 10, right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 10,
    },
    videoContainer: {
        width: '100%', height: 220, borderRadius: 14, overflow: 'hidden',
        marginBottom: 12, backgroundColor: '#000',
    },
    videoPlayer: { width: '100%', height: '100%' },

    // Officer review
    decisionBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderRadius: 12, padding: 12, marginBottom: 12,
    },
    decisionText: { fontSize: 16, fontFamily: 'Nunito-Bold' },
    remarksBox: {
        flexDirection: 'row', gap: 8, backgroundColor: C.offWhite,
        borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border,
    },
    remarksText: { flex: 1, fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, lineHeight: 18 },
    reviewMeta: { gap: 2, marginTop: 4 },
    reviewMetaText: { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textTertiary },

    // Pending
    pendingBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14, marginBottom: 16,
    },
    pendingText: { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.amber },

    // Fullscreen Modal
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    modalClose: {
        position: 'absolute', top: 60, right: 24, zIndex: 10,
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },
    modalImg: { width: '100%', height: '85%' },
});
