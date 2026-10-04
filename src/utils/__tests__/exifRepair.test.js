/* eslint-env jest */
import fs from 'fs';
import path from 'path';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Crypto from 'expo-crypto';
import { NativeModules } from 'react-native';
import { Platform } from 'react-native';
import { computeFileSha256 } from '../fileHash';
import {
    extractImageLocation, parseSingleValue, parseCoordinateComponent,
    parseExifGPS, parseJpegBinaryExif, validateCoordinates,
} from '../exifParser';
import { createGpsJpegFixture } from './fixtures/gpsJpegFixture';

jest.mock('expo-file-system/legacy', () => ({
    readAsStringAsync: jest.fn(), getInfoAsync: jest.fn(), copyAsync: jest.fn(), deleteAsync: jest.fn(),
    cacheDirectory: 'file:///cache/', EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-media-library', () => ({
    getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(),
    getAssetsAsync: jest.fn(), getAssetInfoAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
    digest: jest.fn(), digestStringAsync: jest.fn(), CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));
jest.mock('react-native', () => ({
    NativeModules: { MediaStoreResolver: { resolveOriginalMedia: jest.fn() } }, Platform: { OS: 'android' },
}));
const gps = { GPSLatitude: [12, 30, 0], GPSLatitudeRef: 'N', GPSLongitude: [45, 15, 0], GPSLongitudeRef: 'E' };
beforeEach(() => {
    jest.resetAllMocks();
    global.__DEV__ = false;
    Platform.OS = 'android';
    MediaLibrary.getPermissionsAsync.mockResolvedValue({ granted: false });
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ granted: false });
    FileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 202 });
    FileSystem.readAsStringAsync.mockResolvedValue(Buffer.from(createGpsJpegFixture()).toString('base64'));
    Crypto.digest.mockImplementation(async (_algorithm, bytes) => {
        const crypto = require('crypto');
        return Uint8Array.from(crypto.createHash('sha256').update(Buffer.from(bytes)).digest()).buffer;
    });
});

