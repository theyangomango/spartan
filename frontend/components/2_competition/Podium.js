import { StyleSheet, View, Text, Image, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// Function to determine dynamic styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            pfpSize: {
                left: 70,
                center: 74,
                right: 66,
            },
            barHeight: {
                left: 115,
                center: 143,
                right: 93,
            },
            barWidth: 90,
            fontSize: {
                handleText: 17,
                barText: 35,
            },
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            pfpSize: {
                left: 60,
                center: 64,
                right: 56,
            },
            barHeight: {
                left: 105,
                center: 133,
                right: 83,
            },
            barWidth: 80,
            fontSize: {
                handleText: 15,
                barText: 31,
            },
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            pfpSize: {
                left: 58,
                center: 62,
                right: 54,
            },
            barHeight: {
                left: 100,
                center: 125,
                right: 80,
            },
            barWidth: 75,
            fontSize: {
                handleText: 14.5,
                barText: 30,
            },
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            pfpSize: {
                left: 54,
                center: 58,
                right: 50,
            },
            barHeight: {
                left: 95,
                center: 118,
                right: 75,
            },
            barWidth: 70,
            fontSize: {
                handleText: 14,
                barText: 28,
            },
        };
    }
};

const dynamicStyles = getDynamicStyles();

export default function Podium({ data }) {
    return (
        <View style={styles.leaderboard_ctnr}>
            <View style={styles.left}>
                <View style={[styles.pfp_ctnr, { width: dynamicStyles.pfpSize.left }]}>
                    {data && <Image source={{ uri: data[1].pfp }} style={styles.pfp} />}
                </View>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.leaderboard_handle_text, { fontSize: dynamicStyles.fontSize.handleText }]}>{data && data[1].handle}</Text>
                <View style={[styles.bar_ctnr, styles.silver_ctnr, { height: dynamicStyles.barHeight.left, width: dynamicStyles.barWidth }]}>
                    <Text style={[styles.bar_text, { fontSize: dynamicStyles.fontSize.barText }]}>2</Text>
                </View>
            </View>
            <View style={styles.center}>
                <View style={[styles.pfp_ctnr, { width: dynamicStyles.pfpSize.center }]}>
                    {data && <Image source={{ uri: data[0].pfp }} style={styles.pfp} />}
                </View>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.leaderboard_handle_text, { fontSize: dynamicStyles.fontSize.handleText }]}>{data && data[0].handle}</Text>
                <View style={[styles.bar_ctnr, styles.gold_ctnr, { height: dynamicStyles.barHeight.center, width: dynamicStyles.barWidth }]}>
                    <Text style={[styles.bar_text, { fontSize: dynamicStyles.fontSize.barText }]}>1</Text>
                </View>
            </View>
            <View style={styles.right}>
                <View style={[styles.pfp_ctnr, { width: dynamicStyles.pfpSize.right }]}>
                    {data && <Image source={{ uri: data[2].pfp }} style={styles.pfp} />}
                </View>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.leaderboard_handle_text, { fontSize: dynamicStyles.fontSize.handleText }]}>{data && data[2].handle}</Text>
                <View style={[styles.bar_ctnr, styles.bronze_ctnr, { height: dynamicStyles.barHeight.right, width: dynamicStyles.barWidth }]}>
                    <Text style={[styles.bar_text, { fontSize: dynamicStyles.fontSize.barText }]}>3</Text>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    leaderboard_ctnr: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: '38%',
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#59AAEE',
        zIndex: -1
    },
    bar_ctnr: {
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        marginHorizontal: 13,
        alignItems: 'center'
    },
    left: {
        alignItems: 'center',
        width: '28%'
    },
    center: {
        alignItems: 'center',
        width: '28%'
    },
    right: {
        alignItems: 'center',
        width: '28%'
    },
    silver_ctnr: {
        backgroundColor: '#C0C0C0'
    },
    gold_ctnr: {
        backgroundColor: '#FFD700'
    },
    bronze_ctnr: {
        backgroundColor: '#ff7e33'
    },
    pfp_ctnr: {
        aspectRatio: 1,
        borderRadius: 50
    },
    pfp: {
        flex: 1,
        borderRadius: 50,
    },
    leaderboard_handle_text: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#fff',
        paddingTop: 4,
        paddingBottom: 10,
    },
    bar_text: {
        fontFamily: 'Outfit_800ExtraBold',
        paddingTop: 6,
        color: '#fff'
    },
});
