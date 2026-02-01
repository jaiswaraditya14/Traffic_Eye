import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer } from '../components/MobileContainer';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../utils/theme';

export default function ForgotPassword({ navigation }) {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);

    const handleSend = () => {
        setSent(true);
    };

    return (
        <MobileContainer>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Forgot Password?</Text>
                    <Text style={styles.subtitle}>
                        {sent ? 'Check your email for reset instructions' : 'Enter your email to receive reset instructions'}
                    </Text>
                </View>

                {!sent ? (
                    <View style={styles.form}>
                        <Input label="Email" placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                        <Button onPress={handleSend} fullWidth>
                            Send Reset Link
                        </Button>
                    </View>
                ) : (
                    <View style={styles.success}>
                        <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
                        <Text style={styles.successText}>Email sent successfully!</Text>
                        <Button onPress={() => navigation.navigate('CitizenSignIn')} fullWidth>
                            Back to Sign In
                        </Button>
                    </View>
                )}
            </KeyboardAvoidingView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
    backButton: { marginBottom: SPACING.lg },
    title: { fontSize: FONT_SIZES.xxxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
    subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
    form: { paddingHorizontal: SPACING.lg },
    success: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg },
    successText: { fontSize: FONT_SIZES.lg, color: COLORS.textPrimary, marginVertical: SPACING.lg },
});


