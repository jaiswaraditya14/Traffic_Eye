import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView,
    ActivityIndicator, Animated, Modal, StatusBar, TextInput,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAppContext } from '../../context';
import { useImagePicker, useLocation } from '../../hooks';
import * as MediaLibrary from 'expo-media-library';
import { parseExifGPS } from '../../utils';

// ── Design Tokens ──
const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    amberDark: '#D97706',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    surfaceInput: '#F2F4F6',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    border: '#C4C6D0',
    success: '#059669',
    successSurface: '#D1FAE5',
    warning: '#D97706',
    warningSurface: '#FEF3C7',
    error: '#BA1A1A',
    primarySurface: '#D7E2FF',
    info: '#1B3A6B',
};

export default function NewReport({ navigation }) {
    const {
        image, setImage, pickFromGallery, captureFromCamera,
        pickVideoFromGallery, captureVideoFromCamera
    } = useImagePicker();
    const insets = useSafeAreaInsets();

    const {
        location, address, setAddress, loading: loadingLocation,
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

    const hideBanner = useCallback((delay = 3000) => {
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

    const handleLocationExtraction = useCallback(async (exif, source, assetId) => {
        // Gallery images — show reading banner immediately for instant feedback
        // Camera images — also try EXIF first (GPS is now preserved since we removed allowsEditing)
        showBanner('reading');

        let lat = null;
        let lng = null;

        // ── Strategy 1: EXIF GPS Parsing (Android flat keys, iOS {GPS}, DMS, rationals) ──
        if (exif) {
            console.log(`[GPS Extraction] Strategy 1 — Parsing raw ${source} image EXIF data...`);
            const exifCoords = parseExifGPS(exif);
            if (exifCoords) {
                lat = exifCoords.lat;
                lng = exifCoords.lng;
                console.log(`[GPS Extraction] ✅ Successfully obtained EXIF coordinates: lat=${lat}, lng=${lng}`);
            } else {
                console.log('[GPS Extraction] EXIF data present but did not contain valid GPS coordinates');
            }
        }

        // ── Strategy 2: MediaLibrary.getAssetInfoAsync (for Android when EXIF object is stripped) ──
        if (lat === null && assetId) {
            try {
                console.log('[GPS Extraction] Strategy 2 — Trying MediaLibrary lookup for assetId:', assetId);
                const { status } = await MediaLibrary.requestPermissionsAsync();
                const locPerm = await MediaLibrary.requestPermissionsAsync(true);
                console.log('[GPS Extraction] MediaLibrary permission:', status, '| loc access:', locPerm.accessPrivileges);
                if (status === 'granted') {
                    const info = await MediaLibrary.getAssetInfoAsync(assetId, { shouldDownloadFromNetwork: false });
                    console.log('[GPS Extraction] MediaLibrary location object:', JSON.stringify(info?.location));
                    const mlLat = info?.location?.latitude;
                    const mlLng = info?.location?.longitude;
                    
                    if (
                        mlLat != null && mlLng != null &&
                        isFinite(mlLat) && isFinite(mlLng) &&
                        !(mlLat === 0 && mlLng === 0) &&
                        Math.abs(mlLat) <= 90 && Math.abs(mlLng) <= 180
                    ) {
                        lat = mlLat;
                        lng = mlLng;
                        console.log(`[GPS Extraction] ✅ Got valid coords from MediaLibrary: lat=${lat}, lng=${lng}`);
                    } else {
                        console.log('[GPS Extraction] MediaLibrary returned invalid/empty location (0,0 or null)');
                    }
                }
            } catch (e) {
                console.warn('[GPS Extraction] MediaLibrary lookup failed:', e.message);
            }
        }

        // ── Reverse geocode if valid EXIF coordinates were extracted ──
        if (lat !== null && lng !== null) {
            showBanner('extracting');
            try {
                const result = await reverseGeocodeFromCoords(lat, lng);
                if (result) { showBanner('success'); hideBanner(4000); }
                else { showBanner('no-gps'); hideBanner(3000); }
            } catch (e) {
                console.warn('[GPS Extraction] Reverse geocoding failed:', e.message);
                showBanner('no-gps'); hideBanner(3000);
            }
        } else {
            // ── Strategy 3: Fallback to live device GPS (only if EXIF is missing/invalid) ──
            console.log('[GPS Extraction] ⚠️ No valid EXIF coords found — falling back to live device GPS (Approx. 10m radius)');
            showBanner('fallback-gps');
            const gpsResult = await detectLocation(true); // true = apply <=10m approximation radius
            if (gpsResult) {
                showBanner('success');
                hideBanner(4000);
            } else {
                console.log('[GPS Extraction] Live GPS also unavailable — user must enter manually');
                showBanner('no-gps');
                hideBanner(3000);
                setAutoFillStatus(null);
            }
        }
    }, [reverseGeocodeFromCoords, detectLocation, showBanner, hideBanner]);

    const handleTakePhoto = async () => {
        const result = await captureFromCamera();
        if (result?.uri) {
            setVideo(null); setMediaType('image');
            // Native OS crop already applied — use the URI directly
            await handleCropDone(result.uri, result.exif || null, 'camera');
        }
    };

    const handlePickImage = async () => {
        const result = await pickFromGallery();
        if (result?.uri) {
            setVideo(null); setMediaType('image');
            await handleCropDone(result.uri, result.exif || null, 'gallery', result.assetId || null);
        }
    };

    const handleCropDone = async (uri, exif, source, assetId = null) => {
        // Add cache-buster to force refresh
        const uriWithCache = `${uri}?t=${new Date().getTime()}`;
        setImage(uriWithCache);
        await handleLocationExtraction(exif, source, assetId);
    };

    const handleDetectLocation = async () => {
        const result = await detectLocation();
        if (result) {
            setTrustLevel('Verified Location');
            Alert.alert('Success', 'Location detected successfully!');
        }
    };

    const handleSubmit = () => {
        if (!image && !video) { Alert.alert('Error', 'Please capture or select an image or video'); return; }
        setCurrentReport({
            image, video, mediaType, description, address, location,
            trustLevel: trustLevel || 'Needs Verification / Manual Location',
            timestamp: new Date()
        });
        navigation.navigate('AIProcessing');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
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
                                <Text style={styles.placeholderSub}>AI will auto-detect plate & violation</Text>
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


                    {/* ── Auto Fill Banner ── */}
                    {autoFillStatus && (
                        <Animated.View
                            style={[
                                styles.banner,
                                autoFillStatus === 'success' && { backgroundColor: C.successSurface, borderColor: C.success + '40' },
                                autoFillStatus === 'no-gps' && { backgroundColor: C.warningSurface, borderColor: C.warning + '40' },
                                { opacity: bannerAnim, transform: [{ scale: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }
                            ]}
                        >
                            {(autoFillStatus === 'extracting' || autoFillStatus === 'reading' || autoFillStatus === 'fallback-gps') && (
                                <ActivityIndicator size="small" color={C.navyMid} style={{ marginRight: 4 }} />
                            )}
                            {(autoFillStatus === 'success') && (
                                <Ionicons name="checkmark-circle" size={20} color={C.success} />
                            )}
                            {(autoFillStatus === 'no-gps') && (
                                <Ionicons name="warning" size={20} color={C.warning} />
                            )}
                            <Text style={[
                                styles.bannerText,
                                { color: autoFillStatus === 'success' ? C.success : autoFillStatus === 'no-gps' ? C.warning : C.navyMid }
                            ]}>
                                {autoFillStatus === 'reading' && 'Reading image metadata...'}
                                {autoFillStatus === 'extracting' && 'Detecting location from photo...'}
                                {autoFillStatus === 'fallback-gps' && 'Getting your current location...'}
                                {autoFillStatus === 'success' && 'Location auto-detected!'}
                                {autoFillStatus === 'no-gps' && 'No GPS data in this photo — enter manually'}
                            </Text>
                        </Animated.View>
                    )}

                    {/* ── Details ── */}
                    <Text style={styles.stepHeader}>Step 2: Add Details</Text>

                    <Text style={styles.fieldLabel}>Location Address</Text>
                    <View style={styles.addressBox}>
                        {/* Inline geocoding spinner — visible only while reverse geocoding */}
                        {autoFillStatus === 'extracting' && (
                            <View style={styles.inlineGeocodeRow}>
                                <ActivityIndicator size="small" color={C.navyMid} />
                                <Text style={styles.inlineGeocodeText}>Detecting location from image…</Text>
                            </View>
                        )}
                        <TextInput
                            style={styles.addressInput}
                            placeholder="Enter address..."
                            value={address}
                            onChangeText={setAddress}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.addressBtns}>
                            <TouchableOpacity style={styles.addrBtnWithText} onPress={() => setIsMapVisible(true)}>
                                <Ionicons name="map" size={16} color={C.white} />
                                <Text style={styles.addrBtnText}>Map</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.addrBtnWithText, { backgroundColor: C.amber }]} onPress={handleDetectLocation}>
                                {loadingLocation ? <ActivityIndicator size="small" color={C.navy} /> : <Ionicons name="location" size={16} color={C.navy} />}
                                <Text style={[styles.addrBtnText, { color: C.navy }]}>Detect</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.fieldLabel}>Description (Optional)</Text>
                    <View style={[styles.descBox, focusedDesc && { borderColor: C.navyMid, backgroundColor: C.surface }]}>
                        <TextInput
                            style={styles.descInput}
                            placeholder="Add specifics about the violation... AI will analyze the rest."
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

    videoPlaceholder: { alignItems: 'center', flex: 1, width: '100%', justifyContent: 'center', backgroundColor: '#FEE2E2' },
    videoText: { fontSize: 15, fontFamily: 'Nunito-Bold', color: '#BA1A1A', marginTop: 10 },

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
        borderColor: '#C4C6D0',
        backgroundColor: C.surface
    },
    mediaBtnOutlineText: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.navyMid },

    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        backgroundColor: '#E0E7FF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(27,58,107,0.1)',
        marginBottom: 24
    },
    bannerText: { fontSize: 13, fontFamily: 'Nunito-Bold' },

    fieldLabel: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.navy, marginBottom: 10, marginTop: 12 },
    addressBox: {
        flexDirection: 'column',
        backgroundColor: '#F1F5F9', // Subtle distinct color 
        borderRadius: 20,
        paddingLeft: 18,
        paddingRight: 18,
        paddingTop: 14,
        paddingBottom: 14,
        minHeight: 150, // Massive box
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#1B3A6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
    },
    addressInput: { flex: 1, fontSize: 14, color: C.textPrimary, fontFamily: 'Nunito-Medium', textAlignVertical: 'top', minHeight: 70 },
    addressBtns: { flexDirection: 'row', gap: 8, alignSelf: 'flex-end', marginTop: 10 },
    addrBtnWithText: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: C.navyMid, justifyContent: 'center', alignItems: 'center' },
    addrBtnText: { color: C.white, fontSize: 13, fontFamily: 'Nunito-Bold' },
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
        shadowColor: '#1B3A6B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
    },
    descInput: { fontSize: 14, color: C.textPrimary, textAlignVertical: 'top', height: 90, fontFamily: 'Nunito-Medium' },

    plateBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: C.surface,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        marginBottom: 32,
    },
    plateInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        letterSpacing: 1.5,
    },


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
