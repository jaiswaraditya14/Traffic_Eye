// src/components/map/maplibreNative.js
// Safe loader for @maplibre/maplibre-react-native that prevents crashes
// when running inside standard Expo Go (where native MLRN binary modules are not compiled).

import React from 'react';
import { View } from 'react-native';

let Map = View;
let Camera = React.forwardRef((props, ref) => null);
let Marker = ({ children }) => children || null;
let UserLocation = () => null;
let GeoJSONSource = () => null;
let Layer = () => null;
let isMapLibreNativeAvailable = false;

try {
    // Dynamic require so missing TurboModules don't crash app startup
    const mlrn = require('@maplibre/maplibre-react-native');
    if (mlrn && (mlrn.Camera || mlrn.Map)) {
        Map = mlrn.Map || View;
        Camera = mlrn.Camera || Camera;
        Marker = mlrn.Marker || Marker;
        UserLocation = mlrn.UserLocation || UserLocation;
        GeoJSONSource = mlrn.GeoJSONSource || GeoJSONSource;
        Layer = mlrn.Layer || Layer;
        isMapLibreNativeAvailable = true;
    }
} catch {
    // Expected in Expo Go where native C++/Java binaries are absent
    isMapLibreNativeAvailable = false;
}

export {
    Map,
    Camera,
    Marker,
    UserLocation,
    GeoJSONSource,
    Layer,
    isMapLibreNativeAvailable,
};
