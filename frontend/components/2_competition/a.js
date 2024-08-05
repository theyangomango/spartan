import { StyleSheet, View, Text, Image } from "react-native";
import StatsRow from "./StatsRow";

export default function Podium({ data }) {
    console.log(data);

    return (
        <View style={styles.leaderboard_ctnr}>


            <View style={styles.left}>
                <View style={styles.left_pfp}>
                    {data && <Image source={{ uri: data[1].pfp }} style={styles.pfp} />}
                </View>
                <Text style={styles.leaderboard_handle_text}>{data && data[1].handle}</Text>
                {/* <View style={[styles.bar_ctnr, styles.silver_ctnr]}>
                    <Text style={styles.bar_text}>2</Text>
                </View> */}
            </View>
            <View style={styles.center}>
                <View style={styles.center_pfp}>
                    {data && <Image source={{ uri: data[0].pfp }} style={styles.pfp} />}
                </View>
                <Text style={styles.leaderboard_handle_text}>{data && data[0].handle}</Text>
                {/* <View style={[styles.bar_ctnr, styles.gold_ctnr]}>
                    <Text style={styles.bar_text}>1</Text>
                </View> */}
            </View>
            <View style={styles.right}>
                <View style={styles.right_pfp}>
                    {data && <Image source={{ uri: data[2].pfp }} style={styles.pfp} />}
                </View>
                <Text style={styles.leaderboard_handle_text}>{data && data[2].handle}</Text>
                {/* <View style={[styles.bar_ctnr, styles.bronze_ctnr]}>
                    <Text style={styles.bar_text}>3</Text>
                </View> */}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    leaderboard_ctnr: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: 300,
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'flex-end',
        // backgroundColor: '#59AAEE',
        zIndex: -1
    },
    bar_ctnr: {
        width: 80,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        marginHorizontal: 12,
        alignItems: 'center'
    },
    left: {
        alignItems: 'center'
    },
    center: {
        alignItems: 'center'
    },
    right: {
        alignItems: 'center'

    },
    silver_ctnr: {
        height: 105,
        backgroundColor: '#C0C0C0'
    },
    gold_ctnr: {
        height: 133,
        backgroundColor: '#FFD700'
    },
    bronze_ctnr: {
        height: 83,
        backgroundColor: '#ff7e33'
    },
    left_pfp: {
        width: 90,
        aspectRatio: 1,
        borderRadius: 100
    },
    center_pfp: {
        width: 112,
        aspectRatio: 1,
        borderRadius: 100,
        marginHorizontal: 20
    },
    right_pfp: {
        width: 90,
        aspectRatio: 1,
        borderRadius: 100
    },
    pfp: {
        flex: 1,
        borderRadius: 100,
    },
    leaderboard_handle_text: {
        fontFamily: 'Mulish_700Bold',
        // color: '#fff',
        paddingTop: 3.5,
        paddingBottom: 10,
        fontSize: 14
    },
    bar_text: {
        fontFamily: 'Outfit_800ExtraBold',
        paddingTop: 6,
        fontSize: 31,
        color: '#fff'
    },
});