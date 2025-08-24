import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, Dimensions, Animated } from 'react-native';
import { Clock } from 'iconsax-react-native';
import { MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';
import { LinearGradient } from 'expo-linear-gradient';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // iPhone 13 baseline
const scaledSize = (size) => Math.round(size * scale);

const COLORS = {
    card: '#FFFFFF',
    text: '#0F172A',
    subtext: '#64748B',
    hairline: 'rgba(2, 6, 23, 0.06)',
    chipText: '#FFFFFF',
    green: '#40D99B',
    greenDark: '#25B57E',
    blue: '#2D9EFF',
    iconBg: '#E2E8F0',
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

function formatDateShort(d) {
    const date = toDate(d);
    const opts = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, opts);
}

function formatNumber(n) {
    if (n === undefined || n === null) return '0';
    try { return Number(n).toLocaleString(); } catch { return String(n); }
}

// Accepts seconds (number) or a pre-formatted string ("01:23:45")
function formatTimer(value) {
    if (value == null) return '00:00';
    if (typeof value === 'string') return value;
    const sec = Number(value) || 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const CurrentWorkoutPanel = ({ workout, timerRef, openWorkout }) => {
    const [time, setTime] = useState(timerRef?.current);
    const pulse = useRef(new Animated.Value(1)).current;
    const pulseOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const id = setInterval(() => {
            setTime(timerRef?.current);
        }, 1000);
        return () => clearInterval(id);
    }, [timerRef]);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1.25, duration: 900, useNativeDriver: true }),
                    Animated.timing(pulse, { toValue: 1.0, duration: 900, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(pulseOpacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
                    Animated.timing(pulseOpacity, { toValue: 1.0, duration: 900, useNativeDriver: true }),
                ]),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulse, pulseOpacity]);

    const dateLabel = useMemo(() => `${formatDateShort(workout?.created)} Workout`, [workout?.created]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{dateLabel}</Text>
                    <Text style={styles.subtitle}>In progress • Keep it up</Text>
                </View>

                {/* Live timer pill */}
                <View style={styles.livePill}>
                    <Animated.View style={[styles.liveDot, { transform: [{ scale: pulse }], opacity: pulseOpacity }]} />
                    <Clock color={COLORS.text} size={scaledSize(15)} variant="Bold" />
                    <Text style={styles.liveText}>{formatTimer(time)}</Text>
                </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                        <Clock color={COLORS.text} size={scaledSize(16)} variant="Bold" />
                    </View>
                    <Text style={styles.statLabel}>Duration</Text>
                    <Text style={styles.statValue}>{formatTimer(time)}</Text>
                </View>

                <View style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                        <MaterialCommunityIcons name="weight-lifter" size={scaledSize(16)} color={COLORS.text} />
                    </View>
                    <Text style={styles.statLabel}>Volume</Text>
                    <Text style={styles.statValue}>{formatNumber(workout?.volume)} lb</Text>
                </View>

                <View style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                        <FontAwesome6 name="trophy" size={scaledSize(13)} color={COLORS.text} />
                    </View>
                    <Text style={styles.statLabel}>PBs</Text>
                    <Text style={styles.statValue}>{formatNumber(workout?.PBs ?? 0)}</Text>
                </View>
            </View>

            {/* Action */}
            <RNBounceable style={styles.primaryBtn} onPress={openWorkout}>
                <LinearGradient
                    colors={[COLORS.green, COLORS.greenDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryGradient}
                >
                    <Text style={styles.primaryBtnText}>Back to Workout</Text>
                    <MaterialCommunityIcons name="arm-flex" size={scaledSize(18)} color="#fff" />
                </LinearGradient>
            </RNBounceable>
        </View>
    );
};

export default React.memo(CurrentWorkoutPanel);

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: scaledSize(16),
        paddingVertical: scaledSize(14),
        borderRadius: scaledSize(24),
        marginHorizontal: scaledSize(16),
        marginTop: scaledSize(12),
        backgroundColor: COLORS.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaledSize(8) },
        shadowOpacity: 0.1,
        shadowRadius: scaledSize(18),
        elevation: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(2, 6, 23, 0.04)',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scaledSize(10),
        gap: scaledSize(10),
    },
    title: {
        fontSize: scaledSize(18),
        fontFamily: 'Outfit_700Bold',
        color: COLORS.text,
    },
    subtitle: {
        marginTop: scaledSize(2),
        fontSize: scaledSize(12.5),
        fontFamily: 'Outfit_400Regular',
        color: COLORS.subtext,
    },

    livePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaledSize(6),
        backgroundColor: '#EEF2FF',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(99, 102, 241, 0.35)',
        paddingVertical: scaledSize(6),
        paddingHorizontal: scaledSize(10),
        borderRadius: scaledSize(999),
    },
    liveDot: {
        width: scaledSize(8),
        height: scaledSize(8),
        borderRadius: scaledSize(4),
        backgroundColor: '#EF4444',
    },
    liveText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(12.5),
        color: COLORS.text,
    },

    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.hairline,
        marginVertical: scaledSize(8),
    },

    statsRow: {
        flexDirection: 'row',
        gap: scaledSize(10),
        marginBottom: scaledSize(12),
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: scaledSize(16),
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
        backgroundColor: COLORS.iconBg,
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

    primaryBtn: {
        borderRadius: scaledSize(16),
        overflow: 'hidden',
    },
    primaryGradient: {
        width: '100%',
        paddingVertical: scaledSize(12),
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
