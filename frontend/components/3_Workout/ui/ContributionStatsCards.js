import React, { Fragment, memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import theme from "../../../theme/mfpDark";
import scaleSize from "../../../helper/scaleSize";

const ContributionStatsCards = ({ stats, style }) => {
    if (!Array.isArray(stats) || stats.length === 0) return null;

    return (
        <View style={[styles.container, style]}>
            {stats.map((stat, index) => {
                const key = stat?.key || index;
                const label = String(stat?.label || "").toUpperCase();
                const value = stat?.value ?? "--";
                const showDivider = index < stats.length - 1;

                return (
                    <Fragment key={key}>
                        <View style={styles.cell}>
                            <View style={styles.content}>
                                <Text style={styles.value} numberOfLines={1}>{value}</Text>
                                <Text style={styles.label} numberOfLines={1}>{label}</Text>
                            </View>
                        </View>
                        {showDivider ? <View style={styles.divider} /> : null}
                    </Fragment>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 0,
    },
    cell: {
        flexBasis: 0,
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(3),
    },
    content: {
        alignItems: "center",
        justifyContent: "center",
    },
    value: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
        color: theme.textPrimary,
    },
    label: {
        marginTop: scaleSize(1),
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(11),
        color: theme.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.3,
        textAlign: "center",
    },
    divider: {
        height: scaleSize(18),
        width: 1.3,
        backgroundColor: "rgba(255,255,255,0.22)",
        marginHorizontal: scaleSize(10) / 2,
    },
});

export default memo(ContributionStatsCards);