test('all parser entry points share the canonical implementation', () => {
    const nodeCore = require('../exifParserCoreCommonJS');
    const esCore = require('../exifParserCore');
    expect(nodeCore.parseExifGPS).toBe(parseExifGPS);
    expect(esCore.parseExifGPS).toBe(parseExifGPS);
});
test('every truncated TIFF prefix fails safely without a location', () => {
    const bytes = createGpsJpegFixture();
    for (let size = 0; size < 200; size++) {
        expect(() => parseJpegBinaryExif(bytes.subarray(0, size))).not.toThrow();
        expect(parseJpegBinaryExif(bytes.subarray(0, size))).toBeNull();
    }
});
test.each(['E', 'W', 'junk'])('rejects wrong-axis latitude reference %s', ref => {
    expect(parseExifGPS({ ...gps, GPSLatitudeRef: ref })).toBeNull();
});
test('does not merge partial pairs from different metadata blocks', () => {
    expect(parseExifGPS({ latitude: 12, GPS: { Longitude: 45 } })).toBeNull();
});
test('distinguishes original permission failure from absent GPS in an accessible copy', async () => {
    NativeModules.MediaStoreResolver.resolveOriginalMedia.mockResolvedValue({ isOriginal: false, reason: 'ORIGINAL_PERMISSION_DENIED' });
    const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'test_exif.jpeg'));
    FileSystem.readAsStringAsync.mockResolvedValue(fixture.toString('base64'));
    const result = await extractImageLocation({ uri: 'file:///copy.jpg', assetId: '17' });
    expect(result).toMatchObject({ status: 'ORIGINAL_METADATA_INACCESSIBLE', hasGps: false, metadataAccessible: true });
    expect(NativeModules.MediaStoreResolver.resolveOriginalMedia).toHaveBeenCalledWith('content://media/external/images/media/17', null, null, null, null);
});
test('requests original permissions before reading native original bytes and preserves their hash', async () => {
    NativeModules.MediaStoreResolver.resolveOriginalMedia.mockResolvedValue({
        isOriginal: true, originalContentUri: 'content://media/external/images/media/17?requireOriginal=1',
        bytesBase64: Buffer.from(createGpsJpegFixture()).toString('base64'), sha256: 'ab'.repeat(32),
    });
    const result = await extractImageLocation({ uri: 'file:///copy.jpg', assetId: '17' });
    expect(MediaLibrary.requestPermissionsAsync.mock.invocationCallOrder[0])
        .toBeLessThan(NativeModules.MediaStoreResolver.resolveOriginalMedia.mock.invocationCallOrder[0]);
    expect(result).toMatchObject({ status: 'GPS_FOUND', latitude: 12.5, longitude: 45.25, hashSource: 'ORIGINAL_BYTES', provenance: { source: 'EXIF_ORIGINAL' } });
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
});
test('resolves an exact iOS Photos identifier to a local file without cloud downloading', async () => {
    Platform.OS = 'ios';
    MediaLibrary.getPermissionsAsync.mockResolvedValue({ granted: true });
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({ localUri: 'file:///original.jpg' });
    const result = await extractImageLocation({ uri: 'ph://EXACT%2FIDENTIFIER' });
    expect(MediaLibrary.getAssetInfoAsync).toHaveBeenCalledWith('EXACT/IDENTIFIER', { shouldDownloadFromNetwork: false });
    expect(result).toMatchObject({ status: 'GPS_FOUND', provenance: { source: 'EXIF_ORIGINAL' } });
});
test('malformed Photos URI is unavailable, not an exception or guessed file', async () => {
    Platform.OS = 'ios';
    expect(await extractImageLocation({ uri: 'ph://%' })).toMatchObject({ hasGps: false, status: 'FILE_ACCESS_FAILED' });
});
test('content provider read failure copies the same URI locally and cleans up', async () => {
    FileSystem.readAsStringAsync.mockRejectedValueOnce(new Error('denied'));
    const uri = 'content://documents/document/photo?token=needed';
    expect(await extractImageLocation(uri)).toMatchObject({ status: 'GPS_FOUND' });
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({ from: uri, to: expect.stringContaining('file:///cache/exif-') });
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(expect.stringContaining('file:///cache/exif-'), { idempotent: true });
});
test('read failures never invoke device GPS or return substitute coordinates', async () => {
    FileSystem.readAsStringAsync.mockRejectedValue(new Error('private URI'));
    expect(await extractImageLocation('file:///unreadable.jpg')).toMatchObject({ hasExif: false, hasGps: false, status: 'FILE_ACCESS_FAILED', provenance: null });
});
test('unknown-size reads never hash a possibly partial InputStream result', async () => {
    FileSystem.getInfoAsync.mockResolvedValue({ exists: true });
    expect(await extractImageLocation('file:///unknown-size.jpg')).toMatchObject({ sha256: null });
    expect(Crypto.digest).not.toHaveBeenCalled();
});
test('oversized images fail gracefully before binary reading', async () => {
    FileSystem.getInfoAsync.mockResolvedValue({ size: 26 * 1024 * 1024 });
    expect(await extractImageLocation('file:///huge.jpg')).toMatchObject({ status: 'FILE_TOO_LARGE', hasGps: false });
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
});
test('legacy hashing also preserves URI access and never hashes base64 text', async () => {
    const uri = 'content://provider/photo?token=needed';
    expect(await computeFileSha256(uri)).toMatchObject({ sourceUri: uri, fileSize: 202 });
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(uri, { encoding: 'base64' });
    Crypto.digest.mockRejectedValue(new Error('unavailable'));
    expect(await computeFileSha256(uri)).toBeNull();
    expect(Crypto.digestStringAsync).not.toHaveBeenCalled();
});
afterEach(() => { global.__DEV__ = true; });

