// StyleSheet of the feed rank card (FeedSnapshotCard).
import { StyleSheet } from "react-native";

import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 0,
        paddingBottom: 0,
    },
    rankSection: {
        backgroundColor: theme.bg,
    },
    rankTabsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(12),
        paddingTop: scaleSize(4),
        paddingBottom: scaleSize(8),
    },
    rankTab: {
        paddingVertical: scaleSize(7),
        paddingHorizontal: scaleSize(16),
        borderRadius: scaleSize(20),
        marginRight: scaleSize(6),
        borderWidth: scaleSize(2),
    },
    rankTabActive: {
        backgroundColor: "#59a9ff",
        borderColor: "#59a9ff",
        shadowColor: "#59a9ff",
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(12),
        shadowOffset: { width: 0, height: 4 },
    },
    rankTabInactive: {
        backgroundColor: "rgba(8,8,21,0.92)",
        borderColor: "rgba(255,255,255,0.18)",
    },
    rankTabText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(14),
        letterSpacing: 0.3,
    },
    rankTabTextActive: {
        color: "#05060f",
    },
    rankTabTextInactive: {
        color: "rgba(255,255,255,0.7)",
    },
    rankCard: {
        paddingVertical: scaleSize(26),
        paddingHorizontal: scaleSize(24),
        justifyContent: "center",
        position: "relative",
        minHeight: scaleSize(220),
        height: scaleSize(220),
    },
    rankCardFrame: {
        marginHorizontal: scaleSize(14),
        borderRadius: scaleSize(20),
        borderWidth: 1,
        borderColor: theme.hairline,
        backgroundColor: theme.surface,
        overflow: "hidden",
    },
    rankCardRank: {
        height: "auto",
        minHeight: 0,
        paddingVertical: 0,
        paddingHorizontal: 0,
    },
    rankHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(16),
        paddingTop: scaleSize(14),
        minHeight: scaleSize(38),
        zIndex: 2,
    },
    rankEyebrow: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(11),
        color: theme.textSecondary,
        letterSpacing: 1.1,
        textTransform: "uppercase",
    },
    rankOvrChip: {
        flexDirection: "row",
        alignItems: "baseline",
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(4),
        borderRadius: scaleSize(12),
    },
    rankOvrLabel: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: scaleSize(10),
        letterSpacing: 0.8,
        marginRight: scaleSize(5),
    },
    rankOvrValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        color: theme.textPrimary,
        fontVariant: ["tabular-nums"],
    },
    rankFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(12),
        borderTopWidth: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(0,0,0,0.16)",
        zIndex: 2,
    },
    rankCardWrapper: {
        width: "100%",
    },
    rankCardHidden: {
        display: "none",
    },
    rankCardContent: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: scaleSize(4),
        paddingBottom: scaleSize(20),
        zIndex: 2,
    },
    rankCardContentNoHeader: {
        paddingTop: scaleSize(22),
    },
    rankBadgeCluster: {
        width: scaleSize(130),
        height: scaleSize(104),
        justifyContent: "center",
        alignItems: "center",
        marginBottom: scaleSize(2),
        position: "relative",
    },
    rankParticleLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    rankParticle: {
        position: "absolute",
        borderRadius: 999,
        shadowOpacity: 0.75,
        shadowOffset: { width: 0, height: 0 },
    },
    rankProgressText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(13),
        color: "rgba(255,255,255,0.8)",
        letterSpacing: 0.2,
    },
    rankTitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: scaleSize(22),
        color: "#fffef4",
        marginTop: scaleSize(4),
        letterSpacing: 2,
        textAlign: "center",
        textTransform: "uppercase",
    },
    bodygraphCard: {
        paddingHorizontal: scaleSize(20),
        justifyContent: "center",
    },
    bodygraphContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        flex: 1,
        paddingTop: scaleSize(6),
    },
    bodygraphStatsColumn: {
        width: "30%",
        paddingRight: scaleSize(10),
        justifyContent: "center",
    },
    bodygraphOverallHero: {
        gap: scaleSize(4),
    },
    bodygraphOverallLabel: {
        textTransform: "uppercase",
        fontFamily: "Outfit_700Bold",
        letterSpacing: 0.4,
        color: "rgba(247,248,255,0.9)",
        fontSize: scaleSize(14),
    },
    bodygraphOverallValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(40),
        lineHeight: scaleSize(44),
        color: theme.primary,
    },
    bodygraphStatsLabel: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        color: "rgba(247,248,255,0.78)",
        letterSpacing: 0.25,
    },
    bodygraphStatsValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
        color: "#f7f8ff",
        letterSpacing: 0.25,
    },
    bodygraphStatsEmptyText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        color: "rgba(247,248,255,0.6)",
        letterSpacing: 0.25,
        maxWidth: "90%",
    },
    bodygraphFigures: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-evenly",
        gap: scaleSize(16),
        minHeight: scaleSize(190),
        paddingBottom: scaleSize(10),
    },
    bodygraphFigureSlot: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-end",
        height: "100%",
        overflow: "visible",
    },
    bodygraphFigureSlotFront: {
        paddingRight: scaleSize(6),
    },
    bodygraphFigureSlotBack: {
        flex: 1,
        height: "100%",
        paddingLeft: scaleSize(6),
    },
    bodygraphFigure: {
        width: "100%",
        height: "100%",
    },
    bodygraphFigureFront: {
        transform: [{ scale: 1.18 }, { translateY: scaleSize(12) }, { translateX: scaleSize(6) }],
    },
    bodygraphFigureBack: {
        transform: [{ scale: 1.18 }, { translateY: scaleSize(12) }],
    },
});

export default styles;
