import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer } from '../components/MobileContainer';
import { Button } from '../components/Button';
import { useAppContext } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function RoleSelection({ navigation }) {
    const { setUserRole } = useAppContext();

    const handleRoleSelect = (role) => {
        setUserRole(role);
        if (role === 'citizen') {
            navigation.navigate('CitizenSignIn');
        } else {
            navigation.navigate('OfficerSignIn');
        }
    };

    return (
        <MobileContainer>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Choose Your Role</Text>
                    <Text style={styles.subtitle}>
                        Select how you'd like to use TrafficEye
                    </Text>
                </View>

                <View style={styles.content}>
                    {/* Citizen Card */}
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleRoleSelect('citizen')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: `${COLORS.primary}15` }]}>
                            <Ionicons name="person" size={48} color={COLORS.primary} />
                        </View>
                        <Text style={styles.cardTitle}>Citizen</Text>
                        <Text style={styles.cardDescription}>
                            Report traffic violations and earn rewards for making your community safer
                        </Text>
                        <View style={styles.features}>
                            <View style={styles.feature}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                                <Text style={styles.featureText}>Report violations</Text>
                            </View>
                            <View style={styles.feature}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                                <Text style={styles.featureText}>Earn rewards</Text>
                            </View>
                            <View style={styles.feature}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                                <Text style={styles.featureText}>Track reports</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Officer Card */}
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleRoleSelect('officer')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: `${COLORS.secondary}15` }]}>
                            <Ionicons name="shield-checkmark" size={48} color={COLORS.secondary} />
                        </View>
                        <Text style={styles.cardTitle}>Traffic Officer</Text>
                        <Text style={styles.cardDescription}>
                            Verify reports, manage violations, and maintain traffic safety
                        </Text>
                        <View style={styles.features}>
                            <View style={styles.feature}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                                <Text style={styles.featureText}>Verify reports</Text>
                            </View>
                            <View style={styles.feature}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                                <Text style={styles.featureText}>View analytics</Text>
                            </View>
                            <View style={styles.feature}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                                <Text style={styles.featureText}>Export data</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        paddingBottom: SPACING.xl,
    },
    header: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xxl,
        paddingBottom: SPACING.xl,
    },
    title: {
        fontSize: FONT_SIZES.xxxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
    },
    content: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.lg,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.md,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    cardTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    cardDescription: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
        lineHeight: 20,
    },
    features: {
        gap: SPACING.sm,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    featureText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
});


