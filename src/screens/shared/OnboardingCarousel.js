import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Dimensions,
    TouchableOpacity, Image, StatusBar, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const { width } = Dimensions.get('window');

const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    amberDark: '#D97706',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    border: '#C4C6D0',
};

const slides = [
    {
        image: require('../../../assets/images/1.jpg'),
        icon: 'camera',
        iconColor: C.navyMid,
        iconBg: '#D7E2FF',
        title: 'Report Violations',
        description: 'Capture traffic violations with your phone camera. Help keep roads safe and earn rewards for your community.',
        accent: C.navyMid,
        pills: [
            { icon: 'camera-outline', label: 'Photo & Video' },
            { icon: 'location-outline', label: 'GPS Tagged' },
            { icon: 'flash-outline', label: 'Instant' },
        ],
    },
    {
        image: require('../../../assets/images/onboarding_ai.jpg'),
        icon: 'scan',
        iconColor: '#047857',
        iconBg: '#D1FAE5',
        title: 'AI Verification',
        description: 'Gemini AI instantly analyzes license plates, violation types, and location with government-grade accuracy.',
        accent: '#047857',
        pills: [
            { icon: 'sparkles-outline', label: 'Gemini AI' },
            { icon: 'car-outline', label: 'Plate Scan' },
            { icon: 'shield-outline', label: 'Validated' },
        ],
    },
    {
        image: require('../../../assets/images/onboarding_rewards.jpg'),
        icon: 'trophy',
        iconColor: C.amberDark,
        iconBg: '#FEF3C7',
        title: 'Earn Rewards',
        description: 'Get recognition for verified reports. Accumulate points, unlock achievements and make a real difference.',
        accent: C.amberDark,
        pills: [
            { icon: 'trophy-outline', label: 'Points' },
            { icon: 'gift-outline', label: 'Rewards' },
            { icon: 'ribbon-outline', label: 'Rankings' },
        ],
    },
];

function FeaturePill({ icon, label, color }) {
    return (
        <View style={[pillStyles.pill, { borderColor: color + '40', backgroundColor: color + '12' }]}>
            <Ionicons name={icon} size={13} color={color} />
            <Text style={[pillStyles.label, { color }]}>{label}</Text>
        </View>
    );
}

export default function OnboardingCarousel({ navigation }) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const { setHasSeenOnboarding } = useAppContext();
    const scrollViewRef = useRef(null);
    const buttonScale = useRef(new Animated.Value(1)).current;

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            const next = currentSlide + 1;
            setCurrentSlide(next);
            scrollViewRef.current?.scrollTo({ x: width * next, animated: true });
        } else {
            setHasSeenOnboarding(true);
        }
    };

    const handleSkip = () => setHasSeenOnboarding(true);

    const handleScroll = (event) => {
        const idx = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentSlide(idx);
    };

    const onPressIn = () =>
        Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
    const onPressOut = () =>
        Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={C.offWhite} />

            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.scrollView}
            >
                {slides.map((s, index) => (
                    <View key={index} style={[styles.slide, { width }]}>

                        {/* ── Large rounded image card ── */}
                        <View style={styles.imageContainer}>
                            <Image
                                source={s.image}
                                style={styles.slideImage}
                                resizeMode="cover"
                            />
                            {/* Accent top bar */}
                            <View style={[styles.accentBar, { backgroundColor: s.accent }]} />
                            {/* Fade-out at bottom so it blends into page */}
                            <LinearGradient
                                colors={['transparent', 'rgba(248,249,251,0.55)', C.offWhite]}
                                style={styles.imageGradient}
                            />
                        </View>

                        {/* ── Icon badge overlapping image bottom ── */}
                        <View style={[styles.iconBadge, { backgroundColor: s.iconBg }]}>
                            <Ionicons name={s.icon} size={32} color={s.iconColor} />
                        </View>

                        {/* ── Text + feature pills ── */}
                        <View style={styles.textSection}>
                            <Text style={styles.slideTitle}>{s.title}</Text>
                            <Text style={styles.slideDescription}>{s.description}</Text>
                            <View style={styles.pillRow}>
                                {s.pills.map((p, i) => (
                                    <FeaturePill key={i} icon={p.icon} label={p.label} color={s.accent} />
                                ))}
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* ── Bottom Controls ── */}
            <View style={styles.bottomSection}>
                <View style={styles.indicators}>
                    {slides.map((s, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                index === currentSlide
                                    ? [styles.indicatorActive, { backgroundColor: s.accent }]
                                    : styles.indicatorInactive,
                            ]}
                        />
                    ))}
                </View>

                <View style={styles.ctaRow}>
                    {!(currentSlide === slides.length - 1) && (
                        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                            <Text style={styles.skipText}>Skip</Text>
                        </TouchableOpacity>
                    )}

                    <Animated.View
                        style={[
                            styles.nextButtonWrapper,
                            { flex: 1 },
                            { transform: [{ scale: buttonScale }] },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.nextButton}
                            onPress={handleNext}
                            onPressIn={onPressIn}
                            onPressOut={onPressOut}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={currentSlide === slides.length - 1 ? [C.amberDark, C.amber] : [C.navy, C.navyMid]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.nextButtonGradient}
                            >
                                <Text style={styles.nextButtonText}>
                                    {currentSlide === slides.length - 1 ? 'Get Started' : 'Continue'}
                                </Text>
                                <Ionicons
                                    name={currentSlide === slides.length - 1 ? 'checkmark' : 'arrow-forward'}
                                    size={18}
                                    color={C.white}
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                <View style={styles.trustRow}>
                    <Ionicons name="shield-checkmark" size={12} color={C.textTertiary} />
                    <Text style={styles.trustText}>Government approved  •  Secure  •  Private</Text>
                </View>
            </View>
        </View>
    );
}

