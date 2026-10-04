// Styles of the post composer screen (PostUploadOptionsScreen).
import { StyleSheet } from 'react-native';
import theme from '../../../theme/mfpDark';
import { scaleWidth375 } from '../../../helper/scaleSize';
import { composeHorizontalPadding, avatarSize, headerBottomPadding } from './composerLayout';

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: theme.surface
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: scaleWidth375(18),
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: theme.bg,
        paddingBottom: headerBottomPadding,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.hairline,
        position: 'relative'
    },
    cancel_btn: {
        paddingVertical: scaleWidth375(6),
        paddingHorizontal: scaleWidth375(8)
    },
    header_title_ctnr: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    header_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleWidth375(16),
        textAlign: 'center',
        color: theme.textPrimary
    },
    share_btn: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    share_btn_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleWidth375(14.5),
        color: theme.primary
    },
    share_btn_text_disabled: {
        color: theme.textSecondary
    },
    body_scrollview: {
        flex: 1,
        backgroundColor: theme.surface
    },
    body_content: {
        paddingHorizontal: composeHorizontalPadding,
        paddingTop: scaleWidth375(18),
        paddingBottom: scaleWidth375(40)
    },
    compose_row: {
        flexDirection: 'row'
    },
    avatar_ctnr: {
        width: avatarSize
    },
    avatar: {
        width: avatarSize,
        height: avatarSize,
        borderRadius: avatarSize / 2,
        backgroundColor: theme.surface
    },
    avatar_placeholder: {
        width: avatarSize,
        height: avatarSize,
        borderRadius: avatarSize / 2,
        backgroundColor: theme.hairline,
        alignItems: 'center',
        justifyContent: 'center'
    },
    caption_ctnr: {
        flex: 1,
        marginLeft: scaleWidth375(12),
        position: 'relative'
    },
    caption_text: {
        fontSize: scaleWidth375(17),
        fontFamily: 'Outfit_500Medium',
        color: theme.textPrimary,
        minHeight: avatarSize,
        paddingVertical: 0,
        paddingHorizontal: 0
    },
    caption_measure: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        opacity: 0,
        zIndex: -1,
        minHeight: 0
    },
    caption_limit_text: {
        marginTop: scaleWidth375(6),
        fontSize: scaleWidth375(12),
        fontFamily: 'Outfit_400Regular',
        color: theme.textSecondary
    },
    media_carousel_wrapper: {
        marginTop: scaleWidth375(18),
        marginHorizontal: -composeHorizontalPadding,
        alignItems: 'center'
    },
    media_container: {
        width: '100%',
        backgroundColor: theme.field,
        overflow: 'hidden'
    },
    media_list: {
        width: '100%',
        height: '100%'
    },
    media_slide: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    media_image: {
        width: '100%',
        height: '100%',
        borderRadius: 0
    },
    video_controls_overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: scaleWidth375(12),
    },
    video_mute_button: {
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: scaleWidth375(20),
        padding: scaleWidth375(8),
    },
    video_play_icon_wrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    video_slider_overlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: scaleWidth375(12),
        paddingBottom: scaleWidth375(10),
        paddingTop: scaleWidth375(6),
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    video_slider: {
        height: scaleWidth375(30),
    },
    video_time_row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: scaleWidth375(6),
    },
    video_time_text: {
        fontSize: scaleWidth375(11),
        color: '#fff',
        fontFamily: 'Outfit_600SemiBold',
    },
    media_indicator_row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: scaleWidth375(8)
    },
    media_manage_btn: {
        marginTop: scaleWidth375(16),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    media_manage_text: {
        marginLeft: scaleWidth375(8),
        color: theme.primary,
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleWidth375(14)
    },
    add_media_stack: {
        marginTop: scaleWidth375(18)
    },
    add_media_cta: {
        marginTop: 0,
        marginHorizontal: -composeHorizontalPadding,
        paddingVertical: scaleWidth375(32),
        paddingHorizontal: composeHorizontalPadding,
        borderRadius: scaleWidth375(16),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        backgroundColor: theme.surface,
        alignItems: 'center'
    },
    add_media_title: {
        marginTop: scaleWidth375(12),
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleWidth375(16),
        color: theme.textPrimary
    },
    add_media_subtitle: {
        marginTop: scaleWidth375(6),
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleWidth375(13),
        color: theme.textSecondary
    },
    clip_badge: {
        marginTop: scaleWidth375(12),
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: scaleWidth375(18),
        paddingVertical: scaleWidth375(6),
        borderRadius: scaleWidth375(20),
    },
    clip_badge_text: {
        color: theme.textPrimary,
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleWidth375(13),
        letterSpacing: 0.5,
    },
    media_dot: {
        width: scaleWidth375(6),
        height: scaleWidth375(4.5),
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.22)',
        marginHorizontal: scaleWidth375(3)
    },
    media_dash: {
        width: scaleWidth375(22),
        height: scaleWidth375(4.5),
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.6)',
        marginHorizontal: scaleWidth375(3)
    },
    edit_workout_container: {
        marginTop: scaleWidth375(24),
        paddingHorizontal: 0,
    },
    edit_workout_label: {
        color: theme.textSecondary,
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleWidth375(12),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: scaleWidth375(6),
    },
    edit_workout_name: {
        color: theme.primary,
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleWidth375(16),
    }
});

export default styles;