test.each([[0, 0], [0, 45], [12, 0]])('accepts valid coordinate (%s,%s)', (lat, lng) => {
    expect(validateCoordinates(lat, lng)).toMatchObject({ latitude: lat, longitude: lng });
    expect(parseExifGPS({ latitude: lat, longitude: lng })).toMatchObject({ latitude: lat, longitude: lng });
});
test('accepts signed decimal coordinates without refs', () => {
    expect(parseExifGPS({ latitude: -12.5, longitude: -45.25 })).toMatchObject({ latitude: -12.5, longitude: -45.25 });
});
test.each(['12garbage', '1/0', '1/0junk', '1/2/3', '', { numerator: Infinity, denominator: 1 }])('rejects malformed numeric %j', value => {
    expect(parseSingleValue(value)).toBeNull();
});
test.each([[12, 60, 0], [12, 0, 60], [12, -1, 0], [12, 1, 0, 9], [12, 0], [12]].map(value => [value]))('rejects malformed DMS %j', value => {
    expect(parseCoordinateComponent(value)).toBeNull();
});
test('does not flip an explicitly negative coordinate to a contradictory north ref', () => {
    expect(parseExifGPS({ latitude: -12.5, longitude: 45, latitudeRef: 'N', longitudeRef: 'E' })).toBeNull();
});
test('continues past XMP APP1 to the EXIF APP1', () => {
    const gpsBytes = createGpsJpegFixture();
    const xmp = Uint8Array.from([0xff, 0xe1, 0, 8, 88, 77, 80, 0, 0, 0]);
    const bytes = new Uint8Array(gpsBytes.length + xmp.length);
    bytes.set(gpsBytes.subarray(0, 2)); bytes.set(xmp, 2); bytes.set(gpsBytes.subarray(2), 2 + xmp.length);
    expect(parseJpegBinaryExif(bytes)).toMatchObject({ latitude: 12.5, longitude: 45.25 });
});
test('never reads GPS pointers outside the APP1 segment', () => {
    const bytes = createGpsJpegFixture();
    new DataView(bytes.buffer).setUint16(4, 10, false);
    expect(() => parseJpegBinaryExif(bytes)).not.toThrow();
    expect(parseJpegBinaryExif(bytes)).toBeNull();
});
test('never substitutes a different image selected by filename or dimensions', async () => {
    MediaLibrary.getPermissionsAsync.mockResolvedValue({ granted: true });
    MediaLibrary.getAssetsAsync.mockResolvedValue({ assets: [{ id: 'different', filename: 'same.jpg', width: 100, height: 100 }] });
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({ uri: 'file:///different.jpg', location: { latitude: 60, longitude: 70 } });
    const result = await extractImageLocation({ uri: 'file:///selected.jpg', fileName: 'same.jpg', width: 100, height: 100 });
    expect(MediaLibrary.getAssetsAsync).not.toHaveBeenCalled();
    expect(result).toMatchObject({ latitude: 12.5, longitude: 45.25, isOriginal: false });
});
test('preserves access-bearing URI parameters for both parsing and hashing', async () => {
    const uri = 'content://provider/selected/7?access=required';
    await extractImageLocation({ uri, exif: gps });
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(uri, expect.any(Object));
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalledWith(uri.split('?')[0], expect.any(Object));
});
test('never replaces a binary-byte SHA256 with a base64-string hash', async () => {
    Crypto.digest.mockRejectedValue(new Error('digest unavailable'));
    const result = await extractImageLocation({ uri: 'file:///selected.jpg', exif: gps });
    expect(Crypto.digestStringAsync).not.toHaveBeenCalled();
    expect(result.sha256).toBeNull();
});
test('reads the exact unchanged supplied JPEG and reports no EXIF or GPS', async () => {
    const file = path.join(__dirname, 'fixtures', 'test_exif.jpeg');
    const bytes = fs.readFileSync(file);
    expect(require('crypto').createHash('sha256').update(bytes).digest('hex'))
        .toBe('ac0fe4c0a42d7286b548c3e9f0f581738e9631f7f5508ee89cf72a2b02a6cb3e');
    FileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: bytes.length });
    FileSystem.readAsStringAsync.mockResolvedValue(bytes.toString('base64'));
    const result = await extractImageLocation({ uri: 'file:///test_exif.jpeg', mimeType: 'image/jpeg' });
    expect(result).toMatchObject({ status: 'NO_EXIF_DATA', hasExif: false, hasGps: false, latitude: null, longitude: null });
});
