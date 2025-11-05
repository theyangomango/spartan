import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Text, Dimensions } from "react-native";
import ProfilePicture from "./ProfilePicture";
import formatPhoneNumber from "../../../helper/formatPhoneNumber";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import THEME from "../../../theme/mfpDark";
import scaleSize from "../../../helper/scaleSize";
import DismissableTextInput from "../../common/DismissableTextInput";

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base screen width assumed as 375

function wScale(size) {
    return Math.round(size * scale);
}

const EditProfileModal = ({ setPFP }) => {
    const userData = (global?.userData && typeof global.userData === 'object') ? global.userData : {};
    const initialBio = (userData?.bio ?? '').toString();
    const [bio, setBio] = useState(initialBio);
    const displayName = (() => {
        const name = typeof userData?.name === 'string' ? userData.name.trim() : '';
        if (name) return name;
        const given = typeof userData?.firstName === 'string' ? userData.firstName.trim() : '';
        const family = typeof userData?.lastName === 'string' ? userData.lastName.trim() : '';
        const combined = [given, family].filter(Boolean).join(' ').trim();
        if (combined.length) return combined;
        const fallback = typeof userData?.displayName === 'string' ? userData.displayName.trim() : '';
        if (fallback) return fallback;
        const handle = typeof userData?.handle === 'string' ? userData.handle.trim() : '';
        return handle;
    })();

    const handleBioBlur = () => {
        if (userData) {
            userData.bio = bio;
        }
        if (userData?.uid) {
            updateDoc('usersPublic', userData.uid, { bio });
        }
    };

    return (
        <View style={styles.mainContainer}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <ProfilePicture imageUri={userData.image} setPFP={setPFP} />
                <Text style={styles.heading}>Personal Information</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Username</Text>
                    <DismissableTextInput
                        style={styles.non_editable_input_text}
                        placeholder={userData.handle}
                        placeholderTextColor={THEME.muted}
                        editable={false}
                        enableAccessory={false}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Name</Text>
                    <DismissableTextInput
                        style={styles.non_editable_input_text}
                        value={displayName}
                        placeholder={displayName}
                        editable={false}
                        placeholderTextColor={THEME.muted}
                        enableAccessory={false}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Bio</Text>
                    <DismissableTextInput
                        style={styles.editable_input_text}
                        value={bio}
                        onChangeText={setBio}
                        onBlur={handleBioBlur}
                        placeholder="No bio yet..."
                        placeholderTextColor={bio?.length ? THEME.muted : THEME.textPrimary}
                        selectionColor={THEME.primary}
                        multiline
                        returnKeyType="default"
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <DismissableTextInput
                        style={styles.non_editable_input_text}
                        placeholder={userData.email}
                        editable={false}
                        placeholderTextColor={THEME.muted}
                        enableAccessory={false}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Phone Number</Text>
                    <DismissableTextInput
                        style={styles.non_editable_input_text}
                        placeholder={formatPhoneNumber(userData.phoneNumber)}
                        editable={false}
                        placeholderTextColor={THEME.muted}
                        enableAccessory={false}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <DismissableTextInput
                        style={styles.non_editable_input_text}
                        placeholder="********"
                        editable={false}
                        placeholderTextColor={THEME.muted}
                        secureTextEntry
                        enableAccessory={false}
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
        fontFamily: 'Outfit_600SemiBold',
        letterSpacing: 0.1,
        color: THEME.textSecondary,
        alignSelf: 'flex-start',
        paddingLeft: scaleSize(wScale(20)),
        width: '100%',
        paddingVertical: scaleSize(wScale(12)),
        backgroundColor: THEME.fieldDeep
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
