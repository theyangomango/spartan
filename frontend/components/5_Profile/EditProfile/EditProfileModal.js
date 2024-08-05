import React, { useState, useCallback } from "react";
import { StyleSheet, View, ScrollView, Text, TextInput, Image } from "react-native";
import { Entypo } from '@expo/vector-icons'; // Assuming Entypo icons are used for the camera icon

const EditProfileModal = () => {
    return (
        <View style={styles.mainContainer}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.pfpContainer}>
                    <Image source={{ uri: global.userData.image }} style={styles.profilePicture} />
                    <View style={styles.cameraIconContainer}>
                        <Entypo name="camera" size={16} color="#fff" />
                    </View>
                </View>
                <Text style={styles.heading}>Personal Information</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput style={styles.input} placeholder={global.userData.handle} placeholderTextColor={'#000'} editable={false}/>
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput style={styles.input} placeholder="Enter your name" />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Bio</Text>
                    <TextInput style={styles.input} placeholder={global.userData.bio} placeholderTextColor={'#777'}/>
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput style={styles.input} placeholder="Enter your email address" keyboardType="email-address" />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput style={styles.input} placeholder="Enter your phone number" keyboardType="phone-pad" />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput style={styles.input} placeholder="Enter your password" secureTextEntry />
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    scrollContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    pfpContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    profilePicture: {
        width: 100,
        aspectRatio: 1,
        borderRadius: 60,
    },
    cameraIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#333',
        borderRadius: 100,
        padding: 8,
    },
    heading: {
        fontSize: 13.5,
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: 0.1,
        color: '#888',
        // marginBottom: 5,
        alignSelf: 'flex-start',
        paddingLeft: 20,
        width: '100%',
        paddingVertical: 12,
        backgroundColor: '#f6f6f6'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        marginVertical: 0,
        paddingVertical: 12.5,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f3f3',
    },
    label: {
        fontSize: 14,
        color: '#333',
        fontFamily: 'Outfit_500Medium',
        width: '35%',
    },
    input: {
        fontSize: 14,
        color: '#333',
        fontFamily: 'Outfit_500Medium',
        width: '65%',
        // padding: 10,
        // borderRadius: 10,
        // borderWidth: 1,
        // borderColor: '#ddd',
    },
});

export default React.memo(EditProfileModal);
