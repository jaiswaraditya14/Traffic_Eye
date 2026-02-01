import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer } from '../components/MobileContainer';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAppContext } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../utils/theme';

export default function OfficerSignIn({ navigation }) {
    const [badgeId, setBadgeId] = useState('');
    const [password, setPassword] = useState('');
    const { setIsAuthenticated } = useAppContext();

    const handleSignIn = () => {
        setIsAuthenticated(true);
        navigation.replace('OfficerMain');
    };

    return (
        <MobileContainer>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <View style={styles.badge}>
                            <Ionicons name="shield-checkmark" size={64} color={COLORS.secondary} />
                        </View>
                        <Text style={styles.title}>Officer Sign In</Text>
                        <Text style={styles.subtitle}>Access your verification dashboard</Text>
                    </View>

                    <View style={styles.form}>
                        <Input label="Badge ID" placeholder="Enter your badge ID" value={badgeId} onChangeText={setBadgeId} autoCapitalize="none" />
                        <Input label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry />

                        <Button onPress={handleSignIn} fullWidth variant="success" style={styles.signInButton}>
                            Sign In
                        </Button>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { flexGrow: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.lg, alignItems: 'center' },
    backButton: { alignSelf: 'flex-start', marginBottom: SPACING.lg },
    badge: { marginBottom: SPACING.lg },
    title: { fontSize: FONT_SIZES.xxxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
    subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center' },
    form: { paddingHorizontal: SPACING.lg },
    signInButton: { marginTop: SPACING.md },
});


