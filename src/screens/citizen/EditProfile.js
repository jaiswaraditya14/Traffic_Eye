import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer, Input, FocusAwareStatusBar } from '../../components';
import { useAuth } from '../../context';
import { authService } from '../../services';

// ── Design Tokens ──
const C = {
    navy: '#0A1E3F',
    navyMid: '#0F2C59',
    amber: '#F59E0B',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    surface: '#FFFFFF',
    surfaceInput: '#F2F4F6',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    primarySurface: '#D7E2FF',
};

export default function EditProfile({ navigation }) {
    const { profile, user, refreshProfile } = useAuth();
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const phone = profile?.phone || '';
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Please enter your full name');
            return;
        }

        setLoading(true);
        try {
            const { error } = await authService.updateProfile(user.id, {
                full_name: fullName.trim(),
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
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Navy Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

                <View style={styles.content}>
                    {/* ── Avatar Section ── */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={40} color={C.white} />
                            <TouchableOpacity style={styles.editBadge}>
                                <Ionicons name="camera" size={14} color={C.navyMid} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── Form ── */}
                    <View style={styles.formContainer}>
                        <Input
                            label="Full Name"
                            placeholder="Enter your full name"
                            value={fullName}
                            onChangeText={setFullName}
                        />

                        {/* Read-only fields */}
                        <View style={styles.readOnlyContainer}>
                            <Text style={styles.readOnlyLabel}>Phone Number</Text>
                            <View style={styles.readOnlyInput}>
                                <Ionicons name="call-outline" size={18} color={C.textTertiary} />
                                <Text style={styles.readOnlyText}>{phone || 'Not set'}</Text>
                                <Ionicons name="lock-closed" size={14} color={C.textTertiary} style={styles.lockIcon} />
                            </View>
                            <Text style={styles.readOnlyHelp}>This cannot be changed</Text>
                        </View>

                        <View style={styles.readOnlyContainer}>
                            <Text style={styles.readOnlyLabel}>Email Address</Text>
                            <View style={styles.readOnlyInput}>
                                <Ionicons name="mail-outline" size={18} color={C.textTertiary} />
                                <Text style={styles.readOnlyText}>{user?.email}</Text>
                                <Ionicons name="lock-closed" size={14} color={C.textTertiary} style={styles.lockIcon} />
                            </View>
                            <Text style={styles.readOnlyHelp}>Contact support to change email</Text>
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveButton, loading && { opacity: 0.6 }]}
                            onPress={handleSave}
                            disabled={loading}
                            activeOpacity={0.88}
                        >
                            <LinearGradient
                                colors={[C.navy, C.navyMid]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.saveGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color={C.white} />
                                ) : (
                                    <Text style={styles.saveText}>Save Changes</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Nunito-Bold',
        color: C.white,
        letterSpacing: -0.3,
    },

    // Content
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },

    // Avatar
    avatarSection: {
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 32,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: C.navyMid,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: C.amber,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: C.offWhite,
    },

    // Form
    formContainer: { gap: 12 },
    readOnlyContainer: { marginBottom: 12 },
    readOnlyLabel: {
        fontSize: 12,
        fontFamily: 'Nunito-SemiBold',
        color: C.navyMid,
        marginBottom: 8,
    },
    readOnlyInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
    },
    readOnlyText: {
        flex: 1,
        color: C.textSecondary,
        fontSize: 15,
        fontFamily: 'Nunito-Medium',
    },
    lockIcon: { marginLeft: 'auto' },
    readOnlyHelp: {
        fontSize: 11,
        color: C.textTertiary,
        marginTop: 6,
        marginLeft: 4,
    },

    // Submit
    saveButton: {
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 24,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
        elevation: 6,
    },
    saveGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    saveText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
});
