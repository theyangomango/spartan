// Styles of the ProfileWorkoutsAndPosts screen and of its locked-profile view.
import { StyleSheet } from "react-native";

import scaleSize from "../../helper/scaleSize";
import theme from "../../theme/mfpDark";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    contentWrap: {
        flex: 1,
    },
    bodyContent: {
        flex: 1,
        paddingHorizontal: 0,
        paddingTop: scaleSize(4),
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: scaleSize(120),
        paddingHorizontal: 0,
    },
    workoutListContent: {
        paddingBottom: scaleSize(120),
        paddingTop: scaleSize(6),
    },
    headerContainer: {
        backgroundColor: theme.bg,
        paddingBottom: scaleSize(6),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        position: 'relative',
        paddingHorizontal: scaleSize(20),
        paddingBottom: scaleSize(6),
    },
    headerBackButton: {
        position: 'absolute',
        left: scaleSize(20),
        top: '50%',
        transform: [{ translateY: -scaleSize(17) }],
        width: scaleSize(34),
        height: scaleSize(34),
        borderRadius: scaleSize(17),
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentWrap: {
        borderRadius: scaleSize(999),
    },
    segmentBg: {
        flexDirection: 'row',
        backgroundColor: theme.surface,
        borderRadius: scaleSize(999),
        padding: scaleSize(4),
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 1,
    },
    segmentChip: {
        borderRadius: scaleSize(999),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.surface,
        width: scaleSize(105),
        height: scaleSize(34),
        marginHorizontal: scaleSize(2),
    },
    segmentChipActive: {
        backgroundColor: theme.primary,
        shadowColor: theme.primary,
        shadowOpacity: 0.15,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 2,
    },
    segmentChipText: {
        fontSize: scaleSize(12.5),
        fontFamily: 'Outfit_600SemiBold',
        color: theme.textSecondary,
    },
    segmentChipTextActive: {
        color: theme.textPrimary,
    },
    postWrapper: {
    },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: scaleSize(20),
        paddingVertical: scaleSize(16),
    },
    emptyTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14.5),
        color: '#E3E9FF',
        marginBottom: scaleSize(4),
    },
    emptySubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12.5),
        color: '#9CA3AF',
        textAlign: 'center',
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingNote: {
        marginTop: scaleSize(8),
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12),
        color: '#9CA3AF',
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaleSize(24),
    },
    lockedContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaleSize(24),
    },
    lockedIconWrap: {
        width: scaleSize(78),
        height: scaleSize(78),
        borderRadius: scaleSize(39),
        backgroundColor: 'rgba(99, 102, 241, 0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaleSize(14),
    },
    lockedTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(16.5),
        color: '#E5E9FF',
        marginBottom: scaleSize(6),
    },
    lockedSubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(13),
        lineHeight: scaleSize(19),
        color: '#9CA3AF',
        textAlign: 'center',
    },
});

export default styles;
