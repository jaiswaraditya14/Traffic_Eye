import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, FocusAwareStatusBar } from '../../components';

// ── Design Tokens ──
const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    success: '#059669',
};

export default function SignUpSuccess({ navigation }) {
    return (
        <MobileContainer>
            <FocusAwareStatusBar barStyle="dark-content" statusBgColor={C.offWhite} />
            <View style={styles.container}>
                <Ionicons name="checkmark-circle" size={100} color={C.success} />
                <Text style={styles.title}>Signup Successful! 🎉</Text>
                <Text style={styles.subtitle}>Your email has been successfully confirmed.</Text>
                <Text style={styles.subtitle}>You can now continue signing in to access your account.</Text>

                <TouchableOpacity 
                    style={styles.button}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('CitizenSignIn')}
                >
                    <LinearGradient
                        colors={[C.navy, C.navyMid]}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.buttonText}>Continue to Sign In</Text>
                        <Ionicons name="arrow-forward" size={16} color={C.white} />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: C.offWhite,
    },
    title: {
        fontFamily: 'Nunito-Bold',
        fontSize: 26,
        color: C.navy,
        marginTop: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Nunito-Regular',
        fontSize: 16,
        color: C.textSecondary,
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 24,
    },
    button: {
        marginTop: 40,
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
        elevation: 6,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    buttonText: {
        color: C.white,
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
    }
});
