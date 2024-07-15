import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { SimpleLineIcons } from '@expo/vector-icons';
import followUser from '../../../backend/user/followUser';
import unfollowUser from '../../../backend/user/unfollowUser';
import { BlurView } from 'expo-blur';

export default function PostHeader({ data, url }) {
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        if (global.userData) {
            setIsFollowing(global.userData.following.includes(data.uid));
        }
    }, [global.userData])

    const handleFollowPress = () => {
        if (!isFollowing) {
            followUser(global.userData.uid, data.uid);
        } else {
            unfollowUser(global.userData.uid, data.uid);
        }
        setIsFollowing((prev) => !prev);
    };

    return (
        <View style={styles.outer}>
            <BlurView intensity={1} style={styles.main_ctnr}>
                <View style={styles.left}>
                    <View style={styles.pfp_ctnr}>
                        <Image
                            source={{ uri: url }}
                            style={styles.pfp}
                        />
                    </View>
                    <View style={styles.text_ctnr}>
                        <Text style={styles.handle_text}>
                            {data.handle}
                        </Text>
                        <TouchableOpacity activeOpacity={0.5}>
                            <View>
                                <Text style={styles.workout_text}>
                                    {'Morning Workout 7/5'}
                                </Text>
                            </View>
                        </TouchableOpacity>
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
                    {/* <View style={styles.options_icon_ctnr}>
                    <SimpleLineIcons name='options-vertical' size={14} />
                </View> */}
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    outer: {
        position: 'absolute',
        zIndex: 1,
        top: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        overflow: 'hidden'
    },
    main_ctnr: {
        backgroundColor: 'rgba(37,42,54,0.3)',
        paddingTop: 16,
        paddingLeft: 22,
        paddingRight: 13,
        paddingVertical: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    left: {
        flexDirection: 'row',
    },
    pfp_ctnr: {
        width: 46,
        aspectRatio: 1,
        marginRight: 5,
    },
    pfp: {
        flex: 1,
        borderRadius: 30
    },
    text_ctnr: {
        padding: 4,
        justifyContent: 'center'
    },
    handle_text: {
        fontSize: 14.5,
        paddingBottom: 5,
        fontFamily: 'Lato_700Bold',
        color: '#fff'
    },
    workout_text: {
        fontSize: 12.5,
        fontFamily: 'Lato_400Regular',
        color: '#90D2FF'
    },
    right: {
        flexDirection: 'row'
    },
    follow_btn: {
        width: 83,
        height: 38,
        borderRadius: 30,
        marginHorizontal: 10,
        marginVertical: 4,
        backgroundColor: '#0699FF',
        justifyContent: 'center'
    },
    following_btn: {
        width: 90,
        height: 38,
        borderRadius: 30,
        marginHorizontal: 10,
        marginVertical: 4,
        backgroundColor: '#F7FCFF',
        justifyContent: 'center'
    },
    follow_text: {
        textAlign: 'center',
        color: 'white',
        fontSize: 15.5,
        // fontWeight: '700'
        fontFamily: 'SourceSansPro_600SemiBold',
    },
    following_btn_text: {
        textAlign: 'center',
        color: '#0699FF',
        fontSize: 14.5,
        fontFamily: 'SourceSansPro_600SemiBold',
    },
    options_icon_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingRight: 3
    },
});