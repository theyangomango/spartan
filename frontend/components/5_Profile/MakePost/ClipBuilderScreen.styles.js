// Styles of the clip builder screen (ClipBuilderScreen).
import { StyleSheet } from "react-native";
import theme from "../../../theme/mfpDark";
import { scaleWidth375 } from "../../../helper/scaleSize";
import { composeHorizontalPadding, avatarSize } from "./composerLayout";

const styles = StyleSheet.create({
    main: {
        flex: 1,
        backgroundColor: theme.surface,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleWidth375(18),
        paddingBottom: scaleWidth375(12),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.hairline,
        backgroundColor: theme.bg,
        position: "relative",
    },
    header_btn: {
        width: scaleWidth375(40),
        height: scaleWidth375(32),
        alignItems: "center",
        justifyContent: "center",
    },
    header_title_ctnr: {
        position: "absolute",
        left: 0,
        right: 0,
        top: scaleWidth375(4),
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    header_title: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleWidth375(16),
        color: theme.textPrimary,
        textAlign: "center",
    },
    header_action_btn: {
        minWidth: scaleWidth375(48),
        alignItems: "flex-end",
        justifyContent: "center",
        paddingVertical: scaleWidth375(6),
    },
    header_action_text: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleWidth375(16),
        color: theme.primary,
    },
    header_action_text_disabled: {
        color: "rgba(148,163,184,0.6)",
    },
    body: {
        flex: 1,
    },
    body_content: {
        paddingHorizontal: composeHorizontalPadding,
        paddingTop: scaleWidth375(18),
        paddingBottom: scaleWidth375(48),
        flexGrow: 1,
    },
    media_block: {
        marginTop: scaleWidth375(18),
        marginHorizontal: -composeHorizontalPadding,
    },
    previewWrapper: {
        marginBottom: scaleWidth375(12),
    },
    videoStage: {
        width: "100%",
        aspectRatio: 9 / 16,
        backgroundColor: "#000",
        position: "relative",
        borderRadius: 0,
        overflow: "hidden",
    },
    video_pressable: {
        width: "100%",
        height: "100%",
    },
    previewVideo: {
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
    },
    video_play_icon_wrap: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    video_slider_overlay: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: scaleWidth375(12),
        paddingBottom: scaleWidth375(10),
        paddingTop: scaleWidth375(6),
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    video_slider: {
        height: scaleWidth375(30),
    },
    video_time_row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: scaleWidth375(6),
    },
    video_time_text: {
        fontSize: scaleWidth375(11),
        color: "#fff",
        fontFamily: "Outfit_600SemiBold",
    },
    video_controls_overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "flex-start",
        alignItems: "flex-end",
        padding: scaleWidth375(12),
    },
    video_mute_button: {
        width: scaleWidth375(36),
        height: scaleWidth375(36),
        borderRadius: scaleWidth375(18),
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
    },
    previewMeta: {
        paddingVertical: scaleWidth375(12),
        paddingHorizontal: composeHorizontalPadding,
        fontFamily: "Outfit_600SemiBold",
        color: theme.textPrimary,
    },
    clear_btn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: scaleWidth375(12),
        paddingHorizontal: composeHorizontalPadding,
    },
    clear_btn_text: {
        fontFamily: "Outfit_600SemiBold",
        color: theme.error || "#EF4444",
        fontSize: scaleWidth375(14),
        marginLeft: scaleWidth375(6),
    },
    placeholder: {
        borderRadius: scaleWidth375(16),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        paddingVertical: scaleWidth375(32),
        paddingHorizontal: composeHorizontalPadding,
        alignItems: "center",
        marginBottom: scaleWidth375(16),
        backgroundColor: theme.surface,
    },
    placeholder_full: {
        marginHorizontal: 0,
        alignSelf: "stretch",
    },
    placeholder_title: {
        marginTop: scaleWidth375(12),
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleWidth375(16),
        color: theme.textPrimary,
    },
    placeholder_text: {
        marginTop: scaleWidth375(6),
        fontFamily: "Outfit_500Medium",
        color: theme.textSecondary,
        fontSize: scaleWidth375(13),
        textAlign: "center",
    },
    caption_block: {
        marginTop: 0,
        paddingHorizontal: 0,
    },
    caption_row: {
        flexDirection: "row",
    },
    avatar_ctnr: {
        width: avatarSize,
    },
    avatar: {
        width: avatarSize,
        height: avatarSize,
        borderRadius: avatarSize / 2,
        backgroundColor: theme.surface,
    },
    avatar_placeholder: {
        width: avatarSize,
        height: avatarSize,
        borderRadius: avatarSize / 2,
        backgroundColor: theme.hairline,
        alignItems: "center",
        justifyContent: "center",
    },
    caption_ctnr: {
        flex: 1,
        marginLeft: scaleWidth375(12),
    },
    caption_text: {
        fontSize: scaleWidth375(17),
        fontFamily: "Outfit_500Medium",
        color: theme.textPrimary,
        minHeight: avatarSize,
        paddingVertical: 0,
        paddingHorizontal: 0,
    },
});

export default styles;
