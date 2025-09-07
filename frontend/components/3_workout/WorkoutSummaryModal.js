import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, View, Text, StyleSheet, FlatList, Dimensions, Pressable, Animated } from 'react-native';
import { Clock } from 'iconsax-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';
import { LinearGradient } from 'expo-linear-gradient';
import roundToNearestMinute from '../../helper/roundToNearestMinute';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // iPhone 13 baseline
const scaledSize = (size) => Math.round(size * scale);

const COLORS = {
    bgDim: 'rgba(15, 23, 42, 0.45)',
    card: '#FFFFFF',
    text: '#0F172A',
    subtext: '#64748B',
    hairline: 'rgba(2, 6, 23, 0.06)',
    chipText: '#FFFFFF',
    green: '#40D99B',
    greenDark: '#25B57E',
    blue: '#2D9EFF',
    icon: '#6366F1',
};

const muscleColors = {
    Chest: '#FFAFB8',
    Shoulders: '#A1CDEE',
    Arms: '#CBBCFF',
    Back: '#95E0C8',
    Triceps: '#FFD580',
    Legs: '#FFB347',
    Abs: '#FF7561',
};

function toDate(d) {
    try {
        if (d?.toDate) return d.toDate();
        const maybe = new Date(d);
        return isNaN(+maybe) ? new Date() : maybe;
    } catch {
        return new Date();
    }
}

function formatDateNice(d) {
    const opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString(undefined, opts);
}

function formatNumber(n) {
    if (n === undefined || n === null) return '0';
    try {
        return Number(n).toLocaleString();
    } catch {
        return String(n);
    }
}

function bestSet(sets) {
    if (!Array.isArray(sets) || sets.length === 0) return null;
    const parsed = sets.map((s) => ({
        weight: Number(s.weight ?? 0),
        reps: Number(s.reps ?? 0),
    }));
    parsed.sort((a, b) => b.weight - a.weight || b.reps - a.reps);
    return parsed[0];
}

