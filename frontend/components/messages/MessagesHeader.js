import React, { useState } from "react";
import { StyleSheet, View, Pressable, Text, TouchableOpacity } from "react-native";
import { ArrowLeft2 } from 'iconsax-react-native';

export default function MessagesHeader({ toFeedScreen, handle }) {
    const [selectedButton, setSelectedButton] = useState('All');

    const handleButtonPress = (button) => {
        setSelectedButton(button);
    };

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.top_row}>
                <TouchableOpacity activeOpacity={0.5} onPress={toFeedScreen}>
                    <View style={styles.arrow_icon_ctnr}>
                        <ArrowLeft2 size="20" color="#2D9EFF" />
                        {/* <ArrowLeft2 size="24" color="#fff" /> */}
                    </View>
                </TouchableOpacity>
                <View style={styles.title_ctnr}>
                    <Text style={styles.title}>Messages</Text>
                </View>
                <View style={[styles.arrow_icon_ctnr, styles.hidden]}>
                    {/* <ArrowLeft2 size="24" color="#2D9EFF" />  */}
                    <ArrowLeft2 size="20" color="#fff" />
                </View>
            </View>

            <View style={styles.bottom_row}>
                <View style={styles.overlay}>
                    <Pressable
                        style={[
                            styles.button_ctnr,
                            { backgroundColor: selectedButton === 'All' ? '#fff' : '#eee' }
                        ]}
                        onPress={() => handleButtonPress('All')}
                    >
                        <Text style={styles.button_text}>All</Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.button_ctnr,
                            { backgroundColor: selectedButton === 'Direct' ? '#fff' : '#eee' }
                        ]}
                        onPress={() => handleButtonPress('Direct')}
                    >
                        <Text style={styles.button_text}>Direct</Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.button_ctnr,
                            { backgroundColor: selectedButton === 'Group' ? '#fff' : '#eee' }
                        ]}
                        onPress={() => handleButtonPress('Group')}
                    >
                        <Text style={styles.button_text}>Group</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingBottom: 2,
    },
    top_row: {
        width: '100%',
        height: 103,
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    arrow_icon_ctnr: {
        paddingVertical: 10
    },
    title_ctnr: {
        padding: 10,
        flex: 1,
        alignItems: 'center',
    },
    title: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 18,
        color: '#2D9EFF'
    },
    bottom_row: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 5
    },
    overlay: {
        flexDirection: 'row',
        backgroundColor: '#eee',
        borderRadius: 40
    },
    button_ctnr: {
        width: 115,
        height: 20,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 2.5
    },
    button_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 12,
    }
});
