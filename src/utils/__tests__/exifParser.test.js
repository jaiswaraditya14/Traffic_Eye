/* eslint-env jest */
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Crypto from 'expo-crypto';
import { NativeModules, Platform } from 'react-native';
import {
    applyRef,
    extractImageLocation,
    hasValidGpsValues,
    logExifDiagnostics,
    parseCoordinateComponent,
    parseExifGPS,
    parseJpegBinaryExif,
    parseSingleValue,
    validateCoordinates,
} from '../exifParser.js';
import { createGpsJpegFixture } from './fixtures/gpsJpegFixture';

// Mock only platform I/O. Every parser and extraction decision under test is
// imported from the production module; neither Core parser copy is imported.
jest.mock('expo-file-system/legacy', () => ({
    readAsStringAsync: jest.fn(),
    EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-media-library', () => ({
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    getAssetsAsync: jest.fn(),
    getAssetInfoAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
    digest: jest.fn(),
    digestStringAsync: jest.fn(),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    CryptoEncoding: { HEX: 'hex' },
}));
jest.mock('react-native', () => ({
    NativeModules: { MediaStoreResolver: { resolveOriginalMedia: jest.fn() } },
    Platform: { OS: 'android' },
}));

const pickerUri = 'file:///synthetic-selected-image.jpg';
const originalUri = 'content://synthetic.media/images/selected-id';
const nativeResolver = NativeModules.MediaStoreResolver.resolveOriginalMedia;
const gps = {
    GPSLatitude: [12, 30, 0],
    GPSLatitudeRef: 'N',
    GPSLongitude: [45, 15, 0],
    GPSLongitudeRef: 'E',
};

beforeEach(() => {
    jest.resetAllMocks();
    global.__DEV__ = true;
    Platform.OS = 'android';
    nativeResolver.mockResolvedValue(null);
    FileSystem.readAsStringAsync.mockResolvedValue(null);
    MediaLibrary.getPermissionsAsync.mockResolvedValue({ granted: false });
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ granted: false });
    MediaLibrary.getAssetsAsync.mockResolvedValue({ assets: [] });
    MediaLibrary.getAssetInfoAsync.mockResolvedValue(null);
    // Capture diagnostics to assert privacy without writing metadata to CI output.
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    global.__DEV__ = true;
    jest.restoreAllMocks();
});

describe('production EXIF normalization', () => {
    test.each([
        ['numeric decimal', 12.5],
        ['decimal string', '12.5'],
        ['rational string', '25/2'],
        ['rational object', { numerator: 25, denominator: 2 }],
        ['short rational object', { num: 25, den: 2 }],
    ])('parses a %s', (_name, value) => {
        expect(parseSingleValue(value)).toBe(12.5);
    });

    test.each([
        ['missing', undefined], ['null', null], ['NaN', NaN],
        ['infinity', Infinity], ['unparseable', 'invalid'],
        ['zero object denominator', { numerator: 1, denominator: 0 }],
    ])('rejects a %s single value', (_name, value) => {
        expect(parseSingleValue(value)).toBeNull();
    });

    test.each([
        ['numeric DMS', [12, 30, 0]],
        ['rational DMS strings', ['12/1', '30/1', '0/1']],
        ['rational DMS objects', [
            { numerator: 12, denominator: 1 },
            { numerator: 30, denominator: 1 },
            { numerator: 0, denominator: 1 },
        ]],
        ['flat rational pairs', [12, 1, 30, 1, 0, 1]],
        ['spaced rational string', '12/1, 30/1, 0/1'],
        ['compact rational string', '12/1,30/1,0/1'],
        ['formatted DMS', '12 deg 30\' 0" N'],
    ])('parses %s', (_name, value) => {
        expect(parseCoordinateComponent(value)).toBeCloseTo(12.5, 6);
    });

    test('returns the runtime coordinate field names and aliases', () => {
        expect(parseExifGPS(gps)).toEqual({
            latitude: 12.5, longitude: 45.25, lat: 12.5, lng: 45.25,
        });
    });

    test.each(['{GPS}', 'GPS', 'gps', 'Gps', 'GPSInfo'])('supports the %s nested block', (key) => {
        expect(parseExifGPS({ [key]: {
            Latitude: 12.5, Longitude: 45.25, LatitudeRef: 'N', LongitudeRef: 'E',
        } })).toMatchObject({ latitude: 12.5, longitude: 45.25 });
    });

    test('applies south and west references to rational DMS', () => {
        expect(parseExifGPS({ ...gps, GPSLatitudeRef: 'S', GPSLongitudeRef: 'W' }))
            .toMatchObject({ latitude: -12.5, longitude: -45.25 });
    });

    test.each([
        ['north', 'N', 12.5], ['east', 'E', 12.5],
        ['south', 'S', -12.5], ['west', 'W', -12.5],
    ])('applies the %s reference', (_name, ref, result) => {
        expect(applyRef(12.5, ref)).toBe(result);
    });

    test.each([
        ['absent EXIF', null], ['undefined EXIF', undefined], ['empty EXIF', {}],
        ['EXIF without GPS', { Make: 'synthetic-camera' }],
        ['partial GPS', { GPSLatitude: 12.5 }],
        ['corrupt GPS', { GPSLatitude: 'invalid', GPSLongitude: 'invalid' }],
    ])('returns unavailable for %s', (_name, exif) => {
        expect(parseExifGPS(exif)).toBeNull();
    });

    test.each([
        ['latitude above bounds', 91, 45], ['latitude below bounds', -91, 45],
        ['longitude above bounds', 12, 181], ['longitude below bounds', 12, -181],
        ['non-finite latitude', NaN, 45], ['non-finite longitude', 12, Infinity],
    ])('rejects %s', (_name, latitude, longitude) => {
        expect(validateCoordinates(latitude, longitude)).toBeNull();
    });

    test('distinguishes missing tags from Android redaction', () => {
        expect(hasValidGpsValues(undefined, undefined, undefined, undefined))
            .toMatchObject({ valid: false, state: 'GPS_NOT_PRESENT', reason: 'NO_GPS_TAGS' });
        expect(hasValidGpsValues(0, 0, '', ''))
            .toMatchObject({ valid: false, state: 'GPS_UNAVAILABLE', reason: 'ANDROID_PHOTO_PICKER_REDACTION' });
        expect(parseExifGPS({ GPSLatitude: 0, GPSLongitude: 0, GPSLatitudeRef: '', GPSLongitudeRef: '' }))
            .toBeNull();
    });
});

