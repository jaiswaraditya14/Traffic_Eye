import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * ErrorBoundary — catches unhandled React errors anywhere in the tree.
 * Displays a friendly recovery UI instead of a white screen.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
        this.handleReset = this.handleReset.bind(this);
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // Log error in __DEV__ mode only — never log PII in production
        if (__DEV__) {
            console.error('[ErrorBoundary] Unhandled error:', error, info);
        }
    }

    handleReset() {
        this.setState({ hasError: false, error: null });
    }

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="warning" size={48} color="#F59E0B" />
                    </View>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.subtitle}>
                        The app encountered an unexpected error. Please try again.
                    </Text>
                    {__DEV__ && this.state.error && (
                        <ScrollView style={styles.errorBox}>
                            <Text style={styles.errorText}>
                                {this.state.error.toString()}
                            </Text>
                        </ScrollView>
                    )}
                    <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.85}>
                        <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A1E3F',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 32,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    iconContainer: {
        width: 88,
        height: 88,
        borderRadius: 22,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontFamily: 'Nunito-Bold',
        color: '#0F172A',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        fontFamily: 'Nunito-Medium',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    errorBox: {
        backgroundColor: '#FEE2E2',
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
        maxHeight: 120,
        width: '100%',
    },
    errorText: {
        fontSize: 11,
        color: '#B91C1C',
        fontFamily: 'Nunito-Medium',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F2C59',
        borderRadius: 14,
        paddingHorizontal: 28,
        paddingVertical: 14,
        width: '100%',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: '#FFFFFF',
    },
});
