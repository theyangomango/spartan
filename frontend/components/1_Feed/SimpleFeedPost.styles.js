// Styles of the feed post card (SimpleFeedPost and its feedPost/ parts).

import { StyleSheet } from "react-native";

import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        marginBottom: scaleSize(22),
        position: 'relative',
    },
    card: {
        backgroundColor: theme.surface,
        position: 'relative',
    },
    cardHidden: {
        opacity: 0,
    },
    cardLive: {
        backgroundColor: '#22141a',
    },
    sectionTop: {
        paddingHorizontal: scaleSize(18),
        paddingTop: scaleSize(14),
    },
    sectionBottom: {
        paddingTop: scaleSize(6),
        paddingBottom: scaleSize(8),
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatarWrap: {
        width: scaleSize(38),
        aspectRatio: 1,
        borderRadius: scaleSize(24),
        overflow: "hidden",
        marginRight: scaleSize(11),
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: scaleSize(24),
        backgroundColor: theme.field,
    },
    avatarFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    avatarInitials: {
        color: theme.textPrimary,
        fontFamily: "Poppins_600SemiBold",
        fontSize: scaleSize(15.5),
    },
    headerTextCol: {
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
    },
    namePressable: {
        flexShrink: 1,
    },
    nameHandle: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
    },
    nameText: {
        color: theme.textPrimary,
        fontFamily: "Poppins_700Bold",
        fontSize: scaleSize(13),
    },
    timestampText: {
        color: theme.textSecondary,
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(11.5),
        marginTop: scaleSize(2),
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: scaleSize(8),
    },
    cheerButton: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(5),
        borderRadius: scaleSize(12),
        backgroundColor: "rgba(255,77,103,0.18)",
        marginRight: scaleSize(8),
    },
    cheerButtonText: {
        color: "#FF8596",
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(10.5),
        letterSpacing: 0.4,
        textTransform: "uppercase",
    },
    liveTimestampText: {
        color: '#FF8596',
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11.5),
        marginTop: scaleSize(2),
    },
    liveBackdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255,77,103,0.06)",
    },
    moreButton: {
        paddingHorizontal: scaleSize(4),
        paddingVertical: scaleSize(4),
    },
    titleBlock: {
        marginTop: scaleSize(12),
        paddingBottom: scaleSize(5)
    },
    titleText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
    },
    workoutTitleText: {
        color: '#74abf7ff',
    },
    captionText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
        marginTop: scaleSize(4),
    },
    metricsFigures: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        flex: 1.8,
        paddingLeft: 0,
        
    },
    metricsFigureSlot: {
        flex: 1,
        maxWidth: "94%",
        height: scaleSize(240),
        alignItems: "center",
        justifyContent: "center",
    },
    metricsFigureFront: {
        marginRight: scaleSize(20),
    },
    metricsFigureBack: {
        marginLeft: scaleSize(20),
    },
    metricsFigure: {
        width: "125%",
        height: "125%",
    },
    metricsRow: {
        flexDirection: "row",
        justifyContent: 'space-between',
        paddingVertical: scaleSize(10),
        marginLeft: scaleSize(30),
        marginRight: scaleSize(20),
        alignItems: "center",
    },
    metricsColumnStack: {
        flex: 0.6,
        alignSelf: "stretch",
        justifyContent: "space-between",
        paddingBottom: scaleSize(10)
    },
    metricTopStack: {
        width: "100%",
        gap: scaleSize(10),
    },
    metricStackRow: {
        alignSelf: "stretch",
        marginBottom: scaleSize(10),
        alignItems: "flex-end",
    },
    metricStackRowLast: {
        marginBottom: 0,
    },
    metricLabel: {
        color: 'rgba(255,255,255,0.58)',
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11),
        letterSpacing: 0.2,
        paddingBottom: scaleSize(1.5),
        textAlign: "right",
    },
    metricLabelRight: {
        textAlign: "right",
    },
    metricLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: scaleSize(1.5),
        alignSelf: "stretch",
        justifyContent: "flex-end",
    },
    metricInfoIcon: {
        marginLeft: scaleSize(6),
        padding: scaleSize(2),
    },
    metricLiveDot: {
        width: scaleSize(6.5),
        height: scaleSize(6.5),
        borderRadius: scaleSize(3.25),
        backgroundColor: "#FF4D67",
        marginRight: scaleSize(6),
        shadowColor: "#FF4D67",
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(6),
        shadowOffset: { width: 0, height: 0 },
    },
    metricValue: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        textAlign: "right",
    },
    metricValueRight: {
        textAlign: "right",
    },
    metricValueRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    metricValueRowRight: {
        justifyContent: "flex-end",
    },
    workoutSummaryBlock: {
        marginTop: scaleSize(6),
        marginHorizontal: scaleSize(20),
        paddingTop: scaleSize(10),
        paddingBottom: scaleSize(4),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    workoutSummaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: scaleSize(2),
    },
    workoutSummaryHeaderText: {
        color: theme.textSecondary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(11),
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },
    workoutSummaryHeaderExercise: {
        flex: 1,
        paddingRight: scaleSize(12),
    },
    workoutSummaryHeaderBest: {
        minWidth: scaleSize(96),
        textAlign: 'right',
    },
    workoutSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: scaleSize(4),
    },
    workoutSummaryRowBorder: {
        borderColor: 'rgba(255,255,255,0.08)',
    },
    workoutSummaryExercise: {
        flex: 1,
        paddingRight: scaleSize(12),
        color: theme.textPrimary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
    },
    workoutSummaryBest: {
        minWidth: scaleSize(96),
        flexShrink: 0,
        textAlign: 'right',
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
    },
    recordsValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mediaContainer: {
        width: "100%",
        marginTop: scaleSize(4),
        borderRadius: 0,
        overflow: "hidden",
        backgroundColor: theme.field,
        position: 'relative',
    },
    mediaList: {
        width: '100%',
        height: '100%',
    },
    mediaSlide: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaContent: {
        width: '100%',
        height: '100%',
    },
    mediaIndicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: scaleSize(6),
    },
    mediaDot: {
        width: scaleSize(6),
        height: scaleSize(4.5),
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.22)',
        marginHorizontal: scaleSize(3),
    },
    mediaDash: {
        width: scaleSize(22),
        height: scaleSize(4.5),
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.6)',
        marginHorizontal: scaleSize(3),
    },
    videoControlsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: scaleSize(12),
    },
    videoMuteButton: {
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: scaleSize(20),
        padding: scaleSize(8),
    },
    videoPlayIconWrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoSliderOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: scaleSize(12),
        paddingBottom: scaleSize(10),
        paddingTop: scaleSize(6),
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    videoSlider: {
        height: scaleSize(30),
    },
    videoTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: scaleSize(6),
    },
    videoTimeText: {
        fontSize: scaleSize(11),
        color: '#fff',
        fontFamily: 'Outfit_600SemiBold',
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(16),
    },
    likesContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingRight: scaleSize(12),
    },
    likesContainerPressed: {
        opacity: 0.8,
    },
    likesAvatarWrap: {
        marginRight: scaleSize(6),
    },
    likesAvatar: {
        width: scaleSize(23),
        aspectRatio: 1,
        borderRadius: scaleSize(32) / 2,
        borderWidth: scaleSize(2),
        borderColor: "#fff",
        backgroundColor: theme.field,
    },
    likesAvatarFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    likesAvatarInitials: {
        color: theme.textPrimary,
        fontFamily: "Poppins_600SemiBold",
        fontSize: scaleSize(13),
    },
    likesText: {
        flex: 1,
        color: theme.textPrimary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(13),
    },
    buttonsContainer: {
        width: "32%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(6),
    },
    actionText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12.5),
        marginLeft: scaleSize(6),
    },
    highlightOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: scaleSize(14),
        bottom: scaleSize(12),
        backgroundColor: "#FFF4B3",
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(17, 24, 39, 0.35)',
    },
    optionsModalRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    optionsBackdrop: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#000',
    },
    optionsSheet: {
        backgroundColor: theme.surface,
        paddingHorizontal: scaleSize(26),
        paddingTop: scaleSize(22),
        paddingBottom: scaleSize(32),
        borderTopLeftRadius: scaleSize(26),
        borderTopRightRadius: scaleSize(26),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.06)',
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(24),
        shadowOffset: { width: 0, height: -6 },
        elevation: 18,
    },
    optionsItem: {
        paddingVertical: scaleSize(12),
        borderRadius: scaleSize(16),
    },
    optionsItemPressed: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    optionsItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    optionsItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionsItemIcon: {
        marginRight: scaleSize(10),
    },
    optionsItemText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(14.5),
        letterSpacing: 0.2,
        color: theme.textPrimary,
    },
    optionsItemDeleteText: {
        color: '#FF6B6B',
    },
    optionsDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginVertical: scaleSize(4),
    },
});

export default styles;
