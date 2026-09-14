/* eslint-env jest */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import useImagePicker from '../useImagePicker';

jest.mock('expo-image-picker', () => ({
    requestMediaLibraryPermissionsAsync: jest.fn(), requestCameraPermissionsAsync: jest.fn(),
    launchImageLibraryAsync: jest.fn(), launchCameraAsync: jest.fn(),
}));
jest.mock('expo-media-library', () => ({ getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn() }));

let latest;
function Harness() { latest = useImagePicker(); return null; }
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    latest = null;
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' });
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    MediaLibrary.getPermissionsAsync.mockResolvedValue({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] });
    ImagePicker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: [] });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('permission denial is user-visible and always clears loading', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'denied' });
    let view;
    await act(async () => { view = renderer.create(<Harness />); });
    await act(async () => { await latest.pickFromGallery(); });
    expect(Alert.alert).toHaveBeenCalledWith('Permission Required', expect.stringContaining('photo library'));
    expect(latest.loading).toBe(false);
    await act(async () => view.unmount());
});

test('late permission result after unmount performs no alert or media launch', async () => {
    const permission = deferred();
    ImagePicker.requestMediaLibraryPermissionsAsync.mockReturnValue(permission.promise);
    let view, request;
    await act(async () => { view = renderer.create(<Harness />); });
    act(() => { request = latest.pickFromGallery(); });
    await act(async () => view.unmount());
    permission.resolve({ status: 'denied' });
    await act(async () => { await request; });
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
});

test('successful image selection returns original metadata without logging it', async () => {
    const asset = { uri: 'file:///private/evidence.jpg', exif: { GPSLatitude: 19.076 }, assetId: 'asset', width: 1200, height: 900, mimeType: 'image/jpeg', fileSize: 123 };
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    let view, result;
    await act(async () => { view = renderer.create(<Harness />); });
    await act(async () => { result = await latest.pickFromGallery(); });
    expect(result).toMatchObject(asset);
    expect(latest.exifData).toEqual(asset.exif);
    expect(log).not.toHaveBeenCalled();
    await act(async () => view.unmount());
});
