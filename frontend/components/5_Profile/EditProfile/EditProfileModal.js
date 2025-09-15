import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Text, TextInput, Dimensions } from "react-native";
import ProfilePicture from "./ProfilePicture";
import formatPhoneNumber from "../../../helper/formatPhoneNumber";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import THEME from "../../../theme/mfpDark";
import scaleSize from "../../../helper/scaleSize";

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base screen width assumed as 375

function wScale(size) {
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
                        placeholderTextColor={THEME.muted}
                        editable={false}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                        style={styles.non_editable_input_text}
                        placeholder={global.userData.name}
                        editable={false}
                        placeholderTextColor={THEME.muted}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Bio</Text>
                    <TextInput
                        style={styles.editable_input_text}
                        value={bio}
                        onChangeText={setBio}
                        onBlur={handleBioBlur}
                        placeholderTextColor={THEME.muted}
                        selectionColor={THEME.primary}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.non_editable_input_text}
                        placeholder={global.userData.email}
                        editable={false}
                        placeholderTextColor={THEME.muted}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                        style={styles.non_editable_input_text}
                        placeholder={formatPhoneNumber(global.userData.phoneNumber)}
                        editable={false}
                        placeholderTextColor={THEME.muted}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.non_editable_input_text}
                        placeholder="********"
                        editable={false}
                        placeholderTextColor={THEME.muted}
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
        backgroundColor: THEME.bg,
    },
    scrollContainer: {
        alignItems: 'center',
        paddingVertical: scaleSize(wScale(20)),
    },
    heading: {
        fontSize: scaleSize(13.5),
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: 0.1,
        color: THEME.textSecondary,
        alignSelf: 'flex-start',
        paddingLeft: scaleSize(wScale(20)),
        width: '100%',
        paddingVertical: scaleSize(wScale(12)),
        backgroundColor: THEME.bg
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(wScale(20)),
        backgroundColor: THEME.bg,
        marginVertical: 0,
        paddingVertical: scaleSize(wScale(12.5)),
        borderBottomWidth: wScale(1),
        borderBottomColor: THEME.hairline,
    },
    label: {
        fontSize: scaleSize(14),
        color: THEME.textSecondary,
        fontFamily: 'Outfit_500Medium',
        width: '35%',
    },
    non_editable_input_text: {
        fontSize: scaleSize(14),
        color: THEME.textPrimary,
        fontFamily: 'Outfit_500Medium',
        width: '65%',
    },
    editable_input_text: {
        fontSize: scaleSize(14),
        color: THEME.textPrimary,
        fontFamily: 'Outfit_500Medium',
        width: '65%',
    }
});

export default React.memo(EditProfileModal);
