import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import Footer from "../components/Footer";
import { ArrowDown2 } from 'iconsax-react-native'

export default function Competition({ navigation, route }) {
    const userData = route.params.userData;

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.circle_ctnr}></View>
            <View style={styles.body}>
                <View style={styles.top_ctnr}>
                    <TouchableOpacity style={styles.header}>
                        <Text style={styles.header_text}>Bench Press Max</Text>
                        <Text> </Text>
                        <ArrowDown2 size={20} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.leaderboard_ctnr}>
                        <View style={styles.left}>
                            <View style={styles.left_pfp}></View>
                            <Text style={styles.leaderboard_handle_text}>samsuluk</Text>
                            <View style={[styles.bar_ctnr, styles.silver_ctnr]}>
                                <Text style={styles.bar_text}>2</Text>
                            </View>
                        </View>
                        <View style={styles.center}>
                            <View style={styles.center_pfp}></View>
                            <Text style={styles.leaderboard_handle_text}>samsuluk</Text>
                            <View style={[styles.bar_ctnr, styles.gold_ctnr]}>
                                <Text style={styles.bar_text}>1</Text>
                            </View>
                        </View>
                        <View style={styles.right}>
                            <View style={styles.right_pfp}></View>
                            <Text style={styles.leaderboard_handle_text}>samsuluk</Text>
                            <View style={[styles.bar_ctnr, styles.bronze_ctnr]}>
                                <Text style={styles.bar_text}>3</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.bottom_ctnr}>
                    <TouchableOpacity>
                        <View style={styles.bottom_ctnr_heading}>
                            <Text style={styles.bottom_ctnr_heading_text}>All Followers</Text>
                            <Text> </Text>
                            <ArrowDown2 size={18} color="#000" />
                        </View>
                    </TouchableOpacity>

                    <ScrollView style={styles.scrollview_ctnr}>
                        <View style={styles.card_ctnr}>
                            <View style={styles.card_left}>
                                <View style={styles.pfp_ctnr}>

                                </View>
                                <Text style={styles.handle_text}>yangbai</Text>
                            </View>
                            <View style={styles.card_right}>
                                <Text style={styles.stat_text}>225lbs</Text>
                                <Text style={styles.rank_text}>1st</Text>
                            </View>
                        </View>

                        <View style={styles.card_ctnr}>
                            <View style={styles.card_left}>
                                <View style={styles.pfp_ctnr}>

                                </View>
                                <Text style={styles.handle_text}>yangbai</Text>
                            </View>
                            <View style={styles.card_right}>
                                <Text style={styles.stat_text}>155lbs</Text>
                                <Text style={styles.rank_text}>1st</Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>

            </View>
            <Footer navigation={navigation} currentScreenName={'Competition'} userData={userData} />
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    body: {
        flex: 1
    },
    circle_ctnr: {
        // width: '300%',
        // aspectRatio: 1,
        // backgroundColor: '#2D9EFF',
        // position: 'absolute',
        // top: '-100%',
        // left: '-100%',
        // borderRadius: 10000
    },
    top_ctnr: {
        backgroundColor: '#2D9EFF',
        justifyContent: 'space-between'
    },
    header: {
        paddingTop: 50,
        flexDirection: 'row',
    },
    header_text: {
        fontSize: 16,
        color: '#fff',
        fontFamily: 'Inter_600SemiBold',
        paddingLeft: 24,
        paddingBottom: 30,
    },
    leaderboard_ctnr: {
        width: '100%',
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
        backgroundColor: 'red',
        borderRadius: 22
    },
    center_pfp: {
        width: 46,
        height: 46,
        backgroundColor: 'red',
        borderRadius: 23
    },
    right_pfp: {
        width: 40,
        height: 40,
        backgroundColor: 'red',
        borderRadius: 20
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
    bottom_ctnr: {
        flex: 1,
        paddingHorizontal: 15
    },
    bottom_ctnr_heading: {
        flexDirection: 'row',
        paddingHorizontal: 5,
        paddingTop: 18,
        paddingBottom: 16
    },
    scrollview_ctnr: {
        flex: 1,
    },
    card_ctnr: {
        height: 65,
        borderRadius: 15,
        borderWidth: 0.8,
        borderColor: '#555',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginBottom: 15,
    },
    card_left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pfp_ctnr: {
        width: 36,
        height: 36,
        backgroundColor: 'red',
        borderRadius: 18
    },
    handle_text: {
        fontFamily: 'Mulish_700Bold',
        paddingHorizontal: 10
    },
    card_right: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stat_text: {
        fontFamily: 'Mulish_700Bold',
        color: '#2D9EFF',
    },
    rank_text: {
        fontFamily: 'Mulish_700Bold',
        paddingLeft: 12,
    },
    bottom_ctnr_heading_text: {
        fontFamily: 'Mulish_700Bold',
    }
});