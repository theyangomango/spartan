// Styles of ActiveWorkoutModal and of its collapsed timer label.
import { StyleSheet } from "react-native";

import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";

const CTA_SHADOW_COLOR = '#000000';

const styles = StyleSheet.create({
    main_ctnr: { flex: 1 },

    // Header animation wrappers
    headerAnimated: { backgroundColor: 'transparent', position: 'relative', alignItems: 'stretch', alignSelf: 'center', width: '100%', overflow: 'hidden' },
    headerCollapsedOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 3,
        alignItems: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        zIndex: 2,
    },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerShadow: { height: scaleSize(2), backgroundColor: theme.hairline },
    bodyContainer: { flex: 1, width: '100%' },
    collapsedHud: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: scaleSize(18),
        borderColor: 'rgba(255,255,255,0.12)',
        shadowColor: CTA_SHADOW_COLOR,
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(10),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 6,
    },
    collapsedHudContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: scaleSize(-4)
    },
    collapsedHudLabel: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
        color: '#fff',
        flexShrink: 1,
        textAlign: 'center',
    },
    collapsedHudSeparator: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
        color: '#fff',
        marginHorizontal: scaleSize(12),
    },
    collapsedHudTimer: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
        color: '#fff',
    },
    // Allow the BottomSheet background to show through
    scrollview: { paddingTop: scaleSize(5), backgroundColor: 'transparent' },
    titleDisplayContainer: {
        paddingHorizontal: scaleSize(24),
        marginBottom: scaleSize(12),
    },
    titleDisplayText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(17),
        color: theme.textPrimary,
    },
    titleDisplaySubText: {
        marginTop: scaleSize(2),
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(13),
        color: theme.textSecondary,
    },
    titleDisplayInput: {
        width: '100%',
        padding: 0,
        paddingVertical: 0,
        textAlignVertical: 'top',
    },
    // Ensure FlashList receives a parent with a valid size
    listWrap: { flex: 1 },

    waitingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: 'transparent' },
    waitingText: { marginTop: scaleSize(6), fontFamily: "Nunito_700Bold", color: theme.textPrimary },

    add_exercise_btn: {
        marginHorizontal: scaleSize(20),
        marginTop: scaleSize(18),
        borderRadius: scaleSize(20),
        backgroundColor: '#E2EDFF',
        borderWidth: 0,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        paddingVertical: scaleSize(13),
        paddingHorizontal: scaleSize(18),
        shadowColor: '#000000',
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 3,
    },
    add_exercise_text: {
        fontSize: scaleSize(13),
        fontFamily: "Outfit_700Bold",
        color: theme.surface,
    },
    end_workout_btn: {
        marginHorizontal: scaleSize(20),
        marginTop: scaleSize(12),
        borderRadius: scaleSize(20),
        backgroundColor: '#2d2d2dff',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        paddingVertical: scaleSize(13),
        paddingHorizontal: scaleSize(18),
    },
    end_workout_btn_text: {
        fontSize: scaleSize(13),
        fontFamily: "Outfit_700Bold",
        color: theme.textPrimary,
    },
    end_workout_overlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
    },
    end_workout_sheet: {
        backgroundColor: theme.bg,
        borderTopLeftRadius: scaleSize(26),
        borderTopRightRadius: scaleSize(26),
        paddingTop: scaleSize(16),
        paddingBottom: scaleSize(56),
        paddingHorizontal: scaleSize(22),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.06)',
        shadowColor: '#000000',
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(12),
        shadowOffset: { width: 0, height: -scaleSize(4) },
        elevation: 10,
    },
    end_workout_backdrop: {
        flex: 1,
    },
    end_workout_options: {
        marginTop: scaleSize(6),
    },
    end_workout_option: {
        width: '100%',
        paddingVertical: scaleSize(13),
        paddingHorizontal: scaleSize(18),
        alignItems: "center",
        justifyContent: "center",
        borderRadius: scaleSize(18),
        backgroundColor: 'rgba(255,255,255,0.04)',
        marginBottom: scaleSize(12),
    },
    end_workout_option_finish: {
        backgroundColor: 'rgba(100, 193, 159, 0.21)',
    },
    end_workout_option_cancel: {
        backgroundColor: 'rgba(193, 90, 98, 0.18)',
    },
    end_workout_option_last: {
        marginBottom: 0,
    },
    end_workout_option_pressed: {
        opacity: 0.85,
    },
    end_workout_option_text: {
        fontSize: scaleSize(13),
        fontFamily: "Outfit_700Bold",
        color: theme.textPrimary,
        textAlign: "center",
        letterSpacing: 0.2,
    },
    end_workout_option_text_finish: {
        color: '#52cba3e5',
    },
    end_workout_option_text_cancel: {
        color: 'rgba(255,137,147,0.92)',
    },
    cheerOverlayContainer: {
        position: 'absolute',
        top: scaleSize(18),
        right: scaleSize(20),
        width: scaleSize(48),
        height: scaleSize(48),
        borderRadius: scaleSize(24),
        backgroundColor: 'rgba(15, 20, 35, 0.82)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    cheerOverlayAvatar: {
        width: '100%',
        height: '100%',
    },
    cheerOverlayFallback: {
        flex: 1,
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    cheerOverlayFallbackText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(16),
        color: '#FFFFFF',
    },

});

export default styles;
