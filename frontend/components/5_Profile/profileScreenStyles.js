// Container styles shared by the own-profile and view-profile screens.
import { StyleSheet } from "react-native";

import scaleSize from "../../helper/scaleSize";
import theme from "../../theme/mfpDark";

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        // Match Feed background for cohesion
        backgroundColor: theme.bg,
    },
    scrollContent: {
        paddingBottom: scaleSize(120),
    },
    body_ctnr: {
        paddingHorizontal: scaleSize(14),
        paddingBottom: scaleSize(4),
    },
    cards_ctnr: {
        paddingHorizontal: 0,
        marginHorizontal: 0,
        paddingTop: scaleSize(12),
    },
});

export default styles;
