/**
 * OnboardingCarousel.js — Traffic Eye Citizen Onboarding
 *
 * Fully illustrated using Ionicons on gradient backgrounds.
 * No photo assets required — zero broken-image risk.
 * Professional government-app feel.
 */
import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Dimensions,
    TouchableOpacity, StatusBar, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { FocusAwareStatusBar } from '../../components';

const { width } = Dimensions.get('window');

const C = {
    navy: '#0F2C59',
    navyMid: '#1E3A8A',
    amber: '#D97706',
    amberDark: '#B45309',
    white: '#FFFFFF',
    offWhite: '#F4F6F9',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: '#CBD5E1',
};

// Slides — pure Ionicons illustration, no photos
const slides = [
    {
        icon: 'camera',
        iconSize: 80,
        gradColors: ['#0A1E3F', '#0F2C59'],
        accentIcon: 'shield-checkmark',
        accentColor: '#D97706',
        bgShapes: ['scan-outline', 'location-outline'],
        title: 'Report Violations',
        description: 'Photograph traffic violations directly from your phone. Help maintain road safety and hold violators accountable.',
        chips: ['Photo Report', 'Video Clip', 'GPS Tagged'],
    },
    {
        icon: 'scan',
        iconSize: 80,
        gradColors: ['#064E3B', '#047857'],
        accentIcon: 'checkmark-circle',
        accentColor: '#34D399',
        bgShapes: ['eye-outline', 'analytics-outline'],
        title: 'AI Verification',
        description: 'Our AI analyses licence plates, violation type and geolocation with government-grade accuracy before forwarding to officers.',
        chips: ['Plate Reader', 'GPS Verified', 'Anti-Fake'],
    },
    {
        icon: 'trophy',
        iconSize: 80,
        gradColors: ['#78350F', '#B45309'],
        accentIcon: 'star',
        accentColor: '#FCD34D',
        bgShapes: ['gift-outline', 'ribbon-outline'],
        title: 'Earn Rewards',
        description: 'Every verified report earns you civic points. Redeem them for safety gear, discount coupons, and more.',
        chips: ['Civic Points', 'Safety Gear', 'Coupons'],
    },
];

// Illustrated slide card — full gradient panel with large icon
function IllustrationCard({ slide, index }) {
    return (
        <LinearGradient
            colors={slide.gradColors}
            style={styles.illustration}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            {/* Decorative background shape icons */}
            <Ionicons
                name={slide.bgShapes[0]}
                size={180}
                color="rgba(255,255,255,0.04)"
                style={styles.bgShape1}
            />
            <Ionicons
                name={slide.bgShapes[1]}
                size={120}
                color="rgba(255,255,255,0.05)"
                style={styles.bgShape2}
            />

            {/* Accent badge (top right) */}
            <View style={[styles.accentBadge, { backgroundColor: `${slide.accentColor}20`, borderColor: `${slide.accentColor}40` }]}>
                <Ionicons name={slide.accentIcon} size={16} color={slide.accentColor} />
                <Text style={[styles.accentBadgeText, { color: slide.accentColor }]}>VERIFIED</Text>
            </View>

            {/* Main icon */}
            <View style={styles.mainIconFrame}>
                <View style={styles.mainIconOuter}>
                    <Ionicons name={slide.icon} size={slide.iconSize} color="rgba(255,255,255,0.95)" />
                </View>
            </View>

            {/* Slide number indicator */}
            <View style={styles.slideNumRow}>
                <Text style={styles.slideNum}>0{index + 1}</Text>
                <Text style={styles.slideNumOf}> / 0{slides.length}</Text>
            </View>
        </LinearGradient>
    );
}

