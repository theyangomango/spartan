import React, { useState } from "react";
import { View, Image, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Entypo } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import getPFP from "../../../../backend/storage/getPFP";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import { deleteObject, ref, uploadBytes } from "firebase/storage";
import { storage } from "../../../../firebase.config";
import * as ImageManipulator from 'expo-image-manipulator';


const ProfilePicture = ({ imageUri }) => {
    const [profileImage, setProfileImage] = useState(imageUri);

    async function compressImage(uri) {
        const compressedImage = await ImageManipulator.manipulateAsync(
            uri,
            [],
            { compress: 0.01, format: ImageManipulator.SaveFormat.JPEG }
        );
        return compressedImage.uri;
    }

    const pickImage = async () => {
        // Ask for permission to access media library
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need media library permissions to make this work!');
            return;
        }

        // Launch image picker
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            const pfpURI = result.assets[0].uri;
            setProfileImage(pfpURI);
            const pfpRef = ref(storage, `pfps/${global.userData.uid}.png`);
            await deleteObject(pfpRef); 
            const compressedURI = await compressImage(pfpURI);
            const res = await fetch(compressedURI);
            const bytes = await res.blob();
            await uploadBytes(pfpRef, bytes);
            const firebaseURI = await getPFP(global.userData.uid);
            await updateDoc('users', global.userData.uid, {image: firebaseURI});
            console.log('done');
        }
    };

    return (
        <TouchableOpacity onPress={pickImage}>
            <View style={styles.pfpContainer}>
                <Image source={{ uri: profileImage }} style={styles.profilePicture} />
                <View style={styles.cameraIconContainer}>
                    <Entypo name="camera" size={16} color="#fff" />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
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
});

export default ProfilePicture;
