import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView,
    ActivityIndicator, Animated, Modal, StatusBar, TextInput,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, ImageCropModal } from '../../components';
import { useAppContext } from '../../context';
import { useImagePicker, useLocation } from '../../hooks';

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

    const [showCropModal, setShowCropModal] = useState(false);
    const [pendingCropUri, setPendingCropUri] = useState(null);
    const [pendingExif, setPendingExif] = useState(null);
    const [pendingMediaSource, setPendingMediaSource] = useState(null);

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

    useEffect(() => { return () => { if (bannerTimer.current) clearTimeout(bannerTimer.current); }; }, []);

    const handleLocationExtraction = useCallback(async (exif, source) => {
        if (source === 'camera') {
            showBanner('fallback-gps');
            const gpsResult = await detectLocation();
            if (gpsResult) { showBanner('success'); hideBanner(4000); }
            else { showBanner('no-gps'); hideBanner(3000); }
        } else {
            const lat = exif?.GPSLatitude;
            const lng = exif?.GPSLongitude;
            if (lat && lng && lat !== 0 && lng !== 0) {
                showBanner('extracting');
                const result = await reverseGeocodeFromCoords(lat, lng);
                if (result) { showBanner('success'); hideBanner(4000); }
                else { showBanner('no-gps'); hideBanner(3000); }
            } else {
                // For gallery images with no location, do not auto-detect. User can choose manually.
                setAutoFillStatus(null);
            }
        }
    }, [reverseGeocodeFromCoords, detectLocation, showBanner, hideBanner]);

    const handleTakePhoto = async () => {
        const result = await captureFromCamera();
        if (result) {
            setVideo(null); setMediaType('image');
            setPendingCropUri(result.uri); setPendingExif(result.exif || null);
            setPendingMediaSource('camera');
            setShowCropModal(true);
        }
    };

    const handlePickImage = async () => {
        const result = await pickFromGallery();
        if (result) {
            setVideo(null); setMediaType('image');
            setPendingCropUri(result.uri); setPendingExif(result.exif || null);
            setPendingMediaSource('gallery');
            setShowCropModal(true);
        }
    };

    const handleCropDone = async (croppedUri) => {
        setShowCropModal(false); setImage(croppedUri); setPendingCropUri(null);
        await handleLocationExtraction(pendingExif, pendingMediaSource);
        setPendingExif(null); setPendingMediaSource(null);
    };

    const handleCropCancel = async () => {
        setShowCropModal(false);
        if (pendingCropUri) setImage(pendingCropUri);
        setPendingCropUri(null);
        await handleLocationExtraction(pendingExif, pendingMediaSource);
        setPendingExif(null); setPendingMediaSource(null);
    };

    const handleRecordVideo = async () => {
        const result = await captureVideoFromCamera();
        if (result?.uri) {
            setImage(null); setVideo(result.uri); setMediaType('video');
            await handleLocationExtraction(result.exif, 'camera');
        }
    };

    const handlePickVideo = async () => {
        const result = await pickVideoFromGallery();
        if (result?.uri) {
            setImage(null); setVideo(result.uri); setMediaType('video');
            await handleLocationExtraction(result.exif, 'gallery');
        }
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
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Navy Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Report</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

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

                    {/* ── Media Preview with Sentinel Frame ── */}
                    <View style={styles.imageContainer}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.mediaImage} />
                        ) : video ? (
                            <View style={styles.videoPlaceholder}>
                                <Ionicons name="videocam" size={48} color="#BA1A1A" />
                                <Text style={styles.videoText}>Video Selected</Text>
                            </View>
                        ) : (
                            <View style={styles.cameraPlaceholder}>
                                <Ionicons name="camera-outline" size={48} color={C.textTertiary} />
                                <Text style={styles.placeholderText}>Capture Evidence</Text>
                                <Text style={styles.placeholderSub}>AI will auto-detect plate & violation</Text>
                                
                                {/* Guide lines */}
                                <View style={styles.scannerOverlay}>
                                    <View style={styles.scannerCorners} />
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ── Action Buttons ── */}
                    <View style={styles.mediaBtnRow}>
                        <TouchableOpacity style={styles.mediaBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
                            <LinearGradient colors={[C.navy, C.navyMid]} style={styles.mediaBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                <Ionicons name="camera" size={18} color={C.white} />
                                <Text style={styles.mediaBtnText}>Photo</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.mediaBtnOutline} onPress={handlePickImage} activeOpacity={0.8}>
                            <Ionicons name="images" size={18} color={C.navyMid} />
                            <Text style={styles.mediaBtnOutlineText}>Gallery</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.mediaBtnRow}>
                        <TouchableOpacity style={styles.mediaBtn} onPress={handleRecordVideo} activeOpacity={0.8}>
                            <LinearGradient colors={['#DC2626', '#B91C1C']} style={styles.mediaBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                <Ionicons name="videocam" size={18} color={C.white} />
                                <Text style={styles.mediaBtnText}>Record</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.mediaBtnOutline} onPress={handlePickVideo} activeOpacity={0.8}>
                            <Ionicons name="film" size={18} color={C.textTertiary} />
                            <Text style={[styles.mediaBtnOutlineText, { color: C.textTertiary }]}>Video</Text>
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
                            <Ionicons
                                name={autoFillStatus === 'success' ? 'checkmark-circle' : autoFillStatus === 'no-gps' ? 'warning' : 'navigate'}
                                size={20}
                                color={autoFillStatus === 'success' ? C.success : autoFillStatus === 'no-gps' ? C.warning : C.navyMid}
                            />
                            <Text style={[styles.bannerText, { color: autoFillStatus === 'success' ? C.success : autoFillStatus === 'no-gps' ? C.warning : C.navyMid }]}>
                                {autoFillStatus === 'success' ? 'Location auto-detected!' : autoFillStatus === 'no-gps' ? 'Could not detect location' : 'Detecting location...'}
                            </Text>
                        </Animated.View>
                    )}

                    {/* ── Details ── */}
                    <Text style={styles.stepHeader}>Step 2: Add Details</Text>

                    <Text style={styles.fieldLabel}>Location Address</Text>
                    <View style={styles.addressBox}>
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
            <ImageCropModal visible={showCropModal} imageUri={pendingCropUri} onCropDone={handleCropDone} onCancel={handleCropCancel} />
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
        height: 240,
        backgroundColor: '#E5E7EB',
        borderRadius: 24, // High rounding
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    mediaImage: { width: '100%', height: '100%', resizeMode: 'cover' },
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
        flexDirection: 'row', 
        backgroundColor: '#F1F5F9', // Subtle distinct color 
        borderRadius: 20, 
        paddingLeft: 18, 
        paddingRight: 10, 
        paddingVertical: 14, 
        minHeight: 150, // Massive box
        alignItems: 'flex-start',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#1B3A6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
    },
    addressInput: { flex: 1, fontSize: 14, color: C.textPrimary, paddingRight: 10, fontFamily: 'Nunito-Medium', textAlignVertical: 'top', height: '100%', paddingTop: 4 },
    addressBtns: { flexDirection: 'row', gap: 8, alignSelf: 'flex-end', paddingTop: 20 },
    addrBtnWithText: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: C.navyMid, justifyContent: 'center', alignItems: 'center' },
    addrBtnText: { color: C.white, fontSize: 13, fontFamily: 'Nunito-Bold' },

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
});
