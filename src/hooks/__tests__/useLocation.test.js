/* eslint-env jest */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import useLocation from '../useLocation';
import { reverseGeocode } from '../../services/geoService';
jest.mock('../../services/geoService', () => ({ reverseGeocode: jest.fn() }));
jest.mock('expo-location', () => ({ getCurrentPositionAsync: jest.fn() }));
let current, view;
function Harness() { current = useLocation(); return null; }
beforeEach(async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    reverseGeocode.mockReset();
    await act(async () => { view = renderer.create(<Harness />); });
});
afterEach(async () => { await act(async () => view.unmount()); });
test('GPS coordinates including zeros survive geocoder failure and are not replaced with device GPS', async () => {
    reverseGeocode.mockRejectedValue(new Error('offline'));
    await act(async () => { await current.reverseGeocodeFromCoords(0, 0, 'EXIF_ORIGINAL'); });
    expect(current.location).toEqual({ latitude: 0, longitude: 0 });
    expect(current.locationSource).toBe('EXIF_ORIGINAL');
    expect(current.address).toBe('0.000000, 0.000000');
    expect(require('expo-location').getCurrentPositionAsync).not.toHaveBeenCalled();
});
test('clearing a new selection prevents a late previous-image geocode from restoring its address', async () => {
    let resolve, request;
    reverseGeocode.mockImplementation(() => new Promise(done => { resolve = done; }));
    act(() => { request = current.reverseGeocodeFromCoords(12.5, 45.25, 'EXIF_ORIGINAL'); });
    await act(async () => { current.clearLocation(); });
    resolve({ displayName: 'Old photo address' });
    await act(async () => { await request; });
    expect(current.location).toBeNull(); expect(current.address).toBe('');
});
