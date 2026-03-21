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
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
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
                                {/* Circle Frame Icon */}
                                <View style={styles.iconFrame}>
                                    <Ionicons name="person" size={28} color={C.navyMid} />
                                </View>
                                {/* Text Content */}
                                <View style={styles.cardText}>
                                    <View style={styles.cardTitleRow}>
                                        <Text style={styles.cardTitle}>Citizen</Text>
                                        <View style={[styles.roleBadge, { backgroundColor: C.primarySurface, borderColor: C.navyMid + '20' }]}>
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
                                <Ionicons name="chevron-forward" size={20} color={C.textTertiary} style={{ marginTop: 4 }} />
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
                            {/* Left accent bar */}
                            <View style={[styles.cardAccentBar, { backgroundColor: C.amber }]} />
                            <View style={styles.cardContent}>
                                {/* Circle Frame Icon */}
                                <View style={styles.iconFrame}>
                                    <Ionicons name="shield-checkmark" size={28} color={C.amberDark} />
                                </View>
                                {/* Text Content */}
                                <View style={styles.cardText}>
                                    <View style={styles.cardTitleRow}>
                                        <Text style={styles.cardTitle}>Traffic Officer</Text>
                                        <View style={[styles.roleBadge, { backgroundColor: C.amberSurface, borderColor: C.amber + '40' }]}>
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
                                <Ionicons name="chevron-forward" size={20} color={C.textTertiary} style={{ marginTop: 4 }} />
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
        fontFamily: 'Nunito-Bold',
        fontSize: 24,
        color: C.white,
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontFamily: 'Nunito-Regular',
        fontSize: 14,
        color: 'rgba(255,255,255,0.65)',
        textAlign: 'center',
        lineHeight: 20,
    },

    // ── Cards Section ──
    cardsSection: {
        paddingHorizontal: 22,
        paddingTop: 32,
        gap: 20,
    },
    card: {
        backgroundColor: C.surface,
        borderRadius: 24,
        flexDirection: 'row',
        overflow: 'hidden',
        shadowColor: '#1B3A6B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    cardAccentBar: {
        width: 6,
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 24,
        gap: 16,
    },
    iconFrame: {
        width: 60,
        height: 60,
        borderRadius: 30, // Circle Frame for roles
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        backgroundColor: '#FFFFFF',
        shadowColor: '#1B3A6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
    },
    cardText: {
        flex: 1,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    cardTitle: {
        fontFamily: 'Nunito-Bold',
        fontSize: 19,
        color: C.textPrimary,
        letterSpacing: -0.3,
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    roleBadgeText: {
        fontFamily: 'Nunito-ExtraBold',
        fontSize: 10,
        letterSpacing: 1.2,
    },
    cardDescription: {
        fontFamily: 'Nunito-Regular',
        fontSize: 14,
        color: C.textSecondary,
        lineHeight: 21,
        marginBottom: 16,
    },
    featureList: {
        gap: 8,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    featureDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    featureText: {
        fontFamily: 'Nunito-SemiBold',
        fontSize: 13,
        color: C.textPrimary,
    },

    // Footer note
    footerNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingBottom: 20,
    },
    footerNoteText: {
        fontFamily: 'Nunito-Regular',
        fontSize: 12,
        color: C.textTertiary,
        textAlign: 'center',
    },
});
