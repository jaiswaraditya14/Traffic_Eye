/**
 * ConfirmationModal.js — themed confirm / cancel dialog
 *
 * A branded replacement for ad-hoc two-button Alert.alert() confirmations that
 * appear across the app. Used here for the AI "Submit for manual review?"
 * fallback, and reusable for destructive confirmations (tone="danger").
 */
import React from 'react';
import { Modal, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '../../utils/theme';
import PressableScale from './PressableScale';

/**
 * @param {boolean}  visible
 * @param {string}   title
 * @param {string}   message
 * @param {string}   [icon]         - Ionicons name (defaults by tone)
 * @param {string}   [confirmLabel] - default "Confirm"
 * @param {string}   [cancelLabel]  - default "Cancel"
 * @param {'default'|'danger'} [tone]
 * @param {boolean}  [loading]      - shows a spinner in the confirm button and blocks actions
 * @param {function} onConfirm
 * @param {function} onCancel
 */
export default function ConfirmationModal({
    visible,
    title,
    message,
    icon,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'default',
    loading = false,
    onConfirm,
    onCancel,
}) {
    const isDanger = tone === 'danger';
    const accent = isDanger ? COLORS.danger : COLORS.primary;
    const accentSurface = isDanger ? COLORS.errorSurface : COLORS.primarySurface;
    const iconName = icon || (isDanger ? 'warning-outline' : 'help-circle-outline');

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={loading ? undefined : onCancel}
        >
            <View style={styles.backdrop}>
                <View style={styles.card} accessibilityViewIsModal>
                    <View style={[styles.iconCircle, { backgroundColor: accentSurface }]}>
                        <Ionicons name={iconName} size={30} color={accent} />
                    </View>

                    {!!title && <Text style={styles.title}>{title}</Text>}
                    {!!message && <Text style={styles.message}>{message}</Text>}

                    <View style={styles.actions}>
                        <PressableScale
                            onPress={onCancel}
                            disabled={loading}
                            style={[styles.btn, styles.cancelBtn]}
                            accessibilityLabel={cancelLabel}
                        >
                            <Text style={styles.cancelText}>{cancelLabel}</Text>
                        </PressableScale>

                        <PressableScale
                            onPress={onConfirm}
                            disabled={loading}
                            style={[styles.btn, { backgroundColor: accent }, loading && styles.btnDisabled]}
                            accessibilityLabel={confirmLabel}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} size="small" />
                            ) : (
                                <Text style={styles.confirmText}>{confirmLabel}</Text>
                            )}
                        </PressableScale>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: COLORS.overlayStrong,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    card: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: COLORS.card,
        borderRadius: BORDER_RADIUS.xxl,
        padding: SPACING.xl,
        alignItems: 'center',
        ...SHADOWS.xl,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: BORDER_RADIUS.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        ...TYPOGRAPHY.h2,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    message: {
        ...TYPOGRAPHY.body,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    actions: {
        flexDirection: 'row',
        gap: SPACING.md,
        width: '100%',
    },
    btn: {
        flex: 1,
        minHeight: 50,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnDisabled: {
        opacity: 0.7,
    },
    cancelBtn: {
        backgroundColor: COLORS.surfaceContainer,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    cancelText: {
        ...TYPOGRAPHY.label,
        color: COLORS.textSecondary,
    },
    confirmText: {
        ...TYPOGRAPHY.label,
        color: COLORS.white,
    },
});
