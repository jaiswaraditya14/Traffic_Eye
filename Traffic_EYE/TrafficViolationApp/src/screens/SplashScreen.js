import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../context/AppContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../utils/theme';

export default function SplashScreen({ navigation }) {
    const { setShowSplash } = useAppContext();

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
            navigation.replace('Onboarding');
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>🚦</Text>
                </View>
                <Text style={styles.title}>TrafficEye</Text>
                <Text style={styles.subtitle}>Smart Violation Reporting</Text>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    icon: {
        fontSize: 64,
    },
    title: {
        fontSize: FONT_SIZES.xxxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.white,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: FONT_SIZES.md,
        color: COLORS.white,
        opacity: 0.9,
    },
});


