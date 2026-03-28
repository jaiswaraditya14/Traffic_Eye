import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MapComponent() {
    return (
        <View style={styles.container}>
            <Ionicons name="map-outline" size={48} color="#94A3B8" />
            <Text style={styles.text}>Interactive Maps are not supported on the standard Web preview.</Text>
            <Text style={styles.subtext}>Please use a mobile device or emulator for full functionality.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
        textAlign: 'center',
        marginTop: 16,
    },
    subtext: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 8,
    },
});
