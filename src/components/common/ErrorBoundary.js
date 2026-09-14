import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../utils/theme';
import PressableScale from './PressableScale';

/**
 * ErrorBoundary — catches unhandled React render errors anywhere below it and
 * shows a branded recovery screen instead of a white/blank screen.
 *
 * Recovery: "Try Again" clears the error AND remounts the child subtree (via an
 * incrementing key), so a transient render failure gets a genuinely fresh mount
 * rather than re-rendering the same broken state.
 *
 * Privacy: only an allowlisted error kind and frame count render in __DEV__.
 * Production shows a generic, reassuring message and never surfaces stack
 * traces, tokens, evidence URLs, provider responses, or any identifying detail.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null, resetKey: 0 };
        this.handleRetry = this.handleRetry.bind(this);
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // Dev-only diagnostics. Never log in production — an error message or
        // component stack could incidentally contain sensitive strings.
        if (__DEV__) {
            console.warn('[ErrorBoundary] Render failure captured.');
        }
        this.setState({ info });
    }

    handleRetry() {
        // Clear the error and bump the reset key so children remount fresh.
        this.setState((prev) => ({
            hasError: false,
            error: null,
            info: null,
            resetKey: prev.resetKey + 1,
        }));
    }

    render() {
        if (!this.state.hasError) {
            // Keying the subtree lets "Try Again" force a clean remount.
            return (
                <React.Fragment key={this.state.resetKey}>
                    {this.props.children}
                </React.Fragment>
            );
        }

        const safeKind = ['Error', 'TypeError', 'RangeError', 'ReferenceError'].includes(this.state.error?.name)
            ? this.state.error.name : 'Error';
        const devMessage = __DEV__ ? `Render failure type: ${safeKind}` : null;
        const devStack = __DEV__ && this.state.info?.componentStack
            ? `Component frames captured: ${this.state.info.componentStack.split('\n').filter(Boolean).length}` : null;

        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="warning" size={44} color={COLORS.secondary} />
                    </View>

                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.subtitle}>
                        The app hit an unexpected error. Tap Try Again to reload, then
                        check your report status before submitting again.
                    </Text>

                    {(devMessage || devStack) && (
                        <ScrollView style={styles.errorBox} contentContainerStyle={styles.errorBoxContent}>
                            {!!devMessage && <Text style={styles.errorText}>{devMessage}</Text>}
                            {!!devStack && <Text style={styles.stackText}>{devStack}</Text>}
                        </ScrollView>
                    )}

                    <PressableScale
                        onPress={this.handleRetry}
                        style={styles.button}
                        accessibilityLabel="Try again"
                        accessibilityHint="Reloads the screen that failed"
                    >
                        <Ionicons name="refresh" size={18} color={COLORS.white} style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Try Again</Text>
                    </PressableScale>
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.primaryDark,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: BORDER_RADIUS.xxxl,
        padding: SPACING.xxl,
        width: '100%',
        alignItems: 'center',
        ...SHADOWS.xl,
    },
    iconContainer: {
        width: 88,
        height: 88,
        borderRadius: BORDER_RADIUS.xxl,
        backgroundColor: COLORS.secondarySurface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING['20'],
    },
    title: {
        ...TYPOGRAPHY.h2,
        color: COLORS.text,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    errorBox: {
        backgroundColor: COLORS.errorSurface,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.xl,
        maxHeight: 140,
        width: '100%',
    },
    errorBoxContent: {
        paddingBottom: SPACING.xs,
    },
    errorText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.error,
        marginBottom: SPACING.xs,
    },
    stackText: {
        ...TYPOGRAPHY.caption,
        fontSize: 10,
        lineHeight: 14,
        color: COLORS.textSecondary,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        width: '100%',
    },
    buttonIcon: {
        marginRight: SPACING.sm,
    },
    buttonText: {
        ...TYPOGRAPHY.subtitle,
        color: COLORS.white,
    },
});
