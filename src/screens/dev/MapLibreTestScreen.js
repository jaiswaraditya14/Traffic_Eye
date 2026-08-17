/**
 * MapLibreTestScreen.js
 * Minimal isolated test screen — proves native MapLibre v11 loads.
 * Contains ONLY: Map + OpenFreeMap Liberty style + Camera + one Marker.
 * No heatmap, clustering, geocoding, EXIF, or app data.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';

const OPEN_FREE_MAP_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';

// Single test marker — Mumbai Bandra Junction
const MARKER_COORD = [72.8777, 19.0760]; // [lng, lat] — MapLibre uses [lng, lat]

export default function MapLibreTestScreen() {
    const [status, setStatus] = useState('Initializing...');
    const [tilesLoaded, setTilesLoaded] = useState(false);

    return (
        <View style={styles.container}>
            {/* Status Banner */}
            <View style={[styles.banner, tilesLoaded ? styles.bannerOk : styles.bannerWaiting]}>
                <Text style={styles.bannerText}>{status}</Text>
            </View>

            {/* Native MapLibre v11 Map */}
            <Map
                style={styles.map}
                mapStyle={OPEN_FREE_MAP_LIBERTY}
                logo={false}
                attribution={true}
                attributionPosition={{ bottom: 8, right: 8 }}
                onDidFinishLoadingMap={() => {
                    setTilesLoaded(true);
                    setStatus('✅ MapLibre v11 LOADED — OpenFreeMap tiles OK');
                }}
                onDidFailLoadingMap={(err) => {
                    setStatus(`❌ Map failed: ${err?.message || 'unknown error'}`);
                }}
            >
                {/* Camera */}
                <Camera
                    defaultSettings={{
                        centerCoordinate: MARKER_COORD,
                        zoomLevel: 13,
                    }}
                />

                {/* Single test marker */}
                <Marker
                    id="test-marker"
                    lngLat={MARKER_COORD}
                >
                    <View style={styles.marker} />
                </Marker>
            </Map>

            {/* Bottom Label */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {'@maplibre/maplibre-react-native v11  •  OpenFreeMap Liberty\nPan and zoom to verify native runtime'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A1E3F' },
    map: { flex: 1 },
    banner: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
        zIndex: 10,
    },
    bannerWaiting: { backgroundColor: '#B45309' },
    bannerOk:      { backgroundColor: '#15803D' },
    bannerText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },
    marker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#EF4444',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    footer: {
        backgroundColor: '#0A1E3F',
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    footerText: {
        color: '#94A3B8',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
});
