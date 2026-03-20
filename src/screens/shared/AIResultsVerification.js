import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer, Button, Input } from '../../components';
import { useAppContext } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils';

export default function AIResultsVerification({ navigation, route }) {
    const { currentReport } = useAppContext();
    const { aiResults } = route.params || {};

    // Editable fields with AI-detected values
    const [vehicleNumber, setVehicleNumber] = useState(aiResults?.vehicleNumber || '');
    const [violationType, setViolationType] = useState(aiResults?.violationType || '');
    const [confidence, setConfidence] = useState(aiResults?.confidence?.toString() || '0');
    const [imageModalVisible, setImageModalVisible] = useState(false);

    const severity = aiResults?.severity || 'Unknown';
    const allViolations = aiResults?.allViolations || [];
    const violationDetected = aiResults?.violationDetected !== false;

    const getSeverityColor = (sev) => {
        switch (sev) {
            case 'Critical': return '#dc2626';
            case 'High': return '#ea580c';
            case 'Medium': return '#eab308';
            case 'Low': return '#22c55e';
            default: return COLORS.textSecondary;
        }
    };

    const handleSubmit = () => {
        if (!vehicleNumber.trim()) {
            Alert.alert('Error', 'Please enter a vehicle number');
            return;
        }
        if (!violationType.trim()) {
            Alert.alert('Error', 'Please select or enter a violation type');
            return;
        }

        // Navigate to success screen with verified data
        navigation.navigate('ReportSuccess', {
            verifiedData: {
                vehicleNumber,
                violationType,
                severity,
                allViolations,
                confidence: `${confidence}%`,
                ...currentReport
            }
        });
    };

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Verify AI Results</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Media Preview */}
                    <View style={styles.mediaContainer}>
                        {currentReport?.image ? (
                            <TouchableOpacity
                                onPress={() => setImageModalVisible(true)}
                                activeOpacity={0.9}
                            >
                                <Image source={{ uri: currentReport.image }} style={styles.mediaPreview} />
                                <View style={styles.zoomIndicator}>
                                    <Ionicons name="expand" size={20} color={COLORS.white} />
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.placeholder}>
                                <Ionicons name="image" size={64} color={COLORS.gray400} />
                            </View>
                        )}
                    </View>

                    {/* AI Results Card */}
                    <View style={styles.card}>
                        <View style={styles.aiHeader}>
                            <Ionicons name="sparkles" size={24} color={COLORS.secondary} />
                            <Text style={styles.sectionTitle}>AI Detection Results</Text>
                            <View style={[styles.confidenceBadge, { backgroundColor: parseInt(confidence) >= 80 ? COLORS.success : COLORS.warning }]}>
                                <Text style={styles.confidenceBadgeText}>{confidence}% Confidence</Text>
                            </View>
                        </View>

                        {/* Severity Badge */}
                        {violationDetected && (
                            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(severity) + '20', borderColor: getSeverityColor(severity) }]}>
                                <Ionicons name="alert-circle" size={16} color={getSeverityColor(severity)} />
                                <Text style={[styles.severityText, { color: getSeverityColor(severity) }]}>
                                    Severity: {severity}
                                </Text>
                            </View>
                        )}

                        {/* All Violations List (when multiple) */}
                        {allViolations.length > 1 && (
                            <View style={styles.allViolationsBox}>
                                <Text style={styles.allViolationsTitle}>All Violations Detected ({allViolations.length}):</Text>
                                {allViolations.map((v, i) => (
                                    <Text key={i} style={styles.allViolationItem}>
                                        {i === 0 ? '🔴' : '🟡'} {v} {i === 0 ? '(Most Severe)' : ''}
                                    </Text>
                                ))}
                            </View>
                        )}

                        {aiResults?.description && (
                            <View style={styles.descriptionBox}>
                                <Ionicons name="information-circle" size={16} color={COLORS.primary} />
                                <Text style={styles.descriptionText}>{aiResults.description}</Text>
                            </View>
                        )}
                        <Text style={styles.aiSubtitle}>
                            Please review and correct the information below if needed
                        </Text>
                    </View>

                    {/* Editable Fields */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Detected Information</Text>

                        {/* Vehicle Number Plate */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputHeader}>
                                <Ionicons name="car-sport" size={20} color={COLORS.primary} />
                                <Text style={styles.inputLabel}>Vehicle Number Plate</Text>
                            </View>
                            <Input
                                placeholder="Enter vehicle number"
                                value={vehicleNumber}
                                onChangeText={setVehicleNumber}
                                autoCapitalize="characters"
                            />
                        </View>

                        {/* Violation Type */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputHeader}>
                                <Ionicons name="warning" size={20} color={COLORS.warning} />
                                <Text style={styles.inputLabel}>Violation Type</Text>
                            </View>
                            <Input
                                placeholder="Enter violation type"
                                value={violationType}
                                onChangeText={setViolationType}
                            />
                            {/* Common Violation Types */}
                            <View style={styles.quickOptions}>
                                {['Speeding', 'Red Light', 'No Helmet'].map(type => (
                                    <TouchableOpacity
                                        key={type}
                                        style={styles.quickOption}
                                        onPress={() => setViolationType(type)}
                                    >
                                        <Text style={styles.quickOptionText}>{type}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* AI Confidence (Locked) */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputHeader}>
                                <Ionicons name="analytics" size={20} color={COLORS.success} />
                                <Text style={styles.inputLabel}>AI Confidence Level</Text>
                                <View style={styles.lockBadge}>
                                    <Ionicons name="lock-closed" size={12} color={COLORS.textSecondary} />
                                    <Text style={styles.lockText}>Read-only</Text>
                                </View>
                            </View>
                            <View style={styles.confidenceContainer}>
                                <Input
                                    value={confidence}
                                    editable={false}
                                    style={styles.readOnlyInput}
                                />
                                <Text style={styles.percentSymbol}>%</Text>
                            </View>
                            <View style={styles.confidenceBar}>
                                <View
                                    style={[
                                        styles.confidenceFill,
                                        {
                                            width: `${confidence}%`,
                                            backgroundColor: parseInt(confidence) >= 80 ? COLORS.success :
                                                parseInt(confidence) >= 50 ? COLORS.warning :
                                                    COLORS.error
                                        }
                                    ]}
                                />
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.footer}>
                    <Button
                        onPress={() => navigation.goBack()}
                        variant="secondary"
                        style={styles.footerButton}
                    >
                        Back
                    </Button>
                    <Button
                        onPress={handleSubmit}
                        style={styles.footerButton}
                    >
                        Submit Report
                    </Button>
                </View>

                {/* Image Zoom Modal */}
                <Modal
                    visible={imageModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setImageModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setImageModalVisible(false)}
                        >
                            <Ionicons name="close" size={32} color={COLORS.white} />
                        </TouchableOpacity>
                        <Image
                            source={{ uri: currentReport?.image }}
                            style={styles.modalImage}
                            resizeMode="contain"
                        />
                    </View>
                </Modal>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    title: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    content: { flex: 1, paddingHorizontal: SPACING.lg },
    mediaContainer: { width: '100%', height: 200, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.lg, ...SHADOWS.md },
    mediaPreview: { width: '100%', height: '100%' },
    zoomIndicator: { position: 'absolute', bottom: SPACING.sm, right: SPACING.sm, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BORDER_RADIUS.md, padding: 4 },
    placeholder: { flex: 1, backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.gray100 },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
    sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, flex: 1 },
    confidenceBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.md },
    confidenceBadgeText: { color: COLORS.white, fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold },
    descriptionBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.xs,
        backgroundColor: COLORS.gray50,
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        marginVertical: SPACING.sm,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary
    },
    descriptionText: {
        flex: 1,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        lineHeight: 16
    },
    aiSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    formSection: { marginBottom: SPACING.xl },
    inputWrapper: { marginBottom: SPACING.lg },
    inputHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
    inputLabel: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
    quickOptions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
    quickOption: { backgroundColor: COLORS.gray100, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: BORDER_RADIUS.md },
    quickOptionText: { fontSize: FONT_SIZES.xs, color: COLORS.textPrimary, fontWeight: FONT_WEIGHTS.medium },
    lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.gray100, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BORDER_RADIUS.sm, marginLeft: 'auto' },
    lockText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.medium },
    confidenceContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    readOnlyInput: { flex: 1, backgroundColor: COLORS.gray100, opacity: 0.8 },
    percentSymbol: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    confidenceBar: { height: 6, backgroundColor: COLORS.gray200, borderRadius: BORDER_RADIUS.sm, marginTop: SPACING.sm, overflow: 'hidden' },
    confidenceFill: { height: '100%', borderRadius: BORDER_RADIUS.sm },
    severityBadge: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.md, borderWidth: 1.5,
        marginBottom: SPACING.sm, alignSelf: 'flex-start',
    },
    severityText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },
    allViolationsBox: {
        backgroundColor: COLORS.gray50, borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm, marginBottom: SPACING.sm,
        borderLeftWidth: 3, borderLeftColor: COLORS.warning,
    },
    allViolationsTitle: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
    allViolationItem: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
    footer: { flexDirection: 'row', gap: SPACING.md, padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.gray200 },
    footerButton: { flex: 1 },
    modalContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
    closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 1 },
    modalImage: { width: '100%', height: '80%' }
});
