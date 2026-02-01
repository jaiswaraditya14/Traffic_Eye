// CitizenSignUp.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer } from '../components/MobileContainer';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../utils/theme';

export default function CitizenSignUp({ navigation }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSignUp = () => {
        navigation.navigate('CitizenSignIn');
    };

    return (
        <MobileContainer>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join us in making roads safer</Text>
                    </View>

                    <View style={styles.form}>
                        <Input label="Full Name" placeholder="Enter your name" value={name} onChangeText={setName} />
                        <Input label="Email" placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                        <Input label="Phone Number" placeholder="Enter your phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                        <Input label="Password" placeholder="Create password" value={password} onChangeText={setPassword} secureTextEntry />
                        <Input label="Confirm Password" placeholder="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

                        <Button onPress={handleSignUp} fullWidth style={styles.signUpButton}>
                            Sign Up
                        </Button>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('CitizenSignIn')}>
                                <Text style={styles.signInLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { flexGrow: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
    backButton: { marginBottom: SPACING.lg },
    title: { fontSize: FONT_SIZES.xxxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
    subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
    form: { paddingHorizontal: SPACING.lg },
    signUpButton: { marginTop: SPACING.md },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg },
    footerText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    signInLink: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: FONT_WEIGHTS.semibold },
});


