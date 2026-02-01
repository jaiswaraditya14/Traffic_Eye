import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../components/MobileContainer';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAppContext } from '../context/AppContext';

import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function NewReport({ navigation }) {
    const [image, setImage] = useState(null);
    const [video, setVideo] = useState(null);
    const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [loadingLocation, setLoadingLocation] = useState(false);
    const { setCurrentReport } = useAppContext();


    const pickImage = async () => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setVideo(null);
            setMediaType('image');
        }
    };

    const pickFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setVideo(null);
            setMediaType('image');
        }
    };

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 1,
            videoMaxDuration: 30, // 30 seconds max
        });

        if (!result.canceled) {
            setVideo(result.assets[0].uri);
            setImage(null);
            setMediaType('video');
        }
    };

    const recordVideo = async () => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 1,
            videoMaxDuration: 30, // 30 seconds max
        });

        if (!result.canceled) {
            setVideo(result.assets[0].uri);
            setImage(null);
            setMediaType('video');
        }
    };

    const detectLocation = async () => {
        try {
            setLoadingLocation(true);

            // Request location permissions
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Please enable location permissions to use this feature');
                setLoadingLocation(false);
                return;
            }

            // Get current location
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            // Reverse geocode to get address
            const addressData = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (addressData && addressData.length > 0) {
                const addr = addressData[0];
                const formattedAddress = [
                    addr.street,
                    addr.district,
                    addr.city,
                    addr.region,
                    addr.postalCode,
                    addr.country
                ].filter(Boolean).join(', ');

                setAddress(formattedAddress);
                Alert.alert('Success', 'Location detected successfully!');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to detect location. Please try again.');
            console.error(error);
        } finally {
            setLoadingLocation(false);
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
                            <Button onPress={pickImage} style={styles.cameraButton}>
                                <Ionicons name="camera" size={20} color={COLORS.white} />
                                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Take Photo</Text>
                            </Button>
                            <Button onPress={pickFromGallery} variant="secondary" style={styles.cameraButton}>
                                <Ionicons name="images" size={20} color={COLORS.primary} />
                                <Text style={styles.buttonTextSecondary}>From Gallery</Text>
                            </Button>
                        </View>

                        {/* Video Buttons */}
                        <View style={styles.cameraButtons}>
                            <Button onPress={recordVideo} style={styles.videoButton}>
                                <Ionicons name="videocam" size={20} color={COLORS.white} />
                                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Record Video</Text>
                            </Button>
                            <Button onPress={pickVideo} variant="secondary" style={styles.videoButton}>
                                <Ionicons name="film" size={20} color={COLORS.primary} />
                                <Text style={styles.buttonTextSecondary}>Select Video</Text>
                            </Button>
                        </View>

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
                                onPress={detectLocation}
                                disabled={loadingLocation}
                            >
                                {loadingLocation ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <Ionicons name="location" size={24} color={COLORS.white} />
                                )}
                            </TouchableOpacity>
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
    placeholderText: { fontSize: FONT_SIZES.sm, marginTop: SPACING.md },
    videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    videoText: { fontSize: FONT_SIZES.md, marginTop: SPACING.md, fontWeight: FONT_WEIGHTS.semibold },
    videoSubtext: { fontSize: FONT_SIZES.sm, marginTop: SPACING.xs },
    cameraButtons: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
    cameraButton: { flex: 1, flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center' },
    videoButton: { flex: 1, flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center' },
    buttonText: { fontWeight: FONT_WEIGHTS.semibold },
    buttonTextSecondary: { fontWeight: FONT_WEIGHTS.semibold },
    addressContainer: {
        position: 'relative',
        marginBottom: SPACING.lg
    },
    addressInput: {
        paddingRight: 64, // Add padding to prevent text from going under the button
    },
    locationButton: {
        position: 'absolute',
        right: 12,
        top: 44, // Adjusted to align better with input field
        backgroundColor: COLORS.primary,
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.md,
    },
});



