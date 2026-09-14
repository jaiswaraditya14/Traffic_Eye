/**
 * StatusPill.js — status / severity pill
 *
 * Consolidates the ad-hoc status badges duplicated across report screens
 * (e.g. ImageReportStatus `statusBadge`/`statusCfg`, MyReports, officer
 * queues) into one themed, icon-labelled pill. Also renders the
 * "manual review" state used by the AI fallback path so officers and citizens
 * see it consistently.
 *
 *   <StatusPill status="pending" />
 *   <StatusPill kind="severity" status="high" />
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../utils/theme';

const STATUS_CONFIG = {
    pending: { label: 'Pending', icon: 'time-outline', fg: COLORS.warning, bg: COLORS.warningSurface },
    processing: { label: 'Processing', icon: 'sync-outline', fg: COLORS.primary, bg: COLORS.primarySurface },
    manual_review: { label: 'Manual review', icon: 'person-outline', fg: COLORS.primary, bg: COLORS.primarySurface },
    approved: { label: 'Approved', icon: 'checkmark-circle-outline', fg: COLORS.success, bg: COLORS.successSurface },
    rejected: { label: 'Rejected', icon: 'close-circle-outline', fg: COLORS.danger, bg: COLORS.errorSurface },
    completed: { label: 'Completed', icon: 'checkmark-done-outline', fg: COLORS.success, bg: COLORS.successSurface },
    failed: { label: 'Failed', icon: 'alert-circle-outline', fg: COLORS.danger, bg: COLORS.errorSurface },
};

const SEVERITY_CONFIG = {
    low: { label: 'Low', icon: 'ellipse', fg: COLORS.success, bg: COLORS.successSurface },
    medium: { label: 'Medium', icon: 'ellipse', fg: COLORS.warning, bg: COLORS.warningSurface },
    high: { label: 'High', icon: 'ellipse', fg: COLORS.secondaryDark, bg: COLORS.secondarySurface },
    critical: { label: 'Critical', icon: 'ellipse', fg: COLORS.danger, bg: COLORS.errorSurface },
};

/**
 * @param {string}  status  - status/severity key (case-insensitive)
 * @param {'status'|'severity'} [kind]
 * @param {string}  [label] - override the default label text
 * @param {'sm'|'md'} [size]
 */
export default function StatusPill({ status, kind = 'status', label, size = 'md' }) {
    const table = kind === 'severity' ? SEVERITY_CONFIG : STATUS_CONFIG;
    const key = String(status || '').toLowerCase();
    const cfg = table[key] || {
        label: label || String(status || 'Unknown'),
        icon: 'help-circle-outline',
        fg: COLORS.textTertiary,
        bg: COLORS.surfaceContainer,
    };
    const isSm = size === 'sm';
    const iconSize = isSm ? 11 : 13;

    return (
        <View
            style={[
                styles.pill,
                { backgroundColor: cfg.bg },
                isSm ? styles.pillSm : styles.pillMd,
            ]}
            accessibilityRole="text"
            accessibilityLabel={`${kind === 'severity' ? 'Severity' : 'Status'}: ${label || cfg.label}`}
        >
            <Ionicons name={cfg.icon} size={iconSize} color={cfg.fg} />
            <Text style={[styles.text, isSm ? styles.textSm : styles.textMd, { color: cfg.fg }]}>
                {label || cfg.label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
        alignSelf: 'flex-start',
    },
    pillSm: { paddingHorizontal: SPACING.sm, paddingVertical: 3 },
    pillMd: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
    text: { ...TYPOGRAPHY.label },
    textSm: { fontSize: 11, letterSpacing: 0.2 },
    textMd: { fontSize: 12.5 },
});
