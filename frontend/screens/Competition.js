import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import Footer from "../components/Footer";
import { ArrowUp2, ArrowDown2 } from 'iconsax-react-native'
import Podium from "../components/competition/Podium";
import ComparingDropdown from "../components/competition/ComparingDropdown";
import ComparedWithDropdown from "../components/competition/ComparedWithDropdown";

export default function Competition({ navigation, route }) {
    const userData = route.params.userData;

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.body}>
                <View style={styles.top_ctnr}>
                    <View style={styles.header}>
                        <ComparingDropdown />
                    </View>

                    <Podium />
                </View>

                <View style={styles.bottom_ctnr}>
                    <TouchableOpacity>
                        {/* <View style={styles.bottom_ctnr_heading}> */}
                            {/* <Text style={styles.bottom_ctnr_heading_text}>All Followers</Text>
                            <Text> </Text>
                            <ArrowDown2 size={18} color="#000" /> */}
                            <ComparedWithDropdown />

                        {/* </View> */}
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
                                <ArrowUp2 size={20} color="#50C878" style={styles.arrow_icon} />
                            </View>
                        </View>

                        <View style={styles.card_ctnr}>
                            <View style={styles.card_left}>
                                <View style={styles.pfp_ctnr}>

                                </View>
                                <Text style={styles.handle_text}>yangbai</Text>
                            </View>
                            <View style={styles.card_right}>
                                <Text style={styles.stat_text}>30lbs</Text>
                                <Text style={styles.rank_text}>2nd</Text>
                                <ArrowDown2 size={20} color="red" style={styles.arrow_icon} />
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
    top_ctnr: {
        backgroundColor: '#2D9EFF',
        justifyContent: 'space-between',
        height: '38%'
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
        paddingLeft: 14,
    },
    arrow_icon: {
        marginLeft: 3.5
    },
    bottom_ctnr_heading_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 16
    }
});