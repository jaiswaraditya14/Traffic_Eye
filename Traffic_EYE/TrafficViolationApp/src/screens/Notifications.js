// Notifications.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../components/MobileContainer';

import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function Notifications({ navigation }) {
    const notifications = [
        { id: 1, type: 'success', title: 'Report Verified', message: 'Your speeding violation report has been verified', time: '2h ago', read: false },
        { id: 2, type: 'info', title: 'New Reward Available', message: 'You can now redeem a coffee voucher', time: '5h ago', read: false },
        { id: 3, type: 'warning', title: 'Report Under Review', message: 'Your red light violation is being reviewed', time: '1d ago', read: true },
    ];

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Notifications</Text>
                    <View style={{ width: 24 }} />
                </View>
                <ScrollView style={styles.content}>
                    {notifications.map((notif) => (
                        <TouchableOpacity key={notif.id} style={[styles.notifCard, { backgroundColor: COLORS.white, borderLeftColor: !notif.read ? COLORS.primary : 'transparent' }, !notif.read && styles.unread]}>
                            <View style={[styles.iconContainer, { backgroundColor: notif.type === 'success' ? `${COLORS.success}15` : notif.type === 'info' ? `${COLORS.info}15` : `${COLORS.warning}15` }]}>
                                <Ionicons
                                    name={notif.type === 'success' ? 'checkmark-circle' : notif.type === 'info' ? 'information-circle' : 'alert-circle'}
                                    size={24}
                                    color={notif.type === 'success' ? COLORS.success : notif.type === 'info' ? COLORS.info : COLORS.warning}
                                />
                            </View>
                            <View style={styles.notifContent}>
                                <Text style={styles.notifTitle}>{notif.title}</Text>
                                <Text style={styles.notifMessage}>{notif.message}</Text>
                                <Text style={styles.notifTime}>{notif.time}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    title: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold },
    content: { flex: 1, paddingHorizontal: SPACING.lg },
    notifCard: { flexDirection: 'row', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
    unread: { borderLeftWidth: 4 },
    iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    notifContent: { flex: 1 },
    notifTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, marginBottom: 4 },
    notifMessage: { fontSize: FONT_SIZES.sm, marginBottom: 4 },
    notifTime: { fontSize: FONT_SIZES.xs },
});



