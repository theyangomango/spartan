import { StyleSheet, View, Text, Image } from "react-native";

export default function Podium({ data }) {
    console.log(data);

    return (
        <View style={styles.leaderboard_ctnr}>
            <View style={styles.left}>
                <View style={styles.left_pfp}>
                    {data && <Image source={{ uri: data[1].pfp }} style={styles.pfp} />}
                </View>
                <Text style={styles.leaderboard_handle_text}>{data && data[1].handle}</Text>
                <View style={[styles.bar_ctnr, styles.silver_ctnr]}>
                    <Text style={styles.bar_text}>2</Text>
                </View>
            </View>
            <View style={styles.center}>
                <View style={styles.center_pfp}>
                    {data && <Image source={{ uri: data[0].pfp }} style={styles.pfp} />}
                </View>
                <Text style={styles.leaderboard_handle_text}>{data && data[0].handle}</Text>
                <View style={[styles.bar_ctnr, styles.gold_ctnr]}>
                    <Text style={styles.bar_text}>1</Text>
                </View>
            </View>
            <View style={styles.right}>
                <View style={styles.right_pfp}>
                    {data && <Image source={{ uri: data[2].pfp }} style={styles.pfp} />}
                </View>
                <Text style={styles.leaderboard_handle_text}>{data && data[2].handle}</Text>
                <View style={[styles.bar_ctnr, styles.bronze_ctnr]}>
                    <Text style={styles.bar_text}>3</Text>
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
        height: 310,
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    bar_ctnr: {
        width: 75,
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
        height: 80,
        backgroundColor: '#C0C0C0'
    },
    gold_ctnr: {
        height: 110,
        backgroundColor: '#FFD700'
    },
    bronze_ctnr: {
        height: 65,
        backgroundColor: '#ff7e33'
    },
    left_pfp: {
        width: 43,
        height: 43,
        borderRadius: 22
    },
    center_pfp: {
        width: 46,
        height: 46,
        borderRadius: 23
    },
    right_pfp: {
        width: 40,
        height: 40,
        borderRadius: 20
    },
    pfp: {
        flex: 1,
        borderRadius: 50,
    },
    leaderboard_handle_text: {
        fontFamily: 'Mulish_700Bold',
        color: '#fff',
        paddingTop: 1,
        paddingBottom: 10
    },
    bar_text: {
        fontFamily: 'Outfit_800ExtraBold',
        paddingTop: 6,
        fontSize: 31,
        color: '#fff'
    },
});