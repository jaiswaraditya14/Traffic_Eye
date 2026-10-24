import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, FocusAwareStatusBar } from '../../components';

// ── Design Tokens ──
const C = {
    navy: '#0A1E3F',
    navyMid: '#0F2C59',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    success: '#059669',
};

export default function SignUpSuccess({ navigation, route }) {
    const isPasswordReset = route?.params?.mode === 'passwordReset';
    const email = route?.params?.email;

    const handleContinue = () => {
        if (isPasswordReset) {
            navigation.navigate('OtpVerification', { email });
        } else {
            navigation.navigate('CitizenSignIn');
        }
    };

    return (
        <MobileContainer>
            <FocusAwareStatusBar barStyle="dark-content" statusBgColor={C.offWhite} />
            <View style={styles.container}>
                <Ionicons name={isPasswordReset ? 'mail-unread' : 'checkmark-circle'} size={100} color={C.success} />
                <Text style={styles.title}>{isPasswordReset ? 'Check your email' : 'Signup Successful! 🎉'}</Text>
                {isPasswordReset ? (
                    <>
                        <Text style={styles.subtitle}>
                            We sent an 8-digit verification code to {email}.
                        </Text>
                        <Text style={styles.subtitle}>Enter the code to continue resetting your password.</Text>
                    </>
                ) : (
                    <>
                        <Text style={styles.subtitle}>Your email has been successfully confirmed.</Text>
                        <Text style={styles.subtitle}>You can now continue signing in to access your account.</Text>
                    </>
                )}

                <TouchableOpacity
                    style={styles.button}
                    activeOpacity={0.88}
                    onPress={handleContinue}
                >
                    <LinearGradient
                        colors={[C.navy, C.navyMid]}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.buttonText}>{isPasswordReset ? 'Enter Verification Code' : 'Continue to Sign In'}</Text>
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
