/**
 * ImageReportReview.js  (Officer Screen)
 *
 * Shows the officer the full details of an image report:
 *  • Evidence photo + full media gallery (images + videos)
 *  • AI analysis block (violation type, description, severity, confidence)
 *  • Submitter information
 *  • Notes / remarks input
 *  • Approve / Reject footer — atomically updates DB and notifies citizen in real-time
 *  • On approval, severity-based reward is computed and displayed
 */
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Image, StatusBar, ActivityIndicator,
    Alert, Animated, Keyboard, Dimensions, Modal,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context';
import { fetchReportById, submitOfficerDecision } from '../../services/reports';
import { rewardService } from '../../services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Tokens ────────────────────────────────────────────────────────────────
const C = {
    navy:           '#002452',
    navyDeep:       '#00102B',
    navyMid:        '#1B3A6B',
    amber:          '#F59E0B',
    amberDark:      '#D97706',
    white:          '#FFFFFF',
    offWhite:       '#F8F9FB',
    surface:        '#FFFFFF',
    surfaceLow:     '#F2F4F6',
    textPrimary:    '#191C1E',
    textSecondary:  '#44474F',
    textTertiary:   '#747780',
    border:         '#E2E8F0',
    success:        '#059669',
    successSurface: '#D1FAE5',
    error:          '#DC2626',
    errorSurface:   '#FEE2E2',
};

const SEVERITY_CFG = {
    critical: { color: '#DC2626', bg: '#FEE2E2', label: 'Critical', icon: 'flame',           reward: 200 },
    high:     { color: '#EA580C', bg: '#FFEDD5', label: 'High',     icon: 'warning',          reward: 200 },
    medium:   { color: '#D97706', bg: '#FEF3C7', label: 'Medium',   icon: 'alert-circle',     reward: 100 },
    low:      { color: '#059669', bg: '#D1FAE5', label: 'Low',      icon: 'checkmark-circle', reward: 50  },
};

// ── Confidence bar ────────────────────────────────────────────────────────
function ConfBar({ score }) {
    const pct   = Math.round((score ?? 0) * 100);
    const color = pct >= 75 ? C.success : pct >= 50 ? C.amber : C.error;
    return (
        <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, fontFamily: 'Nunito-ExtraBold', color: C.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    AI Confidence
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Nunito-Bold', color }}>{pct}%</Text>
            </View>
            <View style={{ height: 8, backgroundColor: C.border, borderRadius: 99, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 99 }} />
            </View>
        </View>
    );
}

// ── Info row ─────────────────────────────────────────────────────────────
function InfoRow({ label, value, mono }) {
    return (
        <View style={ir.row}>
            <Text style={ir.label}>{label}</Text>
            <Text style={[ir.value, mono && ir.mono]}>{value || '—'}</Text>
        </View>
    );
}
const ir = StyleSheet.create({
    row:   { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F2F4F6', paddingVertical: 10 },
    label: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textSecondary, flex: 1 },
    value: { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, flex: 1, textAlign: 'right' },
    mono:  { fontFamily: 'Nunito-Bold', color: C.navy, letterSpacing: 0.5 },
});

