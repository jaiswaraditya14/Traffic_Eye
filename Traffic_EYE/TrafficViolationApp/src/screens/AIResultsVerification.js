import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../components/MobileContainer';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAppContext } from '../context/AppContext';

import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function AIResultsVerification({ navigation, route }) {
    const { currentReport } = useAppContext();
    const { aiResults } = route.params || {};

    // Editable fields with AI-detected values
    const [vehicleNumber, setVehicleNumber] = useState(aiResults?.vehicleNumber || 'ABC-1234');
    const [violationType, setViolationType] = useState(aiResults?.violationType || 'Speeding');
    const [confidence, setConfidence] = useState(aiResults?.confidence || '95');
    const [imageModalVisible, setImageModalVisible] = useState(false);

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
                confidence: `${confidence}% `,
                ...currentReport
            }
        });
    };

    const handleEdit = () => {
        Alert.alert(
            'Edit Information',
            'You can directly edit the fields below to correct any AI detection errors.'
        );
    };

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Verify AI Results</Text> {/* Applied color */}
                    <TouchableOpacity onPress={handleEdit}>
                        <Ionicons name="create-outline" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
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
                        ) : currentReport?.video ? (
                            <View style={styles.videoPlaceholder}>
                                <Ionicons name="videocam" size={64} color={COLORS.primary} />
                                <Text style={styles.videoText}>Video Evidence</Text>
                            </View>
                        ) : (
                            <View style={styles.placeholder}>
                                <Ionicons name="image" size={64} color={COLORS.gray400} />
                            </View>
                        )}
                    </View>

                    {/* AI Results Card */}
                    <View style={[styles.card, { backgroundColor: COLORS.white, borderColor: `${COLORS.secondary} 30` }]}> {/* Changed to styles.card and applied background/border */}
                        <View style={styles.aiHeader}>
                            <Ionicons name="sparkles" size={24} color={COLORS.secondary} />
                            <Text style={[styles.sectionTitle, { color: COLORS.textPrimary, marginBottom: 0 }]}>AI Detection Results</Text> {/* Changed to styles.sectionTitle and applied color */}
                            <View style={styles.confidenceBadge}>
                                <Text style={styles.confidenceBadgeText}>{confidence}% Confidence</Text>
                            </View>
                        </View>
                        <Text style={styles.aiSubtitle}>
                            Please review and correct the information below if needed
                        </Text>
                    </View>

                    {/* Editable Fields */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Detected Information</Text> {/* Applied color */}

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
                                style={[styles.input, { backgroundColor: COLORS.white, color: COLORS.textPrimary, borderColor: COLORS.gray200 }]}
                                placeholderTextColor={COLORS.textSecondary}
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
                                style={[styles.input, { backgroundColor: COLORS.white, color: COLORS.textPrimary, borderColor: COLORS.gray200 }]}
                                placeholderTextColor={COLORS.textSecondary}
                            />
                            {/* Common Violation Types */}
                            <View style={styles.quickOptions}>
                                <TouchableOpacity
                                    style={[styles.quickOption, { backgroundColor: COLORS.white, borderColor: COLORS.gray200 }]}
                                    onPress={() => setViolationType('Speeding')}
                                >
                                    <Text style={styles.quickOptionText}>Speeding</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.quickOption, { backgroundColor: COLORS.white, borderColor: COLORS.gray200 }]}
                                    onPress={() => setViolationType('Red Light')}
                                >
                                    <Text style={styles.quickOptionText}>Red Light</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.quickOption, { backgroundColor: COLORS.white, borderColor: COLORS.gray200 }]}
                                    onPress={() => setViolationType('Wrong Parking')}
                                >
                                    <Text style={styles.quickOptionText}>Wrong Parking</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* AI Confidence */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputHeader}>
                                <Ionicons name="analytics" size={20} color={COLORS.success} />
                                <Text style={styles.inputLabel}>AI Confidence Level</Text>
                                <View style={styles.lockBadge}>
                                    <Ionicons name="lock-closed" size={12} color={COLORS.textSecondary} />
                                    <Text style={styles.lockText}>Auto-generated</Text>
                                </View>
                            </View>
                            <View style={styles.confidenceContainer}>
                                <Input
                                    placeholder="0-100"
                                    value={confidence}
                                    editable={false}
                                    keyboardType="numeric"
                                    style={[styles.confidenceInput, styles.readOnlyInput, { backgroundColor: COLORS.white, color: COLORS.textPrimary, borderColor: COLORS.gray200 }]}
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                                <Text style={styles.percentSymbol}>%</Text>
                            </View>
                            <View style={styles.confidenceBar}>
                                <View
                                    style={[
                                        styles.confidenceFill,
                                        {
                                            width: `${confidence}% `,
                                            backgroundColor: confidence >= 80 ? COLORS.success :
                                                confidence >= 50 ? COLORS.warning :
                                                    COLORS.danger
                                        }
                                    ]}
                                />
                            </View>
                        </View>

                        {/* Additional Information */}
                        {currentReport?.address && (
                            <View style={styles.card}> {/* Changed to styles.card */}
                                <View style={styles.infoRow}>
                                    <Ionicons name="location" size={18} color={COLORS.textSecondary} />
                                    <Text style={styles.infoLabel}>Location:</Text>
                                </View>
                                <Text style={styles.infoValue}>{currentReport.address}</Text>
                            </View>
                        )}

                        {currentReport?.description && (
                            <View style={styles.card}> {/* Changed to styles.card */}
                                <View style={styles.infoRow}>
                                    <Ionicons name="document-text" size={18} color={COLORS.textSecondary} />
                                    <Text style={styles.infoLabel}>Description:</Text>
                                </View>
                                <Text style={styles.infoValue}>{currentReport.description}</Text>
                            </View>
                        )}
                    </View>

                    {/* Info Box */}
                    <View style={[styles.infoBox, { backgroundColor: `${COLORS.info} 15`, borderColor: `${COLORS.info} 30` }]}>
                        <Ionicons name="information-circle" size={20} color={COLORS.info} />
                        <Text style={styles.infoBoxText}>
                            AI has analyzed the evidence. Please verify the detected information and make corrections if needed before submitting.
                        </Text>
                    </View>
                </ScrollView>

                {/* Footer Buttons */}
                <View style={[styles.footer, { borderTopColor: COLORS.gray200, backgroundColor: COLORS.background }]}>
                    <Button
                        onPress={() => navigation.goBack()}
                        variant="secondary"
                        style={styles.button}
                    >
                        <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
                        <Text style={styles.buttonTextSecondary}>Back</Text>
                    </Button>
                    <Button
                        onPress={handleSubmit}
                        style={styles.button}
                    >
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                        <Text style={styles.buttonText}>Submit Report</Text>
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
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Evidence Photo</Text>
                            <TouchableOpacity
                                onPress={() => setImageModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={28} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalImageContainer}
                            contentContainerStyle={styles.modalImageContent}
                            maximumZoomScale={3}
                            minimumZoomScale={1}
                            showsHorizontalScrollIndicator={false}
                            showsVerticalScrollIndicator={false}
                            bouncesZoom={true}
                        >
                            <Image
                                source={{ uri: currentReport?.image }}
                                style={styles.modalImage}
                                resizeMode="contain"
                            />
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <Text style={styles.modalHint}>Pinch to zoom • Drag to pan</Text>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        // color: COLORS.textPrimary // Removed from here, applied inline
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.lg
    },
    mediaContainer: {
        width: '100%',
        height: 200,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.lg,
        ...SHADOWS.md
    },
    mediaPreview: {
        width: '100%',
        height: '100%'
    },
    videoPlaceholder: {
        flex: 1,
        // backgroundColor: COLORS.gray100, // Removed from here, applied inline
        justifyContent: 'center',
        alignItems: 'center'
    },
    videoText: {
        fontSize: FONT_SIZES.md,
        // color: COLORS.primary, // Removed from here, applied inline
        marginTop: SPACING.sm,
        fontWeight: FONT_WEIGHTS.semibold
    },
    placeholder: {
        flex: 1,
        // backgroundColor: COLORS.gray100, // Removed from here, applied inline
        justifyContent: 'center',
        alignItems: 'center'
    },
    card: { // New style for general cards
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOWS.sm
    },
    // aiCard: { // Removed aiCard style, replaced by card
    //     backgroundColor: `${ COLORS.secondary } 15`,
    //     borderRadius: BORDER_RADIUS.lg,
    //     padding: SPACING.md,
    //     marginBottom: SPACING.lg,
    //     borderWidth: 1,
    //     borderColor: `${ COLORS.secondary } 30`
    // },
    aiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.xs
    },
    // aiTitle: { // Removed aiTitle style, replaced by sectionTitle
    //     fontSize: FONT_SIZES.md,
    //     fontWeight: FONT_WEIGHTS.bold,
    //     color: COLORS.textPrimary,
    //     flex: 1
    // },
    confidenceBadge: {
        // backgroundColor: COLORS.success, // Removed from here, applied inline
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.md,
    },
    confidenceBadgeText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.bold,
    },
    aiSubtitle: {
        fontSize: FONT_SIZES.sm,
        // color: COLORS.textSecondary, // Removed from here, applied inline
        marginTop: SPACING.xs
    },
    formSection: {
        marginBottom: SPACING.lg
    },
    sectionTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.bold,
        // color: COLORS.textPrimary, // Removed from here, applied inline
        marginBottom: SPACING.md
    },
    inputWrapper: {
        marginBottom: SPACING.lg
    },
    inputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: SPACING.xs
    },
    inputLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        // color: COLORS.textPrimary // Removed from here, applied inline
    },
    input: {
        marginTop: 0
    },
    quickOptions: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.sm
    },
    quickOption: {
        // backgroundColor: COLORS.gray100, // Removed from here, applied inline
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        // borderColor: COLORS.gray300 // Removed from here, applied inline
    },
    quickOptionText: {
        fontSize: FONT_SIZES.xs,
        // color: COLORS.textPrimary, // Removed from here, applied inline
        fontWeight: FONT_WEIGHTS.medium
    },
    confidenceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm
    },
    confidenceInput: {
        flex: 1,
        marginTop: 0
    },
    percentSymbol: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        // color: COLORS.textPrimary // Removed from here, applied inline
    },
    confidenceBar: {
        height: 8,
        // backgroundColor: COLORS.gray200, // Removed from here, applied inline
        borderRadius: BORDER_RADIUS.sm,
        marginTop: SPACING.sm,
        overflow: 'hidden'
    },
    confidenceFill: {
        height: '100%',
        borderRadius: BORDER_RADIUS.sm
    },
    // infoCard: { // Removed infoCard style, replaced by card
    //     backgroundColor: COLORS.white,
    //     borderRadius: BORDER_RADIUS.lg,
    //     padding: SPACING.md,
    //     marginBottom: SPACING.md,
    //     ...SHADOWS.sm
    // },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: SPACING.xs
    },
    infoLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textSecondary
    },
    infoValue: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        lineHeight: 20
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: `${COLORS.info} 15`,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        gap: SPACING.sm,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: `${COLORS.info} 30`
    },
    infoBoxText: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        lineHeight: 20
    },
    footer: {
        flexDirection: 'row',
        gap: SPACING.md,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray200,
        backgroundColor: COLORS.white
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        gap: SPACING.xs,
        justifyContent: 'center'
    },
    buttonText: {
        color: COLORS.white,
        fontWeight: FONT_WEIGHTS.semibold
    },
    buttonTextSecondary: {
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.semibold
    },
    zoomIndicator: {
        position: 'absolute',
        bottom: SPACING.sm,
        right: SPACING.sm,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.xs,
    },
    lockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.gray100,
        paddingHorizontal: SPACING.xs,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
        marginLeft: 'auto',
    },
    lockText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        fontWeight: FONT_WEIGHTS.medium,
    },
    readOnlyInput: {
        backgroundColor: COLORS.gray100,
        opacity: 0.8,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.md,
    },
    modalTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.white,
    },
    closeButton: {
        padding: SPACING.xs,
    },
    modalImageContainer: {
        flex: 1,
    },
    modalImageContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
    modalFooter: {
        paddingVertical: SPACING.md,
        alignItems: 'center',
    },
    modalHint: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.gray400,
        fontStyle: 'italic',
    },
});




