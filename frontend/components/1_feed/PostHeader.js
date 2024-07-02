import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { SimpleLineIcons } from '@expo/vector-icons';
import followUser from '../../../backend/user/followUser';
import unfollowUser from '../../../backend/user/unfollowUser';

export default function PostHeader({ data, url }) {;
    const [isFollowing, setIsFollowing] = useState(global.userData.following.includes(data.uid));

    const handleFollowPress = () => {
        if (!isFollowing) {
            followUser(global.userData.uid, data.uid);
        } else {
            unfollowUser(global.userData.uid, data.uid);
        }
        setIsFollowing((prev) => !prev);
    };

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.left}>
                <View style={styles.pfp_ctnr}>
                    <Image
                        source={{ uri: url }}
                        style={styles.pfp}
                    />
                </View>
                <View style={styles.text_ctnr}>
                    <View>
                        <Text style={styles.handle_text}>
                            {data.handle}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.date_text}>
                            {data.location}
                        </Text>
                    </View>
                </View>
            </View>
            <View style={styles.right}>
                <Pressable
                    style={[styles.follow_btn, isFollowing && styles.following_btn]}
                    onPress={handleFollowPress}
                >
                    <Text style={isFollowing ? styles.following_btn_text : styles.follow_text}>
                        {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                </Pressable>
                <View style={styles.options_icon_ctnr}>
                    <SimpleLineIcons name='options-vertical' size={14} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        paddingVertical: 5,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    left: {
        flexDirection: 'row'
    },
    pfp_ctnr: {
        width: 42,
        height: 42,
        marginRight: 5,
    },
    pfp: {
        flex: 1,
        borderRadius: 21
    },
    text_ctnr: {
        padding: 4,
    },
    handle_text: {
        fontSize: 12.5,
        paddingBottom: 5,
        fontFamily: 'Lato_700Bold',
    },
    date_text: {
        fontSize: 10.5,
        fontFamily: 'Lato_400Regular'
    },
    right: {
        flexDirection: 'row'
    },
    follow_btn: {
        width: 70,
        height: 33,
        borderRadius: 30,
        marginHorizontal: 10,
        marginVertical: 4,
        backgroundColor: '#0699FF',
        justifyContent: 'center'
    },
    following_btn: {
        width: 75,
        height: 33,
        borderRadius: 30,
        marginHorizontal: 10,
        marginVertical: 4,
        backgroundColor: '#fff',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#0699FF'
    },
    follow_text: {
        textAlign: 'center',
        color: 'white',
        fontSize: 11,
        fontFamily: 'Lato_700Bold',
    },
    following_btn_text: {
        textAlign: 'center',
        color: '#0699FF',
        fontSize: 11,
        fontFamily: 'Lato_700Bold',
    },
    options_icon_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingRight: 3
    },
});