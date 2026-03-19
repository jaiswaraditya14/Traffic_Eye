import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer } from '../../components';
import { Button } from '../../components';
import { useAppContext } from '../../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../utils/theme';

const { width } = Dimensions.get('window');

const slides = [
    {
        icon: 'camera',
        title: 'Report Violations',
        description: 'Capture traffic violations with your phone camera. Take photos or videos up to 15 seconds.',
        color: COLORS.primary,
        bgColor: COLORS.primarySoft || '#EFF6FF',
    },
    {
        icon: 'sparkles',
        title: 'AI Verification',
        description: 'Our AI instantly analyzes license plates, violation types, and location with high accuracy.',
        color: COLORS.secondary,
        bgColor: COLORS.secondarySoft || '#ECFDF5',
    },
    {
        icon: 'trophy',
        title: 'Earn Rewards',
        description: 'Get points for verified reports. Climb the leaderboard and make your community safer.',
        color: COLORS.accent,
        bgColor: COLORS.accentSoft || '#FFFBEB',
    },
];

export default function OnboardingCarousel({ navigation }) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const { setHasSeenOnboarding } = useAppContext();
    const scrollViewRef = useRef(null);

    // Fade animations for content transition
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideUpAnim = useRef(new Animated.Value(0)).current;
    const indicatorWidths = useRef(slides.map((_, i) =>
        new Animated.Value(i === 0 ? 32 : 8)
    )).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(slideUpAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const animateIndicators = (index) => {
        slides.forEach((_, i) => {
            Animated.spring(indicatorWidths[i], {
                toValue: i === index ? 32 : 8,
                useNativeDriver: false,
                tension: 100,
                friction: 10,
            }).start();
        });
    };

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            const nextSlide = currentSlide + 1;
            setCurrentSlide(nextSlide);
            animateIndicators(nextSlide);
            scrollViewRef.current?.scrollTo({ x: width * nextSlide, animated: true });
        } else {
            setHasSeenOnboarding(true);
        }
    };

    const handleSkip = () => {
        setHasSeenOnboarding(true);
    };

    const handleScroll = (event) => {
        const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
        if (slideIndex !== currentSlide) {
            setCurrentSlide(slideIndex);
            animateIndicators(slideIndex);
        }
    };

    return (
        <MobileContainer>
            <Animated.View style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideUpAnim }],
                },
            ]}>
                {/* Skip button */}
                <View style={styles.header}>
                    <Button variant="ghost" onPress={handleSkip} size="sm">
                        Skip
                    </Button>
                </View>

                {/* Slides */}
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    {slides.map((slide, index) => (
                        <View key={index} style={[styles.slide, { width }]}>
                            <View style={[styles.iconContainer, { backgroundColor: slide.bgColor }]}>
                                <View style={[styles.iconInner, { backgroundColor: `${slide.color}20` }]}>
                                    <Ionicons name={slide.icon} size={56} color={slide.color} />
                                </View>
                            </View>
                            <Text style={styles.title}>{slide.title}</Text>
                            <Text style={styles.description}>{slide.description}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Indicators */}
                <View style={styles.indicators}>
                    {slides.map((slide, index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.indicator,
                                {
                                    width: indicatorWidths[index],
                                    backgroundColor: index === currentSlide
                                        ? slides[currentSlide].color
                                        : COLORS.gray300,
                                },
                            ]}
                        />
                    ))}
                </View>

                {/* Button */}
                <View style={styles.footer}>
                    <Button onPress={handleNext} fullWidth size="lg">
                        {currentSlide < slides.length - 1 ? 'Next' : 'Get Started'}
                    </Button>
                </View>
            </Animated.View>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        alignItems: 'flex-end',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
    },
    slide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    iconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    iconInner: {
        width: 110,
        height: 110,
        borderRadius: 55,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: FONT_SIZES.xxl + 2,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    description: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        maxWidth: 320,
        lineHeight: 24,
    },
    indicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.xl,
    },
    indicator: {
        height: 8,
        borderRadius: 4,
    },
    footer: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl + SPACING.md,
    },
});
