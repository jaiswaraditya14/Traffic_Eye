import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, StatusBar } from 'react-native';
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
    border: '#E5E7EB',
};

export default function OfficerSettings({ navigation }) {
    const [notifications, setNotifications] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [vibrationEnabled, setVibrationEnabled] = useState(true);

    const SettingRow = ({ icon, label, description, value, onToggle, isLast }) => (
        <View style={[styles.settingRow, isLast && styles.noBorder]}>
            <View style={styles.iconBox}>
                <Ionicons name={icon} size={20} color={C.navyMid} />
            </View>
            <View style={styles.textCol}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.description}>{description}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={value ? C.navyMid : C.white}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    <Text style={styles.sectionTitle}>Alerts & Notifications</Text>
                    <View style={styles.cardGroup}>
                        <SettingRow
                            icon="notifications"
                            label="Push Notifications"
                            description="Alerts for new assignments"
                            value={notifications}
                            onToggle={setNotifications}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="volume-high"
                            label="Alert Sounds"
                            description="Play sound for priority reports"
                            value={soundEnabled}
                            onToggle={setSoundEnabled}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="phone-portrait"
                            label="Vibration"
                            description="Haptic feedback on alerts"
                            value={vibrationEnabled}
                            onToggle={setVibrationEnabled}
                            isLast
                        />
                    </View>

                    <Text style={styles.sectionTitle}>System Info</Text>
                    <View style={styles.cardGroup}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Server Connection</Text>
                            <View style={styles.secureBadge}>
                                <Ionicons name="lock-closed" size={10} color="#059669" />
                                <Text style={styles.secureText}>Active (TLS 1.3)</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>App Version</Text>
                            <Text style={styles.infoValue}>1.0.4 - Officer Edition</Text>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.copyrightText}>© 2024 TrafficEye System. Law Enforcement Use Only.</Text>
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
    headerTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.white },

    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

    sectionTitle: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.textSecondary, marginBottom: 8, marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    cardGroup: { backgroundColor: C.surface, borderRadius: 20, marginBottom: 24, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F2F4F6', paddingVertical: 4 },
    
    settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    noBorder: {},
    divider: { height: 1, backgroundColor: '#F2F4F6', marginLeft: 64 },
    
    iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8F9FB', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    textCol: { flex: 1 },
    label: { fontSize: 16, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, marginBottom: 2 },
    description: { fontSize: 13, color: C.textSecondary },

    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    infoLabel: { fontSize: 15, fontFamily: 'Nunito-SemiBold', color: C.textPrimary },
    infoValue: { fontSize: 14, color: C.textSecondary, fontFamily: 'Nunito-Medium' },
    secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    secureText: { fontSize: 12, fontFamily: 'Nunito-Bold', color: '#059669' },

    footer: { alignItems: 'center', marginTop: 12 },
    copyrightText: { fontSize: 12, color: C.textTertiary, textAlign: 'center' },
});
