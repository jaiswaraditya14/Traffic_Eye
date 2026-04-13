// ImageCropModal.js
// A modal that allows users to zoom/crop their violation image
// with pinch-to-zoom and drag gestures before submitting
// Also provides a quick "Use This Image" option to skip cropping

import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Image,
    TouchableOpacity,
    Dimensions,
    Animated,
    PanResponder,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImageManipulator from 'expo-image-manipulator';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, GRADIENTS } from '../../utils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CROP_SIZE = SCREEN_WIDTH - SPACING.xl * 2;

export default function ImageCropModal({ visible, imageUri, onCropDone, onCancel }) {
    const [processing, setProcessing] = useState(false);
    const [scale, setScale] = useState(1);
    const [lastScale, setLastScale] = useState(1);

    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const lastPan = useRef({ x: 0, y: 0 });

    // Track pinch distance
    const lastDistance = useRef(0);

    const getDistance = (touches) => {
        const dx = touches[0].pageX - touches[1].pageX;
        const dy = touches[0].pageY - touches[1].pageY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                // Store current position
                lastPan.current = { x: pan.x._value, y: pan.y._value };
                if (evt.nativeEvent.touches.length === 2) {
                    lastDistance.current = getDistance(evt.nativeEvent.touches);
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                if (evt.nativeEvent.touches.length === 2) {
                    // Pinch to zoom
                    const dist = getDistance(evt.nativeEvent.touches);
                    if (lastDistance.current > 0) {
                        const newScale = Math.max(1, Math.min(5, lastScale * (dist / lastDistance.current)));
                        setScale(newScale);
                        scaleAnim.setValue(newScale);
                    }
                } else if (evt.nativeEvent.touches.length === 1) {
                    // Pan / drag
                    pan.x.setValue(lastPan.current.x + gestureState.dx);
                    pan.y.setValue(lastPan.current.y + gestureState.dy);
                }
            },
            onPanResponderRelease: (evt) => {
                setLastScale(scale);
                lastDistance.current = 0;
            },
        })
    ).current;

    const handleZoomIn = () => {
        const newScale = Math.min(5, scale + 0.5);
        setScale(newScale);
        setLastScale(newScale);
        Animated.spring(scaleAnim, {
            toValue: newScale,
            friction: 5,
            useNativeDriver: true,
        }).start();
    };

    const handleZoomOut = () => {
        const newScale = Math.max(1, scale - 0.5);
        setScale(newScale);
        setLastScale(newScale);
        Animated.spring(scaleAnim, {
            toValue: newScale,
            friction: 5,
            useNativeDriver: true,
        }).start();
    };

    const handleReset = () => {
        setScale(1);
        setLastScale(1);
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true }),
        ]).start();
    };

    // Finalize with processing (compress/resize)
    const handleCropAndSave = async () => {
        if (!imageUri) return;
        try {
            setProcessing(true);

            const manipResult = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ resize: { width: 1200 } }],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );

            onCropDone(manipResult.uri);
        } catch (error) {
            console.error('Error cropping image:', error);
            // If crop fails, just use original
            onCropDone(imageUri);
        } finally {
            setProcessing(false);
        }
    };

    // Use image as-is without any processing
    const handleUseAsIs = () => {
        if (imageUri) {
            onCropDone(imageUri);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            statusBarTranslucent
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={onCancel}>
                        <Ionicons name="close" size={22} color={COLORS.white} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Ionicons name="crop" size={18} color={COLORS.white} style={{ marginRight: 6 }} />
                        <Text style={styles.headerTitle}>Edit Photo</Text>
                    </View>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleReset}>
                        <Ionicons name="refresh" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                </View>

                {/* Instruction banner */}
                <View style={styles.instructionBanner}>
                    <Ionicons name="information-circle" size={16} color="#2DD4BF" />
                    <Text style={styles.instructionText}>
                        Pinch to zoom • Drag to reposition
                    </Text>
                </View>

                {/* Crop Area */}
                <View style={styles.cropWrapper}>
                    <View style={styles.cropArea} {...panResponder.panHandlers}>
                        <Animated.Image
                            source={{ uri: imageUri }}
                            style={[
                                styles.cropImage,
                                {
                                    transform: [
                                        { translateX: pan.x },
                                        { translateY: pan.y },
                                        { scale: scaleAnim },
                                    ],
                                },
                            ]}
                            resizeMode="contain"
                        />

                        {/* Corner brackets overlay */}
                        <View style={styles.cornersOverlay} pointerEvents="none">
                            <View style={[styles.corner, styles.cornerTL]} />
                            <View style={[styles.corner, styles.cornerTR]} />
                            <View style={[styles.corner, styles.cornerBL]} />
                            <View style={[styles.corner, styles.cornerBR]} />
                        </View>
                    </View>

                    {/* Zoom level indicator */}
                    <View style={styles.zoomIndicator}>
                        <Text style={styles.zoomText}>{scale.toFixed(1)}x</Text>
                    </View>
                </View>

                {/* Zoom Controls */}
                <View style={styles.zoomControls}>
                    <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut} activeOpacity={0.7}>
                        <Ionicons name="remove-circle" size={28} color={COLORS.white} />
                    </TouchableOpacity>

                    <View style={styles.zoomBarContainer}>
                        <View style={styles.zoomBar}>
                            <View style={[styles.zoomBarFill, { width: `${((scale - 1) / 4) * 100}%` }]} />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn} activeOpacity={0.7}>
                        <Ionicons name="add-circle" size={28} color={COLORS.white} />
                    </TouchableOpacity>
                </View>

                {/* "Use This Image" — prominent finalize button */}
                <TouchableOpacity style={styles.useImageBtn} onPress={handleUseAsIs} activeOpacity={0.7}>
                    <LinearGradient
                        colors={['#0D9488', '#14B8A6']}
                        style={styles.useImageGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
                        <Text style={styles.useImageText}>Use This Image</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Bottom Action Buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.cancelText}>Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.confirmBtn} onPress={handleCropAndSave} activeOpacity={0.7} disabled={processing}>
                        <LinearGradient
                            colors={GRADIENTS.primary}
                            style={styles.confirmGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {processing ? (
                                <ActivityIndicator size="small" color={COLORS.white} />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-done-circle" size={18} color={COLORS.white} />
                                    <Text style={styles.confirmText}>Done</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0F14',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: 50,
        paddingBottom: SPACING.md,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        color: COLORS.white,
        fontSize: FONT_SIZES.md,
        fontFamily: 'Nunito-Bold',
        letterSpacing: 0.3,
    },
    instructionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        alignSelf: 'center',
        backgroundColor: 'rgba(45, 212, 191, 0.1)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 2,
        borderRadius: BORDER_RADIUS.full,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(45, 212, 191, 0.15)',
    },
    instructionText: {
        color: 'rgba(45, 212, 191, 0.8)',
        fontSize: FONT_SIZES.xs,
        fontFamily: 'Nunito-Medium',
    },
    cropWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    cropArea: {
        width: CROP_SIZE,
        height: CROP_SIZE,
        overflow: 'hidden',
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: '#111318',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    cropImage: {
        width: '100%',
        height: '100%',
    },
    cornersOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    corner: {
        position: 'absolute',
        width: 28,
        height: 28,
        borderColor: '#2DD4BF',
    },
    cornerTL: {
        top: 8,
        left: 8,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 6,
    },
    cornerTR: {
        top: 8,
        right: 8,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 6,
    },
    cornerBL: {
        bottom: 8,
        left: 8,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 6,
    },
    cornerBR: {
        bottom: 8,
        right: 8,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 6,
    },
    zoomIndicator: {
        position: 'absolute',
        bottom: 12,
        right: SPACING.xl + 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 1,
        borderColor: 'rgba(45, 212, 191, 0.3)',
    },
    zoomText: {
        color: '#2DD4BF',
        fontSize: FONT_SIZES.xs,
        fontFamily: 'Nunito-Bold',
    },
    zoomControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm,
        gap: SPACING.md,
    },
    zoomBtn: {
        padding: SPACING.xs,
    },
    zoomBarContainer: {
        width: 160,
    },
    zoomBar: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    zoomBarFill: {
        height: '100%',
        backgroundColor: '#2DD4BF',
        borderRadius: 2,
    },
    // Prominent "Use This Image" button
    useImageBtn: {
        marginHorizontal: SPACING.xl,
        marginBottom: SPACING.sm,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
    },
    useImageGradient: {
        flexDirection: 'row',
        height: 54,
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
        borderRadius: BORDER_RADIUS.xl,
    },
    useImageText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.lg,
        fontFamily: 'Nunito-Bold',
        letterSpacing: 0.3,
    },
    // Bottom row buttons
    actions: {
        flexDirection: 'row',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.xl,
        paddingBottom: 36,
        paddingTop: SPACING.xxs,
    },
    cancelBtn: {
        flex: 1,
        height: 46,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    cancelText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: FONT_SIZES.sm,
        fontFamily: 'Nunito-SemiBold',
    },
    confirmBtn: {
        flex: 1,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    confirmGradient: {
        flexDirection: 'row',
        height: 46,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        borderRadius: BORDER_RADIUS.lg,
    },
    confirmText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.sm,
        fontFamily: 'Nunito-Bold',
    },
});
