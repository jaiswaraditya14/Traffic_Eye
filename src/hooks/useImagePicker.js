// useImagePicker hook
// Encapsulates image picking and camera capture logic

import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const VIDEO_SIZE_LIMIT_BYTES = 5 * 1024 * 1024; // 5 MB

export default function useImagePicker() {
    const [image, setImage] = useState(null);
    const [exifData, setExifData] = useState(null);
    const [loading, setLoading] = useState(false);

    const pickFromGallery = async () => {
        try {
            setLoading(true);
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant photo library access to select images.');
                return null;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,  // Native OS crop — accurate & reliable
                quality: 0.92,
                exif: true,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const asset = result.assets[0];
                // BUG FIX: Do NOT call setImage here. NewReport opens the crop
                // modal after this returns. image is only committed once the user
                // confirms crop via handleCropDone → setImage(croppedUri).
                setExifData(asset.exif || null);
                // Return assetId so NewReport can use MediaLibrary for GPS lookup
                return { uri: asset.uri, exif: asset.exif || null, assetId: asset.assetId || null };
            }
            return { uri: null, location: null };
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image from gallery.');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const captureFromCamera = async () => {
        try {
            setLoading(true);
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant camera access to capture photos.');
                return null;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,  // Native OS crop — accurate & reliable
                quality: 0.92,
                exif: true,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const asset = result.assets[0];
                // BUG FIX: Do NOT set image here — the caller (NewReport) opens
                // the crop modal first. image is only set after crop is confirmed
                // via handleCropDone → setImage(croppedUri).
                setExifData(asset.exif || null);
                return { uri: asset.uri, exif: asset.exif || null, assetId: asset.assetId || null };
            }
            return { uri: null, location: null };
        } catch (error) {
            console.error('Error capturing image:', error);
            Alert.alert('Error', 'Failed to capture photo.');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const pickVideoFromGallery = async () => {
        try {
            setLoading(true);
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant photo library access to select videos.');
                return null;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                allowsEditing: false,
                quality: 0.8,
                exif: true,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const asset = result.assets[0];
                if (asset.fileSize && asset.fileSize > VIDEO_SIZE_LIMIT_BYTES) {
                    Alert.alert(
                        'Video Too Large',
                        `Please select a video under 5 MB. This video is ${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB.`
                    );
                    return null;
                }
                return { uri: asset.uri, exif: asset.exif || null };
            }
            return null;
        } catch (error) {
            console.error('Error picking video:', error);
            Alert.alert('Error', 'Failed to pick video from gallery.');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const captureVideoFromCamera = async () => {
        try {
            setLoading(true);
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant camera access to record videos.');
                return null;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['videos'],
                allowsEditing: false,
                quality: 0.8,
                exif: true,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const asset = result.assets[0];
                if (asset.fileSize && asset.fileSize > VIDEO_SIZE_LIMIT_BYTES) {
                    Alert.alert(
                        'Video Too Large',
                        `The recorded video exceeds 5 MB (${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB). Please record a shorter clip.`
                    );
                    return null;
                }
                return { uri: asset.uri, exif: asset.exif || null };
            }
            return null;
        } catch (error) {
            console.error('Error capturing video:', error);
            Alert.alert('Error', 'Failed to record video.');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const clearImage = () => {
        setImage(null);
        setExifData(null);
    };

    return {
        image,
        exifData,
        loading,
        pickFromGallery,
        captureFromCamera,
        pickVideoFromGallery,
        captureVideoFromCamera,
        clearImage,
        setImage,
        setExifData,
    };
}
