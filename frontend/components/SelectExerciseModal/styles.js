import { StyleSheet } from 'react-native';
import scaleSize from '../../helper/scaleSize';
import theme from '../../theme/mfpDark';

const OVERLAY_BG = 'rgba(8, 12, 24, 0.42)';
const MODAL_BG = '#29313eff';
const LIGHT_SURFACE = '#1F2A42';
const LIGHT_FIELD = '#515760ff';
const FIELD_BORDER = 'rgba(120, 198, 255, 0.24)';
const ICON_COLOR = '#D2DCF0';
const TEXT_PRIMARY = '#F6F8FF';
const TEXT_SECONDARY = '#8FA3C2';
const ACCENT = theme.primary;
const ACCENT_SOFT = 'rgba(102, 202, 255, 0.24)';

const scaledSize = (size) => scaleSize(size);

const selectExerciseModalStyles = StyleSheet.create({
    modal_outside: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: OVERLAY_BG,
    },
    outside_pressable: {
        flex: 1,
        width: '100%',
    },
    main_ctnr: {
        width: '94%',
        height: '80%',

        backgroundColor: MODAL_BG,
        borderRadius: scaleSize(scaledSize(30)),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleSize(scaledSize(6)) },
        shadowOpacity: 0.06,
        shadowRadius: scaleSize(scaledSize(12)),
        paddingTop: scaleSize(scaledSize(10)),
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: scaleSize(scaledSize(15)),
        paddingTop: scaleSize(scaledSize(10)),
        paddingBottom: scaleSize(scaledSize(10)),
    },
    newButton: {
        backgroundColor: ACCENT_SOFT,
        paddingHorizontal: scaleSize(scaledSize(20)),
        paddingVertical: scaleSize(scaledSize(4.5)),
        borderRadius: scaleSize(scaledSize(8)),
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.5,
    },
    newButtonText: {
        color: ACCENT,
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: LIGHT_FIELD,
        borderRadius: scaleSize(scaledSize(8)),
        marginHorizontal: scaleSize(scaledSize(15)),
        paddingHorizontal: scaleSize(scaledSize(8)),
        marginBottom: scaleSize(scaledSize(10)),
        alignSelf: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FIELD_BORDER,
    },
    searchIcon: {
        marginRight: scaleSize(scaledSize(8)),
    },
    searchInput: {
        flex: 1,
        padding: scaleSize(scaledSize(8)),
        fontSize: scaleSize(14),
        color: TEXT_PRIMARY,
        fontFamily: 'Outfit_700Bold',
    },
    filterRow: {
        flexDirection: 'row',
        gap: scaleSize(scaledSize(8)),
        paddingHorizontal: scaleSize(scaledSize(16)),
        marginBottom: scaleSize(scaledSize(6)),
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
        paddingVertical: scaleSize(scaledSize(6)),
        paddingHorizontal: scaleSize(scaledSize(12)),
        borderRadius: scaleSize(scaledSize(10)),
        backgroundColor: LIGHT_FIELD,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FIELD_BORDER,
    },
    filterButtonText: {
        fontSize: scaleSize(13),
        color: TEXT_PRIMARY,
        fontFamily: 'Outfit_700Bold',
        flexShrink: 1,
        marginRight: scaleSize(scaledSize(6)),
    },
    dropdownMenu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: LIGHT_SURFACE,
        borderRadius: scaleSize(scaledSize(10)),
        marginTop: scaleSize(scaledSize(6)),
        paddingVertical: scaleSize(scaledSize(4)),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleSize(scaledSize(4)) },
        shadowOpacity: 0.08,
        shadowRadius: scaleSize(scaledSize(10)),
        elevation: 6,
        zIndex: 3,
        maxHeight: scaleSize(scaledSize(220)),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FIELD_BORDER,
    },
    dropdownItem: {
        paddingVertical: scaleSize(scaledSize(8)),
        paddingHorizontal: scaleSize(scaledSize(10)),
    },
    dropdownItemActive: {
        backgroundColor: ACCENT_SOFT,
    },
    dropdownItemText: {
        fontSize: scaleSize(13),
        color: TEXT_PRIMARY,
        fontFamily: 'Outfit_700Bold',
    },
    dropdownItemTextActive: {
        color: ACCENT,
    },
    dropdownBackdrop: {
        position: 'absolute',
        top: scaleSize(scaledSize(140)),
        left: 0,
        right: 0,
        bottom: 0,
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