const pillStyles = StyleSheet.create({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 99,
        borderWidth: 1,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.offWhite,
    },
    scrollView: {
        flex: 1,
    },
    slide: {
        flex: 1,
        backgroundColor: C.offWhite,
    },

    // ── Large card image (replaces small circle) ──
    imageContainer: {
        width: width - 32,
        height: 310,
        alignSelf: 'center',
        borderRadius: 28,
        overflow: 'hidden',
        marginTop: 52,
        // Shadow
        shadowColor: '#1B3A6B',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.18,
        shadowRadius: 30,
        elevation: 12,
    },
    accentBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 5,
        zIndex: 1,
    },
    slideImage: {
        width: '100%',
        height: '100%',
    },
    imageGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 110,
    },

    // ── Icon badge ──
    iconBadge: {
        width: 68,
        height: 68,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: -22,
        zIndex: 10,
        shadowColor: '#1B3A6B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
    },

    // ── Text section ──
    textSection: {
        paddingHorizontal: 28,
        paddingTop: 22,
        alignItems: 'center',
    },
    slideTitle: {
        fontFamily: 'Nunito-Bold',
        fontSize: 28,
        color: C.navy,
        letterSpacing: -0.5,
        marginBottom: 10,
        textAlign: 'center',
    },
    slideDescription: {
        fontFamily: 'Nunito-Regular',
        fontSize: 15,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 320,
        marginBottom: 18,
    },
    pillRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },

    // ── Bottom controls ──
    bottomSection: {
        paddingHorizontal: 28,
        paddingBottom: 44,
        backgroundColor: C.offWhite,
    },
    indicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    indicator: {
        height: 6,
        borderRadius: 3,
    },
    indicatorActive: { width: 30 },
    indicatorInactive: { width: 6, backgroundColor: '#D1D5DB' },

    ctaRow: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    skipButton: {
        paddingHorizontal: 22,
        paddingVertical: 18,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    skipText: {
        fontFamily: 'Nunito-SemiBold',
        fontSize: 15,
        color: C.textTertiary,
    },
    nextButtonWrapper: {},
    nextButton: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    nextButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
        paddingHorizontal: 28,
    },
    nextButtonText: {
        fontFamily: 'Nunito-Bold',
        fontSize: 17,
        color: C.white,
    },
    trustRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    trustText: {
        fontFamily: 'Nunito-Medium',
        fontSize: 12,
        color: C.textTertiary,
    },
});
