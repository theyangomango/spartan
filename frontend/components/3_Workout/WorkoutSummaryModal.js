import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Animated, View, Text } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import WorkoutHistoryCard from '../5_Profile/ProfileBottom/History/WorkoutHistoryCard';
import theme from '../../theme/mfpDark';
import scaleSize from '../../helper/scaleSize';

const COLORS = {
    bgDim: 'rgba(15, 23, 42, 0.45)',
    text: theme.textPrimary,
    hairline: theme.hairline,
    green: '#40D99B',
    greenDark: '#25B57E',
};

const WorkoutSummaryModal = ({ isVisible, workout, onClose, postWorkout }) => {
    const scaleAnim = useRef(new Animated.Value(0.96)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start();
        } else {
            scaleAnim.setValue(0.96);
            opacityAnim.setValue(0);
        }
    }, [isVisible, opacityAnim, scaleAnim]);

    if (!workout) return null;

    return (
        <Modal animationType="fade" transparent visible={isVisible} onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Animated.View
                    style={[styles.container, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
                    renderToHardwareTextureAndroid
                    shouldRasterizeIOS
                >
                    <View style={styles.sheetCard}>
                        <View pointerEvents="none" style={styles.sheetBackdrop} />

                        <WorkoutHistoryCard workout={workout} />

                        <View style={styles.actions}>
                            <RNBounceable style={styles.secondaryBtn} onPress={onClose}>
                                <Text style={styles.secondaryBtnText}>Close</Text>
                            </RNBounceable>

                            <RNBounceable style={styles.primaryBtn} onPress={postWorkout}>
                                <LinearGradient
                                    colors={[COLORS.green, COLORS.greenDark]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.primaryGradient}
                                >
                                    <Text style={styles.primaryBtnText}>Share Post</Text>
                                    <MaterialCommunityIcons name="arm-flex" size={scaleSize(18)} color="#fff" />
                                </LinearGradient>
                            </RNBounceable>
                        </View>
                    </View>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: COLORS.bgDim,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scaleSize(16),
    },
    container: {
        width: '100%',
    },
    sheetCard: {
        width: '100%',
        paddingBottom: scaleSize(4),
        position: 'relative',
    },
    sheetBackdrop: {
        position: 'absolute',
        left: scaleSize(16),
        right: scaleSize(16),
        top: 0,
        bottom: 0,
        backgroundColor: theme.surface,
        borderRadius: scaleSize(20),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.hairline,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleSize(8) },
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(18),
        elevation: 12,
    },
    actions: {
        flexDirection: 'row',
        gap: scaleSize(10),
        marginHorizontal: scaleSize(16),
        marginTop: -scaleSize(14),
        paddingTop: scaleSize(12),
        paddingBottom: scaleSize(12),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.hairline,
        backgroundColor: theme.surface,
        borderBottomLeftRadius: scaleSize(20),
        borderBottomRightRadius: scaleSize(20),
        zIndex: 1,
    },
    secondaryBtn: {
        flex: 1,
        borderRadius: scaleSize(14),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.hairline,
        backgroundColor: theme.field,
        paddingVertical: scaleSize(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryBtnText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(14),
        color: COLORS.text,
    },
    primaryBtn: {
        flex: 1,
        borderRadius: scaleSize(14),
        overflow: 'hidden',
    },
    primaryGradient: {
        width: '100%',
        paddingVertical: scaleSize(10),
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: scaleSize(8),
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: scaleSize(14),
        fontFamily: 'Outfit_700Bold',
    },
});

export default WorkoutSummaryModal;
