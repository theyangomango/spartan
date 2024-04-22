import { StyleSheet, View, Text, Modal, TouchableOpacity } from "react-native";
import { Gallery, AddCircle } from 'iconsax-react-native'

export default function CreateModal() {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.header}>
                <Text style={styles.header_text}>Create</Text>
            </View>

            <TouchableOpacity>
                <View style={styles.post_ctnr}>
                    <View style={styles.post_icon_ctnr}>
                        <Gallery size="21" color="#000" variant="Broken" />
                    </View>
                    <Text style={styles.post_text}>Post</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity>
                <View style={styles.story_ctnr}>
                    <View style={styles.story_icon_ctnr}>
                        <AddCircle size="22" color="#000" variant="Broken" />
                    </View>
                    <Text style={styles.story_text}>Story</Text>
                </View>
            </TouchableOpacity>

        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 22,
    },
    header: {
        alignItems: 'center',
    },
    header_text: {
        padding: 12,
        fontFamily: 'Mulish_700Bold',
        fontSize: 16
    },
    post_ctnr: {
        borderBottomWidth: 0.25,
        borderTopWidth: 0.25,
        borderColor: '#ccc',
        flexDirection: 'row'
    },
    post_icon_ctnr: {
        justifyContent: 'center',
        alignContent: 'center',
        marginRight: 8
    },
    story_ctnr: {
        borderBottomWidth: 0.25,
        borderBottomColor: '#ccc',
        flexDirection: 'row'
    },
    post_text: {
        fontFamily: 'SourceSansPro_400Regular',
        fontSize: 16,
        paddingTop: 6,
        paddingBottom: 6
    },
    story_text: {
        fontFamily: 'SourceSansPro_400Regular',
        fontSize: 16,
        paddingTop: 6,
        paddingBottom: 6
    },
    story_icon_ctnr: {
        justifyContent: 'center',
        alignContent: 'center',
        marginRight: 8
    }
});