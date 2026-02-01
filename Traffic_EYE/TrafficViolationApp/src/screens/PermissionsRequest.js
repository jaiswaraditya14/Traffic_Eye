import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer } from '../components/MobileContainer';
import { Button } from '../components/Button';
import { useAppContext } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../utils/theme';

export default function PermissionsRequest({ navigation }) {
    const { userRole } = useAppContext();

    const handleContinue = () => {
        if (userRole === 'citizen') {
            navigation.replace('CitizenMain');
        } else {
            navigation.replace('OfficerMain');
        }
    };

    return (
        <MobileContainer>
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="shield-checkmark" size={80} color={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>Permissions Required</Text>
                    <Text style={styles.subtitle}>
                        To provide the best experience, we need access to:
                    </Text>

                    <View style={styles.permissions}>
                        <View style={styles.permission}>
                            <Ionicons name="camera" size={24} color={COLORS.primary} />
                            <View style={styles.permissionText}>
                                <Text style={styles.permissionTitle}>Camera</Text>
                                <Text style={styles.permissionDesc}>To capture violation photos</Text>
                            </View>
                        </View>
                        <View style={styles.permission}>
                            <Ionicons name="location" size={24} color={COLORS.primary} />
                            <View style={styles.permissionText}>
                                <Text style={styles.permissionTitle}>Location</Text>
                                <Text style={styles.permissionDesc}>To tag violation locations</Text>
                            </View>
                        </View>
                        <View style={styles.permission}>
                            <Ionicons name="images" size={24} color={COLORS.primary} />
                            <View style={styles.permissionText}>
                                <Text style={styles.permissionTitle}>Photo Library</Text>
                                <Text style={styles.permissionDesc}>To upload existing photos</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Button onPress={handleContinue} fullWidth>
                        Grant Permissions
                    </Button>
                    <Button variant="ghost" onPress={handleContinue} fullWidth>
                        Skip for Now
                    </Button>
                </View>
            </View>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'space-between' },
    content: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.xxl, alignItems: 'center' },
    iconContainer: { marginBottom: SPACING.xl },
    title: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm, textAlign: 'center' },
    subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.xl },
    permissions: { width: '100%', gap: SPACING.lg },
    permission: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    permissionText: { flex: 1 },
    permissionTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
    permissionDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    footer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, gap: SPACING.sm },
});


