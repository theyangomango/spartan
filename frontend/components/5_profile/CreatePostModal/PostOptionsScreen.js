import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView, TextInput } from "react-native"
import { AntDesign } from '@expo/vector-icons'
import { useState } from "react";
import { Location, Weight } from 'iconsax-react-native'
import { Feather } from '@expo/vector-icons'
import createPost from '../../../../backend/posts/createPost'

export default function PostOptionsScreen({ navigation, route }) {
    const { userData, images } = route.params;

    const [caption, setCaption] = useState('');

    function goBack() {
        navigation.goBack();
    }

    function sharePost() {
        console.log('Uploading Post...');
        createPost(userData.uid, caption, images);
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.header}>
                <View style={styles.back_icon_ctnr}>
                    <TouchableOpacity onPress={goBack}>
                        <AntDesign name='left' size={20} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.header_text}>New Post</Text>
                <TouchableOpacity onPress={sharePost}>
                    <Text style={styles.share_text}>Share</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.body_scrollview}>
                <View style={styles.post_preview_ctnr}>
                    <Image
                        source={{ uri: images[0] }}
                        style={styles.post_preview_image}
                    />
                    <View style={styles.caption_input_ctnr}>
                        <TextInput
                            placeholder="Write a caption..."
                            value={caption}
                            onChangeText={setCaption}
                            style={styles.caption_text}
                            multiline={true}
                        />
                    </View>
                </View>

                <TouchableOpacity>
                    <View style={[styles.btn_ctnr, styles.top_btn_ctnr]}>
                        <View style={styles.btn_left}>
                            <View style={[styles.btn_icon_ctnr, styles.workout_icon_ctnr]}>
                                <Weight size={25} color="#0699FF" />
                            </View>
                            <Text style={styles.btn_text}>Add Workout</Text>
                        </View>
                        <View style={styles.right_icon_ctnr}>
                            <AntDesign name='right' size={16} />
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity>
                    <View style={styles.btn_ctnr}>
                        <View style={styles.btn_left}>
                            <View style={[styles.btn_icon_ctnr, styles.user_icon_ctnr]}>
                                <Feather name="user" size={22} color={'#0699FF'} />
                            </View>
                            <Text style={styles.btn_text}>Tag People</Text>
                        </View>
                        <View style={styles.right_icon_ctnr}>
                            <AntDesign name='right' size={16} />
                        </View>
                    </View>
                </TouchableOpacity>


                <TouchableOpacity>
                    <View style={styles.btn_ctnr}>
                        <View style={styles.btn_left}>
                            <View style={[styles.btn_icon_ctnr, styles.location_icon_ctnr]}>
                                <Location size="22" color={'#0699FF'} />
                            </View>
                            <Text style={styles.btn_text}>Add Location</Text>
                        </View>
                        <View style={styles.right_icon_ctnr}>
                            <AntDesign name='right' size={16} />
                        </View>
                    </View>
                </TouchableOpacity>

            </ScrollView>

        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    header: {
        height: 85,
        alignItems: 'center',
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    back_icon_ctnr: {
        paddingBottom: 10,
        paddingLeft: 15,
        paddingRight: 22
    },
    header_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 16,
        padding: 8
    },
    share_text: {
        fontFamily: 'Mulish_500Medium',
        paddingRight: 15,
        paddingBottom: 8,
        fontSize: 15,
        color: '#0699FF'
    },
    body_scrollview: {
        paddingTop: 20,
    },
    post_preview_ctnr: {
        height: 100,
        flexDirection: 'row',
        paddingHorizontal: 15
    },
    post_preview_image: {
        width: 80,
        aspectRatio: 1,
        borderRadius: 15
    },
    caption_input_ctnr: {
        flex: 1,
        paddingTop: 10,
        marginLeft: 15,
    },
    caption_text: {
        fontSize: 15,
        fontFamily: 'Mulish_500Medium',
    },
    // ─── Btns ────────────────────────────────────────────────────────────
    btn_ctnr: {
        paddingVertical: 1.5,
        borderBottomWidth: 0.25,
        borderColor: '#ccc',
        flexDirection: 'row',
        paddingHorizontal: 13,
        justifyContent: 'space-between'
    },
    top_btn_ctnr: {
        borderTopWidth: 0.25,
        borderColor: '#ccc',
    },
    btn_left: {
        flexDirection: 'row'
    },
    btn_text: {
        fontFamily: 'SourceSansPro_400Regular',
        fontSize: 16,
        paddingVertical: 7
    },
    btn_icon_ctnr: {
        justifyContent: 'center',
        alignContent: 'center',
    },
    workout_icon_ctnr: {
        marginRight: 9
    },
    user_icon_ctnr: {
        marginRight: 11
    },
    location_icon_ctnr: {
        marginRight: 12
    },
    right_icon_ctnr: {
        padding: 8
    }
});