// ── Main screen ───────────────────────────────────────────────────────────
export default function ImageReportReview({ route, navigation }) {
    const { reportId } = route.params ?? {};
    const { user }     = useAuth();
    const insets       = useSafeAreaInsets();

    const [report,   setReport]   = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [remarks,  setRemarks]  = useState('');
    const [internal, setInternal] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [alreadyReviewed, setAlreadyReviewed] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [decisionType, setDecisionType] = useState('approved');

    // Success animation
    const successScale = useRef(new Animated.Value(0)).current;
    const successOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadReport();
    }, [reportId]);

    const loadReport = async () => {
        setLoading(true);
        const { data, error } = await fetchReportById(reportId);
        if (!error && data) {
            setReport(data);
            if (data.status !== 'pending') setAlreadyReviewed(true);
        } else {
            Alert.alert('Error', 'Could not load report details.');
            navigation.goBack();
        }
        setLoading(false);
    };

    const handleDecision = async (decision) => {
        if (!user?.id) return Alert.alert('Error', 'You must be logged in.');
        if (!remarks.trim() && decision === 'rejected') {
            Alert.alert('Remarks Required', 'Please provide a reason for rejection.');
            return;
        }

        const sevCfg = SEVERITY_CFG[report?.severity] || SEVERITY_CFG.medium;
        const rewardInfo = decision === 'approved' ? `\n\n🏆 Reward: +${sevCfg.reward} pts (${sevCfg.label} severity)` : '';

        Alert.alert(
            decision === 'approved' ? 'Approve Report?' : 'Reject Report?',
            `This will ${decision === 'approved' ? 'approve' : 'reject'} the report and notify the citizen.${remarks ? `\n\nRemark: ${remarks}` : ''}${rewardInfo}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: decision === 'approved' ? '✅ Approve' : '❌ Reject',
                    style: decision === 'rejected' ? 'destructive' : 'default',
                    onPress: () => submitDecision(decision),
                },
            ]
        );
    };

    const submitDecision = async (decision) => {
        Keyboard.dismiss();
        setSubmitting(true);
        const { data, error } = await submitOfficerDecision(
            reportId,
            user.id,
            decision,
            remarks.trim() || null,
            internal.trim() || null,
        );

        if (error) {
            setSubmitting(false);
            Alert.alert('Submission Failed', error.message ?? 'An error occurred. Please try again.');
            return;
        }

        setDecisionType(decision);

        // Animate success
        Animated.parallel([
            Animated.spring(successScale,   { toValue: 1, useNativeDriver: true }),
            Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start(() => {
            setTimeout(() => navigation.goBack(), 1200);
        });
    };

    if (loading) {
        return (
            <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={C.navyMid} />
                <Text style={{ marginTop: 12, fontFamily: 'Nunito-Medium', color: C.textSecondary }}>Loading report…</Text>
            </View>
        );
    }

    const sevCfg = SEVERITY_CFG[report?.severity] || SEVERITY_CFG.medium;
    const allMedia = report?.media || [];
    let mediaImages = allMedia.filter(m => m.file_type === 'image');
    const mediaVideos = allMedia.filter(m => m.file_type === 'video');
    const isVideoReport = mediaVideos.length > 0;
    // Only fall back to image_url for pre-media-table reports (no media records at all)
    if (mediaImages.length === 0 && mediaVideos.length === 0 && report?.image_url) {
        mediaImages = [{ id: 'legacy-img', file_url: report.image_url, file_type: 'image' }];
    }
    const submitted = report?.submitted_at
        ? new Date(report.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>

                {/* Header */}
                <LinearGradient colors={[C.navyDeep, C.navy, C.navyMid]} style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle}>Review Report</Text>
                        <Text style={s.headerSub}>#{report?.id?.slice(0, 8).toUpperCase()}</Text>
                    </View>
                    <View style={[s.sevChip, { backgroundColor: sevCfg.bg }]}>
                        <Ionicons name={sevCfg.icon} size={13} color={sevCfg.color} />
                        <Text style={[s.sevChipText, { color: sevCfg.color }]}>{sevCfg.label}</Text>
                    </View>
                </LinearGradient>

                {/* Already reviewed banner */}
                {alreadyReviewed && (
                    <View style={[s.reviewedBanner, { backgroundColor: report.status === 'approved' ? C.successSurface : C.errorSurface, flexDirection: 'column' }]}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                            <Ionicons
                                name={report.status === 'approved' ? 'checkmark-circle' : 'close-circle'}
                                size={18}
                                color={report.status === 'approved' ? C.success : C.error}
                            />
                            <Text style={[s.reviewedText, { color: report.status === 'approved' ? C.success : C.error }]}>
                                This report is already {report.status}.
                            </Text>
                        </View>
                        {report.status === 'rejected' && report.officer_review?.[0]?.remarks && (
                            <Text style={{ marginTop: 8, fontSize: 13, fontFamily: 'Nunito-Medium', color: '#7F1D1D' }}>
                                Reason: {report.officer_review[0].remarks}
                            </Text>
                        )}
                    </View>
                )}

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={s.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >


                    {/* ── Media Gallery ── */}
                    {(mediaImages.length > 0 || mediaVideos.length > 0) && (
                        <View style={s.card}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <Ionicons name="images" size={16} color={C.navyMid} />
                                <Text style={s.cardTitle}>Evidence Gallery</Text>
                                <View style={{ backgroundColor: C.surfaceLow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 11, fontFamily: 'Nunito-Bold', color: C.textSecondary }}>{mediaImages.length + mediaVideos.length} file{(mediaImages.length + mediaVideos.length) > 1 ? 's' : ''}</Text>
                                </View>
                            </View>

                            {/* Large image previews */}
                            {mediaImages.map((img) => (
                                <TouchableOpacity key={img.id} onPress={() => setFullscreenImage(img.file_url)} activeOpacity={0.9}>
                                    <View style={s.galleryImgContainer}>
                                        <Image source={{ uri: img.file_url }} style={s.galleryImg} resizeMode="cover" />
                                        <View style={s.galleryImgOverlay}>
                                            <Ionicons name="expand" size={20} color={C.white} />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}

                            {/* Playable video players */}
                            {mediaVideos.map((vid) => (
                                <VideoItem key={vid.id} uri={vid.file_url} style={s.galleryVideo} containerStyle={s.galleryVideoContainer} />
                            ))}
                        </View>
                    )}

                    {/* ── AI Analysis Card ── */}
                    {!isVideoReport && (
                        <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={s.aiCard}>
                            <View style={s.aiCardHeader}>
                                <Ionicons name="sparkles" size={18} color={C.success} />
                                <Text style={s.aiCardTitle}>AI Analysis</Text>
                                <View style={{ backgroundColor: C.success, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                                    <Text style={{ fontSize: 10, fontFamily: 'Nunito-Bold', color: C.white }}>
                                        {Math.round((report?.ai_confidence ?? 0) * 100)}% Confidence
                                    </Text>
                                </View>
                            </View>

                            <View style={s.aiRow}>
                                <Text style={s.aiLabel}>Violation Type</Text>
                                <Text style={s.aiValue}>{report?.violation_type || '—'}</Text>
                            </View>

                            {report?.vehicle_number && (
                                <View style={s.aiRow}>
                                    <Text style={s.aiLabel}>Vehicle Plate</Text>
                                    <Text style={[s.aiValue, { fontFamily: 'Nunito-ExtraBold', letterSpacing: 1, fontSize: 14 }]}>
                                        {report.vehicle_number}
                                    </Text>
                                </View>
                            )}

                            <View style={{ marginTop: 4 }}>
                                <ConfBar score={report?.ai_confidence} />
                            </View>

                            {report?.violation_description && (
                                <View style={s.aiDescBox}>
                                    <Text style={s.aiDescText}>{report.violation_description}</Text>
                                </View>
                            )}
                        </LinearGradient>
                    )}

                    {/* ── Reward Preview ── */}
                    <View style={s.rewardPreview}>
                        <LinearGradient colors={['#FFFBEB', '#FEF3C7']} style={s.rewardPreviewGrad}>
                            <Ionicons name="trophy" size={24} color={C.amberDark} />
                            <View style={{ flex: 1 }}>
                                <Text style={s.rewardPreviewTitle}>Reward on Approval</Text>
                                <Text style={s.rewardPreviewSub}>Based on {sevCfg.label.toLowerCase()} severity level</Text>
                            </View>
                            <Text style={s.rewardPreviewPts}>+{sevCfg.reward} pts</Text>
                        </LinearGradient>
                    </View>

                    {/* ── Submission Details ── */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Submission Details</Text>
                        <InfoRow label="Reported At"  value={submitted} />
                        <InfoRow label="Location"     value={report?.location_address} />
                        {report?.latitude && (
                            <InfoRow label="Coordinates" value={`${report.latitude?.toFixed(5)}, ${report.longitude?.toFixed(5)}`} />
                        )}
                        <InfoRow label="Report ID"    value={`#${report?.id?.slice(0, 8).toUpperCase()}`} mono />
                    </View>

                    {/* ── Submitter Identity ── */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Citizen Info</Text>
                        <InfoRow label="Full Name"  value={report?.submitter?.full_name || '—'} />
                        <InfoRow label="Email"      value={report?.submitter?.email} />
                        <InfoRow label="Phone"      value={report?.submitter?.phone} />
                    </View>

                    {/* ── Officer Remarks ── */}
                    <Text style={s.inputLabel}>Public Remark (shown to citizen) *</Text>
                    <View style={s.inputBox}>
                        <TextInput
                            style={s.input}
                            placeholder="Enter a remark for the citizen…"
                            placeholderTextColor={C.textTertiary}
                            value={remarks}
                            onChangeText={setRemarks}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    <Text style={[s.inputLabel, { marginTop: 12 }]}>Internal Notes (officer-only)</Text>
                    <View style={s.inputBox}>
                        <TextInput
                            style={s.input}
                            placeholder="Private notes not visible to citizen…"
                            placeholderTextColor={C.textTertiary}
                            value={internal}
                            onChangeText={setInternal}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Footer action buttons - sits above system nav bar */}
                <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <TouchableOpacity
                        style={[s.actionBtn, s.rejectBtn, (submitting || alreadyReviewed) && { opacity: alreadyReviewed ? 0.4 : 0.6 }]}
                        onPress={() => handleDecision('rejected')}
                        disabled={submitting || alreadyReviewed}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="close-circle" size={20} color={C.error} />
                        <Text style={[s.actionBtnText, { color: C.error }]}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[s.actionBtn, s.approveBtn, (submitting || alreadyReviewed) && { opacity: alreadyReviewed ? 0.4 : 0.6 }]}
                        onPress={() => handleDecision('approved')}
                        disabled={submitting || alreadyReviewed}
                        activeOpacity={0.85}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={C.white} />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color={C.white} />
                                <Text style={[s.actionBtnText, { color: C.white }]}>Approve</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Success/Reject overlay */}
            <Animated.View
                pointerEvents="none"
                style={[s.successOverlay, { opacity: successOpacity, transform: [{ scale: successScale }] }]}
            >
                <LinearGradient 
                    colors={decisionType === 'approved' ? [C.success, '#047857'] : [C.error, '#991B1B']} 
                    style={s.successContent}
                >
                    <Ionicons 
                        name={decisionType === 'approved' ? "checkmark-circle" : "close-circle"} 
                        size={56} 
                        color={C.white} 
                    />
                    <Text style={s.successTitle}>
                        {decisionType === 'approved' ? 'Report Approved!' : 'Report Rejected'}
                    </Text>
                    <Text style={s.successSub}>Citizen has been notified in real-time.</Text>
                </LinearGradient>
            </Animated.View>

            {/* Fullscreen Image Modal */}
            <Modal visible={!!fullscreenImage} transparent={true} animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
                <View style={s.modalBg}>
                    <TouchableOpacity style={s.modalClose} onPress={() => setFullscreenImage(null)}>
                        <Ionicons name="close" size={28} color={C.white} />
                    </TouchableOpacity>
                    {fullscreenImage && (
                        <Image source={{ uri: fullscreenImage }} style={s.modalImg} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </View>
    );
}

