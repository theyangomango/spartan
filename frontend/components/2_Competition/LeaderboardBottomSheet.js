import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackgroundProps } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from "../../theme/mfpDark";
import LeaderboardModal from "./LeaderboardModal";

import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";

const AUTO_EXPAND_SCROLL_THRESHOLD = 200;

const LeaderboardBottomSheet = ({
    userList,
    categoryCompared,
    comparedMetric,
    onToggleMetric,
    openModal,
    openBottomSheet,
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
    // Custom canvas color for sheet and cards
    canvasColor,
    topOffset = 0,
}) => {
    const bottomSheetRef = useRef(null);
    const insets = useSafeAreaInsets();
    const { height: H } = useWindowDimensions();
    const safeTopOffset = useMemo(() => Math.max(0, Math.round(Number(topOffset) || 0)), [topOffset]);
    const autoExpandTriggeredRef = useRef(false);
    const enforceExpandedRef = useRef(false);
    // Numeric snap points sized so the sheet hugs the bottom edge while the top
    // aligns with the 40% podium band (collapsed) or ~6% band (expanded).
    const snapPoints = useMemo(() => {
        // For @gorhom/bottom-sheet: top position = H - snapPoint.
        // We want top position = 0.40 * H => snapPoint = 0.60 * H.
        // Use ceil to prefer no visual gap over a sub‑pixel gap.
        const collapsedBase = Math.max(1, Math.ceil(H * 0.60));
        const expandedBase = Math.max(collapsedBase + 1, Math.ceil(H * 0.88));
        const offset = Math.min(safeTopOffset, collapsedBase - 1);
        const collapsed = Math.max(1, collapsedBase - offset);
        const expanded = Math.max(collapsed + 1, expandedBase);
        return [collapsed, expanded];
    }, [H, safeTopOffset]);
    const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);

    const handleSheetChanges = useCallback((index) => {
        const nextIndex = typeof index === 'number' ? index : -1;
        if (nextIndex < 0) {
            // Keep the sheet at its smallest snap point instead of letting it fully close.
            autoExpandTriggeredRef.current = false;
            enforceExpandedRef.current = false;
            bottomSheetRef.current?.snapToIndex(0);
            setIsBottomSheetExpanded(false);
            return;
        }
        if (nextIndex === 0) {
            if (enforceExpandedRef.current) {
                bottomSheetRef.current?.expand?.();
                return;
            }
            autoExpandTriggeredRef.current = false;
        }
        if (nextIndex === 1) {
            autoExpandTriggeredRef.current = false;
            enforceExpandedRef.current = false;
        }
        try {
            requestAnimationFrame(() => setIsBottomSheetExpanded(nextIndex === 1));
        } catch {
            setIsBottomSheetExpanded(nextIndex === 1);
        }
    }, []);

    const handleAutoExpandScroll = useCallback((offsetY = 0) => {
        const distance = Math.max(0, Number(offsetY) || 0);
        if (distance < AUTO_EXPAND_SCROLL_THRESHOLD) {
            autoExpandTriggeredRef.current = false;
            return;
        }
        if (isBottomSheetExpanded || autoExpandTriggeredRef.current) return;
        autoExpandTriggeredRef.current = true;
        enforceExpandedRef.current = true;
        const ref = bottomSheetRef.current;
        if (ref?.expand) {
            ref.expand();
        } else if (ref?.snapToIndex) {
            ref.snapToIndex(1);
        }
    }, [isBottomSheetExpanded]);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={0}
                appearsOnIndex={1}
                pressBehavior="collapse"
                opacity={0.4}
            />
        ),
        []
    );

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            enableOverDrag={false}
            backdropComponent={renderBackdrop}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            handleStyle={styles.handleContainer}
            handleIndicatorStyle={styles.handleIndicator}
            // Use custom canvas color (from Competition screen) for unified canvas
            backgroundStyle={{ backgroundColor: canvasColor || require("../../theme/mfpDark").default.bg, borderTopLeftRadius: scaleSize(25), borderTopRightRadius: scaleSize(25) }}
            enablePanDownToClose={false}
            // Keep topInset for correct max height on devices with a notch,
            // but numeric snap points ensure the collapsed state still aligns
            // perfectly with the podium band (no gap).
            topInset={insets.top || 0}
        >
            {blockedMessage ? (
                <BlockedViewClean message={blockedMessage} onResolve={onResolveBlocked} />
            ) : userList ? (
                <LeaderboardModal
                    userList={userList}
                    categoryCompared={categoryCompared}
                    comparedMetric={comparedMetric}
                    onToggleMetric={onToggleMetric}
                    openModal={openModal}
                    openBottomSheet={openBottomSheet}
                    isBottomSheetExpanded={isBottomSheetExpanded}
                    isHexFocus={isHexFocus}
                    hexFocusKey={hexFocusKey}
                    hexFocusLabel={hexFocusLabel}

                    // NEW
                    isTribeFocused={isTribeFocused}
                    tribeComparisons={tribeComparisons}
                    activeCompIndex={activeCompIndex}
                    onActiveCompChange={onActiveCompChange}
                    tribeComparisonSummary={tribeComparisonSummary}
                    onOpenTribeComparison={onOpenTribeComparison}
                    // Pass canvas color to inner cards
                    canvasColor={canvasColor}
                    onScrollExpandRequest={handleAutoExpandScroll}
                    renderTribeBanners={!!isTribeFocused}
                />
            ) : null}
        </BottomSheet>
    );
};

export default React.memo(LeaderboardBottomSheet);

const styles = StyleSheet.create({
    bottomsheet: {
        shadowColor: "#ddd",
        shadowOffset: { width: 0, height: scaleSize(-5) },
        shadowOpacity: 0.8,
        shadowRadius: scaleSize(5),
        elevation: 5,
        // iOS shadow heuristics expect a base fill color
        backgroundColor: theme.bg,
        // rounding and background handled by backgroundStyle
    },
    handleContainer: {
        paddingTop: scaleSize(8),
        paddingBottom: scaleSize(4),
        alignItems: 'center',
        justifyContent: 'center',
    },
    handleIndicator: {
        width: scaleSize(42),
        height: scaleSize(5),
        borderRadius: scaleSize(999),
        backgroundColor: 'rgba(255, 255, 255, 0.28)',
    },
});

// Clean version used by the sheet (leave old BlockedView untouched above for safety)
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
