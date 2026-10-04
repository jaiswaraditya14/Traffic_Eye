/* eslint-env jest */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import MapLibreMap from '../MapLibreMap';
import { Camera, Marker } from '@maplibre/maplibre-react-native';
import { reverseGeocode } from '../../../services/geoService';
jest.mock('@maplibre/maplibre-react-native', () => ({ Map: require('react-native').View, Camera: jest.fn(() => null), Marker: jest.fn(() => null), UserLocation: () => null }));
jest.mock('../../../services/geoService', () => ({ reverseGeocode: jest.fn(), forwardGeocode: jest.fn(), debounce: fn => fn }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
test.each([[12.5, 45.25], [0, 0]])('GPS (%s,%s) initializes v11 camera and marker in longitude/latitude order', async (latitude, longitude) => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    reverseGeocode.mockResolvedValue({ displayName: 'Synthetic address' });
    let view;
    await act(async () => { view = renderer.create(<MapLibreMap initialCoordinate={{ latitude, longitude }} selectedCoordinate={{ latitude, longitude }} showSearch={false} showUserLocation={false} autoLocateOnMount={false} />); });
    expect(Camera.mock.calls[0][0].initialViewState).toEqual({ center: [longitude, latitude], zoom: 13 });
    expect(Marker.mock.calls[0][0].lngLat).toEqual([longitude, latitude]);
    expect(reverseGeocode).toHaveBeenCalledWith(latitude, longitude);
    await act(async () => view.unmount());
});
