// Styles of FoodSearchOverlay: the search sheet, its result and recent-food rows and the barcode scanner modal.
import { StyleSheet } from 'react-native';

import scaleSize from '../../helper/scaleSize';

const makeStyles = (COLORS) =>
    StyleSheet.create({
        sheetWrapper: {
            ...StyleSheet.absoluteFillObject,
            zIndex: 1600,
            elevation: 40,
        },
        sheet: {
            borderTopLeftRadius: scaleSize(32),
            borderTopRightRadius: scaleSize(32),
            overflow: 'hidden',
        },
        sheetBackground: {
            backgroundColor: COLORS.bg || COLORS.background || '#131521',
            borderTopLeftRadius: scaleSize(32),
            borderTopRightRadius: scaleSize(32),
        },
        sheetHandle: {
            paddingVertical: scaleSize(12),
        },
        sheetHandleIndicator: {
            width: scaleSize(42),
            height: scaleSize(4),
            borderRadius: scaleSize(2),
            backgroundColor: 'rgba(255,255,255,0.7)',
        },
        overlayContainer: {
            flex: 1,
            backgroundColor: COLORS.bg || COLORS.background || '#131521',
            borderTopLeftRadius: scaleSize(32),
            borderTopRightRadius: scaleSize(32),
        },
        overlayHeader: {
            paddingBottom: scaleSize(12),
            paddingHorizontal: scaleSize(16),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: COLORS.bg || COLORS.background || '#131521',
            position: 'relative',          // <-- important for absolute title
        },
        headerLeft: {
            padding: scaleSize(6),
        },
        headerRight: {
            paddingHorizontal: scaleSize(6),
            paddingVertical: scaleSize(4),
        },
        titleCenterWrap: {
            position: 'absolute',
            left: 0,
            right: 0,
            alignItems: 'center',
        },
        overlayTitle: {
            fontSize: scaleSize(17),
            color: COLORS.text || COLORS.textPrimary || '#E5E7EB',
            fontFamily: 'Outfit_600SemiBold',
        },
        headerActionText: {
            fontFamily: 'Outfit_600SemiBold',
            fontSize: scaleSize(14),
            color: '#2D92FF',
        },

        searchContainer: { paddingHorizontal: scaleSize(18), marginBottom: scaleSize(12) },
        searchBox: {
            backgroundColor: COLORS.fieldBg || COLORS.card || '#252733',
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: scaleSize(20),
            paddingHorizontal: scaleSize(14),
            paddingVertical: scaleSize(13),
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowOffset: { width: 0, height: scaleSize(1) },
            shadowRadius: scaleSize(3),
            elevation: 2,
        },
        searchInput: {
            flex: 1,
            fontFamily: 'Outfit_400Regular',
            fontSize: scaleSize(15),
            color: COLORS.text || COLORS.textPrimary || '#E5E7EB',
            paddingVertical: 0,
        },
        emptyText: {
            textAlign: 'center',
            marginTop: scaleSize(12),
            marginBottom: scaleSize(4),
            color: COLORS.subtext || COLORS.textSecondary || '#A1A7B3',
            fontFamily: 'Outfit_400Regular',
            fontSize: scaleSize(13),
        },
        loadingMore: {
            paddingVertical: scaleSize(14),
            alignItems: 'center',
            justifyContent: 'center',
        },
        noMoreText: {
            textAlign: 'center',
            marginTop: scaleSize(6),
            marginBottom: scaleSize(4),
            color: COLORS.subtext || COLORS.textSecondary || '#A1A7B3',
            fontFamily: 'Outfit_400Regular',
            fontSize: scaleSize(12),
        },
        historyHeader: {
            marginTop: scaleSize(8),
            marginBottom: scaleSize(8),
            paddingHorizontal: scaleSize(26),
            fontSize: scaleSize(14),
            color: COLORS.subtext || COLORS.textSecondary || '#A1A7B3',
            fontFamily: 'Outfit_600SemiBold',
        },
        historyDeleteContainer: {
            justifyContent: 'center',
            alignItems: 'flex-end',
            height: '100%',
            width: scaleSize(112),
        },
        historyDeleteBtn: {
            width: '100%',
            height: '100%',
            minHeight: scaleSize(36),
            paddingHorizontal: scaleSize(14),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: scaleSize(6),
            backgroundColor: 'rgba(242,113,113,0.16)',
        },
        historyDeleteText: { color: '#F27171', fontFamily: 'Outfit_700Bold', fontSize: scaleSize(12.5) },

        scannerHeader: {
            position: 'absolute',
            top: scaleSize(54),
            left: scaleSize(16),
            right: scaleSize(16),
            zIndex: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        scannerTitle: {
            color: '#fff',
            fontSize: scaleSize(16),
            fontFamily: 'Outfit_600SemiBold',
        },
        scannerFooter: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: scaleSize(48),
            alignItems: 'center',
        },
        scannerHint: {
            color: 'rgba(255,255,255,0.9)',
            fontSize: scaleSize(14),
            paddingHorizontal: scaleSize(16),
            paddingVertical: scaleSize(8),
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: scaleSize(12),
            overflow: 'hidden'
        }
    });

export default makeStyles;
