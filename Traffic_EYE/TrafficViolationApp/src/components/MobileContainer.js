import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SCREEN_WIDTH } from '../utils/theme';

export const MobileContainer = ({ children, style }) => {
    return (
        <View style={[styles.container, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        maxWidth: 428, // iPhone 14 Pro Max width
        width: SCREEN_WIDTH,
        alignSelf: 'center',
    },
});