export default function OnboardingCarousel() {
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

    const slide = slides[currentSlide];

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor="#0A1E3F" />

            {/* Skip button — top right */}
            {currentSlide < slides.length - 1 && (
                <TouchableOpacity style={styles.skipTopBtn} onPress={handleSkip}>
                    <Text style={styles.skipTopText}>Skip</Text>
                    <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
                </TouchableOpacity>
            )}

            {/* Horizontal scroll for slides */}
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

                        {/* Top: Illustrated card */}
                        <View style={styles.cardFrame}>
                            <IllustrationCard slide={s} index={index} />
                        </View>

                        {/* Bottom: Text + chips */}
                        <View style={styles.textSection}>
                            <Text style={styles.slideTitle}>{s.title}</Text>
                            <Text style={styles.slideDescription}>{s.description}</Text>

                            {/* Feature chips */}
                            <View style={styles.chipRow}>
                                {s.chips.map((chip, ci) => (
                                    <View key={ci} style={styles.chip}>
                                        <Ionicons name="checkmark" size={10} color={C.navy} />
                                        <Text style={styles.chipText}>{chip}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Bottom controls */}
            <View style={styles.bottomSection}>

                {/* Pill dots */}
                <View style={styles.indicators}>
                    {slides.map((_, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => {
                                setCurrentSlide(index);
                                scrollViewRef.current?.scrollTo({ x: width * index, animated: true });
                            }}
                        >
                            <View
                                style={[
                                    styles.indicator,
                                    index === currentSlide
                                        ? [styles.indicatorActive, { backgroundColor: C.navy }]
                                        : styles.indicatorInactive,
                                ]}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* CTA row */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
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
                                name={currentSlide === slides.length - 1 ? 'checkmark-circle' : 'arrow-forward'}
                                size={20}
                                color={C.white}
                            />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                {/* Trust line */}
                <View style={styles.trustRow}>
                    <Ionicons name="lock-closed" size={11} color={C.textTertiary} />
                    <Text style={styles.trustText}>Government Approved  ·  Secure  ·  Privacy Protected</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    scrollView: { flex: 1 },

    skipTopBtn: {
        position: 'absolute',
        top: 56,
        right: 20,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.border,
    },
    skipTopText: {
        fontSize: 13,
        fontFamily: 'Nunito-SemiBold',
        color: C.textTertiary,
    },

    slide: {
        flex: 1,
        backgroundColor: C.offWhite,
    },

    // Illustration card
    cardFrame: {
        marginTop: 56,
        marginHorizontal: 20,
        borderRadius: 28,
        overflow: 'hidden',
        height: 300,
        shadowColor: '#0F2C59',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.2,
        shadowRadius: 32,
        elevation: 14,
    },
    illustration: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    bgShape1: {
        position: 'absolute',
        top: -30,
        right: -40,
    },
    bgShape2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
    },
    accentBadge: {
        position: 'absolute',
        top: 18,
        right: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
    },
    accentBadgeText: {
        fontSize: 9,
        fontFamily: 'Nunito-ExtraBold',
        letterSpacing: 0.8,
    },
    mainIconFrame: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainIconOuter: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    slideNumRow: {
        position: 'absolute',
        bottom: 18,
        left: 20,
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    slideNum: {
        fontSize: 22,
        fontFamily: 'Nunito-ExtraBold',
        color: 'rgba(255,255,255,0.5)',
    },
    slideNumOf: {
        fontSize: 13,
        fontFamily: 'Nunito-Medium',
        color: 'rgba(255,255,255,0.3)',
    },

    // Text
    textSection: {
        paddingHorizontal: 24,
        paddingTop: 28,
        alignItems: 'center',
    },
    slideTitle: {
        fontFamily: 'Nunito-ExtraBold',
        fontSize: 26,
        color: C.textPrimary,
        letterSpacing: -0.5,
        marginBottom: 10,
        textAlign: 'center',
    },
    slideDescription: {
        fontFamily: 'Nunito-Regular',
        fontSize: 14,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 320,
        marginBottom: 16,
    },

    // Chips
    chipRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#EFF6FF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    chipText: {
        fontSize: 11,
        fontFamily: 'Nunito-SemiBold',
        color: C.navy,
    },

    // Bottom
    bottomSection: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        backgroundColor: C.offWhite,
        gap: 16,
    },
    indicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginTop: 4,
    },
    indicator: { height: 6, borderRadius: 3 },
    indicatorActive: { width: 28 },
    indicatorInactive: { width: 6, backgroundColor: '#D1D5DB' },

    nextButton: { borderRadius: 18, overflow: 'hidden' },
    nextButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
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
        gap: 6,
    },
    trustText: {
        fontFamily: 'Nunito-Medium',
        fontSize: 11,
        color: C.textTertiary,
        textAlign: 'center',
    },
});
