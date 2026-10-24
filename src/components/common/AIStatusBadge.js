import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../utils/theme';

const STATUS_CONFIG = {
    manual: {
        label: 'Manual Entry',
        icon: 'shield-outline',
        color: COLORS.textTertiary,
        backgroundColor: COLORS.gray100,
        borderColor: COLORS.gray300,
    },
    review: {
        label: 'Needs Review',
        icon: 'eye-outline',
        color: COLORS.warning,
        backgroundColor: COLORS.warningSurface,
        borderColor: COLORS.secondaryBorder,
    },
    uncertain: {
        label: 'AI Uncertain',
        icon: 'help-circle-outline',
        color: '#C2410C',
        backgroundColor: '#FFF7ED',
        borderColor: '#FED7AA',
    },
    integrity: {
        label: 'Integrity Warning',
        icon: 'warning-outline',
        color: COLORS.error,
        backgroundColor: COLORS.errorSurface,
        borderColor: '#FCA5A5',
    },
};

/**
 * Present AI assessment states without treating low confidence as evidence of fraud.
 * Confidence may be supplied in either the persisted 0–1 or display 0–100 scale.
 * Authenticity is a separate report field, so consumers can pass it independently.
 */
export function AIStatusBadge({ result, confidence, authenticityCheck }) {
    const isManualEntry = confidence === 0 && !result;
    const integrityStatus = authenticityCheck?.status ?? result?.authenticity_check?.status;

    let status = null;
    if (isManualEntry) {
        status = 'manual';
    } else if (integrityStatus === 'POSSIBLE_INTEGRITY_ISSUE') {
        status = 'integrity';
    } else if (confidence > 0 && result?.requiresManualReview) {
        status = 'uncertain';
    } else if (result?.requiresManualReview === true) {
        status = 'review';
    }

    if (!status) return null;

    const config = STATUS_CONFIG[status];

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: config.backgroundColor,
                    borderColor: config.borderColor,
                },
            ]}
            accessibilityRole="text"
            accessibilityLabel={`AI status: ${config.label}`}
        >
            <Ionicons name={config.icon} size={13} color={config.color} />
            <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
        </View>
    );
}

export default AIStatusBadge;

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
    },
    label: {
        ...TYPOGRAPHY.label,
        fontSize: 12,
        lineHeight: 16,
    },
});
