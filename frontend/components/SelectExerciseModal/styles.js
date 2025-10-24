import { StyleSheet } from 'react-native';
import scaleSize from '../../helper/scaleSize';
import theme from '../../theme/mfpDark';

const OVERLAY_BG = 'rgba(4, 6, 12, 0.72)';
const MODAL_BG = theme.bg;
const LIGHT_SURFACE = theme.surface;
const LIGHT_FIELD = theme.field;
const FIELD_BORDER = 'rgba(90, 176, 255, 0.25)';
const ICON_COLOR = '#D5E0F6';
const TEXT_PRIMARY = '#F6F8FF';
const TEXT_SECONDARY = '#9CA9C2';
const ACCENT = theme.primary;
const ACCENT_SOFT = 'rgba(87, 185, 255, 0.18)';
const DROPDOWN_BACKDROP_BG = 'rgba(14, 20, 32, 0.72)';

const scaledSize = (size) => scaleSize(size);

const selectExerciseModalStyles = StyleSheet.create({
    modal_outside: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: OVERLAY_BG,
        zIndex: 0,
    },
    outside_pressable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    main_ctnr: {
        flex: 1,
        backgroundColor: MODAL_BG,
        borderTopLeftRadius: scaledSize(28),
        borderTopRightRadius: scaledSize(28),
        overflow: 'hidden',
        zIndex: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaledSize(18),
        paddingTop: scaledSize(8),
        paddingBottom: scaledSize(12),
    },
    closeButton: {
        width: scaledSize(34),
        height: scaledSize(34),
        borderRadius: scaledSize(17),
        backgroundColor: LIGHT_FIELD,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FIELD_BORDER,
    },
    headerTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(15.5),
        color: TEXT_PRIMARY,
        flex: 1,
        textAlign: 'center',
        letterSpacing: 0.2,
    },
    headerSpacer: {
        width: scaledSize(34),
        height: scaledSize(34),
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: LIGHT_SURFACE,
        borderRadius: scaledSize(8),
        marginHorizontal: scaledSize(20),
        paddingHorizontal: scaledSize(8),
        marginBottom: scaledSize(10),
        alignSelf: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FIELD_BORDER,
    },
    searchIcon: {
        marginRight: scaledSize(8),
    },
    searchInput: {
        flex: 1,
        padding: scaledSize(8),
        fontSize: scaleSize(12.5),
        color: TEXT_PRIMARY,
        fontFamily: 'Outfit_600SemiBold',
    },
    filterRow: {
        flexDirection: 'row',
        gap: scaledSize(8),
        paddingHorizontal: scaledSize(20),
        marginBottom: scaledSize(6),
        zIndex: 2,
    },
    dropdownWrap: {
        flex: 1,
        position: 'relative',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: scaledSize(6),
        paddingHorizontal: scaledSize(12),
        borderRadius: scaledSize(10),
        backgroundColor: LIGHT_FIELD,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FIELD_BORDER,
    },
    filterButtonText: {
        fontSize: scaleSize(12.5),
        color: TEXT_PRIMARY,
        fontFamily: 'Outfit_700Bold',
        flexShrink: 1,
        marginRight: scaledSize(6),
    },
    dropdownMenu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: LIGHT_SURFACE,
        borderRadius: scaledSize(10),
        marginTop: scaledSize(6),
        paddingVertical: scaledSize(4),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaledSize(4) },
        shadowOpacity: 0.08,
        shadowRadius: scaledSize(10),
        elevation: 6,
        zIndex: 3,
        maxHeight: scaledSize(220),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FIELD_BORDER,
        overflow: 'hidden'
    },
    dropdownItem: {
        paddingVertical: scaledSize(8),
        paddingHorizontal: scaledSize(10),
    },
    dropdownItemActive: {
        backgroundColor: ACCENT_SOFT,
    },
    dropdownItemText: {
        fontSize: scaleSize(12.5),
        color: TEXT_PRIMARY,
        fontFamily: 'Outfit_700Bold',
    },
    dropdownItemTextActive: {
        color: ACCENT,
    },
    dropdownBackdrop: {
        position: 'absolute',
        top: scaledSize(140),
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: DROPDOWN_BACKDROP_BG,
        zIndex: 1,
    },
});

export {
    selectExerciseModalStyles,
    ICON_COLOR,
    TEXT_SECONDARY,
    TEXT_PRIMARY,
};

export default selectExerciseModalStyles;
