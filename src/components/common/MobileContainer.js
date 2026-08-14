import React from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { SCREEN_WIDTH, COLORS } from '../../utils/theme';

export const MobileContainer = ({ children, style, noBackground }) => {
    return (
        <View style={[styles.container, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        maxWidth: 430,
        width: SCREEN_WIDTH,
        alignSelf: 'center',
        backgroundColor: COLORS.background,
    },
});
