import { StyleSheet, View, Text, TouchableOpacity } from "react-native";

export default function EditProfileButton() {
    return (
        <TouchableOpacity>
            <View style={styles.main_ctnr}>
                <Text style={styles.edit_profile_text}>Edit Profile</Text>
            </View>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        height: 36,
        marginTop: 16,
        borderRadius: 100,
        backgroundColor: '#0499FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
    },
    edit_profile_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 16,
        color: '#fff'
    },
});