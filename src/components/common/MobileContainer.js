import React from 'react';
import { View, StyleSheet, StatusBar, Platform, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SCREEN_WIDTH, COLORS } from '../../utils/theme';

export const MobileContainer = ({ children, style, statusBarStyle = 'dark-content' }) => {
    return (
        <SafeAreaView style={[styles.container, style]} edges={['right', 'left']}>
            <StatusBar
                barStyle={statusBarStyle}
                backgroundColor={COLORS.background}
                translucent={false}
            />
            <ImageBackground
                source={require('../../../assets/traffic_pattern_bg.png')}
                style={styles.bgImage}
                imageStyle={{ opacity: 1, resizeMode: 'repeat' }}
            >
                <View style={styles.innerContainer}>
                    {children}
                </View>
            </ImageBackground>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        maxWidth: 428,
        width: SCREEN_WIDTH,
        alignSelf: 'center',
    },
    bgImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    innerContainer: {
        flex: 1,
    }
});
