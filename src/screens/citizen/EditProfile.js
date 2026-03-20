import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer, Button, Input } from '../../components';
import { useAuth } from '../../context';
import { authService } from '../../services';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils';

export default function EditProfile({ navigation }) {
    const { profile, user, refreshProfile } = useAuth();
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Please enter your full name');
            return;
        }

        setLoading(true);
        try {
            const { error } = await authService.updateProfile(user.id, {
                full_name: fullName,
                updated_at: new Date(),
            });

            if (error) throw error;

            await refreshProfile();
            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Edit Profile</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>
                    <View style={styles.avatarSection}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={50} color={COLORS.white} />
                        </View>
                        <TouchableOpacity style={styles.changePhotoButton}>
                            <Text style={styles.changePhotoText}>Change Photo</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <Input
                            label="Full Name"
                            placeholder="Enter your full name"
                            value={fullName}
                            onChangeText={setFullName}
                        />

                        <View style={styles.readOnlyContainer}>
                            <Text style={styles.readOnlyLabel}>Phone Number (Cannot be changed)</Text>
                            <View style={styles.readOnlyInput}>
                                <Text style={styles.readOnlyText}>{profile?.phone || user?.phone || 'Not available'}</Text>
                            </View>
                        </View>

                        <View style={styles.readOnlyContainer}>
                            <Text style={styles.readOnlyLabel}>Email (Cannot be changed)</Text>
                            <View style={styles.readOnlyInput}>
                                <Text style={styles.readOnlyText}>{user?.email}</Text>
                            </View>
                        </View>

                        <Button
                            onPress={handleSave}
                            disabled={loading}
                            style={styles.saveButton}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color={COLORS.white} />
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </View>
                </View>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    title: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    content: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl },
    avatarSection: { alignItems: 'center', marginBottom: SPACING.xl },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm, ...SHADOWS.md },
    changePhotoButton: { padding: SPACING.xs },
    changePhotoText: { color: COLORS.primary, fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.sm },
    form: { gap: SPACING.md },
    saveButton: { marginTop: SPACING.lg },
    readOnlyContainer: { marginBottom: SPACING.md },
    readOnlyLabel: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textSecondary, marginBottom: SPACING.xs },
    readOnlyInput: { backgroundColor: COLORS.gray100, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.gray200 },
    readOnlyText: { color: COLORS.textTertiary, fontSize: FONT_SIZES.md },
});
