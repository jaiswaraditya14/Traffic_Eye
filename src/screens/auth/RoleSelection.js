import React, { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Animated, StatusBar, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAppContext } from '../../context';
import { ROLES } from '../../utils';

const { width } = Dimensions.get('window');

const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    navyLight: '#2C4E80',
    amber: '#F59E0B',
    amberDark: '#D97706',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    surfaceLow: '#F2F4F6',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    success: '#059669',
    successSurface: '#D1FAE5',
    primarySurface: '#D7E2FF',
    amberSurface: '#FEF3C7',
};

export default function RoleSelection({ navigation }) {
    const { setUserRole } = useAppContext();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const headerSlide = useRef(new Animated.Value(-30)).current;
    const card1Slide = useRef(new Animated.Value(40)).current;
    const card2Slide = useRef(new Animated.Value(40)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(headerSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]),
            Animated.stagger(120, [
                Animated.spring(card1Slide, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
                Animated.spring(card2Slide, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
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
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Navy Header ── */}
                <LinearGradient
                    colors={[C.navy, C.navyMid]}
                    style={styles.header}
                >
                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [{ translateY: headerSlide }],
                            alignItems: 'center',
                        }}
                    >
                        {/* Shield icon */}
                        <View style={styles.shieldContainer}>
                            <Ionicons name="shield-checkmark" size={44} color={C.amber} />
                        </View>
                        <Text style={styles.headerTitle}>Welcome to TrafficEye</Text>
                        <Text style={styles.headerSubtitle}>
                            Choose how you'd like to use the platform
                        </Text>
                    </Animated.View>
                </LinearGradient>

                {/* ── Role Cards ── */}
                <View style={styles.cardsSection}>

                    {/* Citizen Card */}
                    <Animated.View style={{ transform: [{ translateY: card1Slide }], opacity: fadeAnim }}>
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => handleRoleSelect(ROLES.CITIZEN)}
                            activeOpacity={0.82}
                        >
                            {/* Left accent bar */}
                            <View style={[styles.cardAccentBar, { backgroundColor: C.navyMid }]} />
                            <View style={styles.cardContent}>
                                {/* Icon */}
                                <View style={[styles.iconCircle, { backgroundColor: C.primarySurface }]}>
                                    <Ionicons name="person" size={26} color={C.navyMid} />
                                </View>
                                {/* Text */}
                                <View style={styles.cardText}>
                                    <View style={styles.cardTitleRow}>
                                        <Text style={styles.cardTitle}>Citizen</Text>
                                        <View style={[styles.roleBadge, { backgroundColor: C.primarySurface }]}>
                                            <Text style={[styles.roleBadgeText, { color: C.navyMid }]}>REPORTER</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.cardDescription}>
                                        Report traffic violations and earn rewards for making your community safer
                                    </Text>
                                    {/* Feature list */}
                                    <View style={styles.featureList}>
                                        {['Report violations with AI', 'Track your reports', 'Earn reward points'].map((f, i) => (
                                            <View key={i} style={styles.featureItem}>
                                                <View style={[styles.featureDot, { backgroundColor: C.success }]} />
                                                <Text style={styles.featureText}>{f}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                                {/* Arrow */}
                                <Ionicons name="chevron-forward" size={20} color={C.textTertiary} />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Officer Card */}
                    <Animated.View style={{ transform: [{ translateY: card2Slide }], opacity: fadeAnim }}>
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => handleRoleSelect(ROLES.OFFICER)}
                            activeOpacity={0.82}
                        >
                            {/* Left accent bar — amber for authority */}
                            <View style={[styles.cardAccentBar, { backgroundColor: C.amber }]} />
                            <View style={styles.cardContent}>
                                {/* Icon */}
                                <View style={[styles.iconCircle, { backgroundColor: C.amberSurface }]}>
                                    <Ionicons name="shield-checkmark" size={26} color={C.amberDark} />
                                </View>
                                {/* Text */}
                                <View style={styles.cardText}>
                                    <View style={styles.cardTitleRow}>
                                        <Text style={styles.cardTitle}>Traffic Officer</Text>
                                        <View style={[styles.roleBadge, { backgroundColor: C.amberSurface }]}>
                                            <Text style={[styles.roleBadgeText, { color: C.amberDark }]}>AUTHORITY</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.cardDescription}>
                                        Verify citizen reports, manage the violation queue, and maintain road safety
                                    </Text>
                                    {/* Feature list */}
                                    <View style={styles.featureList}>
                                        {['Verify & approve reports', 'Manage pending queue', 'Track enforcement stats'].map((f, i) => (
                                            <View key={i} style={styles.featureItem}>
                                                <View style={[styles.featureDot, { backgroundColor: C.amber }]} />
                                                <Text style={styles.featureText}>{f}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                                {/* Arrow */}
                                <Ionicons name="chevron-forward" size={20} color={C.textTertiary} />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Footer note */}
                    <Animated.View style={[styles.footerNote, { opacity: fadeAnim }]}>
                        <Ionicons name="information-circle-outline" size={14} color={C.textTertiary} />
                        <Text style={styles.footerNoteText}>
                            Officer access requires registration by the Traffic Authority
                        </Text>
                    </Animated.View>
                </View>
            </ScrollView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: C.offWhite,
    },
    scrollContent: {
        paddingBottom: 40,
    },

    // ── Header ──
    header: {
        paddingTop: 60,
        paddingBottom: 36,
        paddingHorizontal: 28,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        alignItems: 'center',
    },
    shieldContainer: {
        width: 80,
        height: 80,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    headerTitle: {
        fontFamily: 'DMSans-Bold',
        fontSize: 24,
        color: C.white,
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontFamily: 'DMSans-Regular',
        fontSize: 14,
        color: 'rgba(255,255,255,0.65)',
        textAlign: 'center',
        lineHeight: 20,
    },

    // ── Cards Section ──
    cardsSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
        gap: 16,
    },
    card: {
        backgroundColor: C.surface,
        borderRadius: 20,
        flexDirection: 'row',
        overflow: 'hidden',
        shadowColor: '#1B3A6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    cardAccentBar: {
        width: 5,
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 20,
        gap: 14,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    cardText: {
        flex: 1,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 6,
        flexWrap: 'wrap',
    },
    cardTitle: {
        fontFamily: 'DMSans-Bold',
        fontSize: 18,
        color: C.textPrimary,
        letterSpacing: -0.3,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
    },
    roleBadgeText: {
        fontFamily: 'DMSans-Bold',
        fontSize: 9,
        letterSpacing: 1.2,
    },
    cardDescription: {
        fontFamily: 'DMSans-Regular',
        fontSize: 13,
        color: C.textSecondary,
        lineHeight: 19,
        marginBottom: 14,
    },
    featureList: {
        gap: 7,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    featureDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    featureText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 12,
        color: C.textPrimary,
    },

    // Footer note
    footerNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 8,
    },
    footerNoteText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 11,
        color: C.textTertiary,
        textAlign: 'center',
    },
});
