import React from 'react';
import { StyleSheet, View, Text } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Calendar, Weight } from 'iconsax-react-native';
import Svg, { Path } from "react-native-svg";

export default function TemplateCard({ lastUsedDate, name }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.text_container}>
                <Text style={styles.title_text}>{name}</Text>
                <View style={styles.info_ctnr}>
                    <View style={styles.date_ctnr}>
                        <Calendar size="18.5" variant="Broken" color={'#666'} />
                        <Text style={styles.date_text}> {lastUsedDate}</Text>
                    </View>
                    <View style={styles.exercises_ctnr}>
                        <Weight size="21.5" color="#666"/>
                        <Text style={styles.exercises_text}> 5 Exercises</Text>
                    </View>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#999" style={styles.chevron_icon} />
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        borderRadius: 15,
        paddingLeft: 27,
        paddingRight: 3,
        marginVertical: 5,
        marginHorizontal: 16,
        backgroundColor: '#f8f8f8',
        height: 85,
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'center'
    },
    text_container: {
        flex: 1,
    },
    title_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        color: '#2D9EFF',
        paddingBottom: 5.5
    },
    info_ctnr: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2
    },
    date_ctnr: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20
    },
    date_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 13,
        color: '#666',
    },
    exercises_ctnr: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exercises_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 13,
        color: '#666',
        marginLeft: 1
    },
    chevron_icon: {
        position: 'absolute',
        right: 20,
        top: '50%',
        transform: [{ translateY: -10 }],
    },
});
