// Styles for the LevelUpTransition rank-up modal.
import { StyleSheet } from "react-native";

import theme from "../../theme/mfpDark";
import { DEVICE_HEIGHT, DEVICE_WIDTH, scaleSize, ts } from "./layoutConstants";

const styles = StyleSheet.create({
    modalRoot: {
        flex: 1,
        backgroundColor: "rgba(4, 7, 13, 0.8)",
        alignItems: "center",
        justifyContent: "flex-start",
    },
    fill: {
        ...StyleSheet.absoluteFillObject,
    },
    baseLayer: {
        flex: 1,
        backgroundColor: theme.bg || "#05070d",
    },
    gradientLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    gradientFill: {
        flex: 1,
    },
    radiance: {
        position: "absolute",
        width: DEVICE_WIDTH * 1.15,
        height: DEVICE_WIDTH * 1.15,
        borderRadius: DEVICE_WIDTH * 0.6,
        top: DEVICE_HEIGHT * 0.18,
        left: (DEVICE_WIDTH - DEVICE_WIDTH * 1.15) / 2,
        shadowColor: "#000000",
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: scaleSize(24),
    },
    rays: {
        position: "absolute",
        width: DEVICE_WIDTH * 1.4,
        height: DEVICE_WIDTH * 1.4,
        borderRadius: DEVICE_WIDTH * 0.7,
        top: DEVICE_HEIGHT * 0.05,
        left: (DEVICE_WIDTH - DEVICE_WIDTH * 1.4) / 2,
        alignItems: "center",
        justifyContent: "center",
    },
    ray: {
        position: "absolute",
        width: "72%",
        height: scaleSize(8),
        borderRadius: scaleSize(8),
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: scaleSize(10),
    },
    raySecondary: {
        transform: [{ rotate: "90deg" }],
    },
    shimmerLine: {
        position: "absolute",
        height: scaleSize(2.6),
        borderRadius: scaleSize(2),
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: scaleSize(5),
    },
    content: {
        position: "absolute",
        top: DEVICE_HEIGHT * 0.18,
        alignItems: "center",
        paddingHorizontal: scaleSize(24),
    },
    pretitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: ts(12),
        letterSpacing: 1.2,
        color: "rgba(244, 247, 255, 0.82)",
        textTransform: "uppercase",
        marginBottom: scaleSize(6),
    },
    title: {
        fontFamily: "Outfit_900Black",
        fontSize: ts(28),
        color: "#fdfdff",
        letterSpacing: 0.4,
        textShadowColor: "rgba(0,0,0,0.45)",
        textShadowOffset: { width: 0, height: scaleSize(3) },
        textShadowRadius: scaleSize(6),
    },
    subtitle: {
        marginTop: scaleSize(10),
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(13),
        color: "rgba(236, 242, 255, 0.9)",
        textShadowColor: "rgba(0,0,0,0.4)",
        textShadowOffset: { width: 0, height: scaleSize(2) },
        textShadowRadius: scaleSize(5),
    },
    rankStack: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(8),
    },
    cardWrap: {
        width: Math.min(DEVICE_WIDTH - scaleSize(16), scaleSize(460)),
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: scaleSize(10) },
        shadowRadius: scaleSize(18),
        position: "absolute",
    },
    cardPrevious: {
        zIndex: 1,
    },
    cardNew: {
        zIndex: 2,
    },
    ctaWrap: {
        position: "absolute",
        bottom: DEVICE_HEIGHT * 0.1,
        width: "100%",
        alignItems: "center",
        paddingHorizontal: scaleSize(24),
    },
    ctaButton: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(14),
        borderRadius: scaleSize(16),
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
        backgroundColor: "rgba(0, 0, 0, 0.25)",
    },
    ctaButtonPressed: {
        opacity: 0.9,
    },
    ctaGradient: {
        ...StyleSheet.absoluteFillObject,
        opacity: 1,
    },
    ctaText: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: ts(15),
        color: "#fdfdff",
        textShadowColor: "rgba(0,0,0,0.35)",
        textShadowOffset: { width: 0, height: scaleSize(1) },
        textShadowRadius: scaleSize(2),
    },
    ctaIcon: {
        position: "absolute",
        right: scaleSize(14),
    },
});

export default styles;
