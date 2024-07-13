import RNBounceable from "@freakycoder/react-native-bounceable";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";

export default function EditProfileButton() {
    return (
        <RNBounceable>
            <View style={styles.main_ctnr}>
                <Text style={styles.edit_profile_text}>Edit Profile</Text>
            </View>
        </RNBounceable>
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
        marginHorizontal: 9,
    },
    edit_profile_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 15.5,
        color: '#fff'
    },
});