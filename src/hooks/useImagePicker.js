// useImagePicker hook
// Encapsulates image picking and camera capture logic

import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
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

            // Request MediaLibrary permission on Android for photo/video only (avoid audio permission rejection)
            try {
                let mPerm = await MediaLibrary.getPermissionsAsync(false, ['photo', 'video']);
                if (!mPerm?.granted) {
                    await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
                }
            } catch (pErr) {
                // Non-fatal if platform doesn't support MediaLibrary request
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 1,
                exif: true,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const asset = result.assets[0];
                try {
                    console.log('[IMAGE ASSET]', JSON.stringify(asset, null, 2));
                } catch {
                    console.log('[IMAGE ASSET]', asset);
                }
                setExifData(asset.exif || null);
                return {
                    uri: asset.uri,
                    exif: asset.exif || null,
                    assetId: asset.assetId || null,
                    width: asset.width,
                    height: asset.height,
                    mimeType: asset.mimeType || asset.type || 'image/jpeg',
                    fileName: asset.fileName || null,
                    fileSize: asset.fileSize || null,
                };
            }
            return null;
        } catch (error) {
            console.error('[useImagePicker] Error picking image:', error);
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
                allowsEditing: false,
                quality: 1,
                exif: true,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const asset = result.assets[0];
                try {
                    console.log('[IMAGE ASSET]', JSON.stringify(asset, null, 2));
                } catch {
                    console.log('[IMAGE ASSET]', asset);
                }
                setExifData(asset.exif || null);
                return {
                    uri: asset.uri,
                    exif: asset.exif || null,
                    assetId: asset.assetId || null,
                    width: asset.width,
                    height: asset.height,
                    mimeType: asset.mimeType || asset.type || 'image/jpeg',
                    fileName: asset.fileName || null,
                    fileSize: asset.fileSize || null,
                };
            }
            return null;
        } catch (error) {
            console.error('[useImagePicker] Error capturing image:', error);
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
