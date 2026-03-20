import React from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { SCREEN_WIDTH, COLORS } from '../../utils/theme';

export const MobileContainer = ({ children, style, noBackground }) => {
    if (noBackground) {
        return (
            <View style={[styles.container, style]}>
                {children}
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <ImageBackground
                source={require('../../../assets/images/background1.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <BlurView intensity={60} tint="light" style={styles.blurOverlay}>
                    {children}
                </BlurView>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        maxWidth: 428,
        width: SCREEN_WIDTH,
        alignSelf: 'center',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    blurOverlay: {
        flex: 1,
        backgroundColor: 'rgba(249, 250, 251, 0.85)',
    },
});
