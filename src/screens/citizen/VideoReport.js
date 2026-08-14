import React, { useState, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, Alert, Animated, ActivityIndicator, StatusBar,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import { useImagePicker, useLocation } from '../../hooks';
import { supabase } from '../../services';
import * as FileSystem from 'expo-file-system/legacy';
const { EncodingType } = FileSystem;
import { decode } from 'base64-arraybuffer';
import { FocusAwareStatusBar } from '../../components';

// ── Design Tokens (matches existing app exactly) ──
const C = {
    navy: '#0A1E3F',
    navyMid: '#0F2C59',
    navyLight: '#1E3A8A',
    amber: '#D97706',
    amberDark: '#B45309',
    amberSurface: '#FEF3C7',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    surfaceLow: '#F8FAFC',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: '#CBD5E1',
    success: '#15803D',
    successSurface: '#DCFCE7',
    warning: '#B45309',
    warningSurface: '#FEF3C7',
    error: '#B91C1C',
    errorSurface: '#FEE2E2',
    primarySurface: '#EFF6FF',
    infoBg: '#EFF6FF',
    infoBorder: '#BFDBFE',
    infoText: '#1E3A8A',
};

const VIOLATION_TYPES = [
    { id: '1', label: 'Speeding', icon: 'speedometer' },
    { id: '2', label: 'Red Light', icon: 'stop-circle' },
    { id: '3', label: 'Wrong Parking', icon: 'car' },
    { id: '4', label: 'Lane Violation', icon: 'git-branch' },
    { id: '5', label: 'Signal Jump', icon: 'warning' },
    { id: '6', label: 'Other', icon: 'ellipsis-horizontal-circle' },
];

const TOTAL_STEPS = 3;

// ── Step Indicator ──
function StepIndicator({ currentStep }) {
    const labels = ['Upload', 'Details', 'Review'];
    return (
        <View style={styles.stepIndicator}>
            {[1, 2, 3].map((step, idx) => (
                <React.Fragment key={step}>
                    <View style={styles.stepItemCol}>
                        <View style={[
                            styles.stepDot,
                            currentStep > step && styles.stepDotDone,
                            currentStep === step && styles.stepDotActive,
                        ]}>
                            {currentStep > step
                                ? <Ionicons name="checkmark" size={12} color={C.navy} />
                                : <Text style={[styles.stepDotText, currentStep === step && styles.stepDotTextActive]}>{step}</Text>
                            }
                        </View>
                        <Text style={[
                            styles.stepLabel,
                            currentStep >= step && styles.stepLabelActive,
                        ]}>{labels[idx]}</Text>
                    </View>
                    {idx < 2 && (
                        <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />
                    )}
                </React.Fragment>
            ))}
        </View>
    );
}

// ── Step 1: Upload Video ──
function StepUpload({ video, onRecordVideo, onPickVideo, onRemoveVideo, loadingPicker }) {
    const filename = video ? video.split('/').pop() : null;

    return (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Upload Violation Video</Text>
            <Text style={styles.stepSubtitle}>Record live or pick an existing clip from your gallery</Text>

            {/* Upload Zone / Preview */}
            {!video ? (
                <View style={styles.uploadZone}>
                    <View style={styles.uploadDashBorder}>
                        <View style={styles.uploadIconCircle}>
                            <Ionicons name="videocam-off-outline" size={36} color={C.navyMid} />
                        </View>
                        <Text style={styles.uploadZoneTitle}>No video selected</Text>
                        <Text style={styles.uploadZoneSub}>Use the buttons below to upload</Text>
                    </View>
                </View>
            ) : (
                <View style={styles.videoPreviewCard}>
                    <View style={styles.videoThumb}>
                        <Ionicons name="videocam" size={32} color={C.white} />
                        <View style={styles.playBtn}>
                            <Ionicons name="play" size={14} color={C.navy} />
                        </View>
                    </View>
                    <View style={styles.videoInfo}>
                        <Text style={styles.videoFilename} numberOfLines={1}>{filename}</Text>
                        <Text style={styles.videoReady}>Video ready for upload</Text>
                    </View>
                    <TouchableOpacity onPress={onRemoveVideo} style={styles.removeBtn}>
                        <Ionicons name="close-circle" size={22} color={C.error} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Buttons */}
            <View style={styles.uploadBtnRow}>
                <TouchableOpacity style={styles.uploadBtnPrimary} onPress={onRecordVideo} activeOpacity={0.85} disabled={loadingPicker}>
                    <LinearGradient colors={[C.navy, C.navyMid]} style={styles.uploadBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        {loadingPicker
                            ? <ActivityIndicator size="small" color={C.white} />
                            : <Ionicons name="videocam" size={18} color={C.white} />
                        }
                        <Text style={styles.uploadBtnText}>Record Video</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadBtnOutline} onPress={onPickVideo} activeOpacity={0.85} disabled={loadingPicker}>
                    <Ionicons name="film-outline" size={18} color={C.navyMid} />
                    <Text style={styles.uploadBtnOutlineText}>Pick from Gallery</Text>
                </TouchableOpacity>
            </View>

            {/* Manual review notice */}
            <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={18} color={C.infoText} />
                <Text style={styles.infoBannerText}>
                    This is a <Text style={styles.infoBold}>manual report</Text>. Your video will be reviewed by a certified traffic officer — not AI.
                </Text>
            </View>
        </View>
    );
}

// ── Step 2: Add Details ──
function StepDetails({
    violationType, setViolationType,
    description, setDescription,
    address, setAddress,
    vehiclePlate, setVehiclePlate,
    onDetectLocation, onOpenMap,
    loadingLocation, video,
}) {
    const [focusedDesc, setFocusedDesc] = useState(false);
    const [focusedPlate, setFocusedPlate] = useState(false);
    const filename = video ? video.split('/').pop() : null;
    const descLen = description.length;

    return (
        <View style={styles.stepContent}>
            {/* Mini video thumbnail row */}
            <View style={styles.miniVideoRow}>
                <View style={styles.miniVideoThumb}>
                    <Ionicons name="videocam" size={16} color={C.white} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.miniVideoName} numberOfLines={1}>{filename || 'video_clip.mp4'}</Text>
                    <Text style={styles.miniVideoSub}>Video attached</Text>
                </View>
                <View style={styles.miniCheckBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={C.success} />
                </View>
            </View>

            {/* Violation Type */}
            <Text style={styles.fieldLabel}>Violation Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {VIOLATION_TYPES.map((type) => (
                    <TouchableOpacity
                        key={type.id}
                        style={[styles.chip, violationType === type.id && styles.chipActive]}
                        onPress={() => setViolationType(type.id)}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={type.icon}
                            size={13}
                            color={violationType === type.id ? C.white : C.textSecondary}
                        />
                        <Text style={[styles.chipText, violationType === type.id && styles.chipTextActive]}>
                            {type.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Description */}
            <Text style={styles.fieldLabel}>Description <Text style={styles.requiredStar}>*</Text></Text>
            <View style={[styles.descBox, focusedDesc && styles.descBoxFocused]}>
                <TextInput
                    style={styles.descInput}
                    placeholder="Describe what you witnessed — vehicle behavior, direction, approximate time..."
                    placeholderTextColor={C.textTertiary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    maxLength={500}
                    onFocus={() => setFocusedDesc(true)}
                    onBlur={() => setFocusedDesc(false)}
                    textAlignVertical="top"
                />
                <Text style={[styles.charCounter, descLen >= 450 && { color: C.error }]}>
                    {descLen}/500
                </Text>
            </View>

            {/* Vehicle Plate */}
            <Text style={styles.fieldLabel}>Vehicle Reg. / Plate No. (Optional)</Text>
            <View style={[styles.plateBox, focusedPlate && { borderColor: C.navyMid }]}>
                <Ionicons name="car-outline" size={18} color={focusedPlate ? C.navyMid : C.textTertiary} />
                <TextInput
                    style={styles.plateInput}
                    placeholder="e.g. MH 02 AB 1234"
                    value={vehiclePlate}
                    onChangeText={setVehiclePlate}
                    autoCapitalize="characters"
                    onFocus={() => setFocusedPlate(true)}
                    onBlur={() => setFocusedPlate(false)}
                    placeholderTextColor={C.textTertiary}
                />
            </View>

            {/* Location */}
            <Text style={styles.fieldLabel}>Incident Location</Text>
            <View style={styles.locationBtnRow}>
                <TouchableOpacity style={styles.locBtnOutline} onPress={onOpenMap} activeOpacity={0.85}>
                    <Ionicons name="map-outline" size={16} color={C.navyMid} />
                    <Text style={styles.locBtnOutlineText}>Pick on Map</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.locBtnAmber} onPress={onDetectLocation} activeOpacity={0.85} disabled={loadingLocation}>
                    {loadingLocation
                        ? <ActivityIndicator size="small" color={C.navy} />
                        : <Ionicons name="navigate" size={16} color={C.navy} />
                    }
                    <Text style={styles.locBtnAmberText}>Detect Location</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.addressBox}>
                <Ionicons name="location" size={14} color={C.textTertiary} style={{ marginTop: 1 }} />
                <TextInput
                    style={styles.addressInput}
                    placeholder="Address will appear here after detection..."
                    placeholderTextColor={C.textTertiary}
                    value={address}
                    onChangeText={setAddress}
                    multiline
                />
            </View>

            {/* Date & Time */}
            <Text style={styles.fieldLabel}>Date & Time of Incident</Text>
            <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={18} color={C.navyMid} />
                <Text style={styles.dateText}>{new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</Text>
                <View style={styles.dateEditBadge}>
                    <Ionicons name="pencil" size={12} color={C.textTertiary} />
                </View>
            </View>
        </View>
    );
}

// ── Step 3: Review & Submit ──
function StepReview({ video, violationType, description, address, vehiclePlate, onSubmit, submitting }) {
    const filename = video ? video.split('/').pop() : null;
    const violationLabel = VIOLATION_TYPES.find(v => v.id === violationType)?.label || 'Not selected';

    return (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review Your Report</Text>
            <Text style={styles.stepSubtitle}>Confirm everything is accurate before submitting</Text>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>Report Summary</Text>

                {/* Video preview */}
                <View style={styles.summaryVideoRow}>
                    <View style={styles.summaryVideoThumb}>
                        <Ionicons name="videocam" size={24} color={C.white} />
                        <View style={styles.summaryPlayBtn}>
                            <Ionicons name="play" size={10} color={C.navy} />
                        </View>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.summaryVideoName} numberOfLines={1}>{filename}</Text>
                        <Text style={styles.summaryVideoSub}>Tap to preview</Text>
                    </View>
                </View>

                <View style={styles.dividerLine} />

                {/* Info rows */}
                {[
                    { icon: 'flag', label: 'Violation Type', value: violationLabel, valColor: C.amber },
                    { icon: 'car-outline', label: 'Vehicle Plate', value: vehiclePlate || 'Not provided', valColor: C.textSecondary },
                    { icon: 'document-text', label: 'Description', value: description || 'Not provided', valColor: C.textSecondary },
                    { icon: 'location', label: 'Location', value: address || 'Not specified', valColor: C.textSecondary },
                    { icon: 'time', label: 'Date & Time', value: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), valColor: C.textSecondary },
                ].map((row, idx) => (
                    <View key={idx} style={styles.summaryRow}>
                        <View style={styles.summaryIconCircle}>
                            <Ionicons name={row.icon} size={14} color={C.navyMid} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.summaryRowLabel}>{row.label}</Text>
                            <Text style={[styles.summaryRowValue, { color: row.valColor }]} numberOfLines={2}>
                                {row.value}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimerBanner}>
                <Ionicons name="warning-outline" size={18} color={C.amberDark} />
                <Text style={styles.disclaimerText}>
                    Your report will be reviewed by a certified traffic officer. Submission of false evidence is punishable by law.
                </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={onSubmit}
                activeOpacity={0.88}
                disabled={submitting}
            >
                <LinearGradient colors={[C.amberDark, C.amber]} style={styles.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {submitting
                        ? <ActivityIndicator size="small" color={C.navy} />
                        : <Ionicons name="cloud-upload" size={20} color={C.navy} />
                    }
                    <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Report'}</Text>
                </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.draftBtn}>
                <Text style={styles.draftText}>Save as Draft</Text>
            </TouchableOpacity>
        </View>
    );
}

// ── Main Screen ──
export default function VideoReport({ navigation }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [violationType, setViolationType] = useState(null);
    const [description, setDescription] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isMapVisible, setIsMapVisible] = useState(false);
    const [selectedCoordinate, setSelectedCoordinate] = useState(null);
    const [mapRegion, setMapRegion] = useState({
        latitude: 19.076,
        longitude: 72.8777,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });
    const insets = useSafeAreaInsets();

    const { pickVideoFromGallery, captureVideoFromCamera, loading: loadingPicker } = useImagePicker();
    const { location, address, setAddress, loading: loadingLocation, detectLocation, setManualLocation } = useLocation();

    const [video, setVideo] = useState(null);

    const handleRecordVideo = useCallback(async () => {
        const result = await captureVideoFromCamera();
        if (result?.uri) setVideo(result.uri);
    }, [captureVideoFromCamera]);

    const handlePickVideo = useCallback(async () => {
        const result = await pickVideoFromGallery();
        if (result?.uri) setVideo(result.uri);
    }, [pickVideoFromGallery]);

    const handleRemoveVideo = () => {
        Alert.alert('Remove Video', 'Are you sure you want to remove this video?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => setVideo(null) },
        ]);
    };

    const handleDetectLocation = async () => {
        const result = await detectLocation();
        if (!result) Alert.alert('Error', 'Could not detect location. Please try again or pick on map.');
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (!video) { Alert.alert('Video Required', 'Please upload or record a video before proceeding.'); return; }
        }
        if (currentStep === 2) {
            if (!description.trim()) { Alert.alert('Description Required', 'Please provide a description of the violation.'); return; }
        }
        if (currentStep < TOTAL_STEPS) setCurrentStep(s => s + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(s => s - 1);
        else navigation.replace('NewReport');
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated.');

            let publicUrl = null;
            let storagePath = null;

            if (video) {
                const ext = video.split('.').pop()?.toLowerCase() || 'mp4';
                const fileName = `vid-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                storagePath = `${user.id}/${fileName}`;

                const base64 = await FileSystem.readAsStringAsync(video, {
                    encoding: EncodingType?.Base64 || 'base64',
                });

                const { error: uploadError } = await supabase.storage
                    .from('report-media')
                    .upload(storagePath, decode(base64), {
                        contentType: `video/${ext === 'mov' ? 'quicktime' : ext}`,
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl: url } } = supabase.storage
                    .from('report-media')
                    .getPublicUrl(storagePath);
                
                publicUrl = url;
            }

            // Insert into image_reports
            const violationLabel = VIOLATION_TYPES.find(v => v.id === violationType)?.label || 'Other';
            const { data: report, error: reportError } = await supabase.from('image_reports').insert({
                user_id: user.id,
                image_url: publicUrl || '',
                image_storage_path: storagePath,
                location_address: address,
                violation_type: violationLabel,
                violation_description: description,
                vehicle_number: vehiclePlate.trim().toUpperCase() || null,
                severity: 'medium', // Default for video reports before officer review
                ai_confidence: 0,
                status: 'pending',
            }).select().single();

            if (reportError) throw reportError;

            // Link evidence to report_media table
            if (report.id && publicUrl) {
                await supabase.from('report_media').insert({
                    report_id: report.id,
                    file_url: publicUrl,
                    file_type: 'video',
                    storage_path: storagePath,
                    file_name: storagePath?.split('/').pop(),
                    mime_type: 'video/mp4',
                });
            }

            // No points awarded at submission time.
            // Points are awarded on approval by the DB function submit_officer_review.

            navigation.navigate('VideoReportSuccess', {
                reportId: report.id,
                displayId: `VR-${report.id.slice(-6).toUpperCase()}`,
                violationType: violationLabel,
                location: address || 'Location not specified',
                submittedAt: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            });
        } catch (error) {
            console.error('Video submission error:', error);
            Alert.alert('Submission Failed', error.message || 'Could not submit your video report.');
        } finally {
            setSubmitting(false);
        }
    };

    const isNextEnabled = currentStep === 1 ? !!video : currentStep === 2 ? !!description.trim() : true;

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>

                {/* ── Navy Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Video Report</Text>
                    <View style={styles.stepChip}>
                        <Text style={styles.stepChipText}>Step {currentStep}/{TOTAL_STEPS}</Text>
                    </View>
                </LinearGradient>

                {/* ── Report Type Toggle ── */}
                <View style={styles.reportTypeBar}>
                    <View style={styles.reportTypeToggle}>
                        <TouchableOpacity
                            style={styles.reportTypeInactiveTab}
                            onPress={() => navigation.replace('NewReport')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="flash-outline" size={14} color={C.textTertiary} />
                            <Text style={styles.reportTypeInactiveText}>AI Analysis</Text>
                        </TouchableOpacity>
                        <View style={styles.reportTypeActiveTab}>
                            <Ionicons name="videocam" size={14} color={C.navy} />
                            <Text style={styles.reportTypeActiveText}>Video </Text>
                        </View>
                    </View>
                </View>

                {/* ── Step Indicator ── */}
                <View style={styles.stepIndicatorContainer}>
                    <StepIndicator currentStep={currentStep} />
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollInner}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {currentStep === 1 && (
                        <StepUpload
                            video={video}
                            onRecordVideo={handleRecordVideo}
                            onPickVideo={handlePickVideo}
                            onRemoveVideo={handleRemoveVideo}
                            loadingPicker={loadingPicker}
                        />
                    )}
                    {currentStep === 2 && (
                        <StepDetails
                            violationType={violationType}
                            setViolationType={setViolationType}
                            description={description}
                            setDescription={setDescription}
                            address={address}
                            setAddress={setAddress}
                            vehiclePlate={vehiclePlate}
                            setVehiclePlate={setVehiclePlate}
                            onDetectLocation={handleDetectLocation}
                            onOpenMap={() => setIsMapVisible(true)}
                            loadingLocation={loadingLocation}
                            video={video}
                        />
                    )}
                    {currentStep === 3 && (
                        <StepReview
                            video={video}
                            violationType={violationType}
                            description={description}
                            address={address}
                            vehiclePlate={vehiclePlate}
                            onSubmit={handleSubmit}
                            submitting={submitting}
                        />
                    )}
                </ScrollView>

                {/* ── Bottom CTA (Steps 1 & 2 only) ── */}
                {currentStep < 3 && (
                    <View style={styles.bottomBar}>
                        <TouchableOpacity
                            style={[styles.nextBtn, !isNextEnabled && styles.nextBtnDisabled]}
                            onPress={handleNext}
                            activeOpacity={0.88}
                            disabled={!isNextEnabled}
                        >
                            <LinearGradient
                                colors={isNextEnabled ? [C.amberDark, C.amber] : ['#D0D0D0', '#D8D8D8']}
                                style={styles.nextBtnGrad}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                <Text style={[styles.nextBtnText, !isNextEnabled && { color: C.textTertiary }]}>
                                    {currentStep === 1 ? 'Next: Add Details' : 'Next: Review'} →
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>

            {/* ── Map Modal ── */}
            <Modal visible={isMapVisible} animationType="slide">
                <View style={styles.mapContainer}>
                    <MapView
                        style={styles.map}
                        region={mapRegion}
                        onRegionChangeComplete={setMapRegion}
                        onPress={(e) => setSelectedCoordinate(e.nativeEvent.coordinate)}
                        showsUserLocation={true}
                    >
                        {selectedCoordinate && <Marker coordinate={selectedCoordinate} />}
                        {!selectedCoordinate && location && <Marker coordinate={location} pinColor="blue" />}
                    </MapView>
                    <View style={styles.mapHeader}>
                        <Text style={styles.mapTitle}>Pin Incident Location</Text>
                        <TouchableOpacity onPress={() => setIsMapVisible(false)}>
                            <Ionicons name="close" size={24} color={C.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.mapConfirm}
                        onPress={() => {
                            setIsMapVisible(false);
                            if (selectedCoordinate) setManualLocation(selectedCoordinate);
                            else if (location) setManualLocation(location);
                        }}
                    >
                        <Text style={styles.mapConfirmText}>Confirm Location</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 22,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.14)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.white },
    stepChip: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12, paddingVertical: 5,
        borderRadius: 20,
    },
    stepChipText: { fontSize: 12, fontFamily: 'Nunito-Bold', color: C.white },

    // Step Indicator
    stepIndicatorContainer: {
        backgroundColor: C.surface,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.04)',
    },
    stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    stepItemCol: { alignItems: 'center', gap: 4 },
    stepDot: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center', alignItems: 'center',
    },
    stepDotActive: { backgroundColor: C.amber },
    stepDotDone: { backgroundColor: C.amber },
    stepDotText: { fontSize: 12, fontFamily: 'Nunito-Bold', color: C.textTertiary },
    stepDotTextActive: { color: C.navy },
    stepLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 6, marginBottom: 14 },
    stepLineActive: { backgroundColor: C.amber },
    stepLabel: { fontSize: 10, fontFamily: 'Nunito-Medium', color: C.textTertiary },
    stepLabelActive: { color: C.navyMid, fontFamily: 'Nunito-Bold' },

    // Scroll
    scroll: { flex: 1 },
    scrollInner: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

    // Step content shared
    stepContent: { gap: 16 },
    stepTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.textPrimary, letterSpacing: -0.3 },
    stepSubtitle: { fontSize: 13, color: C.textTertiary, fontFamily: 'Nunito-Medium', marginTop: -8 },

    // ── Step 1 ──
    uploadZone: {
        height: 200, borderRadius: 24,
        backgroundColor: C.surfaceLow,
        overflow: 'hidden',
        justifyContent: 'center', alignItems: 'center',
        marginVertical: 4,
    },
    uploadDashBorder: {
        flex: 1, width: '100%',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderStyle: 'dashed',
        borderColor: 'rgba(27,58,107,0.22)',
        borderRadius: 22, margin: 1,
        gap: 10,
    },
    uploadIconCircle: {
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: C.primarySurface,
        justifyContent: 'center', alignItems: 'center',
    },
    uploadZoneTitle: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.textSecondary },
    uploadZoneSub: { fontSize: 12, color: C.textTertiary, fontFamily: 'Nunito-Medium' },

    videoPreviewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderRadius: 20,
        padding: 14,
        gap: 12,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    videoThumb: {
        width: 72, height: 56, borderRadius: 12,
        backgroundColor: C.navyMid,
        justifyContent: 'center', alignItems: 'center',
        position: 'relative',
    },
    playBtn: {
        position: 'absolute', bottom: 4, right: 4,
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: C.amber,
        justifyContent: 'center', alignItems: 'center',
    },
    videoInfo: { flex: 1 },
    videoFilename: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    videoReady: { fontSize: 11, color: C.success, fontFamily: 'Nunito-Medium', marginTop: 3 },
    removeBtn: { padding: 4 },

    uploadBtnRow: { flexDirection: 'row', gap: 12 },
    uploadBtnPrimary: { flex: 1, borderRadius: 16, overflow: 'hidden' },
    uploadBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    uploadBtnText: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.white },
    uploadBtnOutline: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: 16,
        borderWidth: 1.5, borderColor: C.border,
        backgroundColor: C.surface,
    },
    uploadBtnOutlineText: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.navyMid },

    infoBanner: {
        flexDirection: 'row',
        gap: 10,
        padding: 14,
        backgroundColor: C.infoBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.infoBorder,
        alignItems: 'flex-start',
    },
    infoBannerText: { flex: 1, fontSize: 12, color: C.infoText, fontFamily: 'Nunito-Medium', lineHeight: 18 },
    infoBold: { fontFamily: 'Nunito-Bold' },

    // ── Step 2 ──
    miniVideoRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.surface, borderRadius: 14, padding: 12,
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    miniVideoThumb: {
        width: 44, height: 34, borderRadius: 8,
        backgroundColor: C.navyMid,
        justifyContent: 'center', alignItems: 'center',
    },
    miniVideoName: { fontSize: 12, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    miniVideoSub: { fontSize: 10, color: C.success, fontFamily: 'Nunito-Medium', marginTop: 2 },
    miniCheckBadge: {},

    fieldLabel: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.navy, marginBottom: -4 },
    requiredStar: { color: C.error },

    chipRow: { gap: 8, paddingBottom: 2 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
        backgroundColor: C.surface,
    },
    chipActive: { backgroundColor: C.navyMid, borderColor: C.navyMid },
    chipText: { fontSize: 12, fontFamily: 'Nunito-Bold', color: C.textSecondary },
    chipTextActive: { color: C.white },

    descBox: {
        backgroundColor: C.surface, borderRadius: 16,
        borderWidth: 1.5, borderColor: C.border,
        padding: 14, minHeight: 110,
    },
    descBoxFocused: { borderColor: C.navyMid, backgroundColor: C.surface },
    descInput: {
        fontSize: 13, color: C.textPrimary,
        fontFamily: 'Nunito-Medium', minHeight: 80,
        textAlignVertical: 'top',
    },
    charCounter: { fontSize: 10, color: C.textTertiary, textAlign: 'right', marginTop: 6, fontFamily: 'Nunito-Medium' },

    plateBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: C.surface,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: C.border,
        marginBottom: 8,
    },
    plateInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        letterSpacing: 1.5,
    },

    locationBtnRow: { flexDirection: 'row', gap: 12 },
    locBtnOutline: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 12, borderRadius: 14,
        borderWidth: 1.5, borderColor: C.navyMid, backgroundColor: C.surface,
    },
    locBtnOutlineText: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.navyMid },
    locBtnAmber: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 12, borderRadius: 14,
        backgroundColor: C.amber,
    },
    locBtnAmberText: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.navy },

    addressBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: C.surfaceLow, borderRadius: 14, padding: 12,
        minHeight: 60,
    },
    addressInput: { flex: 1, fontSize: 13, color: C.textPrimary, fontFamily: 'Nunito-Medium', textAlignVertical: 'top' },

    dateRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: C.surface, borderRadius: 14, padding: 14,
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
    },
    dateText: { flex: 1, fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textPrimary },
    dateEditBadge: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: C.surfaceLow,
        justifyContent: 'center', alignItems: 'center',
    },

    // ── Step 3 ──
    summaryCard: {
        backgroundColor: C.surface, borderRadius: 24, padding: 20,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4,
        gap: 14,
    },
    summaryCardTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.textPrimary },

    summaryVideoRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.surfaceLow, borderRadius: 14, padding: 12,
    },
    summaryVideoThumb: {
        width: 80, height: 56, borderRadius: 10,
        backgroundColor: C.navyMid,
        justifyContent: 'center', alignItems: 'center',
        position: 'relative',
    },
    summaryPlayBtn: {
        position: 'absolute', bottom: 4, right: 4,
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: C.amber,
        justifyContent: 'center', alignItems: 'center',
    },
    summaryVideoName: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    summaryVideoSub: { fontSize: 11, color: C.amber, fontFamily: 'Nunito-Medium', marginTop: 3 },

    dividerLine: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)' },

    summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    summaryIconCircle: {
        width: 30, height: 30, borderRadius: 9,
        backgroundColor: C.primarySurface,
        justifyContent: 'center', alignItems: 'center',
        marginTop: 2,
    },
    summaryRowLabel: { fontSize: 10, fontFamily: 'Nunito-Bold', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    summaryRowValue: { fontSize: 13, fontFamily: 'Nunito-Medium', marginTop: 2, lineHeight: 18 },

    disclaimerBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        padding: 14, borderRadius: 16,
        backgroundColor: C.amberSurface, borderWidth: 1, borderColor: '#FDE68A',
    },
    disclaimerText: { flex: 1, fontSize: 12, color: C.textSecondary, fontFamily: 'Nunito-Medium', lineHeight: 18 },

    submitBtn: {
        borderRadius: 18, overflow: 'hidden',
        shadowColor: C.amberDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
    },
    submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
    submitText: { fontSize: 17, fontFamily: 'Nunito-ExtraBold', color: C.navy, letterSpacing: 0.3 },

    draftBtn: { alignItems: 'center', paddingVertical: 6 },
    draftText: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary },

    // Bottom CTA
    bottomBar: {
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: C.surface,
        borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)',
    },
    nextBtn: { borderRadius: 18, overflow: 'hidden' },
    nextBtnDisabled: { opacity: 0.5 },
    nextBtnGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    nextBtnText: { fontSize: 16, fontFamily: 'Nunito-ExtraBold', color: C.navy, letterSpacing: 0.3 },

    // Map
    mapContainer: { flex: 1, backgroundColor: C.offWhite },
    map: { flex: 1 },
    mapHeader: {
        position: 'absolute', top: 50, left: 20, right: 20,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: C.surface, padding: 16, borderRadius: 16, elevation: 4,
    },
    mapTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    mapConfirm: {
        position: 'absolute', bottom: 40, left: 20, right: 20,
        backgroundColor: C.navyMid, padding: 16, borderRadius: 14, alignItems: 'center', elevation: 4,
    },
    mapConfirmText: { color: C.white, fontSize: 16, fontFamily: 'Nunito-Bold' },

    // Report Type Toggle Bar
    reportTypeBar: {
        backgroundColor: C.surface,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.04)',
    },
    reportTypeToggle: {
        flexDirection: 'row',
        backgroundColor: C.surfaceLow,
        borderRadius: 14,
        padding: 4,
    },
    reportTypeActiveTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        backgroundColor: C.amber,
        borderRadius: 11,
        shadowColor: C.amberDark,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    reportTypeActiveText: {
        fontSize: 13,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
    },
    reportTypeInactiveTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        borderRadius: 11,
    },
    reportTypeInactiveText: {
        fontSize: 13,
        fontFamily: 'Nunito-Medium',
        color: C.textTertiary,
    },
});
