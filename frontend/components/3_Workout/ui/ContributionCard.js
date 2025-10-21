import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import FastImage from "react-native-fast-image";
import theme from "../../../theme/mfpDark";
import scaleSize from "../../../helper/scaleSize";
import { usePfp } from "../../../helper/usePFPs";
import ContributionStatsCards from "./ContributionStatsCards";
import VerifiedHandle from "../../common/VerifiedHandle";

const handleText = (item = {}) => {
    const raw =
        item?.handle ??
        item?.username ??
        item?.userName ??
        (item?.name || "").split(/\s+/)[0];
    if (!raw) return "Friend";
    const str = String(raw).trim();
    if (!str) return "Friend";
    return str.startsWith("@") ? str.slice(1) : str;
};

const initials = (name = "") => {
    const parts = String(name).trim().split(/\s+/);
    const first = (parts[0] || "").charAt(0);
    const second = (parts[1] || "").charAt(0);
    return (first + second).toUpperCase() || "F";
};

const formatStatNumber = (value) => {
    if (value == null) return "0";
    const numeric = Number(value) || 0;
    const safe = numeric < 1000 ? Math.round(numeric) : Math.round(numeric);
    try {
        return safe.toLocaleString();
    } catch {
        return String(safe);
    }
};

const getPfpUri = (entry) => (
    entry?.pfp ||
    entry?.pfpUri ||
    entry?.pfpUrl ||
    entry?.photoURL ||
    entry?.photo ||
    entry?.avatar ||
    entry?.image ||
    ""
);

const ContributionCard = ({ entry, isFirst = false, onPress }) => {
    if (!entry) return null;

    const {
        name = "",
        handle = "",
        volume = 0,
        reps = 0,
        pbs = 0,
    } = entry;

    const rawPfp = entry?.pfpUri || entry?.pfp || getPfpUri(entry);
    const resolvedPfp = usePfp(entry?.uid, entry?.pfpVersion ?? 0, rawPfp || undefined);
    const fallbackLabel = initials(name || handle);
    const stats = useMemo(() => ([
        { key: "reps", label: "reps", value: formatStatNumber(reps) },
        { key: "volume", label: "lbs", value: formatStatNumber(volume) },
        { key: "prs", label: "prs", value: formatStatNumber(pbs) },
    ]), [volume, reps, pbs]);

    const workoutsCompleted = useMemo(() => {
        const raw = Number(entry?.workouts);
        if (!Number.isFinite(raw) || raw <= 0) return 0;
        return Math.round(raw);
    }, [entry?.workouts]);

    const contributionSubtext = useMemo(() => {
        if (workoutsCompleted <= 0) return "No workouts";
        if (workoutsCompleted === 1) return "1 workout";
        return `${workoutsCompleted} workouts`;
    }, [workoutsCompleted]);

    const handleLabel = useMemo(() => {
        const candidate = handleText(entry);
        if (candidate) return candidate;
        if (name) return String(name);
        return "Friend";
    }, [entry, name]);

    const containerStyle = useMemo(() => (
        isFirst ? [styles.card] : [styles.card, styles.cardDivider]
    ), [isFirst]);

    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
            style={containerStyle}
            accessibilityRole={onPress ? "button" : undefined}
            accessibilityLabel={onPress ? `Toggle ${handleLabel}'s weekly workouts` : undefined}
        >
            <View style={styles.row}>
                <View style={styles.handleWrap}>
                    <View style={styles.avatarWrap}>
                        {resolvedPfp ? (
                            <FastImage
                                source={{
                                    uri: resolvedPfp,
                                    priority: FastImage.priority.high,
                                    cache: FastImage.cacheControl.immutable,
                                }}
                                style={styles.pfp}
                                resizeMode={FastImage.resizeMode.cover}
                            />
                        ) : (
                            <View style={[styles.pfp, styles.pfpFallback]}>
                                <Text style={styles.pfpInitials}>{fallbackLabel}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.handleTextWrap}>
                        <VerifiedHandle
                            handle={handleLabel}
                            isVerified={Boolean(entry?.isVerified ?? entry?.verified)}
                            preserveTextAlignment
                            textStyle={styles.handle}
                            numberOfLines={1}
                            containerStyle={styles.handleRow}
                        />
                        <Text style={styles.handleSub} numberOfLines={1} ellipsizeMode="tail">{contributionSubtext}</Text>
                    </View>
                </View>

                <ContributionStatsCards stats={stats} style={styles.statsRow} />
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        paddingLeft: scaleSize(14),
        paddingRight: scaleSize(4),
        paddingVertical: scaleSize(13),
        backgroundColor: theme.fieldDeep,
        borderRadius: 0,
    },
    cardDivider: {
        borderTopWidth: 1.3,
        borderColor: "rgba(255,255,255,0.12)",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: scaleSize(8),
    },
    handleWrap: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
        minWidth: 0,
    },
    handleTextWrap: {
        flexShrink: 1,
        minWidth: 0,
    },
    handleRow: {
        flexShrink: 1,
    },
    avatarWrap: {
        borderRadius: scaleSize(14),
        backgroundColor: "rgba(255,255,255,0.04)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(11),
    },
    pfp: {
        width: scaleSize(32),
        aspectRatio: 1,
        borderRadius: scaleSize(100),
        backgroundColor: "#E2E8F0",
    },
    pfpFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    handle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(13),
        color: theme.textPrimary,
        maxWidth: scaleSize(150),
        flexShrink: 1,
    },
    handleSub: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        color: theme.textSecondary,
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginLeft: "auto",
        gap: 0,
        width: "55%",
    },
});

export default memo(ContributionCard);
