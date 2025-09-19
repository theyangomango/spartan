import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackgroundProps } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from "../../theme/mfpDark";
import LeaderboardModal from "./LeaderboardModal";

import scaleSize from "../../helper/scaleSize";

const LeaderboardBottomSheet = ({
    userList,
    categoryCompared,
    comparedMetric,
    onToggleMetric,
    openModal,
    openBottomSheet,

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
}) => {
    const bottomSheetRef = useRef(null);
    const insets = useSafeAreaInsets();
    const { height: H } = useWindowDimensions();
    // Numeric snap points that compensate for BOTTOM inset so the sheet's top
    // aligns with the 40% podium band exactly (no overlap, no gap).
    const snapPoints = useMemo(() => {
        const B = insets.bottom || 0;
        // For @gorhom/bottom-sheet: top position = H - B - snapPoint
        // We want top position = 0.40 * H => snapPoint = 0.60*H - B
        // Use ceil to prefer no visual gap over a sub‑pixel gap.
        const collapsed = Math.max(1, Math.ceil(H * 0.60 - B));
        const expanded = Math.max(1, Math.ceil(H * 0.94 - B));
        return [collapsed, expanded];
    }, [H, insets.bottom]);
    const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);

    const handleSheetChanges = useCallback((index) => {
        setIsBottomSheetExpanded(index === 1);
    }, []);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={0}
                appearsOnIndex={1}
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
            handleStyle={{ display: "none" }}
            // Use custom canvas color (from Competition screen) for unified canvas
            backgroundStyle={{ backgroundColor: canvasColor || require("../../theme/mfpDark").default.bg, borderTopLeftRadius: scaleSize(25), borderTopRightRadius: scaleSize(25) }}
            enablePanDownToClose={false}
            bottomInset={insets.bottom || 0}
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

                    // NEW
                    isTribeFocused={isTribeFocused}
                    tribeComparisons={tribeComparisons}
                    activeCompIndex={activeCompIndex}
                    onActiveCompChange={onActiveCompChange}
                    tribeComparisonSummary={tribeComparisonSummary}
                    onOpenTribeComparison={onOpenTribeComparison}
                    // Pass canvas color to inner cards
                    canvasColor={canvasColor}
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
                <TouchableOpacity style={stylesLocal.btn} activeOpacity={0.9} onPress={onResolve}>
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
                    <TouchableOpacity style={stylesLocal.btn} activeOpacity={0.9} onPress={onResolve}>
                        <Text style={stylesLocal.btnText}>Enter Personal Info</Text>
                    </TouchableOpacity>
                )}
            </View>
        </>
    );
});
