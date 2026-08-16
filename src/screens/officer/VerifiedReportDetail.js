/**
 * VerifiedReportDetail.js  (Officer Screen)
 *
 * Full-detail view of an approved report in the Verified Queue.
 * • All report fields, citizen info, location, evidence gallery
 * • Points awarded badge
 * • Officer notes / remarks
 * • PDF download (expo-print + expo-sharing) — generates a clean HTML/PDF and
 *   triggers the native share/save dialog.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, StatusBar, ActivityIndicator, Alert, Modal, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FocusAwareStatusBar } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import { fetchReportById } from '../../services/reports';

// ── Tokens ────────────────────────────────────────────────────────────────
const C = {
    navy:           '#0A1E3F',
    navyDeep:       '#00102B',
    navyMid:        '#0F2C59',
    amber:          '#F59E0B',
    amberDark:      '#D97706',
    amberSurface:   '#FEF3C7',
    white:          '#FFFFFF',
    offWhite:       '#F4F6F9',
    surface:        '#FFFFFF',
    surfaceLow:     '#F2F4F6',
    textPrimary:    '#0F172A',
    textSecondary:  '#475569',
    textTertiary:   '#64748B',
    border:         '#E2E8F0',
    success:        '#059669',
    successSurface: '#D1FAE5',
    error:          '#DC2626',
    errorSurface:   '#FEE2E2',
};

const SEVERITY_CFG = {
    critical: { color: '#2563EB', bg: '#DBEAFE', label: 'Critical' },
    high:     { color: '#EA580C', bg: '#FFEDD5', label: 'High'     },
    medium:   { color: '#D97706', bg: '#FEF3C7', label: 'Medium'   },
    low:      { color: '#059669', bg: '#D1FAE5', label: 'Low'      },
};

// ── Info row ──────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
    return (
        <View style={ir.row}>
            <Text style={ir.label}>{label}</Text>
            <Text style={ir.value}>{value || '—'}</Text>
        </View>
    );
}
const ir = StyleSheet.create({
    row:   { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F2F4F6', paddingVertical: 10 },
    label: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textSecondary, flex: 1 },
    value: { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, flex: 1, textAlign: 'right' },
});

// ── Main screen ───────────────────────────────────────────────────────────
export default function VerifiedReportDetail({ route, navigation }) {
    const { reportId, mockData } = route.params ?? {};

    const [report,         setReport]         = useState(null);
    const [loading,        setLoading]        = useState(true);
    const [pdfGenerating,  setPdfGenerating]  = useState(false);
    const [fullscreenImg,  setFullscreenImg]  = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadReport();
    }, [reportId, mockData]);

    const loadReport = async () => {
        setLoading(true);
        if (mockData) {
            setReport(mockData);
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
            setLoading(false);
            return;
        }

        const { data, error } = await fetchReportById(reportId);
        if (!error && data) {
            setReport(data);
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        } else {
            Alert.alert('Error', 'Could not load report details.');
            navigation.goBack();
        }
        setLoading(false);
    };

    // ── PDF Generation ────────────────────────────────────────────────────
    const handleDownloadPDF = async () => {
        if (!report) return;
        setPdfGenerating(true);
        try {
            const sevCfg = SEVERITY_CFG[report.severity] || SEVERITY_CFG.medium;
            const dateSubmitted = report.submitted_at
                ? new Date(report.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—';
            const dateApproved = report.reviewed_at
                ? new Date(report.reviewed_at).toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—';

            // Build evidence images HTML — fetch as base64 for embedding
            let evidenceHtml = '';
            const allMedia = report.media || [];
            const imageMedia = allMedia.filter(m => m.file_type === 'image');
            const fileLinks  = allMedia.filter(m => m.file_type !== 'image');

            // Include main image if no gallery image
            const mainImageUrls = report.image_url ? [report.image_url] : [];
            const allImageUrls  = [...new Set([...mainImageUrls, ...imageMedia.map(m => m.file_url)])];

            // Try to embed images as base64 (fallback: skip if it fails)
            for (const url of allImageUrls) {
                try {
                    const b64 = await FileSystem.readAsStringAsync(
                        // For remote URLs we write to cache then read
                        url.startsWith('file://') ? url : url,
                        { encoding: FileSystem.EncodingType.Base64 },
                    ).catch(() => null);
                    if (b64) {
                        const ext = url.split('.').pop()?.toLowerCase() || 'jpeg';
                        evidenceHtml += `<img src="data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${b64}" style="max-width:100%;border-radius:8px;margin-bottom:12px;" />`;
                    } else {
                        evidenceHtml += `<img src="${url}" style="max-width:100%;border-radius:8px;margin-bottom:12px;" />`;
                    }
                } catch {
                    evidenceHtml += `<img src="${url}" style="max-width:100%;border-radius:8px;margin-bottom:12px;" />`;
                }
            }

            // File links
            fileLinks.forEach(f => {
                evidenceHtml += `<p>📎 <a href="${f.file_url}">${f.file_name || f.file_url}</a></p>`;
            });

            // Officer remarks/notes
            const officerReview = Array.isArray(report.officer_review)
                ? report.officer_review[0]
                : report.officer_review;
            const officerName   = officerReview?.officer?.full_name || '—';
            const publicRemark  = officerReview?.remarks || '—';

            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 32px; color: #0F172A; background: #fff; }
    .header { background: linear-gradient(135deg, #0A1E3F, #0F2C59); color: #fff; border-radius: 12px; padding: 28px 32px; margin-bottom: 28px; }
    .header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 800; }
    .header p  { margin: 0; opacity: 0.7; font-size: 13px; }
    .badge-row { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
    .badge { padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-block; }
    .badge-approved { background: #D1FAE5; color: #059669; }
    .badge-sev { background: ${sevCfg.bg}; color: ${sevCfg.color}; }
    .section { background: #F4F6F9; border-radius: 10px; padding: 20px 24px; margin-bottom: 20px; }
    .section h2 { margin: 0 0 14px; font-size: 14px; font-weight: 700; color: #0F2C59; text-transform: uppercase; letter-spacing: 0.5px; }
    .row { display: flex; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding: 9px 0; }
    .row:last-child { border-bottom: none; }
    .lbl { font-size: 13px; color: #475569; }
    .val { font-size: 13px; font-weight: 600; color: #0F172A; text-align: right; }
    .reward-box { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
    .reward-pts { font-size: 26px; font-weight: 900; color: #D97706; }
    .evidence-section { margin-bottom: 20px; }
    .evidence-section h2 { font-size: 14px; font-weight: 700; color: #0F2C59; text-transform: uppercase; margin-bottom: 12px; }
    .footer { margin-top: 36px; text-align: center; font-size: 11px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Traffic Eye — Verified Report</h1>
    <p>Report ID: #${report.id?.slice(0, 8).toUpperCase()}</p>
    <div class="badge-row">
      <span class="badge badge-approved">✓ Approved</span>
      <span class="badge badge-sev">${sevCfg.label} Severity</span>
    </div>
  </div>

  <div class="section">
    <h2>Report Details</h2>
    <div class="row"><span class="lbl">Violation Type</span><span class="val">${report.violation_type || '—'}</span></div>
    <div class="row"><span class="lbl">Vehicle Number</span><span class="val">${report.vehicle_number || '—'}</span></div>
    <div class="row"><span class="lbl">Location</span><span class="val">${report.location_address || '—'}</span></div>
    ${report.latitude ? `<div class="row"><span class="lbl">Coordinates</span><span class="val">${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}</span></div>` : ''}
    <div class="row"><span class="lbl">Date Submitted</span><span class="val">${dateSubmitted}</span></div>
    <div class="row"><span class="lbl">Date Approved</span><span class="val">${dateApproved}</span></div>
    <div class="row"><span class="lbl">Report ID</span><span class="val">#${report.id?.slice(0, 8).toUpperCase()}</span></div>
  </div>

  <div class="reward-box">
    <span style="font-size:24px;">🏆</span>
    <div>
      <div style="font-size:13px;font-weight:600;color:#92400E;">Points Awarded to Citizen</div>
      <div class="reward-pts">+${report.reward_amount || 0} pts</div>
    </div>
  </div>



  <div class="section">
    <h2>Officer Review</h2>
    <div class="row"><span class="lbl">Reviewed By</span><span class="val">${officerName}</span></div>
    <div class="row"><span class="lbl">Remark to Citizen</span><span class="val">${publicRemark}</span></div>
  </div>

  ${evidenceHtml ? `
  <div class="evidence-section">
    <h2>Evidence</h2>
    ${evidenceHtml}
  </div>` : ''}

  <div class="footer">
    Generated by Traffic Eye Officer App · ${new Date().toLocaleString('en-IN')}<br/>
    This document is an official verified traffic violation report.
  </div>
</body>
</html>`;

            const { uri } = await Print.printToFileAsync({
                html,
                base64: false,
            });

            // Rename to friendly filename
            const destPath = `${FileSystem.cacheDirectory}TrafficEye_Report_${report.id?.slice(0, 8).toUpperCase()}.pdf`;
            await FileSystem.moveAsync({ from: uri, to: destPath });

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(destPath, {
                    mimeType:  'application/pdf',
                    dialogTitle: `TrafficEye_Report_${report.id?.slice(0, 8).toUpperCase()}.pdf`,
                    UTI: 'com.adobe.pdf',
                });
            } else {
                Alert.alert('Saved', `PDF saved to: ${destPath}`);
            }
        } catch (err) {
            console.error('PDF generation error:', err);
            Alert.alert('Failed', 'Could not generate PDF. Please try again.');
        } finally {
            setPdfGenerating(false);
        }
    };

    // ── Loading state ─────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={C.navyMid} />
                <Text style={{ marginTop: 12, fontFamily: 'Nunito-Medium', color: C.textSecondary }}>Loading report…</Text>
            </View>
        );
    }

    const sevCfg = SEVERITY_CFG[report?.severity] || SEVERITY_CFG.medium;
    const allMedia   = report?.media || [];
    let imageMedia = allMedia.filter(m => m.file_type === 'image');
    const videoMedia = allMedia.filter(m => m.file_type === 'video');
    // Only fall back to image_url for pre-media-table reports (no media records at all)
    if (imageMedia.length === 0 && videoMedia.length === 0 && report?.image_url) {
        imageMedia = [{ id: 'legacy-img', file_url: report.image_url, file_type: 'image' }];
    }
    const fileMedia = allMedia.filter(m => m.file_type !== 'image' && m.file_type !== 'video');

    const dateSubmitted = report?.submitted_at
        ? new Date(report.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';
    const dateApproved = report?.reviewed_at
        ? new Date(report.reviewed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    const officerReview = Array.isArray(report?.officer_review)
        ? report.officer_review[0]
        : report?.officer_review;
    const publicRemark  = officerReview?.remarks;
    const officerName   = officerReview?.officer?.full_name;

    return (
        <View style={s.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navyDeep} />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>

                {/* ── Header ── */}
                <LinearGradient colors={[C.navyDeep, C.navy, C.navyMid]} style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle}>Verified Report</Text>
                        <Text style={s.headerSub}>#{report?.id?.slice(0, 8).toUpperCase()}</Text>
                    </View>
                    {/* Download PDF button */}
                    <TouchableOpacity
                        style={s.downloadBtn}
                        onPress={handleDownloadPDF}
                        disabled={pdfGenerating}
                    >
                        {pdfGenerating ? (
                            <ActivityIndicator size="small" color={C.navy} />
                        ) : (
                            <Ionicons name="download-outline" size={20} color={C.navy} />
                        )}
                    </TouchableOpacity>
                </LinearGradient>

                <Animated.ScrollView
                    style={{ flex: 1, opacity: fadeAnim }}
                    contentContainerStyle={s.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Approved Status Banner ── */}
                    <View style={s.approvedBanner}>
                        <Ionicons name="checkmark-circle" size={22} color={C.success} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.approvedTitle}>Report Verified</Text>
                            <Text style={s.approvedSub}>Approved on {dateApproved}</Text>
                        </View>
                        <View style={[s.sevPill, { backgroundColor: sevCfg.bg }]}>
                            <Text style={[s.sevPillText, { color: sevCfg.color }]}>{sevCfg.label}</Text>
                        </View>
                    </View>



                    {/* ── Evidence Gallery ── */}
                    {(imageMedia.length > 0 || videoMedia.length > 0 || fileMedia.length > 0) && (
                        <View style={s.card}>
                            <View style={s.cardHeader}>
                                <Ionicons name="images" size={16} color={C.navyMid} />
                                <Text style={s.cardTitle}>Additional Evidence</Text>
                                <View style={s.countChip}>
                                    <Text style={s.countChipText}>{imageMedia.length + videoMedia.length + fileMedia.length} file{(imageMedia.length + videoMedia.length + fileMedia.length) > 1 ? 's' : ''}</Text>
                                </View>
                            </View>
                            
                            {/* Videos */}
                            {videoMedia.map(vid => (
                                <VideoItem key={vid.id} uri={vid.file_url} style={s.galleryImg} containerStyle={s.galleryImgFrame} />
                            ))}

                            {/* Images */}
                            {imageMedia.map(img => (
                                <TouchableOpacity key={img.id} onPress={() => setFullscreenImg(img.file_url)} activeOpacity={0.9}>
                                    <View style={s.galleryImgFrame}>
                                        <Image source={{ uri: img.file_url }} style={s.galleryImg} resizeMode="cover" />
                                        <View style={s.galleryExpand}>
                                            <Ionicons name="expand" size={18} color={C.white} />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            {fileMedia.map(f => (
                                <View key={f.id} style={s.fileRow}>
                                    <Ionicons name="attach" size={16} color={C.navyMid} />
                                    <Text style={s.fileText} numberOfLines={1}>{f.file_name || 'Attached file'}</Text>
                                    <View style={s.fileTypePill}>
                                        <Text style={s.fileTypeText}>{f.file_type?.toUpperCase() || 'FILE'}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* ── Points Awarded ── */}
                    <LinearGradient colors={['#FFFBEB', '#FEF3C7']} style={s.rewardCard}>
                        <Ionicons name="trophy" size={28} color={C.amberDark} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.rewardTitle}>Points Awarded</Text>
                            <Text style={s.rewardSub}>Credited to citizen for this report</Text>
                        </View>
                        <Text style={s.rewardPts}>+{report?.reward_amount || 0}</Text>
                    </LinearGradient>

                    {/* ── Report Details ── */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Report Details</Text>
                        <InfoRow label="Report ID"      value={`#${report?.id?.slice(0, 8).toUpperCase()}`} />
                        <InfoRow label="Violation Type"  value={report?.violation_type} />
                        <InfoRow label="Vehicle Number"  value={report?.vehicle_number} />
                        <InfoRow label="Date Submitted"  value={dateSubmitted} />
                        <InfoRow label="Date Approved"   value={dateApproved} />
                    </View>

                    {/* ── Location ── */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Location</Text>
                        <InfoRow label="Address"     value={report?.location_address} />
                        {report?.latitude && (
                            <InfoRow label="Coordinates" value={`${report.latitude?.toFixed(5)}, ${report.longitude?.toFixed(5)}`} />
                        )}
                    </View>



                    {/* ── Officer Notes ── */}
                    {(publicRemark || officerName) && (
                        <View style={s.card}>
                            <Text style={s.cardTitle}>Officer Review Notes</Text>
                            {officerName && <InfoRow label="Reviewed By" value={officerName} />}
                            {publicRemark && (
                                <View style={s.remarkBox}>
                                    <Ionicons name="chatbubble-outline" size={14} color={C.navyMid} />
                                    <Text style={s.remarkText}>{publicRemark}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* ── PDF Download CTA (bottom) ── */}
                    <TouchableOpacity
                        style={[s.downloadCta, pdfGenerating && { opacity: 0.6 }]}
                        onPress={handleDownloadPDF}
                        disabled={pdfGenerating}
                        activeOpacity={0.85}
                    >
                        <LinearGradient colors={[C.navyMid, C.navy]} style={s.downloadCtaGrad}>
                            {pdfGenerating ? (
                                <>
                                    <ActivityIndicator size="small" color={C.white} />
                                    <Text style={s.downloadCtaText}>Generating PDF…</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="document-text" size={20} color={C.white} />
                                    <Text style={s.downloadCtaText}>Download as PDF</Text>
                                    <Ionicons name="share-outline" size={18} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </Animated.ScrollView>

                {/* ── PDF Generating Overlay ── */}
                {pdfGenerating && (
                    <View style={s.genOverlay}>
                        <View style={s.genBox}>
                            <ActivityIndicator size="large" color={C.navyMid} />
                            <Text style={s.genText}>Generating PDF…</Text>
                            <Text style={s.genSub}>Embedding evidence and report data</Text>
                        </View>
                    </View>
                )}
            </SafeAreaView>

            {/* ── Fullscreen Image Modal ── */}
            <Modal visible={!!fullscreenImg} transparent animationType="fade" onRequestClose={() => setFullscreenImg(null)}>
                <View style={s.modalBg}>
                    <TouchableOpacity style={s.modalClose} onPress={() => setFullscreenImg(null)}>
                        <Ionicons name="close" size={28} color={C.white} />
                    </TouchableOpacity>
                    {fullscreenImg && (
                        <Image source={{ uri: fullscreenImg }} style={s.modalImg} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },

    // Header
    header:      { paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.white },
    headerSub:   { fontSize: 12, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.6)' },
    downloadBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: C.amber,
        justifyContent: 'center', alignItems: 'center',
    },

    scroll: { paddingHorizontal: 16, paddingTop: 16 },

    // Approved banner
    approvedBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: C.successSurface, borderRadius: 14,
        padding: 14, marginBottom: 16,
        borderWidth: 1, borderColor: 'rgba(5,150,105,0.15)',
    },
    approvedTitle: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.success },
    approvedSub:   { fontSize: 11, fontFamily: 'Nunito-Medium', color: '#065F46', marginTop: 2 },
    sevPill:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    sevPillText:   { fontSize: 11, fontFamily: 'Nunito-Bold' },


    // Cards
    card: {
        backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 14,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardTitle:   { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.navyMid, marginBottom: 8 },
    countChip:   { backgroundColor: C.surfaceLow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    countChipText: { fontSize: 11, fontFamily: 'Nunito-Bold', color: C.textSecondary },

    // Gallery
    galleryImgFrame: {
        width: '100%', height: 220, borderRadius: 12, overflow: 'hidden',
        marginBottom: 10, backgroundColor: C.surfaceLow, position: 'relative',
    },
    galleryImg: { width: '100%', height: '100%' },
    galleryExpand: {
        position: 'absolute', bottom: 10, right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 10,
    },

    // File rows
    fileRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: C.surfaceLow, borderRadius: 10, padding: 10, marginBottom: 6,
    },
    fileText: { flex: 1, fontSize: 12, fontFamily: 'Nunito-Medium', color: C.textPrimary },
    fileTypePill: { backgroundColor: C.navyMid, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    fileTypeText: { fontSize: 10, fontFamily: 'Nunito-Bold', color: C.white },

    // Reward card
    rewardCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        borderRadius: 16, padding: 18, marginBottom: 14,
        borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    },
    rewardTitle: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    rewardSub:   { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textTertiary, marginTop: 2 },
    rewardPts:   { fontSize: 28, fontFamily: 'Nunito-ExtraBold', color: C.amberDark },

    // Remark
    remarkBox: {
        flexDirection: 'row', gap: 8, alignItems: 'flex-start',
        backgroundColor: C.surfaceLow, borderRadius: 10, padding: 10, marginTop: 6,
    },
    remarkText: { flex: 1, fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textPrimary, lineHeight: 19 },

    // Download CTA
    downloadCta: { borderRadius: 16, overflow: 'hidden', marginTop: 8, marginBottom: 8, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
    downloadCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 20 },
    downloadCtaText: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.white },

    // Generating overlay
    genOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', zIndex: 99 },
    genBox: { backgroundColor: C.surface, borderRadius: 20, padding: 32, alignItems: 'center', gap: 10, minWidth: 220 },
    genText: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    genSub:  { fontSize: 12, fontFamily: 'Nunito-Medium', color: C.textTertiary, textAlign: 'center' },

    // Fullscreen modal
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    modalClose: {
        position: 'absolute', top: 60, right: 24, zIndex: 10,
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
    },
    modalImg: { width: '100%', height: '85%' },
});

// Helper component for playable video
function VideoItem({ uri, style, containerStyle }) {
    const player = useVideoPlayer(uri, p => { p.loop = false; });
    return (
        <View style={containerStyle}>
            <VideoView player={player} style={style} allowsFullscreen allowsPictureInPicture />
        </View>
    );
}
