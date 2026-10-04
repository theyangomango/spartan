import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BottomSheet from "@gorhom/bottom-sheet";
import { useSharedValue, useAnimatedReaction } from "react-native-reanimated";
import { useWindowDimensions, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import UserStatsModal from "./UserStatsModal";
import scaleSize from "../../../helper/scaleSize";
import { strong as hapticStrong } from "../../../utils/haptics";

import { onHexagonUpdate } from "../../../utils/hexagonEvents";
import buildEffectiveStatsUser from "./effectiveStatsUser";
import isThisUser from "../../../helper/isThisUser";

const UserStatsBottomSheet = ({ isVisible, setIsVisible, user, navigation, sheetProgressSV, heightRatio = 1 }) => {
    const bottomSheetRef = useRef(null);
    const { height: windowHeight } = useWindowDimensions();
    const { top: insetTop = 0 } = useSafeAreaInsets();
    const snapPoints = useMemo(() => {
        const fullHeight = Math.max(0, windowHeight + insetTop);
        const ratio = Number(heightRatio);
        const clampedRatio = Number.isFinite(ratio) && ratio > 0 && ratio <= 1 ? ratio : 1;
        const targetHeight = Math.max(scaleSize(180), fullHeight * clampedRatio);
        return [targetHeight];
    }, [windowHeight, insetTop, heightRatio]);
    const isFullHeight = snapPoints[0] >= windowHeight + insetTop - 1;
    const [tick, setTick] = useState(0);
    const animatedIndexSV = useSharedValue(-1);
    const animatedPositionSV = useSharedValue(0);
    const openPositionSV = useSharedValue(0);
    const closePositionSV = useSharedValue(1);

    useAnimatedReaction(
        () => animatedIndexSV.value,
        (value) => {
            const currentPos = animatedPositionSV.value;
            if (currentPos === undefined || currentPos === null) return;
            if (value === 0) {
                openPositionSV.value = currentPos;
            } else if (value <= -1) {
                closePositionSV.value = currentPos;
            }
        },
        []
    );

    useAnimatedReaction(
        () => animatedPositionSV.value,
        (position) => {
            if (!sheetProgressSV) return;
            if (position === undefined || position === null) return;
            const openPos = openPositionSV.value;
            let closePos = closePositionSV.value;
            if (position > openPos && position > closePos) {
                closePos = position;
                closePositionSV.value = closePos;
            }
            if (closePos <= openPos) closePos = openPos + 1;
            const span = closePos - openPos;
            const normalized = span > 0 ? 1 - ((position - openPos) / span) : 1;
            let clamped = normalized;
            if (clamped < 0) clamped = 0;
            if (clamped > 1) clamped = 1;
            sheetProgressSV.value = clamped;
        },
        [sheetProgressSV]
    );

    const renderHandle = useCallback(() => null, []);

    useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current?.expand();
        } else if (sheetProgressSV) {
            sheetProgressSV.value = 0;
        }
    }, [isVisible, sheetProgressSV, windowHeight]);

    // Live refresh when hexagon changes elsewhere in the app
    useEffect(() => {
        const off = onHexagonUpdate(() => setTick((t) => t + 1));
        return () => off && off();
    }, []);

    function toViewProfile() {
        const u = user || global?.userData;
        if (!u) return;
        hapticStrong();
        const rootNav = navigation?.getParent?.("ROOT");
        if (isThisUser(u)) {
            if (rootNav?.navigate) rootNav.navigate("Profile", { transition: "slide-from-right" });
            else navigation.navigate("Profile", { transition: "slide-from-right" });
            return;
        }

        const payload = {
            user: {
                handle: u.handle,
                name: u.name,
                pfp: u.pfp || u.image,
                uid: u.uid,
            },
        };
        if (rootNav?.navigate) rootNav.navigate("ViewProfile", payload);
        else navigation.navigate("ViewProfile", payload);
    }

    const effectiveUser = useMemo(
        () => buildEffectiveStatsUser(user),
        [user, (global?.userData?.completedWorkouts || []).length, global?.userData?.statsExercises]
    );

    const handleDetailActiveChange = useCallback(() => {
        /* keep header styling static when detail overlay opens */
    }, []);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            animatedIndex={animatedIndexSV}
            animatedPosition={animatedPositionSV}
            snapPoints={snapPoints}
            handleComponent={renderHandle}
            handleHeight={0}
            backgroundStyle={{
                backgroundColor: require("../../../theme/mfpDark").default.bg,
                borderTopLeftRadius: scaleSize(24),
                borderTopRightRadius: scaleSize(24),
            }}
            containerStyle={{
                marginTop: -insetTop,
                overflow: "hidden",
                borderTopLeftRadius: scaleSize(24),
                borderTopRightRadius: scaleSize(24),
                zIndex: 999,
                elevation: 30,
            }}
            enablePanDownToClose
            onClose={() => {
                setIsVisible(false);
            }}
        >
            {effectiveUser && (
                <UserStatsModal
                    key={tick}
                    user={effectiveUser}
                    toViewProfile={toViewProfile}
                    navigation={navigation}
                    visible={isVisible}
                    onDetailActiveChange={handleDetailActiveChange}
                />
            )}
        </BottomSheet>
    );
};

export default React.memo(UserStatsBottomSheet);
