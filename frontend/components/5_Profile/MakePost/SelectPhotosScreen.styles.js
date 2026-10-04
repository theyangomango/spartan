// Styles of the media picker screen (SelectPhotosScreen) and the aspect ratio they share with it.
import { StyleSheet } from 'react-native';
import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';

export const FEED_ASPECT_RATIO = 1; // square crop across selection & preview

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg
    },
    header_ctnr: {
        alignItems: 'center',
        paddingHorizontal: scaleSize(5),
        paddingBottom: scaleSize(15),
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: theme.bg
    },
    close_icon_ctnr: {
        paddingHorizontal: scaleSize(18)
    },
    header_text_ctnr: {
    },
    next_icon_ctnr: {
        paddingHorizontal: scaleSize(23)
    },
    title_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
        color: theme.textPrimary,
    },
    preview_ctnr: {
        width: '100%',
        aspectRatio: FEED_ASPECT_RATIO,
        backgroundColor: theme.surface,
        overflow: 'hidden'
    },
    preview_image: {
        width: '100%',
        aspectRatio: FEED_ASPECT_RATIO
    },
    preview_video_ctnr: {
        flex: 1,
    },
    preview_video_overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    preview_placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaleSize(24),
    },
    preview_placeholder_text: {
        marginTop: scaleSize(10),
        color: theme.textSecondary,
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(13),
        textAlign: 'center',
    },
    crop_btn: {
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(6),
        borderRadius: scaleSize(12),
        backgroundColor: 'rgba(32,133,255,0.85)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    crop_btn_disabled: {
        backgroundColor: 'rgba(110,110,110,0.6)'
    },
    crop_btn_text: {
        color: '#fff',
        marginLeft: scaleSize(8),
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(12),
    },
    clear_btn: {
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(6),
        borderRadius: scaleSize(12),
        backgroundColor: 'rgba(239,68,68,0.9)',
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scaleSize(8),
    },
    clear_btn_text: {
        color: '#fff',
        marginLeft: scaleSize(6),
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12),
    },
    preview_action_row: {
        position: 'absolute',
        right: scaleSize(14),
        top: scaleSize(14),
        flexDirection: 'row',
        alignItems: 'center',
    },
    preview_footer_info: {
        position: 'absolute',
        right: scaleSize(14),
        bottom: scaleSize(14),
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(6),
        borderRadius: scaleSize(12),
        backgroundColor: 'rgba(0,0,0,0.45)'
    },
    preview_footer_text: {
        color: '#fff',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(12),
    }
});

export default styles;
