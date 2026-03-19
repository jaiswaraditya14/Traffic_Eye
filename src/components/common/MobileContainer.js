import React from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
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
            <View style={styles.innerContainer}>
                {children}
            </View>
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
    innerContainer: {
        flex: 1,
    }
});
