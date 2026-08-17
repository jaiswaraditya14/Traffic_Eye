import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, Alert, TextInput, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../../context/AppContext';
import { supabase } from '../../services';
import * as FileSystem from 'expo-file-system/legacy';
const { EncodingType } = FileSystem;
import { decode } from 'base64-arraybuffer';
import { FocusAwareStatusBar } from '../../components';


const C = {
    navy: '#0A1E3F',
    navyMid: '#0F2C59',
    amber: '#D97706',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    border: '#CBD5E1',
    error: '#B91C1C',
    success: '#15803D',
    successSurface: '#DCFCE7',
    warning: '#B45309',
};

export default function AIResultsVerification({ navigation, route }) {
    const { currentReport } = useAppContext();
    const { aiResults, authenticityResult: routeAuthResult, possibleDuplicate, duplicateExistingId } = route.params || {};

    const [vehicleNumber, setVehicleNumber] = useState(() => {
        const raw = aiResults?.vehicleNumber || currentReport?.vehiclePlate || '';
        // Don't pre-fill placeholder strings into the editable field
        return (raw === 'Not detected' || raw === 'Not applicable' || raw === 'N/A') ? '' : raw;
    });

    // Multi-select: start with all AI-detected violations pre-selected
    const [selectedViolations, setSelectedViolations] = useState(() => {
        const initial = aiResults?.allViolations?.length
            ? aiResults.allViolations
            : aiResults?.violationType ? [aiResults.violationType] : [];
        return initial;
    });
    const violationType = selectedViolations.join(', '); // joined for display/submit

    const toggleViolation = (v) => {
        setSelectedViolations(prev =>
            prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
        );
    };
    const [address, setAddress] = useState(currentReport?.address || '');
    const [confidence] = useState(aiResults?.confidence?.toString() || '0');
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const severity = aiResults?.severity || 'Unknown';
    const violationDetected = aiResults?.violationDetected !== false;
    const plateOCR = aiResults?.plateOCR || null;
    const allViolations = aiResults?.allViolations || [];
    const aiDescription = aiResults?.description || null;

    const handleSubmit = async () => {
        if (!vehicleNumber.trim()) {
            Alert.alert('Error', 'Please enter a vehicle number');
            return;
        }
        if (selectedViolations.length === 0) {
            Alert.alert('Error', 'Please select at least one violation type');
            return;
        }

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // 1. Upload image to Storage
            let publicUrl = null;
            let storagePath = null;

            if (currentReport?.image) {
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                storagePath = `${user.id}/${fileName}`;

                // Convert URI to Base64 and then to ArrayBuffer
                const base64 = await FileSystem.readAsStringAsync(currentReport.image, {
                    encoding: EncodingType?.Base64 || 'base64',
                });

                const { error: uploadError } = await supabase.storage
                    .from('report-media')
                    .upload(storagePath, decode(base64), {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl: url } } = supabase.storage
                    .from('report-media')
                    .getPublicUrl(storagePath);
                
                publicUrl = url;
            }

            let imgReportId = null;

            // Save to new image_reports table (officer queue + transparency layer)
            const severityLower = (aiResults?.severity || 'medium').toLowerCase();
            const normSeverity = ['low', 'medium', 'high', 'critical'].includes(severityLower) ? severityLower : 'medium';
            // location_source is persisted only when the optional DB column exists.
            // Run: ALTER TABLE image_reports ADD COLUMN IF NOT EXISTS location_source TEXT;
            const locationSourcePayload = currentReport?.locationSource
                ? { location_source: currentReport.locationSource }
                : {};

            const { data: imgReport, error: imgReportError } = await supabase.from('image_reports').insert({
                user_id:               user.id,
                image_url:             publicUrl || '',
                image_storage_path:    storagePath,
                latitude:              currentReport?.location?.latitude ?? null,
                longitude:             currentReport?.location?.longitude ?? null,
                location_address:      address || currentReport?.address || null,
                ...locationSourcePayload,
                violation_type:        violationType,
                violation_description: aiResults?.description || null,
                severity:              normSeverity,
                ai_confidence:         parseFloat(confidence) / 100,
                ai_raw_result:         aiResults,
                vehicle_number:        vehicleNumber,
                status:                'pending',
                authenticity_check:    routeAuthResult || currentReport?.authenticityResult || null,
                possible_duplicate:    possibleDuplicate || false,
                duplicate_report_id:   duplicateExistingId || null,
            }).select().single();


            if (imgReportError) throw imgReportError;
            imgReportId = imgReport.id;

            // Link evidence to report_media table (for gallery display)
            if (imgReportId && publicUrl) {
                await supabase.from('report_media').insert({
                    report_id:    imgReportId,
                    file_url:     publicUrl,
                    file_type:    'image',
                    storage_path: storagePath,
                    file_name:    storagePath?.split('/').pop(),
                    mime_type:    'image/jpeg',
                });
            }

            // No points awarded at submission time.
            // Points are awarded by the officer via submit_officer_review DB function upon approval.

            navigation.navigate('ReportSuccess', {
                verifiedData: {
                    vehicleNumber,
                    violationType,
                    severity,
                    confidence: `${confidence}%`,
                    ...currentReport,
                    address, // Use edited address
                    reportId: imgReportId
                }
            });
        } catch (error) {
            console.error('Error saving report:', error);
            Alert.alert('Submission Failed', error.message || 'Could not save report. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Review AI Results</Text>
                    <View style={{ width: 36 }} />
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Media Preview */}
                    <View style={styles.mediaContainer}>
                        {currentReport?.image ? (
                            <TouchableOpacity onPress={() => setImageModalVisible(true)} activeOpacity={0.9}>
                                <Image source={{ uri: currentReport.image }} style={styles.mediaPreview} resizeMode="cover" />
                                <View style={styles.zoomBtn}><Ionicons name="expand" size={16} color={C.navyMid} /></View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.placeholder}><Ionicons name="image" size={48} color={C.border} /></View>
                        )}
                    </View>

                    {/* Possible Duplicate Warning Banner */}
                    {possibleDuplicate && (
                        <View style={styles.duplicateBanner}>
                            <Ionicons name="warning" size={18} color="#B45309" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.duplicateBannerTitle}>⚠️ Possible Duplicate</Text>
                                <Text style={styles.duplicateBannerText}>
                                    This vehicle number plate has already been reported. The officer will review both reports independently. You may still submit.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* AI Insights Card */}
                    <View style={styles.aiCard}>
                        <View style={styles.aiHeader}>
                            <Ionicons name="sparkles" size={18} color={violationDetected ? C.success : C.warning} />
                            <Text style={[styles.aiTitle, { color: violationDetected ? C.success : C.warning }]}>AI Detection</Text>
                            <View style={[styles.confidenceBadge, !violationDetected && { backgroundColor: '#FEF3C7', borderColor: 'rgba(217,119,6,0.2)' }]}>
                                <Text style={[styles.confidenceText, !violationDetected && { color: C.warning }]}>{confidence}% Match</Text>
                            </View>
                        </View>

                        {/* Primary message */}
                        <View style={styles.aiAlertBox}>
                            {violationDetected ? (
                                <Text style={styles.aiAlertText}>
                                    A potential <Text style={{ fontFamily: 'Nunito-Bold' }}>{selectedViolations.length > 0 ? selectedViolations.join(' & ') : 'traffic violation'}</Text> has been detected. Verify and correct the details below before submitting.
                                </Text>
                            ) : (
                                <Text style={styles.aiAlertText}>
                                    No clear violation detected automatically. You may still file a report by filling the details below.
                                </Text>
                            )}
                        </View>

                        {/* AI reasoning */}
                        {!!aiDescription && aiDescription !== 'No traffic violation detected.' && (
                            <View style={styles.aiReasonBox}>
                                <Ionicons name="information-circle-outline" size={14} color={C.textSecondary} style={{ marginTop: 1 }} />
                                <Text style={styles.aiReasonText}>{aiDescription}</Text>
                            </View>
                        )}

                        {/* All violations detected */}
                        {allViolations.length > 0 && (
                            <View style={styles.allViolationsRow}>
                                <Text style={styles.violationTagLabel}>Tap to select/deselect:</Text>
                                {allViolations.map((v, i) => {
                                    const active = selectedViolations.includes(v);
                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={[
                                                styles.violationTag,
                                                active && styles.violationTagActive,
                                            ]}
                                            onPress={() => toggleViolation(v)}
                                        >
                                            {active && <Ionicons name="checkmark" size={12} color="#4F46E5" style={{ marginRight: 4 }} />}
                                            <Text style={[
                                                styles.violationTagText,
                                                active && styles.violationTagTextActive,
                                            ]}>{v}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Input Forms */}
                    <Text style={styles.sectionHeader}>Detected Details</Text>
                    
                    <View style={styles.inputBox}>
                        <Text style={styles.inputLabel}>Vehicle Registration Plate</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. MH12AB1234"
                            value={vehicleNumber}
                            onChangeText={setVehicleNumber}
                            autoCapitalize="characters"
                            placeholderTextColor={C.textTertiary}
                        />
                        {/* OCR uncertainty warning */}
                        {plateOCR?.uncertainCharacters?.length > 0 && (
                            <View style={styles.ocrWarningRow}>
                                <Ionicons name="alert-circle" size={14} color={C.warning} />
                                <Text style={styles.ocrWarningText}>
                                    Uncertain: {plateOCR.uncertainCharacters.join(' · ')}
                                </Text>
                            </View>
                        )}
                        {plateOCR?.confidence != null && (
                            <Text style={styles.ocrMetaText}>
                                OCR confidence: {plateOCR.confidence}%{plateOCR.notes ? ` — ${plateOCR.notes}` : ''}
                            </Text>
                        )}
                    </View>

                    <View style={styles.inputBox}>
                        <Text style={styles.inputLabel}>Violation Type(s)</Text>
                        <View style={styles.chipsRow}>
                            {['Triple Riding', 'No Helmet', 'Wrong Parking', 'Speeding', 'No Seat Belt', 'Rash Driving', 'Footpath Driving', 'Red Light', 'Wrong Way', 'Phone Use', 'Overloading', 'Lane Cutting'].map(type => {
                                const active = selectedViolations.includes(type);
                                return (
                                    <TouchableOpacity
                                        key={type}
                                        style={[styles.chip, active && styles.chipActive]}
                                        onPress={() => toggleViolation(type)}
                                    >
                                        {active && <Ionicons name="checkmark" size={13} color={C.white} style={{ marginRight: 4 }} />}
                                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{type}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {selectedViolations.length > 0 && (
                            <Text style={styles.selectedViolationsText}>Selected: {selectedViolations.join(', ')}</Text>
                        )}
                    </View>

                    <View style={styles.inputBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={styles.inputLabel}>Incident Location Address</Text>
                            {currentReport?.locationSource && (
                                <View style={[
                                    styles.locSourceBadge,
                                    (currentReport.locationSource === 'EXIF_ORIGINAL' || currentReport.locationSource === 'EXIF_PICKER_COPY' || currentReport.locationSource === 'IMAGE_EXIF') && styles.locSourceBadgeExif,
                                    (currentReport.locationSource === 'LIVE_DEVICE_LOCATION' || currentReport.locationSource === 'LIVE_LOCATION') && styles.locSourceBadgeLive,
                                ]}>
                                    <Ionicons
                                        name={(currentReport.locationSource === 'EXIF_ORIGINAL' || currentReport.locationSource === 'EXIF_PICKER_COPY' || currentReport.locationSource === 'IMAGE_EXIF') ? 'image' : (currentReport.locationSource === 'LIVE_DEVICE_LOCATION' || currentReport.locationSource === 'LIVE_LOCATION') ? 'navigate' : 'pin'}
                                        size={11}
                                        color={(currentReport.locationSource === 'EXIF_ORIGINAL' || currentReport.locationSource === 'EXIF_PICKER_COPY' || currentReport.locationSource === 'IMAGE_EXIF') ? '#15803D' : (currentReport.locationSource === 'LIVE_DEVICE_LOCATION' || currentReport.locationSource === 'LIVE_LOCATION') ? '#0F2C59' : '#64748B'}
                                    />
                                    <Text style={[
                                        styles.locSourceText,
                                        (currentReport.locationSource === 'EXIF_ORIGINAL' || currentReport.locationSource === 'EXIF_PICKER_COPY' || currentReport.locationSource === 'IMAGE_EXIF') && { color: '#15803D' },
                                        (currentReport.locationSource === 'LIVE_DEVICE_LOCATION' || currentReport.locationSource === 'LIVE_LOCATION') && { color: '#0F2C59' },
                                    ]}>
                                        {currentReport.locationSource === 'EXIF_ORIGINAL' ? 'Original Image GPS' : currentReport.locationSource === 'EXIF_PICKER_COPY' ? 'Image GPS' : (currentReport.locationSource === 'LIVE_DEVICE_LOCATION' || currentReport.locationSource === 'LIVE_LOCATION') ? 'Live Device GPS' : 'Manual'}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <TextInput
                            style={[styles.textInput, styles.addressInput]}
                            placeholder="Location details..."
                            value={address}
                            onChangeText={setAddress}
                            multiline
                            numberOfLines={4}
                            placeholderTextColor={C.textTertiary}
                        />
                        {currentReport?.location?.latitude != null && currentReport?.location?.longitude != null && (
                            <Text style={styles.coordMetaText}>
                                Coordinates: {currentReport.location.latitude.toFixed(6)}, {currentReport.location.longitude.toFixed(6)}
                            </Text>
                        )}
                    </View>

                </ScrollView>

                {/* Footer Action */}
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[styles.primaryBtn, submitting && { opacity: 0.7 }]} 
                        onPress={handleSubmit} 
                        disabled={submitting}
                        activeOpacity={0.88}
                    >
                        <View style={styles.primaryBtnInner}>
                            {submitting ? (
                                <ActivityIndicator color={C.white} size="small" />
                            ) : (
                                <>
                                    <Text style={styles.primaryBtnText}>Confirm & Submit</Text>
                                    <Ionicons name="checkmark-circle" size={18} color={C.white} />
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>

            </SafeAreaView>

            {/* Modal */}
            <Modal visible={imageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
                <View style={styles.modalBg}>
                    <TouchableOpacity style={styles.modalClose} onPress={() => setImageModalVisible(false)}>
                        <Ionicons name="close" size={28} color={C.white} />
                    </TouchableOpacity>
                    <ScrollView
                        maximumZoomScale={5}
                        minimumZoomScale={1}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
                        style={{ width: '100%', height: '100%' }}
                    >
                        <Image source={{ uri: currentReport?.image }} style={styles.modalImg} resizeMode="contain" />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, backgroundColor: C.navy },
    backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.white },

    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

    // Media
    mediaContainer: { 
        width: '100%', 
        height: 240, 
        borderRadius: 24, 
        overflow: 'hidden', 
        backgroundColor: C.surface, 
        marginBottom: 24, 
        shadowColor: '#0F2C59', 
        shadowOffset: { width: 0, height: 12 }, 
        shadowOpacity: 0.12, 
        shadowRadius: 20, 
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    mediaPreview: { width: '100%', height: '100%' },
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    zoomBtn: { 
        position: 'absolute', 
        bottom: 16, 
        right: 16, 
        backgroundColor: 'rgba(255,255,255,0.92)', 
        padding: 10, 
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },

    // AI Card
    aiCard: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: 24, 
        padding: 20, 
        marginBottom: 28, 
        borderWidth: 1, 
        borderColor: 'rgba(5,150,105,0.1)',
        shadowColor: C.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    aiTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', marginLeft: 8, flex: 1 },
    confidenceBadge: { 
        backgroundColor: C.successSurface, 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 100,
        borderWidth: 1,
        borderColor: 'rgba(5,150,105,0.2)',
    },
    confidenceText: { fontSize: 12, fontFamily: 'Nunito-ExtraBold', color: C.success, letterSpacing: 0.2 },
    aiAlertBox: { 
        marginTop: 4,
        paddingLeft: 4,
    },
    aiAlertText: { fontSize: 14, color: C.textSecondary, lineHeight: 22, fontFamily: 'Nunito-Medium' },

    // AI reasoning note
    aiReasonBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        marginTop: 10, paddingTop: 10,
        borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
        paddingLeft: 4,
    },
    aiReasonText: {
        flex: 1, fontSize: 12, fontFamily: 'Nunito-Medium',
        color: C.textSecondary, lineHeight: 18,
    },

    // All violations chips (multi-select)
    allViolationsRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 8,
        marginTop: 12, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
    },
    violationTagLabel: {
        width: '100%', fontSize: 11, fontFamily: 'Nunito-SemiBold',
        color: C.textSecondary, marginBottom: 2,
    },
    violationTag: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 100,
        backgroundColor: '#F3F4F6',
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    },
    violationTagActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#4F46E5',
    },
    violationTagText: {
        fontSize: 12, fontFamily: 'Nunito-Bold', color: C.textSecondary,
    },
    violationTagTextActive: {
        color: '#4F46E5',
    },


    sectionHeader: { 
        fontSize: 17, 
        fontFamily: 'Nunito-Bold', 
        color: C.navy, 
        marginBottom: 20, 
        letterSpacing: -0.2,
        marginLeft: 4,
    },

    inputBox: { marginBottom: 24 },
    inputLabel: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.navyMid, marginBottom: 10, marginLeft: 6 },
    textInput: { 
        backgroundColor: C.surface, 
        borderWidth: 1.5, 
        borderColor: '#E5E7EB', 
        borderRadius: 16, 
        paddingHorizontal: 18, 
        paddingVertical: 14, 
        fontSize: 16, 
        color: C.textPrimary, 
        fontFamily: 'Nunito-SemiBold',
        shadowColor: C.navyMid, 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.02, 
        shadowRadius: 6, 
    },
    addressInput: {
        minHeight: 120,
        textAlignVertical: 'top',
        paddingTop: 14,
    },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
    chip: { 
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F3F4F6', 
        borderWidth: 1, 
        borderColor: 'rgba(0,0,0,0.05)', 
        paddingHorizontal: 16, 
        paddingVertical: 10, 
        borderRadius: 14 
    },
    chipActive: {
        backgroundColor: C.navy,
        borderColor: C.navy,
    },
    chipText: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.navyMid },
    chipTextActive: { color: C.white },
    selectedViolationsText: { fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.success, marginTop: 10, marginLeft: 4 },

    footer: { 
        paddingHorizontal: 24, 
        paddingTop: 20,
        paddingBottom: 40, 
        backgroundColor: C.surface, 
        borderTopWidth: 1, 
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    primaryBtn: { 
        borderRadius: 18, 
        overflow: 'hidden', 
        shadowColor: C.navy, 
        shadowOffset: { width: 0, height: 8 }, 
        shadowOpacity: 0.25, 
        shadowRadius: 16, 
        elevation: 8 
    },
    primaryBtnInner: { flexDirection: 'row', paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: C.navy },
    primaryBtnText: { fontSize: 17, fontFamily: 'Nunito-ExtraBold', color: C.white, letterSpacing: 0.5 },

    // OCR metadata
    ocrWarningRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 6 },
    ocrWarningText: { fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.warning, flex: 1 },
    ocrMetaText: { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textSecondary, marginTop: 4, paddingHorizontal: 6 },

    // Location Source metadata badge
    locSourceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    locSourceBadgeExif: {
        backgroundColor: '#DCFCE7',
        borderColor: '#86EFAC',
    },
    locSourceBadgeLive: {
        backgroundColor: '#EFF6FF',
        borderColor: '#93C5FD',
    },
    locSourceText: {
        fontSize: 11,
        fontFamily: 'Nunito-Bold',
        color: '#64748B',
    },
    coordMetaText: {
        fontSize: 11,
        fontFamily: 'Nunito-Medium',
        color: C.textSecondary,
        marginTop: 6,
        marginLeft: 4,
    },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    modalClose: { position: 'absolute', top: 60, right: 24, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    modalImg: { width: '100%', height: '85%' },

    // Possible Duplicate Warning Banner
    duplicateBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: '#FEF3C7',
        borderWidth: 1.5,
        borderColor: '#D97706',
        borderRadius: 18,
        padding: 16,
        marginBottom: 20,
    },
    duplicateBannerTitle: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: '#92400E',
        marginBottom: 4,
    },
    duplicateBannerText: {
        fontSize: 13,
        fontFamily: 'Nunito-Medium',
        color: '#78350F',
        lineHeight: 19,
    },
});
