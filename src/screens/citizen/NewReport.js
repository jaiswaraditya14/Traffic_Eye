import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator, Modal } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer, Button, Input } from '../../components';
import { useAppContext } from '../../context';
import { useImagePicker, useLocation } from '../../hooks';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils';

export default function NewReport({ navigation }) {
    const {
        image,
        setImage,
        pickFromGallery: pickImageGallery,
        captureFromCamera: takePhoto,
        pickVideoFromGallery: pickVideoGallery,
        captureVideoFromCamera: recordVideo
    } = useImagePicker();

    const {
        location,
        address,
        setAddress,
        loading: loadingLocation,
        detectLocation,
        setManualLocation
    } = useLocation();

    const [trustLevel, setTrustLevel] = useState(null); // 'Verified Location', 'Gallery Upload', 'Needs Verification / Manual Location'
    
    const [isMapVisible, setIsMapVisible] = useState(false);
    const [selectedCoordinate, setSelectedCoordinate] = useState(null);
    const [mapRegion, setMapRegion] = useState({
        latitude: location?.latitude || 28.6139,
        longitude: location?.longitude || 77.2090,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });

    const [video, setVideo] = useState(null);
    const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
    const [description, setDescription] = useState('');

    const { setCurrentReport } = useAppContext();

    const handleTakePhoto = async () => {
        const result = await takePhoto();
        if (result && result.uri) {
            setVideo(null);
            setMediaType('image');
            setTrustLevel('Verified Location');
            detectLocation();
        }
    };

    const handlePickImage = async () => {
        const result = await pickImageGallery();
        if (result && result.uri) {
            setVideo(null);
            setMediaType('image');
            if (result.location) {
                setTrustLevel('Gallery Upload');
                setManualLocation(result.location);
                Alert.alert('Location Found', 'Location details dynamically extracted from your image.');
            } else {
                setTrustLevel('Needs Verification / Manual Location');
                Alert.alert('Notice', 'No location data found in image. Please use the GPS button or enter the location manually.');
            }
        }
    };

    const handleRecordVideo = async () => {
        const uri = await recordVideo();
        if (uri) {
            setImage(null);
            setVideo(uri);
            setMediaType('video');
            setTrustLevel('Verified Location');
            detectLocation();
        }
    };

    const handlePickVideo = async () => {
        const uri = await pickVideoGallery();
        if (uri) {
            setImage(null);
            setVideo(uri);
            setMediaType('video');
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
            location,
            trustLevel: trustLevel || 'Needs Verification / Manual Location',
            timestamp: new Date()
        });
        navigation.navigate('AIProcessing');
    };

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>New Report</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.content}>
                        {/* Media Capture Area */}
                        <View style={styles.imageContainer}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.image} />
                            ) : video ? (
                                <View style={styles.videoPlaceholder}>
                                    <Ionicons name="videocam" size={64} color={COLORS.primary} />
                                    <Text style={styles.videoText}>Video Selected</Text>
                                    <Text style={styles.videoSubtext}>Ready to submit</Text>
                                </View>
                            ) : (
                                <View style={styles.placeholder}>
                                    <Ionicons name="camera" size={64} color={COLORS.gray400} />
                                    <Text style={styles.placeholderText}>Capture or select violation photo/video</Text>
                                </View>
                            )}
                        </View>

                        {/* Photo Buttons */}
                        <View style={styles.cameraButtons}>
                            <Button onPress={handleTakePhoto} style={styles.cameraButton}>
                                <Ionicons name="camera" size={20} color={COLORS.white} />
                                <Text style={styles.buttonText}>Take Photo</Text>
                            </Button>
                            <Button onPress={handlePickImage} variant="secondary" style={styles.cameraButton}>
                                <Ionicons name="images" size={20} color={COLORS.primary} />
                                <Text style={styles.buttonTextSecondary}>Gallery Photo</Text>
                            </Button>
                        </View>

                        {/* Video Buttons */}
                        <View style={styles.cameraButtons}>
                            <Button onPress={handleRecordVideo} style={[styles.cameraButton, { backgroundColor: COLORS.secondary }]}>
                                <Ionicons name="videocam" size={20} color={COLORS.white} />
                                <Text style={styles.buttonText}>Record Video</Text>
                            </Button>
                            <Button onPress={handlePickVideo} variant="secondary" style={styles.cameraButton}>
                                <Ionicons name="film" size={20} color={COLORS.primary} />
                                <Text style={styles.buttonTextSecondary}>Gallery Video</Text>
                            </Button>
                        </View>

                        {/* Address with Auto-Detect */}
                        <View style={styles.addressContainer}>
                            <Input
                                label={`Location Address ${trustLevel ? `(${trustLevel})` : ''}`}
                                placeholder="Enter address or use GPS..."
                                value={address}
                                onChangeText={setAddress}
                                multiline
                                numberOfLines={2}
                                inputStyle={styles.addressInput}
                            />
                            <View style={styles.locationButtonsWrapper}>
                                <TouchableOpacity
                                    style={styles.mapButton}
                                    onPress={() => setIsMapVisible(true)}
                                >
                                    <Ionicons name="map" size={20} color={COLORS.white} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.locationButtonRight}
                                    onPress={handleDetectLocation}
                                    disabled={loadingLocation}
                                >
                                    {loadingLocation ? (
                                        <ActivityIndicator size="small" color={COLORS.white} />
                                    ) : (
                                        <Ionicons name="location" size={20} color={COLORS.white} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Description */}
                        <Input
                            label="Description (Optional)"
                            placeholder="Add details about the violation..."
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                        />

                        {/* Submit Button */}
                        <Button onPress={handleSubmit} fullWidth disabled={!image && !video}>
                            Submit Report
                        </Button>
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Map Picker Modal */}
            <Modal visible={isMapVisible} animationType="slide">
                <View style={styles.mapContainer}>
                    <MapView
                        style={styles.map}
                        region={mapRegion}
                        onRegionChangeComplete={setMapRegion}
                        onPress={(e) => setSelectedCoordinate(e.nativeEvent.coordinate)}
                        showsUserLocation={true}
                    >
                        {selectedCoordinate && (
                            <Marker coordinate={selectedCoordinate} />
                        )}
                        {!selectedCoordinate && location && (
                            <Marker coordinate={location} pinColor="blue" />
                        )}
                    </MapView>
                    
                    <View style={styles.mapHeader}>
                        <Text style={styles.mapTitle}>Tap Map to Select Location</Text>
                        <TouchableOpacity onPress={() => setIsMapVisible(false)} style={styles.closeMapButton}>
                            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.mapFooter}>
                        <Button 
                            fullWidth 
                            disabled={!selectedCoordinate && !location}
                            onPress={() => {
                                setIsMapVisible(false);
                                setTrustLevel('Manual Location');
                                if (selectedCoordinate) {
                                    setManualLocation(selectedCoordinate);
                                } else if (location) {
                                    setManualLocation(location);
                                }
                            }}
                        >
                            Confirm Location
                        </Button>
                    </View>
                </View>
            </Modal>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    title: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold },
    scrollContent: { flex: 1 },
    content: { flex: 1, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
    imageContainer: { width: '100%', height: 300, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.lg, ...SHADOWS.md },
    image: { width: '100%', height: '100%' },
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    placeholderText: { fontSize: FONT_SIZES.sm, marginTop: SPACING.md, textAlign: 'center', color: COLORS.textSecondary },
    videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    videoText: { fontSize: FONT_SIZES.md, marginTop: SPACING.md, fontWeight: FONT_WEIGHTS.semibold },
    videoSubtext: { fontSize: FONT_SIZES.sm, marginTop: SPACING.xs, color: COLORS.textSecondary },
    cameraButtons: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
    cameraButton: { flex: 1, flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center' },
    buttonText: { fontWeight: FONT_WEIGHTS.semibold, color: COLORS.white },
    buttonTextSecondary: { fontWeight: FONT_WEIGHTS.semibold, color: COLORS.primary },
    addressContainer: {
        position: 'relative',
        marginBottom: SPACING.lg
    },
    addressInput: {
        paddingRight: 110,
    },
    locationButtonsWrapper: {
        position: 'absolute',
        right: 12,
        top: 40,
        flexDirection: 'row',
        gap: SPACING.md,
    },
    mapButton: {
        backgroundColor: COLORS.secondary,
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.md,
    },
    locationButtonRight: {
        backgroundColor: COLORS.primary,
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.md,
    },
    mapContainer: { flex: 1, backgroundColor: COLORS.white },
    map: { width: '100%', height: '100%' },
    mapHeader: { position: 'absolute', top: 50, left: SPACING.lg, right: SPACING.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.md },
    mapTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold },
    closeMapButton: { padding: SPACING.xs },
    mapFooter: { position: 'absolute', bottom: 40, left: SPACING.lg, right: SPACING.lg, backgroundColor: COLORS.white, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.lg },
});
