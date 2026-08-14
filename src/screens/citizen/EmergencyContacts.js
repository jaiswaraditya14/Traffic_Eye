import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { EMERGENCY_CONTACTS } from '../../data/trafficData';
import { FocusAwareStatusBar } from '../../components';

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
    border: '#E5E7EB',
    error: '#BA1A1A',
    errorSurface: '#FFDAD6',
};

export default function EmergencyContacts({ navigation }) {
    const handleCall = (number) => {
        Linking.openURL(`tel:${number}`);
    };

    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>SOS Emergency</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* ── Warning Notice ── */}
                    <View style={styles.warningBox}>
                        <Ionicons name="alert-circle" size={20} color={C.error} />
                        <Text style={styles.warningText}>
                            Use these numbers only for genuine road emergencies. Misuse is a punishable offence.
                        </Text>
                    </View>

                    <Text style={styles.sectionTitle}>Direct Dial Services</Text>

                    {EMERGENCY_CONTACTS.map((contact, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.contactCard}
                            activeOpacity={0.8}
                            onPress={() => handleCall(contact.number)}
                        >
                            <View style={styles.contactIconFrame}>
                                <Ionicons name={contact.icon} size={28} color={C.error} />
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactName}>{contact.name}</Text>
                                <Text style={styles.contactDesc}>{contact.desc}</Text>
                            </View>
                            <View style={styles.callCircle}>
                                <Ionicons name="call" size={20} color={C.white} />
                                <Text style={styles.numberText}>{contact.number}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {/* ── Regional Support ── */}
                    <View style={styles.helpBoard}>
                        <Text style={styles.boardTitle}>Regional Highway Support</Text>
                        <Text style={styles.boardText}>
                            For breakdowns on National Highways (NH), dial 1033. For State Highways, please check local district helpline.
                        </Text>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    },
    backButton: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.white },

    scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
    
    warningBox: {
        flexDirection: 'row', gap: 12, backgroundColor: C.errorSurface,
        padding: 16, borderRadius: 16, marginBottom: 28,
        borderWidth: 1, borderColor: '#FFCFCC',
    },
    warningText: { flex: 1, fontSize: 13, color: '#BA1A1A', fontFamily: 'Nunito-SemiBold', lineHeight: 18 },

    sectionTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.navy, marginBottom: 16 },

    contactCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
        padding: 16, borderRadius: 20, marginBottom: 16,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    },
    contactIconFrame: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
    contactInfo: { flex: 1, marginLeft: 16 },
    contactName: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    contactDesc: { fontSize: 12, color: C.textTertiary, fontFamily: 'Nunito-Medium', marginTop: 2 },
    
    callCircle: {
        alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: C.error, borderRadius: 12,
    },
    numberText: { fontSize: 12, fontFamily: 'Nunito-Bold', color: C.white },

    helpBoard: {
        marginTop: 12, padding: 20, backgroundColor: C.navyMid, borderRadius: 24,
    },
    boardTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.white, marginBottom: 8 },
    boardText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Nunito-Medium', lineHeight: 20 },
});
