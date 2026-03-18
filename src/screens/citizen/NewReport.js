import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, Button, Input, ImageCropModal } from '../../components';
import { useAppContext } from '../../context';
import { useImagePicker, useLocation } from '../../hooks';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, GRADIENTS } from '../../utils';

export default function NewReport({ navigation }) {
    const {
        image,
        setImage,
        exifData,
        pickFromGallery: pickImageGallery,
        captureFromCamera: takePhoto,
        pickVideoFromGallery: pickVideoGallery,
        captureVideoFromCamera: recordVideo
    } = useImagePicker();

    const {
        address,
        setAddress,
        loading: loadingLocation,
        detectLocation,
        reverseGeocodeFromCoords
    } = useLocation();

    const [video, setVideo] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const [description, setDescription] = useState('');

    // Crop modal state
    const [showCropModal, setShowCropModal] = useState(false);
    const [pendingCropUri, setPendingCropUri] = useState(null);
    const [pendingExif, setPendingExif] = useState(null);

    // Auto-fill animation state: null | 'extracting' | 'fallback-gps' | 'success' | 'no-gps'
    const [autoFillStatus, setAutoFillStatus] = useState(null);
    const bannerAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const bannerTimer = useRef(null);

    const { setCurrentReport } = useAppContext();

    // Animate banner in
    const showBanner = useCallback((status) => {
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        setAutoFillStatus(status);
        bannerAnim.setValue(0);
        Animated.spring(bannerAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();
    }, [bannerAnim]);

    // Animate banner out
    const hideBanner = useCallback((delay = 3000) => {
        bannerTimer.current = setTimeout(() => {
            Animated.timing(bannerAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setAutoFillStatus(null));
        }, delay);
    }, [bannerAnim]);

    // Pulse animation for the extracting/fallback states
    useEffect(() => {
        if (autoFillStatus === 'extracting' || autoFillStatus === 'fallback-gps') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.6, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [autoFillStatus, pulseAnim]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => { if (bannerTimer.current) clearTimeout(bannerTimer.current); };
    }, []);

    // Extract GPS from EXIF data and auto-fill address with visual feedback
    // Falls back to live GPS if no EXIF location found
    const extractAddressFromExif = useCallback(async (exif) => {
        const lat = exif?.GPSLatitude;
        const lng = exif?.GPSLongitude;

        if (lat && lng && lat !== 0 && lng !== 0) {
            // Show extracting state
            showBanner('extracting');

            const result = await reverseGeocodeFromCoords(lat, lng);
            if (result) {
                // Show success state
                showBanner('success');
                hideBanner(4000);
            } else {
                // Geocoding failed, fallback to live GPS
                showBanner('fallback-gps');
                const gpsResult = await detectLocation();
                if (gpsResult) {
                    showBanner('success');
                    hideBanner(4000);
                } else {
                    showBanner('no-gps');
                    hideBanner(3000);
                }
            }
        } else {
            // No EXIF GPS — fallback to live GPS automatically
            showBanner('fallback-gps');
            const gpsResult = await detectLocation();
            if (gpsResult) {
                showBanner('success');
                hideBanner(4000);
            } else {
                showBanner('no-gps');
                hideBanner(3000);
            }
        }
    }, [reverseGeocodeFromCoords, detectLocation, showBanner, hideBanner]);

    const handleTakePhoto = async () => {
        const result = await takePhoto();
        if (result) {
            setVideo(null);
            setMediaType('image');
            // Open crop modal to allow zoom/crop
            setPendingCropUri(result.uri);
            setPendingExif(result.exif || null);
            setShowCropModal(true);
        }
    };

    const handlePickImage = async () => {
        const result = await pickImageGallery();
        if (result) {
            setVideo(null);
            setMediaType('image');
            // Open crop modal to allow zoom/crop
            setPendingCropUri(result.uri);
            setPendingExif(result.exif || null);
            setShowCropModal(true);
        }
    };

    // Called when user finishes cropping or skips
    const handleCropDone = async (croppedUri) => {
        setShowCropModal(false);
        setImage(croppedUri);
        setPendingCropUri(null);
        // Extract address from EXIF GPS (if available)
        await extractAddressFromExif(pendingExif);
        setPendingExif(null);
    };

    const handleCropCancel = async () => {
        setShowCropModal(false);
        // Use original image without cropping
        if (pendingCropUri) {
            setImage(pendingCropUri);
        }
        setPendingCropUri(null);
        // Still extract address from EXIF GPS
        await extractAddressFromExif(pendingExif);
        setPendingExif(null);
    };

    const handleRecordVideo = async () => {
        const uri = await recordVideo();
        if (uri) {
            setImage(null);
            setVideo(uri);
            setMediaType('video');
        }
    };

    const handlePickVideo = async () => {
        const uri = await pickVideoGallery();
        if (uri) {
            setImage(null);
            setVideo(uri);
            setMediaType('video');
        }
    };

    const handleDetectLocation = async () => {
        const result = await detectLocation();
        if (result) {
            Alert.alert('Success', 'Location detected successfully!');
        }
    };

    const handleSubmit = () => {
        if (!image && !video) {
            Alert.alert('Error', 'Please capture or select an image or video');
            return;
        }
        setCurrentReport({
            image,
            video,
            mediaType,
            description,
            address,
            timestamp: new Date()
        });
        navigation.navigate('AIProcessing');
    };

    return (
        <>
            <MobileContainer>
                <SafeAreaView style={styles.container} edges={['top']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.title}>New Report</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.content}>
                            {/* Step Indicator */}
                            <View style={styles.stepIndicator}>
                                <View style={styles.stepDot}>
                                    <Text style={styles.stepDotText}>1</Text>
                                </View>
                                <View style={styles.stepLine} />
                                <View style={[styles.stepDot, !image && !video && styles.stepDotInactive]}>
                                    <Text style={[styles.stepDotText, !image && !video && styles.stepDotTextInactive]}>2</Text>
                                </View>
                                <View style={styles.stepLine} />
                                <View style={[styles.stepDot, styles.stepDotInactive]}>
                                    <Text style={[styles.stepDotText, styles.stepDotTextInactive]}>3</Text>
                                </View>
                            </View>

                            {/* Media Capture Area */}
                            <View style={styles.imageContainer}>
                                {image ? (
                                    <Image source={{ uri: image }} style={styles.image} />
                                ) : video ? (
                                    <View style={styles.videoPlaceholder}>
                                        <View style={styles.videoIconBg}>
                                            <Ionicons name="videocam" size={40} color={COLORS.primary} />
                                        </View>
                                        <Text style={styles.videoText}>Video Selected</Text>
                                        <Text style={styles.videoSubtext}>Ready to submit</Text>
                                    </View>
                                ) : (
                                    <View style={styles.placeholder}>
                                        <View style={styles.placeholderIconBg}>
                                            <Ionicons name="camera" size={36} color={COLORS.textTertiary} />
                                        </View>
                                        <Text style={styles.placeholderText}>
                                            Capture or select violation evidence
                                        </Text>
                                        <Text style={styles.placeholderSubtext}>
                                            Photo or video up to 15 seconds
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Photo Buttons */}
                            <View style={styles.mediaButtons}>
                                <TouchableOpacity onPress={handleTakePhoto} style={styles.mediaBtn} activeOpacity={0.7}>
                                    <LinearGradient colors={GRADIENTS.primary} style={styles.mediaBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                        <Ionicons name="camera" size={20} color="#FFF" />
                                        <Text style={styles.mediaBtnText}>Photo</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handlePickImage} style={[styles.mediaBtn, styles.mediaBtnOutline]} activeOpacity={0.7}>
                                    <Ionicons name="images" size={20} color={COLORS.primary} />
                                    <Text style={styles.mediaBtnOutlineText}>Gallery</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.mediaButtons}>
                                <TouchableOpacity onPress={handleRecordVideo} style={styles.mediaBtn} activeOpacity={0.7}>
                                    <LinearGradient colors={GRADIENTS.secondary} style={styles.mediaBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                        <Ionicons name="videocam" size={20} color="#FFF" />
                                        <Text style={styles.mediaBtnText}>Record</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handlePickVideo} style={[styles.mediaBtn, styles.mediaBtnOutline]} activeOpacity={0.7}>
                                    <Ionicons name="film" size={20} color={COLORS.secondary} />
                                    <Text style={[styles.mediaBtnOutlineText, { color: COLORS.secondary }]}>Pick Video</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Auto-fill Status Banner */}
                            {autoFillStatus && (
                                <Animated.View
                                    style={[
                                        styles.autoFillBanner,
                                        autoFillStatus === 'extracting' && styles.autoFillBannerExtracting,
                                        autoFillStatus === 'fallback-gps' && styles.autoFillBannerExtracting,
                                        autoFillStatus === 'success' && styles.autoFillBannerSuccess,
                                        autoFillStatus === 'no-gps' && styles.autoFillBannerWarning,
                                        {
                                            opacity: bannerAnim,
                                            transform: [{
                                                translateY: bannerAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [-20, 0],
                                                }),
                                            }, {
                                                scale: bannerAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0.95, 1],
                                                }),
                                            }],
                                        },
                                    ]}
                                >
                                    {autoFillStatus === 'extracting' && (
                                        <>
                                            <Animated.View style={{ opacity: pulseAnim }}>
                                                <View style={styles.autoFillIconBg}>
                                                    <Ionicons name="scan" size={18} color={COLORS.primary} />
                                                </View>
                                            </Animated.View>
                                            <View style={styles.autoFillTextContainer}>
                                                <Text style={styles.autoFillTitle}>Scanning image metadata...</Text>
                                                <Text style={styles.autoFillSubtitle}>Extracting GPS location from photo</Text>
                                            </View>
                                            <ActivityIndicator size="small" color={COLORS.primary} />
                                        </>
                                    )}
                                    {autoFillStatus === 'fallback-gps' && (
                                        <>
                                            <Animated.View style={{ opacity: pulseAnim }}>
                                                <View style={styles.autoFillIconBg}>
                                                    <Ionicons name="navigate" size={18} color={COLORS.info} />
                                                </View>
                                            </Animated.View>
                                            <View style={styles.autoFillTextContainer}>
                                                <Text style={[styles.autoFillTitle, { color: COLORS.info }]}>Using live GPS...</Text>
                                                <Text style={styles.autoFillSubtitle}>No image GPS found, detecting your location</Text>
                                            </View>
                                            <ActivityIndicator size="small" color={COLORS.info} />
                                        </>
                                    )}
                                    {autoFillStatus === 'success' && (
                                        <>
                                            <View style={[styles.autoFillIconBg, styles.autoFillIconSuccess]}>
                                                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                                            </View>
                                            <View style={styles.autoFillTextContainer}>
                                                <Text style={[styles.autoFillTitle, { color: COLORS.success }]}>Address auto-filled!</Text>
                                                <Text style={styles.autoFillSubtitle}>Location detected successfully</Text>
                                            </View>
                                            <Ionicons name="checkmark-done" size={18} color={COLORS.success} />
                                        </>
                                    )}
                                    {autoFillStatus === 'no-gps' && (
                                        <>
                                            <View style={[styles.autoFillIconBg, styles.autoFillIconWarning]}>
                                                <Ionicons name="warning" size={18} color={COLORS.warning} />
                                            </View>
                                            <View style={styles.autoFillTextContainer}>
                                                <Text style={[styles.autoFillTitle, { color: COLORS.warning }]}>Could not detect location</Text>
                                                <Text style={styles.autoFillSubtitle}>Please enter address manually</Text>
                                            </View>
                                            <Ionicons name="create" size={18} color={COLORS.warning} />
                                        </>
                                    )}
                                </Animated.View>
                            )}

                            {/* Address with Auto-Detect */}
                            <View style={styles.addressContainer}>
                                <Input
                                    label="Location Address"
                                    placeholder="Enter address or use GPS..."
                                    value={address}
                                    onChangeText={setAddress}
                                    multiline
                                    numberOfLines={2}
                                    inputStyle={styles.addressInput}
                                />
                                <TouchableOpacity
                                    style={styles.locationButton}
                                    onPress={handleDetectLocation}
                                    disabled={loadingLocation}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={GRADIENTS.primary}
                                        style={styles.locationButtonInner}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        {loadingLocation ? (
                                            <ActivityIndicator size="small" color={COLORS.white} />
                                        ) : (
                                            <Ionicons name="location" size={22} color={COLORS.white} />
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            {/* Description */}
                            <Input
                                label="Description"
                                placeholder="Add details about the violation..."
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                helperText="Optional — AI will also generate a description"
                            />

                            {/* Submit Button */}
                            <Button onPress={handleSubmit} fullWidth size="lg" disabled={!image && !video}>
                                Analyze with AI
                            </Button>

                            <View style={{ height: SPACING.xxl }} />
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </MobileContainer>

            {/* Image Crop/Zoom Modal */}
            <ImageCropModal
                visible={showCropModal}
                imageUri={pendingCropUri}
                onCropDone={handleCropDone}
                onCancel={handleCropCancel}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        letterSpacing: -0.2,
    },
    scrollContent: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xl,
    },

    // ── Step Indicator ──
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
        gap: SPACING.sm,
    },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepDotInactive: {
        backgroundColor: COLORS.gray200,
    },
    stepDotText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.bold,
        color: '#FFFFFF',
    },
    stepDotTextInactive: {
        color: COLORS.textTertiary,
    },
    stepLine: {
        width: 40,
        height: 2,
        backgroundColor: COLORS.gray200,
        borderRadius: 1,
    },

    // ── Media Area ──
    imageContainer: {
        width: '100%',
        height: 280,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.gray50,
        padding: SPACING.xl,
    },
    placeholderIconBg: {
        width: 72,
        height: 72,
        borderRadius: BORDER_RADIUS.xl,
        backgroundColor: COLORS.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    placeholderText: {
        fontSize: FONT_SIZES.md,
        textAlign: 'center',
        color: COLORS.textSecondary,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    placeholderSubtext: {
        fontSize: FONT_SIZES.sm,
        textAlign: 'center',
        color: COLORS.textTertiary,
        marginTop: SPACING.xxs,
    },
    videoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primarySurface,
    },
    videoIconBg: {
        width: 72,
        height: 72,
        borderRadius: BORDER_RADIUS.xl,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.sm,
    },
    videoText: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.primary,
    },
    videoSubtext: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },

    // ── Media Buttons ──
    mediaButtons: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.md,
    },
    mediaBtn: {
        flex: 1,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    mediaBtnGradient: {
        flexDirection: 'row',
        gap: SPACING.sm,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.md + 2,
        borderRadius: BORDER_RADIUS.lg,
    },
    mediaBtnText: {
        fontWeight: FONT_WEIGHTS.semibold,
        color: '#FFFFFF',
        fontSize: FONT_SIZES.sm,
    },
    mediaBtnOutline: {
        flexDirection: 'row',
        gap: SPACING.sm,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.md + 2,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    mediaBtnOutlineText: {
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.primary,
        fontSize: FONT_SIZES.sm,
    },

    // ── Auto-fill Banner ──
    autoFillBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm + 2,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
        borderWidth: 1,
        gap: SPACING.sm,
    },
    autoFillBannerExtracting: {
        backgroundColor: COLORS.primarySurface,
        borderColor: COLORS.primary + '30',
    },
    autoFillBannerSuccess: {
        backgroundColor: COLORS.successSurface,
        borderColor: COLORS.success + '30',
    },
    autoFillBannerWarning: {
        backgroundColor: COLORS.warningSurface,
        borderColor: COLORS.warning + '30',
    },
    autoFillIconBg: {
        width: 32,
        height: 32,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    autoFillIconSuccess: {
        backgroundColor: COLORS.success + '15',
    },
    autoFillIconWarning: {
        backgroundColor: COLORS.warning + '15',
    },
    autoFillTextContainer: {
        flex: 1,
    },
    autoFillTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.primary,
        letterSpacing: -0.1,
    },
    autoFillSubtitle: {
        fontSize: FONT_SIZES.xxs,
        color: COLORS.textSecondary,
        marginTop: 1,
    },

    // ── Address ──
    addressContainer: {
        position: 'relative',
        marginBottom: SPACING.sm,
    },
    addressInput: {
        paddingRight: 64,
    },
    locationButton: {
        position: 'absolute',
        right: 8,
        top: 36,
    },
    locationButtonInner: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
