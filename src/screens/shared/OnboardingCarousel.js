import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { Button } from '../../components';
import { useAppContext } from '../../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, GRADIENTS, SHADOWS } from '../../utils/theme';

const { width } = Dimensions.get('window');

const slides = [
    {
        image: require('../../../assets/images/1.jpg'),
        icon: 'camera',
        title: 'Report Violations',
        description: 'Capture traffic violations with your phone camera. Take photos or videos to help keep roads safe.',
        gradient: ['#4F46E5', '#6366F1'],
        accentColor: COLORS.primary,
    },
    {
        image: require('../../../assets/images/onboarding_ai.jpg'),
        icon: 'scan',
        title: 'AI Verification',
        description: 'Our AI instantly analyzes license plates, violation types, and location with high accuracy.',
        gradient: ['#0D9488', '#14B8A6'],
        accentColor: COLORS.secondary,
    },
    {
        image: require('../../../assets/images/onboarding_rewards.jpg'),
        icon: 'trophy',
        title: 'Earn Rewards',
        description: 'Get points for verified reports. Climb the leaderboard and make your community safer.',
        gradient: ['#D97706', '#F59E0B'],
        accentColor: COLORS.accent,
    },
];

export default function OnboardingCarousel({ navigation }) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const { setHasSeenOnboarding } = useAppContext();
    const scrollViewRef = React.useRef(null);

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            const nextSlide = currentSlide + 1;
            setCurrentSlide(nextSlide);
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
        setCurrentSlide(slideIndex);
    };

    return (
        <MobileContainer>
            <View style={styles.container}>
                {/* Skip button */}
                <View style={styles.header}>
                    <Button variant="ghost" onPress={handleSkip} textStyle={styles.skipText}>
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
                            {/* Image Section with Gradient Overlay */}
                            <View style={styles.imageContainer}>
                                <Image
                                    source={slide.image}
                                    style={styles.slideImage}
                                    resizeMode="cover"
                                />
                                {/* Gradient overlay on image */}
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.1)', COLORS.background]}
                                    style={styles.imageGradientBottom}
                                />
                                {/* Icon badge on top of image */}
                                <View style={styles.iconOverlay}>
                                    <LinearGradient
                                        colors={slide.gradient}
                                        style={styles.iconBadge}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name={slide.icon} size={28} color="#FFF" />
                                    </LinearGradient>
                                </View>
                            </View>

                            {/* Text Section */}
                            <View style={styles.slideTextContainer}>
                                <Text style={[styles.title, { color: slide.accentColor }]}>{slide.title}</Text>
                                <Text style={styles.description}>{slide.description}</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>

                {/* Indicators */}
                <View style={styles.indicators}>
                    {slides.map((slide, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                index === currentSlide
                                    ? [styles.activeIndicator, { backgroundColor: slides[currentSlide].accentColor }]
                                    : styles.inactiveIndicator,
                            ]}
                        />
                    ))}
                </View>

                {/* Button */}
                <View style={styles.footer}>
                    <Button onPress={handleNext} fullWidth size="lg">
                        {currentSlide < slides.length - 1 ? 'Continue' : 'Get Started'}
                    </Button>
                </View>
            </View>
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
    skipText: {
        color: COLORS.textTertiary,
        fontWeight: FONT_WEIGHTS.medium,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
    },
    // ── Image Section ──
    imageContainer: {
        width: '100%',
        height: '50%',
        overflow: 'hidden',
        position: 'relative',
    },
    slideImage: {
        width: '100%',
        height: '100%',
    },
    imageGradientBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    iconOverlay: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
    },
    iconBadge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    // ── Text Section ──
    slideTextContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xxl,
        paddingTop: SPACING.lg,
    },
    title: {
        fontSize: 28,
        fontWeight: FONT_WEIGHTS.bold,
        marginBottom: SPACING.md,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    description: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        maxWidth: 300,
        lineHeight: 24,
    },
    // ── Indicators ──
    indicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.xl,
    },
    indicator: {
        height: 6,
        borderRadius: 3,
    },
    activeIndicator: {
        width: 28,
    },
    inactiveIndicator: {
        width: 6,
        backgroundColor: COLORS.gray300,
    },
    // ── Footer ──
    footer: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxl,
    },
});
