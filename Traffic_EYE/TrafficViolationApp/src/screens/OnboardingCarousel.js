import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer } from '../components/MobileContainer';
import { Button } from '../components/Button';
import { useAppContext } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../utils/theme';

const { width } = Dimensions.get('window');

const slides = [
    {
        icon: 'camera',
        title: 'Report Violations',
        description: 'Capture traffic violations with your phone camera. Take photos or videos up to 15 seconds.',
        color: COLORS.primary,
    },
    {
        icon: 'sparkles',
        title: 'AI Verification',
        description: 'Our AI instantly analyzes license plates, violation types, and location with high accuracy.',
        color: COLORS.secondary,
    },
    {
        icon: 'trophy',
        title: 'Earn Rewards',
        description: 'Get points for verified reports. Climb the leaderboard and make your community safer.',
        color: COLORS.accent,
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
            navigation.replace('RoleSelection');
        }
    };

    const handleSkip = () => {
        setHasSeenOnboarding(true);
        navigation.replace('RoleSelection');
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
                    <Button variant="ghost" onPress={handleSkip}>
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
                            <View style={[styles.iconContainer, { backgroundColor: `${slide.color}15` }]}>
                                <Ionicons name={slide.icon} size={64} color={slide.color} />
                            </View>
                            <Text style={styles.title}>{slide.title}</Text>
                            <Text style={styles.description}>{slide.description}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Indicators */}
                <View style={styles.indicators}>
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                index === currentSlide ? styles.activeIndicator : styles.inactiveIndicator,
                            ]}
                        />
                    ))}
                </View>

                {/* Button */}
                <View style={styles.footer}>
                    <Button onPress={handleNext} fullWidth>
                        {currentSlide < slides.length - 1 ? 'Next' : 'Get Started'}
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
    slide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    iconContainer: {
        width: 128,
        height: 128,
        borderRadius: 64,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    description: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        maxWidth: 300,
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
    activeIndicator: {
        width: 32,
        backgroundColor: COLORS.primary,
    },
    inactiveIndicator: {
        width: 8,
        backgroundColor: COLORS.gray300,
    },
    footer: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
});


