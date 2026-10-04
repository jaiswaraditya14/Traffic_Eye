/**
 * Local evidence metadata extraction. Never guesses asset identity or supplies
 * device coordinates. Run this before resizing/re-encoding the selected image.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Crypto from 'expo-crypto';
import { NativeModules, Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
import core from './exifGpsCore';
export const { parseSingleValue, parseCoordinateComponent, applyRef, validateCoordinates, hasValidGpsValues, parseExifGPS, parseJpegBinaryExif } = core;
const { inspectExifGPS, inspectJpegExif } = core;
const MAX_BYTES = 25 * 1024 * 1024;
const encoding = FileSystem.EncodingType?.Base64 || 'base64';

export function logExifDiagnostics({ exifExists, coordinates, isOriginal, sha256Result } = {}) {
    if (!__DEV__) return;
    console.log('[EXIF]', {
        exifFound: Boolean(exifExists), gpsFound: Boolean(coordinates),
        isOriginal: Boolean(isOriginal), hashAvailable: Boolean(sha256Result?.sha256),
    });
}
async function hashBytes(bytes) {
    try {
        const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (_) { return null; } // A base64-text hash is NOT an evidence-byte hash.
}
async function readBytes(uri, mimeType) {
    let temporary = null;
    try {
        if (!/^(file|content):\/\//i.test(uri || '')) return { status: 'FILE_ACCESS_FAILED' };
        let info = await Promise.resolve(FileSystem.getInfoAsync?.(uri)).catch(() => null);
        let readUri = uri;
        if (!Number.isFinite(info?.size) && uri.startsWith('content://') && FileSystem.copyAsync && FileSystem.cacheDirectory) {
            temporary = FileSystem.cacheDirectory + 'exif-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.bin';
            await FileSystem.copyAsync({ from: uri, to: temporary });
            info = await FileSystem.getInfoAsync(temporary);
            readUri = temporary;
        }
        if (info?.size > MAX_BYTES) return { status: 'FILE_TOO_LARGE' };
        const options = { encoding };
        // Known small files: one full read is reused for EXIF and hashing.
        // Unknown-size providers: bound memory rather than accepting an unlimited stream.
        if (!info?.size) { options.position = 0; options.length = MAX_BYTES + 1; }
        let base64;
        try { base64 = await FileSystem.readAsStringAsync(readUri, options); }
        catch (_) {
            if (temporary || !uri.startsWith('content://') || !FileSystem.copyAsync || !FileSystem.cacheDirectory) throw _;
            temporary = FileSystem.cacheDirectory + 'exif-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.bin';
            await FileSystem.copyAsync({ from: uri, to: temporary });
            info = await FileSystem.getInfoAsync(temporary);
            if (!info?.exists || info.size > MAX_BYTES) return { status: 'FILE_TOO_LARGE' };
            base64 = await FileSystem.readAsStringAsync(temporary, { encoding });
        }
        if (!base64) return { status: 'FILE_ACCESS_FAILED' };
        const bytes = new Uint8Array(decode(base64));
        if (bytes.length > MAX_BYTES) return { status: 'FILE_TOO_LARGE' };
        const jpeg = !mimeType || ['image/jpeg', 'image/jpg'].includes(mimeType);
        const metadata = jpeg ? inspectJpegExif(bytes) : { status: 'UNSUPPORTED_FORMAT', hasExif: false, coordinates: null };
        // Legacy Android bounded read uses a single InputStream.read(), which
        // may return a prefix. Never certify a prefix as a complete-file hash.
        const complete = Number.isFinite(info?.size) && info.size === bytes.length;
        if (!complete && !metadata.coordinates) metadata.status = 'PARTIAL_READ';
        return { ...metadata, accessible: true, sha256: complete ? await hashBytes(bytes) : null, bytesRead: bytes.length };
    } catch (_) { return { status: 'FILE_ACCESS_FAILED' }; }
    finally { if (temporary) await Promise.resolve(FileSystem.deleteAsync?.(temporary, { idempotent: true })).catch(() => {}); }
}

/** Stable reusable API; null fields mean unavailable, never an invented location. */
export async function extractExifFromImage(assetOrUri) {
    const asset = typeof assetOrUri === 'string' ? { uri: assetOrUri } : (assetOrUri || {});
    const pickerUri = asset.uri || null; // Preserve access-bearing query parameters.
    const selectedSourceUri = asset.sourceUri || pickerUri;
    let assetId = asset.assetId || asset.id || null;
    if (!assetId && pickerUri?.startsWith('ph://')) {
        try { assetId = decodeURIComponent(pickerUri.slice(5).split('?')[0]); } catch (_) { /* inaccessible Photos identifier */ }
    }
    const mimeType = asset.mimeType || (asset.type?.includes('/') ? asset.type : null);
    let originalUri = null, mediaPathType = 'PICKER_COPY', sha256 = null, hashSource = null;
    let coords = null, gpsSource = 'GPS_UNAVAILABLE', extractionMethod = null;
    let hasExif = false, hasGpsTags = false, accessible = false, status = 'FILE_ACCESS_FAILED';
    let originalUnavailable = false, originalInspected = false;
    let displayName = asset.fileName || null;
    const accept = (metadata, source, method) => {
        hasExif ||= Boolean(metadata.hasExif);
        hasGpsTags ||= Boolean(metadata.hasGpsTags);
        accessible ||= Boolean(metadata.accessible || metadata.hasExif);
        status = metadata.status || status;
        if (metadata.coordinates) { coords = metadata.coordinates; gpsSource = source; extractionMethod = method; }
    };

    // Permissions are requested BEFORE requireOriginal. Selected-only access and
    // ACCESS_MEDIA_LOCATION are independent; a native denial is not "GPS absent".
    const exactAndroidUri = Platform.OS === 'android' && (
        /^content:\/\/(media\/[^/]+\/images\/media\/\d+(?:\?|$)|com\.android\.providers\.media\.documents\/document\/)/.test(selectedSourceUri || '') ? selectedSourceUri :
        (typeof assetId === 'string' && /^\d+$/.test(assetId)) ?
            'content://media/external/images/media/' + assetId :
            null
    );
    if (Platform.OS === 'android' && asset.selectionKind === 'gallery' && !exactAndroidUri && !assetId) originalUnavailable = true;
    let permission = null;
    if (assetId || exactAndroidUri) {
        try {
            permission = await MediaLibrary.getPermissionsAsync(false, ['photo']);
            if (!permission?.granted) permission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
        } catch (_) { originalUnavailable = true; }
    }
    if (exactAndroidUri && NativeModules.MediaStoreResolver?.resolveOriginalMedia) {
        try {
            // Keep bridge ABI; unused hints are deliberately null, never identity evidence.
            const native = await NativeModules.MediaStoreResolver.resolveOriginalMedia(exactAndroidUri, null, null, null, null);
            if (native?.isOriginal) {
                originalUri = native.originalContentUri || native.uri;
                displayName = native.displayName || displayName;
                assetId = native.mediaStoreId || assetId;
                originalInspected = true;
                mediaPathType = 'ORIGINAL_CONTENT_URI';
                sha256 = native.sha256 || null; hashSource = sha256 ? 'ORIGINAL_BYTES' : null;
                const metadata = native.bytesBase64 ? inspectJpegExif(new Uint8Array(decode(native.bytesBase64))) : { status: 'UNSUPPORTED_FORMAT', hasExif: false };
                // Raw native tags use the same strict conversion as JS, not float getLatLong.
                const nativeTags = inspectExifGPS(native.exif);
                if (!metadata.coordinates && nativeTags.coordinates) metadata.coordinates = nativeTags.coordinates;
                metadata.hasExif ||= nativeTags.hasExif;
                metadata.hasGpsTags ||= nativeTags.hasGpsTags;
                if (metadata.status === 'UNSUPPORTED_FORMAT' && nativeTags.hasExif) metadata.status = nativeTags.hasGpsTags ? 'INVALID_GPS' : 'NO_GPS_DATA';
                // Backward-compatible native modules may only expose validated decimal GPS.
                if (!metadata.coordinates && native.gpsFound && !native.exif) metadata.coordinates = validateCoordinates(native.latitude, native.longitude);
                accept({ ...metadata, accessible: true }, 'EXIF_ORIGINAL', 'ORIGINAL_CONTENT_RESOLVER_BINARY');
            } else { originalUnavailable = true; }
        } catch (_) { originalUnavailable = true; }
    }
    if (!originalInspected && assetId && permission?.granted) {
        try {
            const info = await MediaLibrary.getAssetInfoAsync(assetId, { shouldDownloadFromNetwork: false });
            const uri = info?.localUri || info?.uri;
            if (uri && /^(file|content):\/\//.test(uri)) {
                const metadata = await readBytes(uri, mimeType);
                if (metadata.accessible) {
                    originalUri = uri; originalInspected = true; mediaPathType = 'ORIGINAL_FILE';
                    sha256 = metadata.sha256; hashSource = sha256 ? 'ORIGINAL_BYTES' : null;
                } else originalUnavailable = true;
                accept(metadata, 'EXIF_ORIGINAL', 'ORIGINAL_DCIM_BINARY_APP1');
            }
            const tags = inspectExifGPS(info?.exif);
            const indexed = validateCoordinates(info?.location?.latitude, info?.location?.longitude);
            if (!coords && (tags.coordinates || indexed)) {
                originalUri = uri || null;
                accept({ ...tags, coordinates: tags.coordinates || indexed, hasExif: true, accessible: true, status: 'GPS_FOUND' }, 'EXIF_ORIGINAL', tags.coordinates ? 'MEDIA_LIBRARY_EXIF' : 'MEDIA_LIBRARY_LOCATION');
            } else if (!originalInspected) originalUnavailable = true;
        } catch (_) { originalUnavailable = true; }
    } else if (assetId && !permission?.granted && !originalInspected) originalUnavailable = true;

    // Once original bytes were inspected, don't override their result with a
    // transformed picker copy or mix the original hash with picker provenance.
    if (!originalInspected && !coords) {
        const metadata = await readBytes(pickerUri, mimeType);
        accept(metadata, 'EXIF_PICKER_COPY', 'BINARY_APP1_HEADER');
        sha256 = metadata.sha256 || null; hashSource = sha256 ? 'PICKER_BYTES' : null;
        const tags = inspectExifGPS(asset.exif);
        if (!coords) accept({ ...tags, status: metadata.status, accessible: metadata.accessible }, 'EXIF_PICKER_COPY', 'PICKER_EXIF');
    }
    if (coords) { hasExif = true; status = 'GPS_FOUND'; }
    else if (originalUnavailable) status = 'ORIGINAL_METADATA_INACCESSIBLE';
    else if (['CORRUPT_METADATA', 'FILE_ACCESS_FAILED', 'FILE_TOO_LARGE', 'UNSUPPORTED_FORMAT', 'PARTIAL_READ'].includes(status)) { /* preserve failure */ }
    else status = hasGpsTags ? 'INVALID_GPS' : (hasExif ? 'NO_GPS_DATA' : 'NO_EXIF_DATA');
    const provenance = coords ? {
        source: gpsSource, method: extractionMethod, uri: gpsSource === 'EXIF_ORIGINAL' ? originalUri : pickerUri,
        assetId: gpsSource === 'EXIF_ORIGINAL' ? assetId : null,
    } : null;
    return {
        status, hasExif, hasGps: Boolean(coords), metadataAccessible: accessible, provenance,
        originalInspected, metadataProvenance: originalInspected ? 'ORIGINAL_BYTES' : (accessible ? 'PICKER_METADATA' : 'INACCESSIBLE'),
        latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null,
        lat: coords?.latitude ?? null, lng: coords?.longitude ?? null,
        source: gpsSource, gpsSource, gpsFound: Boolean(coords), reason: coords ? null : status,
        extractionMethod, sha256, hashSource, pickerUri,
        originalUri, originalContentUri: originalUri, mediaStoreId: assetId,
        displayName, mediaPathType, isOriginal: gpsSource === 'EXIF_ORIGINAL',
        isOriginalBytes: hashSource === 'ORIGINAL_BYTES',
    };
}
// Compatibility for existing callers that use null to mean "no selection".
export async function extractImageLocation(assetOrUri) {
    return assetOrUri ? extractExifFromImage(assetOrUri) : null;
}




