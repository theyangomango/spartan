import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Text, TextInput, Dimensions } from "react-native";
import ProfilePicture from "./ProfilePicture";
import formatPhoneNumber from "../../../helper/formatPhoneNumber";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

const EditProfileModal = ({ setPFP }) => {
    const [bio, setBio] = useState(global.userData.bio);

    const handleBioBlur = () => {
        updateDoc('users', global.userData.uid, { bio: bio });
    };

    return (
        <View style={styles.mainContainer}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <ProfilePicture imageUri={global.userData.image} setPFP={setPFP} />
                <Text style={styles.heading}>Personal Information</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        style={styles.non_editable_input_text}
                        placeholder={global.userData.handle}
                        placeholderTextColor={'#000'}
                        editable={false}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                        style={styles.non_editable_input_text}
                        placeholder={global.userData.name}
                        editable={false}
                        placeholderTextColor={'#000'}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Bio</Text>
                    <TextInput
                        style={styles.editable_input_text}
                        value={bio}
                        onChangeText={setBio}
                        onBlur={handleBioBlur}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.non_editable_input_text}
                        placeholder={global.userData.email}
                        editable={false}
                        placeholderTextColor={'#000'}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                        style={styles.non_editable_input_text}
                        placeholder={formatPhoneNumber(global.userData.phoneNumber)}
                        editable={false}
                        placeholderTextColor={'#000'}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.non_editable_input_text}
                        placeholder="********"
                        editable={false}
                        placeholderTextColor={'#000'}
                        secureTextEntry
                    />
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
        paddingVertical: scaleSize(20),
    },
    heading: {
        fontSize: scaleSize(13.5),
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: 0.1,
        color: '#888',
        alignSelf: 'flex-start',
        paddingLeft: scaleSize(20),
        width: '100%',
        paddingVertical: scaleSize(12),
        backgroundColor: '#f6f6f6'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(20),
        backgroundColor: '#fff',
        marginVertical: 0,
        paddingVertical: scaleSize(12.5),
        borderBottomWidth: scaleSize(1),
        borderBottomColor: '#f3f3f3',
    },
    label: {
        fontSize: scaleSize(14),
        color: '#333',
        fontFamily: 'Outfit_500Medium',
        width: '35%',
    },
    non_editable_input_text: {
        fontSize: scaleSize(14),
        color: '#333',
        fontFamily: 'Outfit_500Medium',
        width: '65%',
    },
    editable_input_text: {
        fontSize: scaleSize(14),
        color: '#777',
        fontFamily: 'Outfit_500Medium',
        width: '65%',
    }
});

export default React.memo(EditProfileModal);
