import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    success: '#059669',
    successSurface: '#D1FAE5',
};

export default function ReportSuccess({ navigation }) {
    const scaleAnim = useRef(new Animated.Value(0.5)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                {/* ── Checkmark Icon ── */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconOuter}>
                        <View style={styles.iconInner}>
                            <Ionicons name="checkmark" size={48} color={C.success} />
                        </View>
                    </View>
                </View>

                {/* ── Text ── */}
                <Text style={styles.title}>Report Submitted!</Text>
                <Text style={styles.subtitle}>
                    Our AI has successfully analyzed your report. It is now under review by an officer.
                </Text>

                {/* ── Points Badge ── */}
                <View style={styles.pointsBadge}>
                    <Ionicons name="trophy" size={20} color={C.amber} />
                    <Text style={styles.pointsText}>+10 Points Earned</Text>
                </View>

                {/* ── Action Buttons ── */}
                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('CitizenMain')}
                        activeOpacity={0.88}
                    >
                        <LinearGradient
                            colors={[C.navy, C.navyMid]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.primaryGradient}
                        >
                            <Text style={styles.primaryText}>Back to Home</Text>
                            <Ionicons name="home" size={16} color={C.white} />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => navigation.navigate('CitizenMain', { screen: 'Reports' })}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="document-text" size={16} color={C.navyMid} />
                        <Text style={styles.secondaryText}>View My Reports</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.offWhite,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    content: {
        width: '100%',
        alignItems: 'center',
    },

    // Icon
    iconContainer: {
        marginBottom: 24,
    },
    iconOuter: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: C.successSurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: C.surface,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: C.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },

    title: {
        fontSize: 26,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        marginBottom: 12,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 20,
    },

    // Points
    pointsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: C.surface,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        marginBottom: 40,
        shadowColor: C.amber,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    pointsText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
    },

    // Buttons
    buttonGroup: {
        alignSelf: 'stretch',
        gap: 12,
    },
    primaryButton: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
    primaryGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    primaryText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: C.surface,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    secondaryText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.navyMid,
    },
});
