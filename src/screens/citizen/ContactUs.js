import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    success: '#059669',
    successSurface: '#D1FAE5',
    infoSurface: '#E0E7FF',
};

export default function ContactUs({ navigation }) {
    const contactInfo = {
        phone: '+91 98765 43210',
        email: 'support@trafficeye.com',
    };

    const handlePhonePress = () => {
        Linking.openURL(`tel:${contactInfo.phone}`).catch(() => Alert.alert('Error', 'Unable to make phone call'));
    };

    const handleEmailPress = () => {
        Linking.openURL(`mailto:${contactInfo.email}`).catch(() => Alert.alert('Error', 'Unable to open email client'));
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Navy Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Help & Contact</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollInner}>
                    {/* ── Help Hero ── */}
                    <View style={styles.heroCard}>
                        <View style={styles.heroIconBg}>
                            <Ionicons name="chatbubbles" size={36} color={C.navyMid} />
                        </View>
                        <Text style={styles.heroTitle}>We're Here to Help</Text>
                        <Text style={styles.heroText}>
                            Having trouble with the app or need assistance regarding a report? Reach out to our support team.
                        </Text>
                    </View>

                    <Text style={styles.sectionTitle}>Get in Touch</Text>

                    {/* ── Contact Options ── */}
                    <TouchableOpacity style={styles.contactCard} onPress={handlePhonePress} activeOpacity={0.8}>
                        <View style={[styles.contactIconBg, { backgroundColor: C.successSurface }]}>
                            <Ionicons name="call" size={24} color={C.success} />
                        </View>
                        <View style={styles.contactDetails}>
                            <Text style={styles.contactLabel}>Phone Support</Text>
                            <Text style={styles.contactValue}>{contactInfo.phone}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={C.textTertiary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactCard} onPress={handleEmailPress} activeOpacity={0.8}>
                        <View style={[styles.contactIconBg, { backgroundColor: C.infoSurface }]}>
                            <Ionicons name="mail" size={24} color={C.navyMid} />
                        </View>
                        <View style={styles.contactDetails}>
                            <Text style={styles.contactLabel}>Email Support</Text>
                            <Text style={styles.contactValue}>{contactInfo.email}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={C.textTertiary} />
                    </TouchableOpacity>

                    {/* ── About Section ── */}
                    <Text style={styles.sectionTitle}>About Traffic Eye</Text>
                    <View style={styles.aboutCard}>
                        <Text style={styles.aboutText}>
                            Traffic Eye is a civic tech initiative aimed at improving road safety. By empowering citizens to report traffic violations safely and easily, together we make our roads safer for everyone.
                        </Text>
                        <View style={styles.aboutDivider} />
                        
                        <View style={styles.featureItem}>
                            <Ionicons name="shield-checkmark" size={18} color={C.amber} />
                            <Text style={styles.featureText}>Secure, anonymous reporting</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="sparkles" size={18} color={C.amber} />
                            <Text style={styles.featureText}>AI-assisted violation detection</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="trophy" size={18} color={C.amber} />
                            <Text style={styles.featureText}>Community reward system</Text>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    },
    backButton: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: C.white },

    content: { flex: 1 },
    scrollInner: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

    // Hero
    heroCard: {
        backgroundColor: C.surface, borderRadius: 20, padding: 24,
        alignItems: 'center', marginBottom: 32,
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },
    heroIconBg: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: C.infoSurface,
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    heroTitle: { fontSize: 20, fontWeight: '800', color: C.navyMid, marginBottom: 8 },
    heroText: { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22 },

    sectionTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary, marginBottom: 12, marginLeft: 4, marginTop: 10 },

    // Contact Cards
    contactCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    contactIconBg: {
        width: 48, height: 48, borderRadius: 24,
        justifyContent: 'center', alignItems: 'center', marginRight: 16,
    },
    contactDetails: { flex: 1 },
    contactLabel: { fontSize: 13, color: C.textSecondary, marginBottom: 2 },
    contactValue: { fontSize: 15, fontWeight: '700', color: C.navyMid },

    // About
    aboutCard: {
        backgroundColor: C.surface, borderRadius: 16, padding: 20, marginTop: 4,
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    aboutText: { fontSize: 14, color: C.textSecondary, lineHeight: 22 },
    aboutDivider: { height: 1, backgroundColor: '#F2F4F6', marginVertical: 16 },
    featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    featureText: { fontSize: 14, fontWeight: '500', color: C.textPrimary },
});
