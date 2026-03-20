import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../../components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils/theme';

const SAFETY_TIPS = [
    {
        id: '1',
        title: 'Wear Your Seatbelt',
        description: 'Seatbelts reduce the risk of fatality by 45%, and cut the risk of serious injury by 50%. Always buckle up before starting your journey.',
        image: 'https://images.unsplash.com/photo-1581452445851-bcce763ef80f?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: '2',
        title: 'Obey Speed Limits',
        description: 'Speed limits are designed for ideal conditions. Reduce your speed in bad weather, heavy traffic, or near construction zones.',
        image: 'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: '3',
        title: 'Never Drink & Drive',
        description: 'Alcohol impairs your ability to drive safely. Always designate a sober driver or use public transportation.',
        image: 'https://images.unsplash.com/photo-1518331539958-e717808f921a?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: '4',
        title: 'Avoid Phone Distractions',
        description: 'Put your phone away. Texting while driving drastically increases your chances of causing an accident.',
        image: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=800&q=80',
    }
];

export default function SafetyTips({ navigation }) {
    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Road Safety Tips</Text>
                    <View style={styles.placeholder} />
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.introText}>
                        Protect yourself and others on the road by following these essential guidelines.
                    </Text>
                    {SAFETY_TIPS.map(tip => (
                        <View key={tip.id} style={styles.card}>
                            <Image source={{ uri: tip.image }} style={styles.image} />
                            <View style={styles.cardContent}>
                                <Text style={styles.title}>{tip.title}</Text>
                                <Text style={styles.description}>{tip.description}</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    placeholder: {
        width: 40,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    introText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.lg,
        lineHeight: 22,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.lg,
        ...SHADOWS.md,
    },
    image: {
        width: '100%',
        height: 180,
    },
    cardContent: {
        padding: SPACING.lg,
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    description: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
});