function VideoItem({ uri, style, containerStyle }) {
    const player = useVideoPlayer(uri, p => { p.loop = false; });
    return (
        <View style={containerStyle}>
            <VideoView player={player} style={style} allowsFullscreen allowsPictureInPicture />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },

    header:    { paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },

    backBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.white },
    headerSub:   { fontSize: 12, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.6)' },
    sevChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
    sevChipText: { fontSize: 11, fontFamily: 'Nunito-Bold' },

    reviewedBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, margin: 12, borderRadius: 12, padding: 12 },
    reviewedText:   { flex: 1, fontSize: 12, fontFamily: 'Nunito-SemiBold', lineHeight: 17 },

    scroll: { paddingHorizontal: 16, paddingTop: 16 },

    imgCard:        { borderRadius: 20, overflow: 'hidden', marginBottom: 16, height: 220, backgroundColor: '#E2E8F0' },
    evidenceImg:    { width: '100%', height: '100%' },
    imgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    imgOverlay:     { position: 'absolute', top: 12, left: 12 },
    sevPill:        { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    sevPillText:    { fontSize: 10, fontFamily: 'Nunito-ExtraBold', color: C.white, letterSpacing: 0.6 },

    // Gallery
    galleryImgContainer: {
        width: '100%', height: 240, borderRadius: 14, overflow: 'hidden',
        marginBottom: 12, backgroundColor: C.surfaceLow,
    },
    galleryImg: { width: '100%', height: '100%' },
    galleryImgOverlay: {
        position: 'absolute', bottom: 10, right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 12,
    },
    galleryVideoContainer: {
        width: '100%', height: 260, borderRadius: 14, overflow: 'hidden',
        marginBottom: 12, backgroundColor: '#000',
    },
    galleryVideo: { width: '100%', height: '100%' },

    // AI Card
    aiCard:       { borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#BBF7D0' },
    aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    aiCardTitle:  { flex: 1, fontSize: 15, fontFamily: 'Nunito-Bold', color: '#166534' },
    aiRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    aiLabel:      { fontSize: 13, fontFamily: 'Nunito-Medium', color: '#166534' },
    aiValue:      { fontSize: 13, fontFamily: 'Nunito-Bold', color: '#166534' },
    aiDescBox:    { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: 10 },
    aiDescText:   { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, lineHeight: 19 },

    // Reward Preview
    rewardPreview: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
    rewardPreviewGrad: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    rewardPreviewTitle: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    rewardPreviewSub: { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textTertiary },
    rewardPreviewPts: { fontSize: 22, fontFamily: 'Nunito-ExtraBold', color: C.amberDark },

    card:      { backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: C.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardTitle: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.navyMid, marginBottom: 8 },

    inputLabel: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.navyMid, marginBottom: 6 },
    inputBox:   { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 12, marginBottom: 4 },
    input:      { fontSize: 14, fontFamily: 'Nunito-Regular', color: C.textPrimary, minHeight: 72 },

    footer:    { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
    actionBtnText: { fontSize: 15, fontFamily: 'Nunito-Bold' },
    rejectBtn:  { borderWidth: 1.5, borderColor: C.error, backgroundColor: C.errorSurface },
    approveBtn: { backgroundColor: C.success },

    successOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 99 },
    successContent: { borderRadius: 24, padding: 40, alignItems: 'center', gap: 12, minWidth: 260 },
    successTitle:   { fontSize: 22, fontFamily: 'Nunito-ExtraBold', color: C.white },
    successSub:     { fontSize: 14, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

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
