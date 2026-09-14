/* eslint-env jest */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import NewReport from '../NewReport';
import { validateNewReport } from '../../../utils/productExperience';
import * as ImagePicker from 'expo-image-picker';
const mockSetReport = jest.fn();
let mockImage, mockLocation, mockAddress, mockDemo;
jest.mock('../../../hooks', () => ({ useImagePicker: () => ({ image: mockImage, setImage: jest.fn(), captureFromCamera: jest.fn(), pickFromGallery: jest.fn() }), useLocation: () => ({ location: mockLocation, address: mockAddress, locationSource: 'MANUAL', setAddress: jest.fn(), setLocationSource: jest.fn(), detectLocation: jest.fn(), setManualLocation: jest.fn(), reverseGeocodeFromCoords: jest.fn() }) }));
jest.mock('../../../context', () => ({ useAppContext: () => ({ setCurrentReport: mockSetReport, demoMode: mockDemo, demoLoading: false }) }));
jest.mock('../../../utils', () => ({ extractImageLocation: jest.fn() }));
jest.mock('../../../components/map/MapLibreMap', () => () => null);
jest.mock('expo-image-picker', () => ({ requestCameraPermissionsAsync: jest.fn() }));
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View, useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../../../components', () => ({ FocusAwareStatusBar: () => null, StepIndicator: () => null, StatusPill: () => null }));
let view, navigation;
beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true; mockImage = null; mockLocation = null; mockAddress = ''; mockDemo = false; mockSetReport.mockClear();
    navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() }; jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => { if (view) await act(async () => view.unmount()); view = null; jest.restoreAllMocks(); });
async function mount() { await act(async () => { view = renderer.create(<NewReport navigation={navigation} />); }); }
test('required fields produce three inline errors', () => expect(Object.keys(validateNewReport({}))).toEqual(['image', 'location', 'address']));
test('missing evidence/location/address disables Continue and blocks handler', async () => {
    await mount(); const button = view.root.findByProps({ accessibilityLabel: 'Analyze with AI' }); expect(button.props.disabled).toBe(true);
    await act(async () => button.props.onPress()); expect(navigation.navigate).not.toHaveBeenCalled(); expect(mockSetReport).not.toHaveBeenCalled();
});
test('valid fields enable Continue and preserve coordinates', async () => {
    mockImage = 'file:///synthetic.jpg'; mockLocation = { latitude: 19.076, longitude: 72.8777 }; mockAddress = 'Synthetic location';
    await mount(); const button = view.root.findByProps({ accessibilityLabel: 'Analyze with AI' }); expect(button.props.disabled).toBe(false);
    await act(async () => button.props.onPress()); expect(mockSetReport).toHaveBeenCalledWith(expect.objectContaining({ image: mockImage, location: mockLocation, address: mockAddress })); expect(navigation.navigate).toHaveBeenCalledWith('AIProcessing');
});
test('camera denied offers Open Settings recovery', async () => {
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false }); await mount();
    const photo = view.root.findAll(node => node.props.onPress && node.props.children?.props?.children?.some?.(child => child?.props?.children === 'Photo'))[0];
    expect(photo).toBeDefined(); await act(async () => photo.props.onPress()); expect(JSON.stringify(view.toJSON())).toContain('permission is denied'); expect(view.root.findByProps({ accessibilityLabel: 'Open Settings' })).toBeDefined();
});
test('demo continues with bundled synthetic data and no real capture', async () => {
    mockDemo = true; await mount(); await act(async () => view.root.findByProps({ accessibilityLabel: 'Preview demo report' }).props.onPress());
    expect(mockSetReport).toHaveBeenCalledWith(expect.objectContaining({ demo: true, locationSource: 'DEMO_SYNTHETIC' })); expect(navigation.navigate).toHaveBeenCalledWith('AIProcessing');
});
test.each([{ latitude: NaN, longitude: 0 }, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: 181 }])('invalid coordinates block submit %j', location => expect(validateNewReport({ image: 'file', location, address: 'Road' }).location).toBeTruthy());
