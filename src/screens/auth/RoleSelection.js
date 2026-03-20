import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAppContext } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, GRADIENTS, ROLES } from '../../utils';

export default function RoleSelection({ navigation }) {
    const { setUserRole } = useAppContext();

    const handleRoleSelect = (role) => {
        setUserRole(role);
        if (role === ROLES.CITIZEN) {
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
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoBadge}>
                        <Text style={styles.logoEmoji}>🚦</Text>
                    </View>
                    <Text style={styles.title}>Welcome to TrafficEye</Text>
                    <Text style={styles.subtitle}>
                        Select how you'd like to use the platform
                    </Text>
                </View>

                <View style={styles.content}>
                    {/* Citizen Card */}
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleRoleSelect(ROLES.CITIZEN)}
                        activeOpacity={0.85}
                    >
                        <View style={styles.cardHeader}>
                            <LinearGradient
                                colors={GRADIENTS.primary}
                                style={styles.iconContainer}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="person" size={28} color="#FFFFFF" />
                            </LinearGradient>
                            <View style={styles.cardHeaderText}>
                                <Text style={styles.cardTitle}>Citizen</Text>
                                <Text style={styles.cardBadge}>REPORTER</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={22} color={COLORS.textTertiary} />
                        </View>
                        <Text style={styles.cardDescription}>
                            Report traffic violations and earn rewards for making your community safer
                        </Text>
                        <View style={styles.features}>
                            {['Report violations', 'Earn rewards', 'Track reports'].map((text, i) => (
                                <View key={i} style={styles.feature}>
                                    <View style={styles.featureCheck}>
                                        <Ionicons name="checkmark" size={12} color={COLORS.success} />
                                    </View>
                                    <Text style={styles.featureText}>{text}</Text>
                                </View>
                            ))}
                        </View>
                    </TouchableOpacity>

                    {/* Officer Card */}
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleRoleSelect(ROLES.OFFICER)}
                        activeOpacity={0.85}
                    >
                        <View style={styles.cardHeader}>
                            <LinearGradient
                                colors={GRADIENTS.secondary}
                                style={styles.iconContainer}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
                            </LinearGradient>
                            <View style={styles.cardHeaderText}>
                                <Text style={styles.cardTitle}>Traffic Officer</Text>
                                <Text style={[styles.cardBadge, styles.cardBadgeSecondary]}>AUTHORITY</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={22} color={COLORS.textTertiary} />
                        </View>
                        <Text style={styles.cardDescription}>
                            Verify reports, manage violations, and maintain traffic safety
                        </Text>
                        <View style={styles.features}>
                            {['Verify reports', 'View analytics', 'Manage queue'].map((text, i) => (
                                <View key={i} style={styles.feature}>
                                    <View style={[styles.featureCheck, { backgroundColor: COLORS.secondarySurface }]}>
                                        <Ionicons name="checkmark" size={12} color={COLORS.secondary} />
                                    </View>
                                    <Text style={styles.featureText}>{text}</Text>
                                </View>
                            ))}
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
        paddingBottom: SPACING.xxl,
    },
    header: {
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xxxl,
        paddingBottom: SPACING.xl,
        alignItems: 'center',
    },
    logoBadge: {
        width: 64,
        height: 64,
        borderRadius: BORDER_RADIUS.xl,
        backgroundColor: COLORS.primarySurface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    logoEmoji: {
        fontSize: 32,
    },
    title: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    content: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.lg,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardHeaderText: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    cardTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        letterSpacing: -0.2,
    },
    cardBadge: {
        fontSize: FONT_SIZES.xxs,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.primary,
        letterSpacing: 1.5,
        marginTop: 2,
    },
    cardBadgeSecondary: {
        color: COLORS.secondary,
    },
    cardDescription: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.lg,
        lineHeight: 20,
    },
    features: {
        gap: SPACING.md,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    featureCheck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.successSurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        fontWeight: FONT_WEIGHTS.medium,
    },
});
