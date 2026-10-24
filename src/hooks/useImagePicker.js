// useImagePicker hook
// Encapsulates image picking and camera capture logic

import { useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, NativeModules } from 'react-native';

export const VIDEO_UPLOAD_LIMIT_BYTES = 12 * 1024 * 1024; // 12 MB
const VIDEO_THUMBNAIL_CACHE_PREFIX = 'traffic-eye:video-thumbnail:';

export async function generateVideoThumbnail(uri) {
    if (!uri) return null;
    try {
        const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: 0 });
        return thumbnailUri || null;
    } catch {
        // A missing frame must never be replaced with a video file or fake image.
        return null;
    }
}

export async function cacheVideoThumbnail(reportId, thumbnailUri) {
    if (!reportId || !thumbnailUri) return;
    try {
        await AsyncStorage.setItem(VIDEO_THUMBNAIL_CACHE_PREFIX + reportId, thumbnailUri);
    } catch {
        // The generated frame still works for the current flow if caching fails.
    }
}

export function getReportMediaInfo(report) {
    const videoMedia = report?.media?.find(media =>
        media.file_type === 'video' || media.mime_type?.startsWith('video/')
    );
    const isVideo = Boolean(videoMedia || report?.ai_raw_result?.source === 'manual_video');
    return {
        isVideo,
        videoUri: videoMedia?.file_url || (isVideo ? report?.image_url : null) || null,
        imageUri: isVideo ? null : report?.image_url || report?.media?.find(media => media.file_type === 'image')?.file_url || null,
        thumbnailUri: report?.thumbnail_url || videoMedia?.thumbnail_url || null,
    };
}

/** Resolve persisted frames first, then extract a real frame from local/remote video. */
export function useVideoThumbnails(reports) {
    const [thumbnails, setThumbnails] = useState({});
    useEffect(() => {
        let active = true;
        const resolveThumbnails = async () => {
            for (const report of reports || []) {
                const { isVideo, videoUri, thumbnailUri } = getReportMediaInfo(report);
                if (!isVideo || !report.id) continue;
                if (thumbnailUri) {
                    if (active) setThumbnails(previous => ({ ...previous, [report.id]: thumbnailUri }));
                    continue;
                }
                let resolved = null;
                try {
                    resolved = await AsyncStorage.getItem(VIDEO_THUMBNAIL_CACHE_PREFIX + report.id);
                } catch {
                    // Fall through to first-frame extraction when local storage is unavailable.
                }
                if (!resolved && videoUri) resolved = await generateVideoThumbnail(videoUri);
                if (resolved) await cacheVideoThumbnail(report.id, resolved);
                if (active && resolved) setThumbnails(previous => ({ ...previous, [report.id]: resolved }));
            }
        };
        resolveThumbnails();
        return () => { active = false; };
    }, [reports]);
    return thumbnails;
}

async function getAssetFileSize(asset) {
    if (Number.isFinite(asset.fileSize)) return asset.fileSize;
    try {
        const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
        if (info?.exists !== false && Number.isFinite(info?.size)) return info.size;
    } catch {
        // The upload service performs its own authoritative size check.
    }
    return null;
}

async function videoAssetMetadata(asset) {
    const fileSize = await getAssetFileSize(asset);
    if (fileSize != null && fileSize > VIDEO_UPLOAD_LIMIT_BYTES) {
        Alert.alert(
            'Video Too Large',
            `Please choose a video up to 12 MB. This video is ${(fileSize / (1024 * 1024)).toFixed(1)} MB.`
        );
        return null;
    }
    return {
        uri: asset.uri,
        exif: asset.exif || null,
        duration: asset.duration,
        mimeType: asset.mimeType,
        fileSize,
        fileName: asset.fileName,
        thumbnailUri: await generateVideoThumbnail(asset.uri),
    };
}

