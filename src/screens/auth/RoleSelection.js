import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAppContext } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, ROLES } from '../../utils';

export default function RoleSelection({ navigation }) {
    const { setUserRole } = useAppContext();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim1 = useRef(new Animated.Value(40)).current;
    const slideAnim2 = useRef(new Animated.Value(40)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.stagger(150, [
                Animated.spring(slideAnim1, {
                    toValue: 0,
                    tension: 80,
                    friction: 10,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim2, {
                    toValue: 0,
                    tension: 80,
                    friction: 10,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

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
                <Animated.View style={[styles.header, { opacity: fadeAnim }]}>

                    <Text style={styles.title}>Choose Your Role</Text>
                    <Text style={styles.subtitle}>
                        Select how you'd like to use TrafficEye
                    </Text>
                </Animated.View>

                <View style={styles.content}>
                    {/* Citizen Card */}
                    <Animated.View style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim1 }],
                    }}>
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => handleRoleSelect(ROLES.CITIZEN)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[COLORS.primarySoft || '#EFF6FF', COLORS.background]}
                                style={styles.cardGradient}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconContainer, { backgroundColor: `${COLORS.primary}15` }]}>
                                        <Ionicons name="person" size={36} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.cardBadge}>
                                        <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
                                    </View>
                                </View>
                                <Text style={styles.cardTitle}>Citizen</Text>
                                <Text style={styles.cardDescription}>
                                    Report traffic violations and earn rewards for making your community safer
                                </Text>
                                <View style={styles.features}>
                                    {['Report violations', 'Earn rewards', 'Track reports'].map((text, i) => (
                                        <View key={i} style={styles.feature}>
                                            <View style={[styles.featureDot, { backgroundColor: COLORS.primary }]} />
                                            <Text style={styles.featureText}>{text}</Text>
                                        </View>
                                    ))}
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Officer Card */}
                    <Animated.View style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim2 }],
                    }}>
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => handleRoleSelect(ROLES.OFFICER)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[COLORS.secondarySoft || '#ECFDF5', COLORS.background]}
                                style={styles.cardGradient}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconContainer, { backgroundColor: `${COLORS.secondary}15` }]}>
                                        <Ionicons name="shield-checkmark" size={36} color={COLORS.secondary} />
                                    </View>
                                    <View style={[styles.cardBadge, { backgroundColor: `${COLORS.secondary}10` }]}>
                                        <Ionicons name="arrow-forward" size={18} color={COLORS.secondary} />
                                    </View>
                                </View>
                                <Text style={styles.cardTitle}>Traffic Officer</Text>
                                <Text style={styles.cardDescription}>
                                    Verify reports, manage violations, and maintain traffic safety
                                </Text>
                                <View style={styles.features}>
                                    {['Verify reports', 'View analytics', 'Export data'].map((text, i) => (
                                        <View key={i} style={styles.feature}>
                                            <View style={[styles.featureDot, { backgroundColor: COLORS.secondary }]} />
                                            <Text style={styles.featureText}>{text}</Text>
                                        </View>
                                    ))}
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
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
        alignItems: 'center',
    },

    title: {
        fontSize: FONT_SIZES.xxxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    content: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.md,
    },
    card: {
        borderRadius: BORDER_RADIUS.xl,
        ...SHADOWS.md,
        overflow: 'hidden',
    },
    cardGradient: {
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: `${COLORS.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    cardDescription: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
        lineHeight: 22,
    },
    features: {
        gap: SPACING.sm,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    featureDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    featureText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        fontWeight: FONT_WEIGHTS.medium,
    },
});