describe('production JPEG byte parser', () => {
    test.each(['little', 'big'])('reads a synthetic JPEG with %s-endian GPS TIFF', (byteOrder) => {
        expect(parseJpegBinaryExif(createGpsJpegFixture({ byteOrder })))
            .toMatchObject({ latitude: 12.5, longitude: 45.25 });
    });

    test('applies south/west from the binary fixture', () => {
        expect(parseJpegBinaryExif(createGpsJpegFixture({ latitudeRef: 'S', longitudeRef: 'W' })))
            .toMatchObject({ latitude: -12.5, longitude: -45.25 });
    });

    test.each([
        ['missing bytes', null], ['empty bytes', new Uint8Array()],
        ['short JPEG', new Uint8Array([0xff, 0xd8, 0xff, 0xd9])],
        ['non-JPEG bytes', new Uint8Array(64)],
    ])('returns unavailable for %s', (_name, bytes) => {
        expect(parseJpegBinaryExif(bytes)).toBeNull();
    });
});

describe('production extraction pipeline with mocked platform I/O', () => {
    test('does not fabricate a result for an absent selection', async () => {
        expect(await extractImageLocation(null)).toBeNull();
        expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
    });

    test('labels valid picker metadata as picker-copy EXIF after permission denial', async () => {
        const result = await extractImageLocation({ uri: pickerUri, mimeType: 'image/jpeg', exif: gps });
        expect(result).toMatchObject({ gpsFound: true, source: 'EXIF_PICKER_COPY', isOriginal: false });
        expect(MediaLibrary.getAssetInfoAsync).not.toHaveBeenCalled();
    });

    test('permission rejection reaches the actual picker fallback without throwing', async () => {
        MediaLibrary.getPermissionsAsync.mockRejectedValue(new Error('ExpoMediaLibrary permission denied'));
        const result = await extractImageLocation({ uri: pickerUri, mimeType: 'image/jpeg', exif: gps });
        expect(result).toMatchObject({ gpsFound: true, source: 'EXIF_PICKER_COPY' });
    });

    test('iOS camera metadata without GPS remains unavailable', async () => {
        Platform.OS = 'ios';
        const result = await extractImageLocation({ uri: pickerUri, mimeType: 'image/jpeg', exif: {} });
        expect(result).toMatchObject({ gpsFound: false, latitude: null, longitude: null, source: 'GPS_UNAVAILABLE' });
        expect(nativeResolver).not.toHaveBeenCalled();
    });

    test('reads the exact supplied MediaLibrary asset ID without a gallery search', async () => {
        MediaLibrary.getPermissionsAsync.mockResolvedValue({ granted: true });
        MediaLibrary.getAssetInfoAsync.mockResolvedValue({
            uri: originalUri, location: { latitude: 12.5, longitude: 45.25 },
        });
        const result = await extractImageLocation({ uri: pickerUri, assetId: 'selected-id', mimeType: 'image/jpeg' });
        expect(MediaLibrary.getAssetInfoAsync).toHaveBeenCalledWith('selected-id', { shouldDownloadFromNetwork: false });
        expect(MediaLibrary.getAssetsAsync).not.toHaveBeenCalled();
        expect(result).toMatchObject({ gpsFound: true, source: 'EXIF_ORIGINAL', mediaStoreId: 'selected-id' });
    });

    test('parses JPEG fixture bytes through the real file-read fallback', async () => {
        FileSystem.readAsStringAsync.mockResolvedValue(Buffer.from(createGpsJpegFixture()).toString('base64'));
        Crypto.digest.mockResolvedValue(new Uint8Array(32).buffer);
        const result = await extractImageLocation({ uri: pickerUri, mimeType: 'image/jpeg' });
        expect(result).toMatchObject({ gpsFound: true, source: 'EXIF_PICKER_COPY', extractionMethod: 'BINARY_APP1_HEADER' });
        expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(pickerUri, expect.objectContaining({ position: 0 }));
    });

    test.each(['image/png', 'image/heic', 'image/heif', 'image/webp'])('does not JPEG-parse picker bytes marked %s', async (mimeType) => {
        FileSystem.readAsStringAsync.mockResolvedValue(Buffer.from(createGpsJpegFixture()).toString('base64'));
        Crypto.digest.mockResolvedValue(new Uint8Array(32).buffer);
        const result = await extractImageLocation({ uri: pickerUri, mimeType });
        expect(result).toMatchObject({ gpsFound: false, source: 'GPS_UNAVAILABLE' });
        // The one read is hashing I/O, not a JPEG header extraction.
        expect(FileSystem.readAsStringAsync).toHaveBeenCalledTimes(1);
        expect(FileSystem.readAsStringAsync).not.toHaveBeenCalledWith(pickerUri, expect.objectContaining({ position: 0 }));
    });

    test('passes decoded file bytes to the production Crypto.digest path', async () => {
        const syntheticBytes = new Uint8Array([0, 1, 2, 127, 128, 255]);
        FileSystem.readAsStringAsync.mockResolvedValue(Buffer.from(syntheticBytes).toString('base64'));
        Crypto.digest.mockResolvedValue(new Uint8Array(32).fill(0xab).buffer);
        const result = await extractImageLocation({ uri: pickerUri, mimeType: 'image/png' });
        const [algorithm, bytes] = Crypto.digest.mock.calls[0];
        expect(algorithm).toBe('SHA-256');
        expect(Array.from(new Uint8Array(bytes))).toEqual(Array.from(syntheticBytes));
        expect(Crypto.digestStringAsync).not.toHaveBeenCalled();
        expect(result.sha256).toBe('ab'.repeat(32));
    });
});

