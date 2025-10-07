import React, { useCallback, useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import InviteBanner from "./3_Workout/InviteBanner";
import useWorkoutInvites from "../hooks/useWorkoutInvites";

const AnimatedView = Animated.View;

export default function WorkoutInviteOverlay({ enabled = true }) {
    const insets = useSafeAreaInsets();
    const latestInviteRef = useRef(null);

    const handleAccepted = useCallback((wid, seedWorkout) => {
        const invite = latestInviteRef.current;
        try { global.isCurrentlyWorkingOut = true; } catch {}

        let joinedDirectly = false;
        try {
            const directJoin = global?.__joinExternalWorkoutDirect;
            if (typeof directJoin === "function") {
                const maybe = directJoin({
                    wid,
                    seedWorkout: seedWorkout || null,
                    inviterUid: invite?.fromUid ? String(invite.fromUid) : null,
                });
                joinedDirectly = true;
                if (maybe && typeof maybe.catch === "function") {
                    maybe.catch(() => { });
                }
            }
        } catch {
            joinedDirectly = false;
        }

        if (!joinedDirectly) {
            try {
                global.__pendingWorkoutJoin = {
                    wid,
                    seedWorkout: seedWorkout || null,
                    inviterUid: invite?.fromUid ? String(invite.fromUid) : null,
                    ts: Date.now(),
                };
            } catch {}
        } else {
            try {
                if (global.__pendingWorkoutJoin?.wid === wid) {
                    global.__pendingWorkoutJoin = null;
                }
            } catch {}
        }

        try {
            const { jumpToTab } = require("../../navigationRef");
            if (typeof jumpToTab === "function") {
                jumpToTab("Workout", { _joinTs: Date.now() });
            }
        } catch {}
    }, []);

    const {
        currentInvite,
        inviterPfpUri,
        bannerY,
        handleInviteLayout,
        accept,
        decline,
    } = useWorkoutInvites({
        enabled,
        onAccepted: handleAccepted,
    });

    useEffect(() => {
        latestInviteRef.current = currentInvite || null;
    }, [currentInvite]);

    const topOffset = Math.max(insets.top, 12) + 6;

    return (
        <AnimatedView
            pointerEvents={currentInvite ? "auto" : "none"}
            onLayout={handleInviteLayout}
            style={[
                styles.bannerWrap,
                {
                    top: topOffset,
                    transform: [{ translateY: bannerY }],
                },
            ]}
        >
            {currentInvite && (
                <InviteBanner
                    invite={currentInvite}
                    pfpUri={inviterPfpUri}
                    onAccept={accept}
                    onDecline={decline}
                />
            )}
        </AnimatedView>
    );
}

const styles = StyleSheet.create({
    bannerWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 999,
    },
});