export default function useImagePicker() {
    const mounted = useRef(true);
    const [image, setImage] = useState(null);
    const [exifData, setExifData] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);
    const beginLoading = () => { if (mounted.current) setLoading(true); };
    const endLoading = () => { if (mounted.current) setLoading(false); };

    const pickFromGallery = async () => {
        try {
            beginLoading();
            // Android's system/document picker needs no broad-library grant.
            // Original-location access is requested by the extractor afterwards.
            if (Platform.OS !== 'android') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!mounted.current) return null;
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Please grant photo library access to select images.');
                    return null;
                }
            }

            const nativePicker = Platform.OS === 'android' && NativeModules.MediaStoreResolver?.pickOriginalImage;
            const selected = nativePicker ? await NativeModules.MediaStoreResolver.pickOriginalImage() : null;
            const result = nativePicker ? { canceled: !selected, assets: selected ? [selected] : [] } : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 1,
                exif: true,
                // ACTION_GET_CONTENT can provide an exact MediaStore/document
                // asset ID; opaque Photo Picker IDs cannot safely be guessed.
                legacy: Platform.OS === 'android',
            });
            if (!mounted.current) return null;

            if (!result.canceled && result.assets?.length > 0) {
                const asset = result.assets[0];
                const fileSize = await getAssetFileSize(asset);
                if (!mounted.current) return null;
                if (fileSize != null && fileSize > VIDEO_UPLOAD_LIMIT_BYTES) {
                    Alert.alert('Image Too Large', `Please choose an image up to 12 MB. This image is ${(fileSize / (1024 * 1024)).toFixed(1)} MB.`);
                    return null;
                }
                // Evidence metadata may contain private GPS or access-bearing URIs; never log it.
                if (mounted.current) setExifData(asset.exif || null);
                return {
                    uri: asset.uri,
                    sourceUri: asset.sourceUri || null,
                    selectionKind: 'gallery',
                    exif: asset.exif || null,
                    assetId: asset.assetId || null,
                    width: asset.width,
                    height: asset.height,
                    mimeType: asset.mimeType || null,
                    fileName: asset.fileName || null,
                    fileSize: asset.fileSize || null,
                };
            }
            return null;
        } catch (error) {
            if (mounted.current) Alert.alert('Error', 'Failed to pick image from gallery.');
            return null;
        } finally {
            endLoading();
        }
    };

    const captureFromCamera = async () => {
        try {
            beginLoading();
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (!mounted.current) return null;
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
            if (!mounted.current) return null;

            if (!result.canceled && result.assets?.length > 0) {
                const asset = result.assets[0];
                // Evidence metadata may contain private GPS or access-bearing URIs; never log it.
                if (mounted.current) setExifData(asset.exif || null);
                return {
                    uri: asset.uri,
                    exif: asset.exif || null,
                    assetId: asset.assetId || null,
                    width: asset.width,
                    height: asset.height,
                    mimeType: asset.mimeType || null,
                    fileName: asset.fileName || null,
                    fileSize: asset.fileSize || null,
                };
            }
            return null;
        } catch (error) {
            if (mounted.current) Alert.alert('Error', 'Failed to capture photo.');
            return null;
        } finally {
            endLoading();
        }
    };

    const pickVideoFromGallery = async () => {
        try {
            beginLoading();
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!mounted.current) return null;
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant photo library access to select videos.');
                return null;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                videoMaxDuration: 15,
                mediaTypes: ['videos'],
                allowsEditing: false,
                quality: 0.8,
                exif: true,
            });
            if (!mounted.current) return null;

            if (!result.canceled && result.assets?.length > 0) {
                const video = await videoAssetMetadata(result.assets[0]);
                return mounted.current ? video : null;
            }
            return null;
        } catch (error) {
            if (mounted.current) Alert.alert('Error', 'Failed to pick video from gallery.');
            return null;
        } finally {
            endLoading();
        }
    };

    const captureVideoFromCamera = async () => {
        try {
            beginLoading();
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (!mounted.current) return null;
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
            if (!mounted.current) return null;

            if (!result.canceled && result.assets?.length > 0) {
                const video = await videoAssetMetadata(result.assets[0]);
                return mounted.current ? video : null;
            }
            return null;
        } catch (error) {
            if (mounted.current) Alert.alert('Error', 'Failed to record video.');
            return null;
        } finally {
            endLoading();
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
