import React from 'react';
import { StyleSheet, View, Text, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'iconsax-react-native'
import RNBounceable from '@freakycoder/react-native-bounceable';
import { Weight } from 'iconsax-react-native'

export default function TemplateCard({ lastUsedDate, exercises, name }) {
    const muscleColors = {
        Chest: '#FFAFB8',
        Shoulders: '#A1CDEE',
        Biceps: '#CBBCFF',
        Back: '#95E0C8'
    };

    return (
        <View style={styles.main_ctnr}>
            {/* <Image 
                source={require('./../../assets/logo_template.png')} 
                style={styles.image} 
            /> */}
            <View style={styles.text_container}>
                <Text style={styles.title_text}>{name}</Text>
                <View style={styles.info_ctnr}>
                    <View style={styles.date_ctnr}>
                        <Calendar size="17" variant="Broken" color={'#666'} />
                        <Text style={styles.date_text}> {lastUsedDate}</Text>
                    </View>
                    <View style={styles.exercises_ctnr}>
                        {/* <Ionicons name="barbell-outline" size={17} color="#666" /> */}
                        <Weight size="21" color="#666" />
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
        borderRadius: 15,
        height: 85,
        justifyContent: 'center',
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center'
    },
    image: {
        width: 55,
        aspectRatio: 1,
        borderRadius: 15,
        marginRight: 13
    },
    text_container: {
        flex: 1,
    },
    title_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 17,
        color: '#2D9EFF',
        // color: '#333',
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
    calendar_icon: {
        marginRight: 4,
    },
    date_text: {
        fontFamily: 'Outfit_300Light',
        fontSize: 13,
        color: '#666',
    },
    exercises_ctnr: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exercises_text: {
        fontFamily: 'Outfit_300Light',
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
    scroll_ctnr: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingTop: 12,
        paddingBottom: 10
    },
    entry_ctnr: {
        flexDirection: 'row',
        paddingBottom: 4.5
    },
    exercise_text: {
        fontFamily: 'Outfit_300Light',
        fontSize: 14.5,
        marginRight: 5
    },
    muscle_ctnr: {
        borderRadius: 10,
        paddingHorizontal: 8.5,
        alignItems: 'center',
        justifyContent: 'center'
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 10.5,
        color: '#fff'
    },
});
