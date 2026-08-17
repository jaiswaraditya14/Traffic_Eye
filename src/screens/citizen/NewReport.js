import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView,
    ActivityIndicator, Animated, Modal, StatusBar, TextInput,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, FocusAwareStatusBar } from '../../components';
import { useAppContext } from '../../context';
import { useImagePicker, useLocation } from '../../hooks';
import { extractImageLocation } from '../../utils';

// ── Design Tokens ──
const C = {
    navy: '#0A1E3F',
    navyMid: '#0F2C59',
    amber: '#D97706',
    amberDark: '#B45309',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    surfaceInput: '#F1F5F9',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: '#CBD5E1',
    success: '#15803D',
    successSurface: '#DCFCE7',
    warning: '#B45309',
    warningSurface: '#FEF3C7',
    error: '#B91C1C',
    primarySurface: '#EFF6FF',
    info: '#0F2C59',
};

export default function NewReport({ navigation }) {
    const {
        image, setImage, pickFromGallery, captureFromCamera,
        pickVideoFromGallery, captureVideoFromCamera
    } = useImagePicker();
    const insets = useSafeAreaInsets();

    const {
        location, address, setAddress, locationSource, setLocationSource, loading: loadingLocation,
        detectLocation, setManualLocation, reverseGeocodeFromCoords
    } = useLocation();

    const [trustLevel, setTrustLevel] = useState(null);
    const [isMapVisible, setIsMapVisible] = useState(false);
    const [selectedCoordinate, setSelectedCoordinate] = useState(null);
    const [mapRegion, setMapRegion] = useState({
        latitude: location?.latitude || 28.6139,
        longitude: location?.longitude || 77.2090,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });

    const [video, setVideo] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const [description, setDescription] = useState('');
    const [focusedDesc, setFocusedDesc] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState(null);

    const [autoFillStatus, setAutoFillStatus] = useState(null);
    const bannerAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const bannerTimer = useRef(null);

    const { setCurrentReport } = useAppContext();

    const showBanner = useCallback((status) => {
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        setAutoFillStatus(status);
        bannerAnim.setValue(0);
        Animated.spring(bannerAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start();
    }, [bannerAnim]);

    const hideBanner = useCallback((delay = 4000) => {
        bannerTimer.current = setTimeout(() => {
            Animated.timing(bannerAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setAutoFillStatus(null));
        }, delay);
    }, [bannerAnim]);

    useEffect(() => {
        if (autoFillStatus === 'extracting' || autoFillStatus === 'fallback-gps' || autoFillStatus === 'reading') {
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

    useEffect(() => { return () => { if (bannerTimer.current) clearTimeout(bannerTimer.current); }; }, []);

    // ── Location Extraction Pipeline ──
    const handleLocationExtraction = useCallback(async (asset) => {
        showBanner('reading');

        try {
            // STEP 1: Extract GPS coordinates directly from original evidence
            const locResult = await extractImageLocation(asset);

            if (locResult && locResult.gpsFound && locResult.latitude != null && locResult.longitude != null) {
                showBanner('extracting');
                const geocodeRes = await reverseGeocodeFromCoords(
                    locResult.latitude,
                    locResult.longitude,
                    locResult.gpsSource || 'EXIF_ORIGINAL',
                    false
                );
                if (geocodeRes && geocodeRes.coords) {
                    setTrustLevel('Verified Location (Image Metadata)');
                    showBanner('success');
                    hideBanner(5000);
                    return;
                }
            }

            // STEP 2: Photo GPS unavailable — present explicit fallback to citizen
            if (__DEV__) {
                if (locResult?.reason === 'ANDROID_PHOTO_PICKER_REDACTION') {
                    console.log('[NewReport] GPS unavailable in Photo Picker copy; original media metadata has not been accessed.');
                } else {
                    console.log('[NewReport] Photograph metadata does not contain valid GPS coordinates.');
                }
            }
            setLocationSource(locResult?.gpsSource || 'GPS_UNAVAILABLE');
            showBanner('no-gps');
        } catch (err) {
            console.warn('[NewReport] Location extraction failure:', err.message);
            setLocationSource('GPS_UNAVAILABLE');
            showBanner('no-gps');
        }
    }, [reverseGeocodeFromCoords, showBanner, hideBanner, setLocationSource]);

    const handleDetectLiveLocation = async () => {
        try {
            showBanner('detecting-live');
            const result = await detectLocation(false, false);
            if (result && result.coords) {
                setTrustLevel('Verified Live Location');
                showBanner('live-success');
                hideBanner(5000);
            } else {
                showBanner('no-gps');
            }
        } catch (error) {
            if (__DEV__) console.warn('[Live Location] Detection failed:', error?.message);
            showBanner('no-gps');
        }
    };

    const handleTakePhoto = async () => {
        const result = await captureFromCamera();
        if (result?.uri) {
            setVideo(null);
            setMediaType('image');
            setImage(result.uri);
            await handleLocationExtraction(result);
        }
    };

    const handlePickImage = async () => {
        const result = await pickFromGallery();
        if (result?.uri) {
            setVideo(null);
            setMediaType('image');
            setImage(result.uri);
            await handleLocationExtraction(result);
        }
    };

    const handleSubmit = () => {
        if (!image && !video) {
            Alert.alert('Evidence Required', 'Please capture or select an image or video before continuing.');
            return;
        }
        if (!address.trim()) {
            Alert.alert(
                'Location Required',
                'Please provide a location address. You can tap "Use Live Location", pick on the map, or enter the address manually.',
                [
                    { text: 'Use Live Location', onPress: handleDetectLiveLocation },
                    { text: 'OK', style: 'cancel' }
                ]
            );
            return;
        }
        setCurrentReport({
            image,
            video,
            mediaType,
            description,
            address,
            location,
            locationSource: locationSource || (location ? 'MANUAL' : 'NOT_FOUND'),
            trustLevel: trustLevel || 'Needs Verification / Manual Location',
            timestamp: new Date(),
        });
        navigation.navigate('AIProcessing');
    };

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                {/* ── Navy Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={[styles.header, { paddingTop: insets.top + 16 }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Report</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

                {/* ── Report Type Toggle ── */}
                <View style={styles.reportTypeBar}>
                    <View style={styles.reportTypeToggle}>
                        <View style={styles.reportTypeActiveTab}>
                            <Ionicons name="flash" size={14} color={C.navy} />
                            <Text style={styles.reportTypeActiveText}>AI Powered</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.reportTypeInactiveTab}
                            onPress={() => navigation.replace('VideoReport')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="videocam-outline" size={14} color={C.textTertiary} />
                            <Text style={styles.reportTypeInactiveText}>Video </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView
                    style={styles.scrollContent}
                    contentContainerStyle={styles.scrollInner}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Steps ── */}
                    <View style={styles.stepIndicator}>
                        <View style={styles.stepDotActive}>
                            <Text style={styles.stepDotTextActive}>1</Text>
                        </View>
                        <View style={styles.stepLineActive} />
                        <View style={image || video ? styles.stepDotActive : styles.stepDot}>
                            <Text style={image || video ? styles.stepDotTextActive : styles.stepDotText}>2</Text>
                        </View>
                        <View style={styles.stepLine} />
                        <View style={styles.stepDot}>
                            <Text style={styles.stepDotText}>3</Text>
                        </View>
                    </View>
                    <Text style={styles.stepHeader}>Step 1: Capture Evidence</Text>

                    {/* ── Media Preview ── */}
                    <TouchableOpacity
                        style={styles.imageContainer}
                        onPress={() => image ? setFullscreenImage(image) : undefined}
                        activeOpacity={image ? 0.9 : 1}
                    >
                        {image ? (
                            <>
                                <Image
                                    key={image}
                                    source={{ uri: image }}
                                    style={styles.mediaImage}
                                />
                                {/* Tap-to-preview hint badge */}
                                <View style={styles.changeImgBadge}>
                                    <Ionicons name="expand" size={14} color={C.white} />
                                    <Text style={styles.changeImgText}>Tap to preview</Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.cameraPlaceholder}>
                                <Ionicons name="camera-outline" size={48} color={C.textTertiary} />
                                <Text style={styles.placeholderText}>Capture Evidence</Text>
                                <Text style={styles.placeholderSub}>AI will auto-detect plate &amp; violation</Text>
                                <View style={styles.scannerOverlay}>
                                    <View style={styles.scannerCorners} />
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* ── Action Buttons ── */}
                    <View style={styles.mediaBtnRow}>
                        {!image && (
                            <TouchableOpacity style={styles.mediaBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
                                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.mediaBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                    <Ionicons name="camera" size={18} color={C.white} />
                                    <Text style={styles.mediaBtnText}>Photo</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={image ? styles.retakeBtn : styles.mediaBtnOutline} onPress={handlePickImage} activeOpacity={0.8}>
                            <Ionicons name={image ? "refresh" : "images"} size={18} color={image ? C.textSecondary : C.navyMid} />
                            <Text style={image ? styles.retakeBtnText : styles.mediaBtnOutlineText}>{image ? 'Choose Another' : 'Gallery'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ── Auto Fill / Location Extraction Banner ── */}
                    {autoFillStatus && (
                        <Animated.View
                            style={[
                                styles.banner,
                                (autoFillStatus === 'success' || autoFillStatus === 'live-success') && styles.bannerSuccess,
                                autoFillStatus === 'no-gps' && styles.bannerNoGps,
                                (autoFillStatus === 'reading' || autoFillStatus === 'extracting' || autoFillStatus === 'detecting-live') && styles.bannerLoading,
                                { opacity: bannerAnim, transform: [{ scale: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }
                            ]}
                        >
                            {/* Loading State */}
                            {(autoFillStatus === 'reading' || autoFillStatus === 'extracting' || autoFillStatus === 'detecting-live') && (
                                <View style={styles.bannerRow}>
                                    <ActivityIndicator size="small" color={C.navyMid} style={{ marginRight: 6 }} />
                                    <Text style={styles.bannerLoadingText}>
                                        {autoFillStatus === 'reading' && 'Reading image metadata…'}
                                        {autoFillStatus === 'extracting' && 'Extracting location from photo…'}
                                        {autoFillStatus === 'detecting-live' && 'Fetching high-accuracy live location…'}
                                    </Text>
                                </View>
                            )}

                            {/* Metadata Success State */}
                            {autoFillStatus === 'success' && (
                                <View style={styles.bannerCol}>
                                    <View style={styles.bannerRow}>
                                        <Ionicons name="checkmark-circle" size={20} color={C.success} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.bannerSuccessTitle}>LOCATION FOUND</Text>
                                            <Text style={styles.bannerSuccessSubtitle}>Source: Image GPS Metadata</Text>
                                        </View>
                                    </View>
                                    {location?.latitude != null && location?.longitude != null && (
                                        <View style={styles.bannerMetaRow}>
                                            <Ionicons name="location" size={13} color={C.success} />
                                            <Text style={styles.bannerMetaText}>
                                                Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Live Location Success State */}
                            {autoFillStatus === 'live-success' && (
                                <View style={styles.bannerCol}>
                                    <View style={styles.bannerRow}>
                                        <Ionicons name="navigate-circle" size={20} color={C.navyMid} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.bannerSuccessTitle, { color: C.navyMid }]}>LIVE LOCATION USED</Text>
                                            <Text style={[styles.bannerSuccessSubtitle, { color: C.navy }]}>Source: Live Device Location</Text>
                                        </View>
                                    </View>
                                    {location?.latitude != null && location?.longitude != null && (
                                        <View style={styles.bannerMetaRow}>
                                            <Ionicons name="navigate" size={13} color={C.navyMid} />
                                            <Text style={[styles.bannerMetaText, { color: C.navyMid }]}>
                                                Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* No Location Found State */}
                            {autoFillStatus === 'no-gps' && (
                                <View style={styles.bannerNoGpsCol}>
                                    <View style={styles.bannerNoGpsHeader}>
                                        <View style={styles.bannerWarnIconWrap}>
                                            <Ionicons name="alert-circle-outline" size={18} color={C.warning} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.bannerNoGpsTitle}>LOCATION NOT FOUND</Text>
                                            <Text style={styles.bannerNoGpsSub}>
                                                No location found from image. The image does not contain usable GPS information.
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.useLiveLocationBtn}
                                        onPress={handleDetectLiveLocation}
                                        activeOpacity={0.85}
                                        disabled={loadingLocation}
                                    >
                                        <LinearGradient
                                            colors={[C.amberDark, C.amber]}
                                            style={styles.useLiveLocationGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            {loadingLocation ? (
                                                <ActivityIndicator size="small" color={C.navy} />
                                            ) : (
                                                <Ionicons name="navigate" size={16} color={C.navy} />
                                            )}
                                            <Text style={styles.useLiveLocationText}>Use Live Location</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>
                    )}

                    {/* ── Details ── */}
                    <Text style={styles.stepHeader}>Step 2: Add Details</Text>

                    <Text style={styles.fieldLabel}>Location Address</Text>
                    <View style={styles.addressBox}>
                        {/* Inline geocoding spinner */}
                        {(autoFillStatus === 'extracting' || autoFillStatus === 'detecting-live') && (
                            <View style={styles.inlineGeocodeRow}>
                                <ActivityIndicator size="small" color={C.navyMid} />
                                <Text style={styles.inlineGeocodeText}>
                                    {autoFillStatus === 'extracting' ? 'Extracting address from image…' : 'Getting live GPS location…'}
                                </Text>
                            </View>
                        )}
                        <TextInput
                            style={styles.addressInput}
                            placeholder="Enter address or use Live Location..."
                            placeholderTextColor={C.textTertiary}
                            value={address}
                            onChangeText={setAddress}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.addressBtns}>
                            <TouchableOpacity style={styles.addrBtnMap} onPress={() => setIsMapVisible(true)} activeOpacity={0.85}>
                                <Ionicons name="map-outline" size={15} color={C.white} />
                                <Text style={styles.addrBtnText}>Map Pin</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.addrBtnLive}
                                onPress={handleDetectLiveLocation}
                                activeOpacity={0.85}
                                disabled={loadingLocation}
                            >
                                {loadingLocation ? (
                                    <ActivityIndicator size="small" color={C.navy} />
                                ) : (
                                    <Ionicons name="navigate" size={15} color={C.navy} />
                                )}
                                <Text style={styles.addrBtnLiveText}>Use Live Location</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.fieldLabel}>Description (Optional)</Text>
                    <View style={[styles.descBox, focusedDesc && { borderColor: C.navyMid, backgroundColor: C.surface }]}>
                        <TextInput
                            style={styles.descInput}
                            placeholder="Add specifics about the violation... AI will analyze the rest."
                            placeholderTextColor={C.textTertiary}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            onFocus={() => setFocusedDesc(true)}
                            onBlur={() => setFocusedDesc(false)}
                        />
                    </View>

                    {/* ── Submit ── */}
                    <TouchableOpacity
                        style={[styles.submitBtn, (!image && !video) && { opacity: 0.5 }]}
                        onPress={handleSubmit}
                        activeOpacity={0.88}
                        disabled={!image && !video}
                    >
                        <LinearGradient colors={[C.amberDark, C.amber]} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Ionicons name="sparkles" size={18} color={C.navy} />
                            <Text style={styles.submitText}>Analyze with AI</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                </ScrollView>
            </SafeAreaView>

            {/* Modals are unchanged visually for brevity, standard map picker */}
            <Modal visible={isMapVisible} animationType="slide">
                <View style={styles.mapContainer}>
                    <MapView style={styles.map} region={mapRegion} onRegionChangeComplete={setMapRegion} onPress={(e) => setSelectedCoordinate(e.nativeEvent.coordinate)} showsUserLocation={true}>
                        {selectedCoordinate && <Marker coordinate={selectedCoordinate} />}
                        {!selectedCoordinate && location && <Marker coordinate={location} pinColor="blue" />}
                    </MapView>
                    <View style={styles.mapHeaderLine}>
                        <Text style={styles.mapTitle}>Pin Location</Text>
                        <TouchableOpacity onPress={() => setIsMapVisible(false)} style={styles.closeMap}>
                            <Ionicons name="close" size={24} color={C.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.mapConfirm} onPress={() => { setIsMapVisible(false); if (selectedCoordinate) setManualLocation(selectedCoordinate); else if (location) setManualLocation(location); }}>
                        <Text style={styles.mapConfirmText}>Confirm Selected</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* Fullscreen Image Modal with Pinch-to-Zoom */}
            <Modal visible={!!fullscreenImage} transparent={true} animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
                <View style={styles.modalBg}>
                    <TouchableOpacity style={styles.modalClose} onPress={() => setFullscreenImage(null)}>
                        <Ionicons name="close" size={28} color={C.white} />
                    </TouchableOpacity>
                    {fullscreenImage && (
                        <ScrollView
                            maximumZoomScale={5}
                            minimumZoomScale={1}
                            showsHorizontalScrollIndicator={false}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <Image source={{ uri: fullscreenImage }} style={styles.modalImg} resizeMode="contain" />
                        </ScrollView>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

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
    headerTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.white },

    scrollContent: { flex: 1 },
    scrollInner: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        gap: 8,
    },
    stepDot: {
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center', alignItems: 'center'
    },
    stepDotActive: {
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: C.amber,
        justifyContent: 'center', alignItems: 'center'
    },
    stepDotText: { fontSize: 12, fontFamily: 'Nunito-Bold', color: C.textTertiary },
    stepDotTextActive: { fontSize: 12, fontFamily: 'Nunito-Bold', color: C.navy },
    stepLine: { width: 30, height: 2, backgroundColor: '#E5E7EB' },
    stepLineActive: { width: 30, height: 2, backgroundColor: C.amber },

    stepHeader: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        color: C.navyMid,
    },
    imageContainer: {
        width: '100%',
        height: 280,
        backgroundColor: '#111827',
        borderRadius: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    mediaImage: { width: '100%', height: '100%', resizeMode: 'contain' },
    changeImgBadge: {
        position: 'absolute',
        bottom: 14,
        right: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
    },
    changeImgText: {
        color: C.white,
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
    },
    retakeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: C.border,
        borderStyle: 'dashed',
    },
    retakeBtnText: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: C.textSecondary,
    },
    // Fullscreen Modal
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    modalClose: {
        position: 'absolute', top: 60, right: 24, zIndex: 10,
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center', alignItems: 'center',
    },
    modalImg: { width: '100%', height: '85%' },

    scannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 20,
    },
    scannerCorners: {
        flex: 1,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
        borderRadius: 12,
        borderStyle: 'dashed',
    },
    cameraPlaceholder: { alignItems: 'center', padding: 32 },
    placeholderText: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.textSecondary, marginTop: 12 },
    placeholderSub: { fontSize: 13, color: C.textTertiary, marginTop: 6, textAlign: 'center' },

    mediaBtnRow: { flexDirection: 'row', gap: 14, marginBottom: 14 },
    mediaBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
    mediaBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    mediaBtnText: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.white },
    mediaBtnOutline: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        backgroundColor: C.surface
    },
    mediaBtnOutlineText: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.navyMid },

    // Banner styles
    banner: {
        borderRadius: 18,
        borderWidth: 1.5,
        padding: 14,
        marginBottom: 20,
    },
    bannerLoading: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    bannerSuccess: {
        backgroundColor: C.successSurface,
        borderColor: '#86EFAC',
    },
    bannerNoGps: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    bannerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    bannerCol: {
        flexDirection: 'column',
        gap: 6,
    },
    bannerMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 4,
        paddingLeft: 4,
    },
    bannerMetaText: {
        fontSize: 12,
        fontFamily: 'Nunito-SemiBold',
        color: '#15803D',
    },
    bannerLoadingText: {
        fontSize: 13,
        fontFamily: 'Nunito-SemiBold',
        color: C.navyMid,
    },
    bannerSuccessTitle: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: C.success,
    },
    bannerSuccessSubtitle: {
        fontSize: 12,
        fontFamily: 'Nunito-Medium',
        color: '#166534',
        marginTop: 1,
    },
    bannerNoGpsCol: {
        flexDirection: 'column',
        gap: 12,
    },
    bannerNoGpsHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    bannerWarnIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 1,
    },
    bannerNoGpsTitle: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: '#92400E',
    },
    bannerNoGpsSub: {
        fontSize: 12,
        fontFamily: 'Nunito-Medium',
        color: '#B45309',
        marginTop: 2,
        lineHeight: 17,
    },
    useLiveLocationBtn: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: C.amberDark,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
    },
    useLiveLocationGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 11,
        paddingHorizontal: 16,
    },
    useLiveLocationText: {
        fontSize: 13,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
    },

    fieldLabel: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.navy, marginBottom: 10, marginTop: 12 },
    addressBox: {
        flexDirection: 'column',
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        paddingLeft: 18,
        paddingRight: 18,
        paddingTop: 14,
        paddingBottom: 14,
        minHeight: 150,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#0F2C59',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
    },
    addressInput: { flex: 1, fontSize: 14, color: C.textPrimary, fontFamily: 'Nunito-Medium', textAlignVertical: 'top', minHeight: 70 },
    addressBtns: { flexDirection: 'row', gap: 10, alignSelf: 'flex-end', marginTop: 12 },
    addrBtnMap: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: C.navyMid,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addrBtnLive: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: C.amber,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: C.amberDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    addrBtnText: { color: C.white, fontSize: 13, fontFamily: 'Nunito-Bold' },
    addrBtnLiveText: { color: C.navy, fontSize: 13, fontFamily: 'Nunito-Bold' },

    // Inline geocoding spinner inside the address box
    inlineGeocodeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        marginBottom: 8,
    },
    inlineGeocodeText: {
        fontSize: 12,
        fontFamily: 'Nunito-SemiBold',
        color: C.navyMid,
    },

    descBox: {
        backgroundColor: C.surface,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        marginBottom: 32,
        shadowColor: '#0F2C59',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
    },
    descInput: { fontSize: 14, color: C.textPrimary, textAlignVertical: 'top', height: 90, fontFamily: 'Nunito-Medium' },

    submitBtn: {
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: C.amberDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        marginBottom: 20,
    },
    submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
    submitText: { fontSize: 17, fontFamily: 'Nunito-ExtraBold', color: C.navy, letterSpacing: 0.5 },

    mapContainer: { flex: 1, backgroundColor: C.offWhite },
    map: { flex: 1 },
    mapHeaderLine: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface, padding: 16, borderRadius: 16, elevation: 4 },
    mapTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    closeMap: { padding: 4 },
    mapConfirm: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: C.navyMid, padding: 16, borderRadius: 14, alignItems: 'center', elevation: 4 },
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
        backgroundColor: C.surfaceInput,
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

