/* eslint-env jest */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import NewReport from '../NewReport';
import { extractImageLocation } from '../../../utils';
import { reverseGeocode } from '../../../services/geoService';
import MapLibreMap from '../../../components/map/MapLibreMap';
const mockPick = jest.fn(), mockReport = jest.fn();
jest.mock('../../../hooks', () => {
    const React = require('react');
    return { useImagePicker: () => {
        const [image, setImage] = React.useState(null);
        return { image, setImage, pickFromGallery: mockPick };
    }, useLocation: require('../../../hooks/useLocation').default };
});
jest.mock('../../../context', () => ({ useAppContext: () => ({ setCurrentReport: mockReport, demoMode: false, demoLoading: false }) }));
jest.mock('../../../utils', () => ({ extractImageLocation: jest.fn() }));
jest.mock('../../../services/geoService', () => ({ reverseGeocode: jest.fn() }));
jest.mock('../../../components/map/MapLibreMap', () => jest.fn(() => null));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View, useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../../../components', () => ({ FocusAwareStatusBar: () => null, StepIndicator: () => null, StatusPill: () => null }));
let view;
beforeEach(async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    reverseGeocode.mockResolvedValue({ displayName: 'Synthetic address' });
    mockPick.mockResolvedValue({ uri: 'file:///synthetic.jpg', assetId: '17', mimeType: 'image/jpeg' });
    extractImageLocation.mockResolvedValue({ status: 'GPS_FOUND', gpsFound: true, latitude: 12.5, longitude: 45.25, gpsSource: 'EXIF_ORIGINAL', provenance: { source: 'EXIF_ORIGINAL' } });
    await act(async () => { view = renderer.create(<NewReport navigation={{ navigate: jest.fn() }} />); });
});
afterEach(async () => { await act(async () => view.unmount()); });
async function pick() {
    const button = view.root.findAll(node => typeof node.props.onPress === 'function' && node.props.children?.some?.(child => ['Gallery', 'Choose Another'].includes(child?.props?.children)))[0];
    expect(button).toBeDefined();
    await act(async () => { await button.props.onPress(); });
}
test.each([[12.5, 45.25], [0, 0]])('selected EXIF (%s,%s) reaches map and the evidence submission handoff', async (latitude, longitude) => {
    extractImageLocation.mockResolvedValue({ status: 'GPS_FOUND', gpsFound: true, latitude, longitude, gpsSource: 'EXIF_ORIGINAL' });
    await pick();
    expect(MapLibreMap.mock.calls.some(([props]) => props.selectedCoordinate?.latitude === latitude && props.selectedCoordinate?.longitude === longitude && props.autoLocateOnMount === false)).toBe(true);
    const button = view.root.findByProps({ accessibilityLabel: 'Analyze with AI' });
    expect(button.props.disabled).toBe(false);
    await act(async () => { button.props.onPress(); });
    expect(mockReport).toHaveBeenCalledWith(expect.objectContaining({ image: 'file:///synthetic.jpg', location: { latitude, longitude }, locationSource: 'EXIF_ORIGINAL' }));
});
test('a subsequent no-GPS photo clears previous coordinates and blocks submission', async () => {
    await pick();
    extractImageLocation.mockResolvedValue({ status: 'NO_EXIF_DATA', gpsFound: false, gpsSource: 'GPS_UNAVAILABLE' });
    mockPick.mockResolvedValue({ uri: 'file:///no-gps.jpg' });
    await pick();
    expect(view.root.findByProps({ accessibilityLabel: 'Analyze with AI' }).props.disabled).toBe(true);
    expect(JSON.stringify(view.toJSON())).toContain('No usable GPS location');
});
test('denied original metadata is not described as proof that GPS is absent', async () => {
    extractImageLocation.mockResolvedValue({ status: 'ORIGINAL_METADATA_INACCESSIBLE', gpsFound: false });
    await pick();
    expect(JSON.stringify(view.toJSON())).toContain('This does not establish whether the original contains GPS');
});
