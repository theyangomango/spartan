import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackgroundProps } from "@gorhom/bottom-sheet";
import theme from "../../theme/mfpDark";
import LeaderboardModal from "./LeaderboardModal";

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
    const snapPoints = useMemo(() => ["60%", "94%"], []);
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
            backgroundStyle={{ backgroundColor: canvasColor || require("../../theme/mfpDark").default.bg, borderTopLeftRadius: 25, borderTopRightRadius: 25 }}
            enablePanDownToClose={false}
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
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
        elevation: 5,
        // rounding and background handled by backgroundStyle
    },
});

// Clean version used by the sheet (leave old BlockedView untouched above for safety)
const BlockedViewClean = React.memo(({ message, onResolve }) => {
    const stylesLocal = StyleSheet.create({
        // Position near top, offset ~80px down from previous placement
        wrap: { flex: 1, paddingHorizontal: 18, paddingTop: 98, paddingBottom: 18, justifyContent: 'flex-start', alignItems: 'center' },
        text: { fontFamily: 'Outfit_700Bold', fontSize: require('../../helper/scaleSize').ts(14.5), color: '#EAEAEA', textAlign: 'center' },
        sub: { fontFamily: 'Outfit_400Regular', fontSize: require('../../helper/scaleSize').ts(12.5), color: '#AEB5C0', textAlign: 'center', marginTop: 8 },
        btn: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#2D9EFF', borderRadius: 12 },
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
        wrap: { flex: 1, padding: 18, justifyContent: 'center', alignItems: 'center' },
        text: { fontFamily: 'Outfit_600SemiBold', fontSize: require('../../helper/scaleSize').ts(14), color: '#333', textAlign: 'center' },
        sub: { fontFamily: 'Outfit_400Regular', fontSize: require('../../helper/scaleSize').ts(12.5), color: '#64748B', textAlign: 'center', marginTop: 8 },
        btn: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#2D9EFF', borderRadius: 12 },
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
