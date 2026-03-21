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
    surface: '#FFFFFF',
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
        slideColor: '#D7E2FF',
    },
    {
        image: require('../../../assets/images/onboarding_ai.jpg'),
        icon: 'scan',
        iconColor: '#047857',
        iconBg: '#D1FAE5',
        title: 'AI Verification',
        description: 'Gemini AI instantly analyzes license plates, violation types, and location with government-grade accuracy.',
        accent: '#047857',
        slideColor: '#D1FAE5',
    },
    {
        image: require('../../../assets/images/onboarding_rewards.jpg'),
        icon: 'trophy',
        iconColor: C.amberDark,
        iconBg: '#FEF3C7',
        title: 'Earn Rewards',
        description: 'Get recognition for verified reports. Accumulate points, unlock achievements and make a real difference.',
        accent: C.amberDark,
        slideColor: '#FEF3C7',
    },
];

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

    const onPressIn = () => {
        Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
    };
    const onPressOut = () => {
        Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
    };

    const slide = slides[currentSlide];
    const isLast = currentSlide === slides.length - 1;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={C.offWhite} />

            {/* ── Slide Content ── */}
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
                        {/* Image with gradient overlay */}
                        <View style={styles.imageContainer}>
                            <Image
                                source={s.image}
                                style={styles.slideImage}
                                resizeMode="cover"
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(248,249,251,0.6)', C.offWhite]}
                                locations={[0.3, 0.7, 1]}
                                style={styles.imageGradient}
                            />
                        </View>

                        {/* Feature icon badge */}
                        <View style={[styles.iconBadge, { backgroundColor: s.iconBg }]}>
                            <Ionicons name={s.icon} size={28} color={s.iconColor} />
                        </View>

                        {/* Text section */}
                        <View style={styles.textSection}>
                            <Text style={[styles.slideTitle, { color: s.accent }]}>{s.title}</Text>
                            <Text style={styles.slideDescription}>{s.description}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* ── Bottom Section ── */}
            <View style={styles.bottomSection}>
                {/* Step indicators */}
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

                {/* CTA Row */}
                <View style={styles.ctaRow}>
                    {/* Skip */}
                    {!isLast && (
                        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                            <Text style={styles.skipText}>Skip</Text>
                        </TouchableOpacity>
                    )}

                    {/* Next / Get Started */}
                    <Animated.View
                        style={[
                            styles.nextButtonWrapper,
                            !isLast && { flex: 1 },
                            isLast && { width: '100%' },
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
                                colors={isLast ? [C.amberDark, C.amber] : [C.navy, C.navyMid]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.nextButtonGradient}
                            >
                                <Text style={styles.nextButtonText}>
                                    {isLast ? 'Get Started' : 'Continue'}
                                </Text>
                                <Ionicons
                                    name={isLast ? 'checkmark' : 'arrow-forward'}
                                    size={18}
                                    color={C.white}
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* Trust signal */}
                <View style={styles.trustRow}>
                    <Ionicons name="shield-checkmark" size={12} color={C.textTertiary} />
                    <Text style={styles.trustText}>Government approved  •  Secure  •  Private</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.offWhite,
    },
    scrollView: {
        flex: 1,
    },

    // ── Slide ──
    slide: {
        flex: 1,
        backgroundColor: C.offWhite,
    },
    imageContainer: {
        width: '100%',
        height: 340,
        overflow: 'hidden',
        position: 'relative',
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
        height: 140,
    },
    iconBadge: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: -32,
        shadowColor: '#1B3A6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
    },
    textSection: {
        paddingHorizontal: 32,
        paddingTop: 20,
        alignItems: 'center',
    },
    slideTitle: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
        marginBottom: 12,
        textAlign: 'center',
    },
    slideDescription: {
        fontSize: 15,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 300,
    },

    // ── Bottom ──
    bottomSection: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        backgroundColor: C.offWhite,
    },
    indicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 24,
    },
    indicator: {
        height: 6,
        borderRadius: 3,
    },
    indicatorActive: {
        width: 28,
    },
    indicatorInactive: {
        width: 6,
        backgroundColor: C.border,
    },
    ctaRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    skipButton: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#EDEEF0',
    },
    skipText: {
        fontSize: 15,
        fontWeight: '600',
        color: C.textTertiary,
    },
    nextButtonWrapper: {},
    nextButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    nextButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: C.white,
    },
    trustRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    trustText: {
        fontSize: 11,
        color: C.textTertiary,
        fontWeight: '500',
    },
});
