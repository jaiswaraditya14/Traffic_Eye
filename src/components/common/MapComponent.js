import React from 'react';
import MapView, { Marker } from 'react-native-maps';

export default function MapComponent({ region, onRegionChangeComplete, onPress, selectedCoordinate, location }) {
    return (
        <MapView 
            style={{ flex: 1 }} 
            region={region} 
            onRegionChangeComplete={onRegionChangeComplete} 
            onPress={onPress} 
            showsUserLocation={true}
        >
            {selectedCoordinate && <Marker coordinate={selectedCoordinate} />}
            {!selectedCoordinate && location && <Marker coordinate={location} pinColor="blue" />}
        </MapView>
    );
}