const Divider = () => <View style={styles.divider} />;

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

    const createdDate = useMemo(() => toDate(workout?.created), [workout?.created]);

    const totalSets = useMemo(() => {
        return workout?.exercises?.reduce((acc, e) => acc + (e.sets?.length || 0), 0) ?? 0;
    }, [workout?.exercises]);

    if (!workout) return null;

    const renderExercise = ({ item }) => {
        const chipColor = muscleColors[item.muscle || ''] || '#CBD5E1';
        const top = bestSet(item.sets);
        return (
            <View style={styles.row}>
                <View style={styles.rowLeft}>
                    <Text style={styles.exerciseName} numberOfLines={1} ellipsizeMode="tail">
                        {`${item.sets?.length || 0} x ${item.name}`}
                    </Text>
                    {!!item.muscle && (
                        <View style={[styles.muscleChip, { backgroundColor: chipColor }]}>
                            <Text style={styles.muscleChipText}>{item.muscle}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.rowRight}>
                    {top ? (
                        <View style={styles.bestPill}>
                            <MaterialCommunityIcons name="weight" size={scaledSize(14)} color={COLORS.text} />
                            <Text style={styles.bestPillText}>{`${top.weight} lb × ${top.reps}`}</Text>
                        </View>
                    ) : (
                        <Text style={styles.naText}>N/A</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <Modal animationType="fade" transparent visible={isVisible} onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Animated.View style={[
                    styles.card,
                    { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
                    { renderToHardwareTextureAndroid: true, shouldRasterizeIOS: true }
                ]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerDate}>{formatDateNice(createdDate)}</Text>
                            <Text style={styles.headerSub}>
                                {workout.exercises?.length || 0} exercises • {totalSets} sets
                            </Text>
                        </View>
                        <View style={styles.headerBadge}>
                            <MaterialCommunityIcons name="trophy" color={COLORS.text} size={scaledSize(16)} />
                            <Text style={styles.headerBadgeText}>
                                {workout.PBs ?? 0} PB{(workout.PBs ?? 0) === 1 ? '' : 's'}
                            </Text>
                        </View>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <View style={styles.statIconWrap}>
                                <Clock color={COLORS.text} size={scaledSize(16)} variant="Bold" />
                            </View>
                            <Text style={styles.statLabel}>Duration</Text>
                            <Text style={styles.statValue}>{roundToNearestMinute(workout.duration)} min</Text>
                        </View>
                        <View style={styles.statCard}>
                            <View style={styles.statIconWrap}>
                                <MaterialCommunityIcons name="weight-lifter" size={scaledSize(16)} color={COLORS.text} />
                            </View>
                            <Text style={styles.statLabel}>Volume</Text>
                            <Text style={styles.statValue}>{formatNumber(workout.volume)} lb</Text>
                        </View>
                        <View style={styles.statCard}>
                            <View style={styles.statIconWrap}>
                                <MaterialCommunityIcons name="arm-flex" size={scaledSize(16)} color={COLORS.text} />
                            </View>
                            <Text style={styles.statLabel}>Highlights</Text>
                            <Text style={styles.statValue}>{workout.PBs ?? 0} PR</Text>
                        </View>
                    </View>

                    {/* Table header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Exercise</Text>
                        <Text style={styles.tableHeaderText}>Best Set</Text>
                    </View>
                    <Divider />

                    {/* List */}
                    <FlatList
                        data={workout.exercises}
                        renderItem={renderExercise}
                        keyExtractor={(item, index) => `${item.name}-${index}`}
                        ItemSeparatorComponent={Divider}
                        contentContainerStyle={{ paddingBottom: scaledSize(6) }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        initialNumToRender={6}
                        maxToRenderPerBatch={6}
                        windowSize={5}
                        removeClippedSubviews
                    />

                    {/* Actions */}
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
                                <MaterialCommunityIcons name="arm-flex" size={scaledSize(18)} color="#fff" />
                            </LinearGradient>
                        </RNBounceable>
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
        paddingHorizontal: scaledSize(16),
    },

    card: {
        width: '100%',
        backgroundColor: COLORS.card,
        borderRadius: scaledSize(24),
        paddingVertical: scaledSize(14),
        paddingHorizontal: scaledSize(18),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaledSize(8) },
        shadowOpacity: 0.18,
        shadowRadius: scaledSize(18),
        elevation: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(2, 6, 23, 0.04)',
    },

    header: {
        marginBottom: scaledSize(10),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerDate: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(18),
        color: COLORS.text,
    },
    headerSub: {
        marginTop: scaledSize(2),
        fontFamily: 'Outfit_400Regular',
        fontSize: scaledSize(12.5),
        color: COLORS.subtext,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(253, 224, 71, 0.2)',
        borderRadius: scaledSize(999),
        paddingVertical: scaledSize(6),
        paddingHorizontal: scaledSize(10),
        gap: scaledSize(6),
    },
    headerBadgeText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(12.5),
        color: COLORS.text,
    },

    statsRow: {
        flexDirection: 'row',
        gap: scaledSize(10),
        marginBottom: scaledSize(10),
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: scaledSize(14),
        paddingVertical: scaledSize(10),
        paddingHorizontal: scaledSize(12),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(100, 116, 139, 0.15)',
    },
    statIconWrap: {
        width: scaledSize(26),
        height: scaledSize(26),
        borderRadius: scaledSize(13),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E2E8F0',
        marginBottom: scaledSize(6),
    },
    statLabel: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaledSize(11.5),
        color: COLORS.subtext,
    },
    statValue: {
        marginTop: scaledSize(2),
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(15),
        color: COLORS.text,
    },

    tableHeader: {
        paddingTop: scaledSize(4),
        paddingBottom: scaledSize(8),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    tableHeaderText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(12.5),
        color: COLORS.subtext,
    },

    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.hairline,
    },

    row: {
        minHeight: scaledSize(46),
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scaledSize(6),
    },
    rowLeft: {
        flex: 1,
        paddingRight: scaledSize(10),
    },
    exerciseName: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaledSize(13.5),
        color: '#111827',
        marginBottom: scaledSize(4),
    },
    muscleChip: {
        alignSelf: 'flex-start',
        borderRadius: scaledSize(999),
        paddingHorizontal: scaledSize(8),
        paddingVertical: scaledSize(2),
    },
    muscleChipText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaledSize(10.5),
        color: COLORS.chipText,
    },

    rowRight: {
        width: '30%',
        alignItems: 'flex-end',
    },
    bestPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaledSize(6),
        borderRadius: scaledSize(999),
        paddingVertical: scaledSize(6),
        paddingHorizontal: scaledSize(10),
        backgroundColor: '#EEF2FF',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(99, 102, 241, 0.35)',
    },
    bestPillText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(12.5),
        color: COLORS.text,
    },
    naText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaledSize(12.5),
        color: COLORS.subtext,
    },

    actions: {
        marginTop: scaledSize(12),
        flexDirection: 'row',
        gap: scaledSize(10),
    },
    secondaryBtn: {
        flex: 1,
        borderRadius: scaledSize(14),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(2, 6, 23, 0.12)',
        backgroundColor: '#FFFFFF',
        paddingVertical: scaledSize(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryBtnText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(14),
        color: COLORS.text,
    },
    primaryBtn: {
        flex: 1,
        borderRadius: scaledSize(14),
        overflow: 'hidden',
    },
    primaryGradient: {
        width: '100%',
        paddingVertical: scaledSize(10),
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: scaledSize(8),
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: scaledSize(14),
        fontFamily: 'Outfit_700Bold',
    },
});

export default WorkoutSummaryModal;
