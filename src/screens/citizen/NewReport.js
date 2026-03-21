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

    const extractAddressFromExif = useCallback(async (exif) => {
        const lat = exif?.GPSLatitude;
        const lng = exif?.GPSLongitude;

        if (lat && lng && lat !== 0 && lng !== 0) {
            showBanner('extracting');
            const result = await reverseGeocodeFromCoords(lat, lng);
            if (result) {
                showBanner('success'); hideBanner(4000);
            } else {
                showBanner('fallback-gps');
                const gpsResult = await detectLocation();
                if (gpsResult) { showBanner('success'); hideBanner(4000); }
                else { showBanner('no-gps'); hideBanner(3000); }
            }
        } else {
            showBanner('fallback-gps');
            const gpsResult = await detectLocation();
            if (gpsResult) { showBanner('success'); hideBanner(4000); }
            else { showBanner('no-gps'); hideBanner(3000); }
        }
    }, [reverseGeocodeFromCoords, detectLocation, showBanner, hideBanner]);

    const handleTakePhoto = async () => {
        const result = await captureFromCamera();
        if (result) {
            setVideo(null); setMediaType('image');
            setPendingCropUri(result.uri); setPendingExif(result.exif || null);
            setShowCropModal(true);
        }
    };

    const handlePickImage = async () => {
        const result = await pickFromGallery();
        if (result) {
            setVideo(null); setMediaType('image');
            setPendingCropUri(result.uri); setPendingExif(result.exif || null);
            setShowCropModal(true);
        }
    };

    const handleCropDone = async (croppedUri) => {
        setShowCropModal(false); setImage(croppedUri); setPendingCropUri(null);
        await extractAddressFromExif(pendingExif); setPendingExif(null);
    };

    const handleCropCancel = async () => {
        setShowCropModal(false);
        if (pendingCropUri) setImage(pendingCropUri);
        setPendingCropUri(null);
        await extractAddressFromExif(pendingExif); setPendingExif(null);
    };

    const handleRecordVideo = async () => {
        const uri = await captureVideoFromCamera();
        if (uri) {
            setImage(null); setVideo(uri); setMediaType('video');
            setTrustLevel('Verified Location'); detectLocation();
        }
    };

    const handlePickVideo = async () => {
        const uri = await pickVideoFromGallery();
        if (uri) {
            setImage(null); setVideo(uri); setMediaType('video');
            setTrustLevel('Needs Verification / Manual Location');
            Alert.alert('Notice', 'Please use the GPS button or enter the location manually.');
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
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
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

                    {/* ── Media Preview ── */}
                    <View style={styles.imageContainer}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.mediaImage} />
                        ) : video ? (
                            <View style={styles.videoPlaceholder}>
                                <Ionicons name="videocam" size={48} color={C.navyMid} />
                                <Text style={styles.videoText}>Video Selected</Text>
                            </View>
                        ) : (
                            <View style={styles.cameraPlaceholder}>
                                <Ionicons name="camera-outline" size={48} color={C.textTertiary} />
                                <Text style={styles.placeholderText}>Capture or select evidence</Text>
                                <Text style={styles.placeholderSub}>Up to 15s video or clear photo</Text>
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
                            numberOfLines={2}
                        />
                        <View style={styles.addressBtns}>
                            <TouchableOpacity style={styles.addrBtn} onPress={() => setIsMapVisible(true)}>
                                <Ionicons name="map" size={18} color={C.white} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.addrBtn, { backgroundColor: C.amber }]} onPress={handleDetectLocation}>
                                {loadingLocation ? <ActivityIndicator size="small" color={C.navy} /> : <Ionicons name="location" size={18} color={C.navy} />}
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
    headerTitle: { fontSize: 20, fontWeight: '700', color: C.white },

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
    stepDotText: { fontSize: 12, fontWeight: '700', color: C.textTertiary },
    stepDotTextActive: { fontSize: 12, fontWeight: '700', color: C.navy },
    stepLine: { width: 30, height: 2, backgroundColor: '#E5E7EB' },
    stepLineActive: { width: 30, height: 2, backgroundColor: C.amber },

    stepHeader: {
        fontSize: 15,
        fontWeight: '700',
        color: C.navyMid,
        marginBottom: 12,
        letterSpacing: -0.2,
    },

    imageContainer: {
        width: '100%',
        height: 220,
        backgroundColor: C.surfaceInput,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    mediaImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    cameraPlaceholder: { alignItems: 'center' },
    placeholderText: { fontSize: 14, fontWeight: '600', color: C.textSecondary, marginTop: 10 },
    placeholderSub: { fontSize: 12, color: C.textTertiary, marginTop: 4 },
    videoPlaceholder: { alignItems: 'center' },
    videoText: { fontSize: 14, fontWeight: '700', color: C.navyMid, marginTop: 8 },

    mediaBtnRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    mediaBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
    mediaBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
    mediaBtnText: { fontSize: 14, fontWeight: '700', color: C.white },
    mediaBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#C4C6D0', backgroundColor: C.surface },
    mediaBtnOutlineText: { fontSize: 14, fontWeight: '700', color: C.navyMid },

    banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: C.primarySurface, borderRadius: 12, borderWidth: 1, borderColor: C.navyMid + '40', marginBottom: 20 },
    bannerText: { fontSize: 13, fontWeight: '600' },

    fieldLabel: { fontSize: 12, fontWeight: '600', color: C.navyMid, marginBottom: 8, marginTop: 10 },
    addressBox: { flexDirection: 'row', backgroundColor: C.surfaceInput, borderRadius: 12, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, alignItems: 'center' },
    addressInput: { flex: 1, fontSize: 14, color: C.textPrimary, paddingRight: 10, paddingVertical: 8 },
    addressBtns: { flexDirection: 'row', gap: 6 },
    addrBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.navyMid, justifyContent: 'center', alignItems: 'center' },

    descBox: { backgroundColor: C.surfaceInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2, borderColor: 'transparent', marginBottom: 24 },
    descInput: { fontSize: 14, color: C.textPrimary, textAlignVertical: 'top', height: 80 },

    submitBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: C.amberDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
    submitText: { fontSize: 16, fontWeight: '800', color: C.navy },

    mapContainer: { flex: 1, backgroundColor: C.offWhite },
    map: { flex: 1 },
    mapHeaderLine: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface, padding: 16, borderRadius: 16, elevation: 4 },
    mapTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
    closeMap: { padding: 4 },
    mapConfirm: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: C.navyMid, padding: 16, borderRadius: 14, alignItems: 'center', elevation: 4 },
    mapConfirmText: { color: C.white, fontSize: 16, fontWeight: '700' },
});
