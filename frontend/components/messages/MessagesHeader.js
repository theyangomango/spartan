import React, { useState } from "react";
import { StyleSheet, View, Pressable, Text, TouchableOpacity } from "react-native";
import { ArrowLeft2 } from 'iconsax-react-native';
import { Feather, FontAwesome6 } from '@expo/vector-icons';

export default function MessagesHeader({ toFeedScreen, handle, setScope }) {
    const [selectedButton, setSelectedButton] = useState('All');

    const handleButtonPress = (button) => {
        setSelectedButton(button);
        setScope(button);
    };

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.row}>
                <View style={styles.arrow_icon_ctnr}>
                    <TouchableOpacity activeOpacity={0.5} onPress={toFeedScreen}>

                        <FontAwesome6 name='chevron-left' size={18.5} color="#2D9EFF"/>

                    </TouchableOpacity>
                </View>

                <View style={styles.overlay}>
                    <Pressable
                        style={[
                            styles.button_ctnr,
                            styles.left_button_ctnr,
                            { backgroundColor: selectedButton === 'All' ? '#2D9EFF' : '#eee' }
                        ]}
                        onPress={() => handleButtonPress('All')}
                    >
                        <Text style={[styles.button_text, { color: selectedButton == 'All' ? '#fff' : '#888' }]}>All</Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.button_ctnr,
                            styles.right_button_ctnr,
                            { backgroundColor: selectedButton === 'Group' ? '#2D9EFF' : '#eee' }
                        ]}
                        onPress={() => handleButtonPress('Group')}
                    >
                        <Text style={[styles.button_text, { color: selectedButton == 'Group' ? '#fff' : '#888' }]}>Group</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        backgroundColor: '#fff',
        paddingTop: 60,
    },
    arrow_icon_ctnr: {
        position: 'absolute',
        zIndex: 1,
        left: 32,
        height: 55,
        // alignItems: 'center'
        justifyContent: 'center'
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
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 5,
        // width: 'auto',
        width: '100%',
        // backgroundColor: 'red',
        paddingHorizontal: 30,
        paddingBottom: 5
    },
    overlay: {
        flexDirection: 'row',
        backgroundColor: '#eee',
        borderRadius: 40,
        // backgroundColor: 'blue'
    },
    button_ctnr: {
        width: 113,
        height: 39,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 4
    },
    left_button_ctnr: {
        marginLeft: 4,
    },
    right_button_ctnr: {
        marginRight: 4,
    },
    button_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 12.5,
    }
});