describe('EXIF diagnostics privacy', () => {
    test('parsing does not log raw EXIF or coordinates', () => {
        parseExifGPS(gps);
        parseExifGPS({ GPSLatitude: 12.5, GPSLongitude: 45.25, GPSLatitudeRef: pickerUri });
        expect(console.log).not.toHaveBeenCalled();
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
    });

    test('development diagnostics contain only boolean availability flags', () => {
        logExifDiagnostics({
            pickerUri, originalUri, originalContentUri: originalUri,
            fileName: 'private-filename', assetId: 'private-asset', mediaStoreId: 'private-media-id',
            exifExists: true, gpsTags: gps, coordinates: { latitude: 12.5, longitude: 45.25 },
            isOriginal: false, gpsSource: pickerUri, reason: pickerUri, extractionMethod: pickerUri,
            sha256Result: { sha256: 'private-evidence-hash', sourceUri: pickerUri },
        });
        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith('[EXIF]', {
            exifFound: true, gpsFound: true, isOriginal: false, hashAvailable: true,
        });
    });

    test('production diagnostics are silent', () => {
        global.__DEV__ = false;
        logExifDiagnostics({ exifExists: true, coordinates: gps });
        expect(console.log).not.toHaveBeenCalled();
    });

    test('platform errors containing a URI are not echoed', async () => {
        nativeResolver.mockRejectedValue(new Error(originalUri));
        MediaLibrary.getPermissionsAsync.mockRejectedValue(new Error(pickerUri));
        FileSystem.readAsStringAsync.mockRejectedValue(new Error(pickerUri));
        await extractImageLocation({ uri: pickerUri, mimeType: 'image/jpeg' });
        const logs = JSON.stringify([console.log.mock.calls, console.warn.mock.calls, console.error.mock.calls]);
        expect(logs.includes(pickerUri)).toBe(false);
        expect(logs.includes(originalUri)).toBe(false);
    });
});

// These are deferred Phase 4 requirements, not passing coverage claims. The
// existing Core/CoreCommonJS copies remain unused by this suite until Phase 4
// consolidates production parsing. Do not assert the current defects are valid.
describe('deferred Phase 4 EXIF repair requirements', () => {
    test.todo('accept valid numeric zero latitude and zero longitude through the complete parser');
    test.todo('accept inherently signed decimal GPS without hemisphere refs');
    test.todo('reject trailing junk, zero string denominators, invalid DMS ranges, and contradictory refs');
    test.todo('bound all JPEG/TIFF reads and continue past non-EXIF APP1 segments');
    test.todo('preserve full URI query parameters through extraction and hashing');
    test.todo('never resolve a null asset ID by filename, dimensions, or recent-gallery heuristics');
    test.todo('never replace a raw-byte hash with a hash of base64 text when Crypto.digest fails');
    test.todo('consolidate the unused Core/CoreCommonJS parser copies with the production parser');
});
