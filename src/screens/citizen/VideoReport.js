import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, Alert, Animated, ActivityIndicator, StatusBar,
    Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MapLibreMap from '../../components/map/MapLibreMap';
import { useImagePicker, useLocation } from '../../hooks';
import { useAuth } from '../../context';
import { reportService } from '../../services';
import { COLORS } from '../../utils/theme';
import VideoRecorder from '../../components/media/VideoRecorder';
import VideoPreview from '../../components/media/VideoPreview';
import { validateNewReport } from '../../utils/productExperience';
import { useAppContext } from '../../context';
import { buildDemoReport } from '../../services/demoMode';
import { FocusAwareStatusBar, FeedbackToast, ConfirmationModal } from '../../components';

// ── Design Tokens (matches existing app exactly) ──

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
                                ? <Ionicons name="checkmark" size={12} color={COLORS.primaryDark} />
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
                            <Ionicons name="videocam-off-outline" size={36} color={COLORS.primary} />
                        </View>
                        <Text style={styles.uploadZoneTitle}>No video selected</Text>
                        <Text style={styles.uploadZoneSub}>Use the buttons below to upload</Text>
                    </View>
                </View>
            ) : (
                <View style={styles.videoPreviewCard}>
                    <View style={styles.videoThumb}>
                        <Ionicons name="videocam" size={32} color={COLORS.white} />
                        <View style={styles.playBtn}>
                            <Ionicons name="play" size={14} color={COLORS.primaryDark} />
                        </View>
                    </View>
                    <View style={styles.videoInfo}>
                        <Text style={styles.videoFilename} numberOfLines={1}>{filename}</Text>
                        <Text style={styles.videoReady}>Video ready for upload</Text>
                    </View>
                    <TouchableOpacity onPress={onRemoveVideo} style={styles.removeBtn}>
                        <Ionicons name="close-circle" size={22} color={COLORS.error} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Buttons */}
            <View style={styles.uploadBtnRow}>
                <TouchableOpacity style={styles.uploadBtnPrimary} onPress={onRecordVideo} activeOpacity={0.85} disabled={loadingPicker}>
                    <LinearGradient colors={[COLORS.primaryDark, COLORS.primary]} style={styles.uploadBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        {loadingPicker
                            ? <ActivityIndicator size="small" color={COLORS.white} />
                            : <Ionicons name="videocam" size={18} color={COLORS.white} />
                        }
                        <Text style={styles.uploadBtnText}>Record Video</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadBtnOutline} onPress={onPickVideo} activeOpacity={0.85} disabled={loadingPicker}>
                    <Ionicons name="film-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.uploadBtnOutlineText}>Pick from Gallery</Text>
                </TouchableOpacity>
            </View>

            {/* Manual review notice */}
            <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={18} color={COLORS.primaryLight} />
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
                    <Ionicons name="videocam" size={16} color={COLORS.white} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.miniVideoName} numberOfLines={1}>{filename || 'video_clip.mp4'}</Text>
                    <Text style={styles.miniVideoSub}>Video attached</Text>
                </View>
                <View style={styles.miniCheckBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
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
                            color={violationType === type.id ? COLORS.white : COLORS.textSecondary}
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
                    placeholderTextColor={COLORS.textTertiary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    maxLength={500}
                    onFocus={() => setFocusedDesc(true)}
                    onBlur={() => setFocusedDesc(false)}
                    textAlignVertical="top"
                />
                <Text style={[styles.charCounter, descLen >= 450 && { color: COLORS.error }]}>
                    {descLen}/500
                </Text>
            </View>

            {/* Vehicle Plate */}
            <Text style={styles.fieldLabel}>Vehicle Reg. / Plate No. (Optional)</Text>
            <View style={[styles.plateBox, focusedPlate && { borderColor: COLORS.primary }]}>
                <Ionicons name="car-outline" size={18} color={focusedPlate ? COLORS.primary : COLORS.textTertiary} />
                <TextInput
                    style={styles.plateInput}
                    placeholder="e.g. MH 02 AB 1234"
                    value={vehiclePlate}
                    onChangeText={setVehiclePlate}
                    autoCapitalize="characters"
                    onFocus={() => setFocusedPlate(true)}
                    onBlur={() => setFocusedPlate(false)}
                    placeholderTextColor={COLORS.textTertiary}
                />
            </View>

            {/* Location */}
            <Text style={styles.fieldLabel}>Incident Location</Text>
            <View style={styles.locationBtnRow}>
                <TouchableOpacity style={styles.locBtnOutline} onPress={onOpenMap} activeOpacity={0.85}>
                    <Ionicons name="map-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.locBtnOutlineText}>Pick on Map</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.locBtnAmber} onPress={onDetectLocation} activeOpacity={0.85} disabled={loadingLocation}>
                    {loadingLocation
                        ? <ActivityIndicator size="small" color={COLORS.primaryDark} />
                        : <Ionicons name="navigate" size={16} color={COLORS.primaryDark} />
                    }
                    <Text style={styles.locBtnAmberText}>Detect Location</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.addressBox}>
                <Ionicons name="location" size={14} color={COLORS.textTertiary} style={{ marginTop: 1 }} />
                <TextInput
                    style={styles.addressInput}
                    placeholder="Address will appear here after detection..."
                    placeholderTextColor={COLORS.textTertiary}
                    value={address}
                    onChangeText={setAddress}
                    multiline
                />
            </View>

            {/* Date & Time */}
            <Text style={styles.fieldLabel}>Date & Time of Incident</Text>
            <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                <Text style={styles.dateText}>{new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</Text>
                <View style={styles.dateEditBadge}>
                    <Ionicons name="pencil" size={12} color={COLORS.textTertiary} />
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
                        <Ionicons name="videocam" size={24} color={COLORS.white} />
                        <View style={styles.summaryPlayBtn}>
                            <Ionicons name="play" size={10} color={COLORS.primaryDark} />
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
                    { icon: 'flag', label: 'Violation Type', value: violationLabel, valColor: COLORS.secondary },
                    { icon: 'car-outline', label: 'Vehicle Plate', value: vehiclePlate || 'Not provided', valColor: COLORS.textSecondary },
                    { icon: 'document-text', label: 'Description', value: description || 'Not provided', valColor: COLORS.textSecondary },
                    { icon: 'location', label: 'Location', value: address || 'Not specified', valColor: COLORS.textSecondary },
                    { icon: 'time', label: 'Date & Time', value: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), valColor: COLORS.textSecondary },
                ].map((row, idx) => (
                    <View key={idx} style={styles.summaryRow}>
                        <View style={styles.summaryIconCircle}>
                            <Ionicons name={row.icon} size={14} color={COLORS.primary} />
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
                <Ionicons name="warning-outline" size={18} color={COLORS.secondaryDark} />
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
                <LinearGradient colors={[COLORS.secondaryDark, COLORS.secondary]} style={styles.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {submitting
                        ? <ActivityIndicator size="small" color={COLORS.primaryDark} />
                        : <Ionicons name="cloud-upload" size={20} color={COLORS.primaryDark} />
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
    const { demoMode, setCurrentReport } = useAppContext();
    const [recorderVisible, setRecorderVisible] = useState(false);
    const [videoAsset, setVideoAsset] = useState(null);
    const [toast, setToast] = useState(null);
    const [removeConfirmation, setRemoveConfirmation] = useState(false);
    const [uploadPhase, setUploadPhase] = useState('validating');
    const abortRef = useRef(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [violationType, setViolationType] = useState(null);
    const [description, setDescription] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isMapVisible, setIsMapVisible] = useState(false);
    const [selectedCoordinate, setSelectedCoordinate] = useState(null);
    const [mapRegion] = useState({  // kept for initialCoordinate fallback below
        latitude: 19.076,
        longitude: 72.8777,
    });
    const insets = useSafeAreaInsets();

    const { user } = useAuth();
    const { pickVideoFromGallery, captureVideoFromCamera, loading: loadingPicker } = useImagePicker();
    const { location, address, setAddress, locationSource, loading: loadingLocation, detectLocation, setManualLocation } = useLocation();

    const [video, setVideo] = useState(null);
    // Double-tap guard — flips synchronously so a second tap can't launch a
    // second upload/insert before the disabled state renders.
    const submittingRef = useRef(false);
    const submissionRef = useRef(null);
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; abortRef.current?.abort(); };
    }, []);

    const canReplaceEvidence = () => {
        if (submittingRef.current || submissionRef.current?.uncertain || submissionRef.current?.uploadStarted) {
            setToast('Retry the existing submission before replacing this evidence. Its upload or save may already have completed.');
            return false;
        }
        return true;
    };
    const handleRecordVideo = () => { if (canReplaceEvidence()) setRecorderVisible(true); };
    const handlePickVideo = async () => {
        if (!canReplaceEvidence()) return;
        const result = await pickVideoFromGallery();
        if (!mountedRef.current || !result?.uri) return;
        if (!Number.isFinite(result.duration) || result.duration <= 0 || result.duration > 15000) { setToast('Choose a video up to 15 seconds long. If duration cannot be verified, record a new clip.'); return; }
        setVideoAsset(result); setVideo(result.uri); submissionRef.current = null;
    };
    const handleRemoveVideo = () => { if (canReplaceEvidence()) setRemoveConfirmation(true); };

    const handleDetectLocation = async () => {
        const result = await detectLocation();
        if (!result) Alert.alert('Error', 'Could not detect location. Please try again or pick on map.');
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (!video) { Alert.alert('Video Required', 'Please upload or record a video before proceeding.'); return; }
        }
        if (currentStep === 2) {
            if (Object.keys(validateNewReport({ image: video, location, address })).length) { setToast('Provide a video, address and incident map location.'); return; }
            if (!description.trim()) { Alert.alert('Description Required', 'Please provide a description of the violation.'); return; }
        }
        if (currentStep < TOTAL_STEPS) setCurrentStep(s => s + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(s => s - 1);
        else navigation.replace('NewReport');
    };

    const handleSubmit = async () => {
        // Ignore repeat taps while a submission is already in flight.
        if (submittingRef.current) return;
        submittingRef.current = true;
        abortRef.current = new AbortController();
        setUploadPhase('validating');
        setSubmitting(true);
        try {
            if (demoMode) {
                setCurrentReport(buildDemoReport());
                navigation.replace('ReportSuccess', { demo: true });
                return;
            }
            const violationLabel = VIOLATION_TYPES.find(v => v.id === violationType)?.label || 'Other';
            const locationSourcePayload = locationSource ? { location_source: locationSource } : {};

            // Payload WITHOUT user_id/image_url/image_storage_path — the service
            // owns upload + storage-path assignment for every reporting screen.
            const report = {
                latitude:              location?.latitude ?? null,
                longitude:             location?.longitude ?? null,
                location_address:      address || null,
                ...locationSourcePayload,
                violation_type:        violationLabel,
                violation_description: description,
                vehicle_number:        vehiclePlate.trim().toUpperCase() || null,
                severity:              'medium', // Default for video reports before officer review
                ai_confidence:         0,
                status:                'pending',
                ai_raw_result: { requiresManualReview: true, source: 'manual_video' },
            };

            const cleanVideoUri = video || '';
            const media = cleanVideoUri
                ? { uri: cleanVideoUri, fileType: 'video', mimeType: videoAsset?.mimeType, fileSize: videoAsset?.fileSize }
                : null;

            const { data: created, error } = await reportService.submitReportWithMedia({
                userId: user?.id,
                signal: abortRef.current.signal,
                onPhase: phase => { if (mountedRef.current) setUploadPhase(phase); },
                submission: submissionRef.current || (submissionRef.current = reportService.createReportSubmission()),
                report,
                media,
            });

            if (error || !created) throw error || new Error('Could not submit your video report.');

            if (!mountedRef.current) return;
            navigation.replace('VideoReportSuccess', {
                reportId: created.id,
                displayId: `VR-${created.id.slice(-6).toUpperCase()}`,
                violationType: violationLabel,
                location: address || 'Location not specified',
                submittedAt: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            });
        } catch (error) {
            // Dev-only diagnostics; user sees a generic, safe message.
            if (__DEV__) console.warn('[reports] Submission did not complete.');
            if (mountedRef.current) setToast(error?.userMessage || 'Could not save your report. Please check your connection and try again.');
        } finally {
            submittingRef.current = false;
            if (mountedRef.current) setSubmitting(false);
        }
    };

    const isNextEnabled = currentStep === 1 ? !!video : currentStep === 2 ? !!description.trim() && Object.keys(validateNewReport({ image: video, location, address })).length === 0 : true;

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={COLORS.primaryDark} />
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>

                {/* ── Navy Header ── */}
                <LinearGradient colors={[COLORS.primaryDark, COLORS.primary]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={20} color={COLORS.white} />
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
                            <Ionicons name="flash-outline" size={14} color={COLORS.textTertiary} />
                            <Text style={styles.reportTypeInactiveText}>AI Analysis</Text>
                        </TouchableOpacity>
                        <View style={styles.reportTypeActiveTab}>
                            <Ionicons name="videocam" size={14} color={COLORS.primaryDark} />
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
                    keyboardDismissMode="on-drag"
                >
                    {!!video && <VideoPreview key={video} uri={video} />}
                    {demoMode && <Text style={{ color: COLORS.warning }}>Demo mode: any submission will be a preview, not saved.</Text>}
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
                                colors={isNextEnabled ? [COLORS.secondaryDark, COLORS.secondary] : ['#D0D0D0', '#D8D8D8']}
                                style={styles.nextBtnGrad}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                <Text style={[styles.nextBtnText, !isNextEnabled && { color: COLORS.textTertiary }]}>
                                    {currentStep === 1 ? 'Next: Add Details' : 'Next: Review'} →
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
            {recorderVisible && <VideoRecorder onCancel={() => setRecorderVisible(false)} onCaptured={asset => { setVideoAsset(asset); setVideo(asset.uri); submissionRef.current = null; setRecorderVisible(false); }} />}
            <ConfirmationModal visible={removeConfirmation} title="Retake video?" message="Remove this selected clip and record new evidence?" confirmLabel="Retake" tone="danger" onCancel={() => setRemoveConfirmation(false)} onConfirm={() => { setRemoveConfirmation(false); setVideo(null); setVideoAsset(null); submissionRef.current = null; setCurrentStep(1); setRecorderVisible(true); }} />
            {submitting && <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.overlayStrong, alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
                <ActivityIndicator size="large" color={COLORS.white} />
                <Text style={{ color: COLORS.white, marginVertical: 16 }}>{uploadPhase === 'saving' ? 'Saving report — confirming outcome…' : uploadPhase === 'uploading' ? 'Uploading evidence…' : uploadPhase === 'cancelling' ? 'Cancelling — waiting for upload cleanup…' : 'Checking report…'}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel submission" disabled={uploadPhase === 'saving' || uploadPhase === 'cancelling'} onPress={() => { abortRef.current?.abort(); setUploadPhase('cancelling'); }} style={{ padding: 16 }}><Text style={{ color: COLORS.white }}>{uploadPhase === 'saving' ? 'Please wait for save confirmation' : 'Cancel submission'}</Text></TouchableOpacity>
            </View>}
            <FeedbackToast visible={!!toast} message={toast || ''} variant="warning" onDismiss={() => setToast(null)} />

            {/* ── Map Location Picker Modal (MapLibre / OpenFreeMap) ── */}
            <Modal visible={isMapVisible} animationType="slide" onRequestClose={() => setIsMapVisible(false)}>
                <MapLibreMap
                    initialCoordinate={{
                        latitude: selectedCoordinate?.latitude || location?.latitude || mapRegion.latitude,
                        longitude: selectedCoordinate?.longitude || location?.longitude || mapRegion.longitude,
                    }}
                    selectedCoordinate={selectedCoordinate || undefined}
                    onLocationSelect={({ latitude, longitude }) =>
                        setSelectedCoordinate({ latitude, longitude })
                    }
                    showSearch={true}
                    showUserLocation={true}
                    showConfirmButton={true}
                    confirmText="Confirm Location"
                    onConfirm={({ coordinate, address: confirmedAddress }) => {
                        setIsMapVisible(false);
                        if (coordinate) {
                            setManualLocation(coordinate, confirmedAddress);
                        } else if (location) {
                            setManualLocation(location);
                        }
                    }}
                />
                {/* Close button overlay */}
                <TouchableOpacity
                    style={styles.closeMapBtn}
                    onPress={() => setIsMapVisible(false)}
                >
                    <Ionicons name="close" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
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
    headerTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: COLORS.white },
    stepChip: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12, paddingVertical: 5,
        borderRadius: 20,
    },
    stepChipText: { fontSize: 12, fontFamily: 'Nunito-Bold', color: COLORS.white },

    // Step Indicator
    stepIndicatorContainer: {
        backgroundColor: COLORS.surface,
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
    stepDotActive: { backgroundColor: COLORS.secondary },
    stepDotDone: { backgroundColor: COLORS.secondary },
    stepDotText: { fontSize: 12, fontFamily: 'Nunito-Bold', color: COLORS.textTertiary },
    stepDotTextActive: { color: COLORS.primaryDark },
    stepLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 6, marginBottom: 14 },
    stepLineActive: { backgroundColor: COLORS.secondary },
    stepLabel: { fontSize: 10, fontFamily: 'Nunito-Medium', color: COLORS.textTertiary },
    stepLabelActive: { color: COLORS.primary, fontFamily: 'Nunito-Bold' },

    // Scroll
    scroll: { flex: 1 },
    scrollInner: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

    // Step content shared
    stepContent: { gap: 16 },
    stepTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: COLORS.textPrimary, letterSpacing: -0.3 },
    stepSubtitle: { fontSize: 13, color: COLORS.textTertiary, fontFamily: 'Nunito-Medium', marginTop: -8 },

    // ── Step 1 ──
    uploadZone: {
        height: 200, borderRadius: 24,
        backgroundColor: COLORS.surfaceContainerLow,
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
        backgroundColor: COLORS.primarySurface,
        justifyContent: 'center', alignItems: 'center',
    },
    uploadZoneTitle: { fontSize: 15, fontFamily: 'Nunito-Bold', color: COLORS.textSecondary },
    uploadZoneSub: { fontSize: 12, color: COLORS.textTertiary, fontFamily: 'Nunito-Medium' },

    videoPreviewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 14,
        gap: 12,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    videoThumb: {
        width: 72, height: 56, borderRadius: 12,
        backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
        position: 'relative',
    },
    playBtn: {
        position: 'absolute', bottom: 4, right: 4,
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: COLORS.secondary,
        justifyContent: 'center', alignItems: 'center',
    },
    videoInfo: { flex: 1 },
    videoFilename: { fontSize: 13, fontFamily: 'Nunito-Bold', color: COLORS.textPrimary },
    videoReady: { fontSize: 11, color: COLORS.success, fontFamily: 'Nunito-Medium', marginTop: 3 },
    removeBtn: { padding: 4 },

    uploadBtnRow: { flexDirection: 'row', gap: 12 },
    uploadBtnPrimary: { flex: 1, borderRadius: 16, overflow: 'hidden' },
    uploadBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    uploadBtnText: { fontSize: 14, fontFamily: 'Nunito-Bold', color: COLORS.white },
    uploadBtnOutline: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: 16,
        borderWidth: 1.5, borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    uploadBtnOutlineText: { fontSize: 14, fontFamily: 'Nunito-Bold', color: COLORS.primary },

    infoBanner: {
        flexDirection: 'row',
        gap: 10,
        padding: 14,
        backgroundColor: COLORS.infoSurface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.primaryBorder,
        alignItems: 'flex-start',
    },
    infoBannerText: { flex: 1, fontSize: 12, color: COLORS.primaryLight, fontFamily: 'Nunito-Medium', lineHeight: 18 },
    infoBold: { fontFamily: 'Nunito-Bold' },

    // ── Step 2 ──
    miniVideoRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: COLORS.surface, borderRadius: 14, padding: 12,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    miniVideoThumb: {
        width: 44, height: 34, borderRadius: 8,
        backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    miniVideoName: { fontSize: 12, fontFamily: 'Nunito-Bold', color: COLORS.textPrimary },
    miniVideoSub: { fontSize: 10, color: COLORS.success, fontFamily: 'Nunito-Medium', marginTop: 2 },
    miniCheckBadge: {},

    fieldLabel: { fontSize: 13, fontFamily: 'Nunito-Bold', color: COLORS.primaryDark, marginBottom: -4 },
    requiredStar: { color: COLORS.error },

    chipRow: { gap: 8, paddingBottom: 2 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 12, fontFamily: 'Nunito-Bold', color: COLORS.textSecondary },
    chipTextActive: { color: COLORS.white },

    descBox: {
        backgroundColor: COLORS.surface, borderRadius: 16,
        borderWidth: 1.5, borderColor: COLORS.border,
        padding: 14, minHeight: 110,
    },
    descBoxFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.surface },
    descInput: {
        fontSize: 13, color: COLORS.textPrimary,
        fontFamily: 'Nunito-Medium', minHeight: 80,
        textAlignVertical: 'top',
    },
    charCounter: { fontSize: 10, color: COLORS.textTertiary, textAlign: 'right', marginTop: 6, fontFamily: 'Nunito-Medium' },

    plateBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        marginBottom: 8,
    },
    plateInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: COLORS.textPrimary,
        letterSpacing: 1.5,
    },

    locationBtnRow: { flexDirection: 'row', gap: 12 },
    locBtnOutline: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 12, borderRadius: 14,
        borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.surface,
    },
    locBtnOutlineText: { fontSize: 13, fontFamily: 'Nunito-Bold', color: COLORS.primary },
    locBtnAmber: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 12, borderRadius: 14,
        backgroundColor: COLORS.secondary,
    },
    locBtnAmberText: { fontSize: 13, fontFamily: 'Nunito-Bold', color: COLORS.primaryDark },

    addressBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: COLORS.surfaceContainerLow, borderRadius: 14, padding: 12,
        minHeight: 60,
    },
    addressInput: { flex: 1, fontSize: 13, color: COLORS.textPrimary, fontFamily: 'Nunito-Medium', textAlignVertical: 'top' },

    dateRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
    },
    dateText: { flex: 1, fontSize: 13, fontFamily: 'Nunito-Medium', color: COLORS.textPrimary },
    dateEditBadge: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: COLORS.surfaceContainerLow,
        justifyContent: 'center', alignItems: 'center',
    },

    // ── Step 3 ──
    summaryCard: {
        backgroundColor: COLORS.surface, borderRadius: 24, padding: 20,
        shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4,
        gap: 14,
    },
    summaryCardTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', color: COLORS.textPrimary },

    summaryVideoRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.surfaceContainerLow, borderRadius: 14, padding: 12,
    },
    summaryVideoThumb: {
        width: 80, height: 56, borderRadius: 10,
        backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
        position: 'relative',
    },
    summaryPlayBtn: {
        position: 'absolute', bottom: 4, right: 4,
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: COLORS.secondary,
        justifyContent: 'center', alignItems: 'center',
    },
    summaryVideoName: { fontSize: 13, fontFamily: 'Nunito-Bold', color: COLORS.textPrimary },
    summaryVideoSub: { fontSize: 11, color: COLORS.secondary, fontFamily: 'Nunito-Medium', marginTop: 3 },

    dividerLine: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)' },

    summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    summaryIconCircle: {
        width: 30, height: 30, borderRadius: 9,
        backgroundColor: COLORS.primarySurface,
        justifyContent: 'center', alignItems: 'center',
        marginTop: 2,
    },
    summaryRowLabel: { fontSize: 10, fontFamily: 'Nunito-Bold', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    summaryRowValue: { fontSize: 13, fontFamily: 'Nunito-Medium', marginTop: 2, lineHeight: 18 },

    disclaimerBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        padding: 14, borderRadius: 16,
        backgroundColor: COLORS.secondarySurface, borderWidth: 1, borderColor: '#FDE68A',
    },
    disclaimerText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, fontFamily: 'Nunito-Medium', lineHeight: 18 },

    submitBtn: {
        borderRadius: 18, overflow: 'hidden',
        shadowColor: COLORS.secondaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
    },
    submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
    submitText: { fontSize: 17, fontFamily: 'Nunito-ExtraBold', color: COLORS.primaryDark, letterSpacing: 0.3 },

    draftBtn: { alignItems: 'center', paddingVertical: 6 },
    draftText: { fontSize: 13, fontFamily: 'Nunito-Medium', color: COLORS.textTertiary },

    // Bottom CTA
    bottomBar: {
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)',
    },
    nextBtn: { borderRadius: 18, overflow: 'hidden' },
    nextBtnDisabled: { opacity: 0.5 },
    nextBtnGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    nextBtnText: { fontSize: 16, fontFamily: 'Nunito-ExtraBold', color: COLORS.primaryDark, letterSpacing: 0.3 },

    // MapLibre map modal close button overlay
    closeMapBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 56 : 16,
        right: 16,
        zIndex: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 22,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
    },

    // Report Type Toggle Bar
    reportTypeBar: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.04)',
    },
    reportTypeToggle: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceContainerLow,
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
        backgroundColor: COLORS.secondary,
        borderRadius: 11,
        shadowColor: COLORS.secondaryDark,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    reportTypeActiveText: {
        fontSize: 13,
        fontFamily: 'Nunito-Bold',
        color: COLORS.primaryDark,
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
        color: COLORS.textTertiary,
    },
});
