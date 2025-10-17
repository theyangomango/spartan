import React, { useMemo } from "react";
import { StyleSheet, View, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from "../../theme/mfpDark";
import LeaderboardModal from "./LeaderboardModal";

import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";

const LeaderboardPanel = ({
    userList,
    categoryCompared,
    comparedMetric,
    onToggleMetric,
    openModal,
    onUserPress,
    scopeKey = null,
    isHexFocus = false,
    hexFocusKey = null,
    hexFocusLabel = "",

    // Tribe-aware
    isTribeFocused,
    tribeComparisons,          // NEW: array
    activeCompIndex,           // NEW: number
    onActiveCompChange,        // NEW: (idx)=>void
    tribeComparisonSummary,    // optional display of active
    onOpenTribeComparison,     // open manager modal
    // Optional: block rendering with a message (e.g., missing personal info)
    blockedMessage,
    onResolveBlocked,
    // Custom canvas color for panel and cards
    canvasColor,
    minHeightOverride = null,
    containerStyle = null,
}) => {
    const insets = useSafeAreaInsets();
    const { height: H } = useWindowDimensions();
    const bottomPadding = useMemo(() => {
        const inset = insets.bottom || 0;
        return inset > 0 ? inset + scaleSize(6) : scaleSize(10);
    }, [insets.bottom]);
    const targetMinHeight = useMemo(() => {
        const proportional = Math.max(1, Math.ceil(H * 0.74));
        const scaledFloor = scaleSize(520);
        return Math.max(proportional, scaledFloor);
    }, [H]);

    const minHeight = useMemo(() => {
        const provided = Number(minHeightOverride);
        const baseMin = Number.isFinite(provided) && provided > 0
            ? Math.max(provided, targetMinHeight)
            : targetMinHeight;

        if (!Array.isArray(userList) || userList.length === 0) return baseMin;

        const approxHeader = scaleSize(38); // top padding + subtle breathing room
        const rowHeight = scaleSize(64) + scaleSize(12.5); // card height + spacing
        const estimatedRows = userList.length * rowHeight;
        const estimatedHeight = approxHeader + estimatedRows + bottomPadding;

        return Math.max(baseMin, Math.round(estimatedHeight));
    }, [targetMinHeight, minHeightOverride, userList, bottomPadding]);
    const panelColor = useMemo(() => theme.surface, []);
    const effectiveCanvasColor = useMemo(() => canvasColor || theme.surface, [canvasColor]);
    const isPanelExpanded = false;

    return (
        <View
            style={[
                styles.container,
                containerStyle,
                {
                    backgroundColor: panelColor,
                    paddingBottom: bottomPadding,
                    paddingTop: scaleSize(12),
                    minHeight,
                },
            ]}
        >
            <View style={styles.content}>
                {blockedMessage ? (
                    <BlockedViewClean message={blockedMessage} onResolve={onResolveBlocked} />
                ) : userList ? (
                    <LeaderboardModal
                        userList={userList}
                        categoryCompared={categoryCompared}
                        comparedMetric={comparedMetric}
                        onToggleMetric={onToggleMetric}
                        openModal={openModal}
                        onUserPress={onUserPress}
                        isPanelExpanded={isPanelExpanded}
                        isHexFocus={isHexFocus}
                        hexFocusKey={hexFocusKey}
                        hexFocusLabel={hexFocusLabel}
                        scopeKey={scopeKey}

                        // NEW
                        isTribeFocused={isTribeFocused}
                        tribeComparisons={tribeComparisons}
                        activeCompIndex={activeCompIndex}
                        onActiveCompChange={onActiveCompChange}
                        tribeComparisonSummary={tribeComparisonSummary}
                        onOpenTribeComparison={onOpenTribeComparison}
                        // Pass canvas color to inner cards
                        canvasColor={effectiveCanvasColor}
                        renderTribeBanners={!!isTribeFocused}
                    />
                ) : null}
            </View>
        </View>
    );
};

export default React.memo(LeaderboardPanel);

const styles = StyleSheet.create({
    container: {
        alignSelf: 'stretch',
        borderTopLeftRadius: scaleSize(25),
        borderTopRightRadius: scaleSize(25),
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: scaleSize(-6) },
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(12),
        elevation: 8,
        backgroundColor: theme.surface,
    },
    content: {
        flexGrow: 1,
    },
});

// Clean version used by the panel (leave old BlockedView untouched above for safety)
const BlockedViewClean = React.memo(({ message, onResolve }) => {
    const stylesLocal = StyleSheet.create({
        // Position near top, offset ~80px down from previous placement
        wrap: { flex: 1, paddingHorizontal: scaleSize(18), paddingTop: scaleSize(98), paddingBottom: scaleSize(18), justifyContent: 'flex-start', alignItems: 'center' },
        text: { fontFamily: 'Outfit_700Bold', fontSize: scaleSize(14.5), color: '#EAEAEA', textAlign: 'center' },
        sub: { fontFamily: 'Outfit_400Regular', fontSize: scaleSize(12.5), color: '#AEB5C0', textAlign: 'center', marginTop: scaleSize(8) },
        btn: { marginTop: scaleSize(14), paddingHorizontal: scaleSize(14), paddingVertical: scaleSize(10), backgroundColor: '#2D9EFF', borderRadius: scaleSize(12) },
        btnText: { color: '#fff', fontFamily: 'Outfit_700Bold' },
    });
    return (
        <View style={stylesLocal.wrap}>
            <Text style={stylesLocal.text}>{message}</Text>
            <Text style={stylesLocal.sub}>Enter your personal info to enable per-lb ranking.</Text>
            {onResolve && (
                <TouchableOpacity style={stylesLocal.btn} activeOpacity={0.9} onPress={withStrongPress(onResolve)}>
                    <Text style={stylesLocal.btnText}>Enter Personal Info</Text>
                </TouchableOpacity>
            )}
        </View>
    );
});

const BlockedView = React.memo(({ message, onResolve }) => {
    const stylesLocal = StyleSheet.create({
        wrap: { flex: 1, padding: scaleSize(18), justifyContent: 'center', alignItems: 'center' },
        text: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(14), color: '#333', textAlign: 'center' },
        sub: { fontFamily: 'Outfit_400Regular', fontSize: scaleSize(12.5), color: '#64748B', textAlign: 'center', marginTop: scaleSize(8) },
        btn: { marginTop: scaleSize(14), paddingHorizontal: scaleSize(14), paddingVertical: scaleSize(10), backgroundColor: '#2D9EFF', borderRadius: scaleSize(12) },
        btnText: { color: '#fff', fontFamily: 'Outfit_700Bold' },
    });
    return (
        <>
            <View style={stylesLocal.wrap}>
                <Text style={stylesLocal.text}>{message}</Text>
                <Text style={stylesLocal.sub}>Enter your personal info to enable per-lb ranking.</Text>
                {onResolve && (
                    <TouchableOpacity style={stylesLocal.btn} activeOpacity={0.9} onPress={withStrongPress(onResolve)}>
                        <Text style={stylesLocal.btnText}>Enter Personal Info</Text>
                    </TouchableOpacity>
                )}
            </View>
        </>
    );
});
