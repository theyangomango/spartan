import RNBounceable from '@freakycoder/react-native-bounceable';
import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons, Octicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

const LogIn = ({ navigation }) => {
    function toSignUpScreen() {
        navigation.navigate('SignUp');
    }

    function toUserLogInCredentials() {
        navigation.navigate('UserLogInCredentials');
    }

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <RNBounceable onPress={toSignUpScreen}>
                    <Ionicons name="chevron-back" size={scaleSize(24)} color="#666" style={styles.closeIcon} />
                </RNBounceable>
                {/* <RNBounceable>
                    <Octicons name="question" size={23} color="#666" style={styles.helpIcon} />
                </RNBounceable> */}
            </View>
            <View style={styles.top_ctnr}>
                <Text style={styles.title}>Log In to Spartan</Text>
                <Text style={styles.subtitle}>
                    Log in to see past posts and workouts, message friends, see notifications, and more.
                </Text>
            </View>

            <View style={styles.bottomContainer}>
                <AuthButton icon="person" text="Phone / Email / Username" onPress={toUserLogInCredentials} />

                {/* // ! Disabled for Beta */}
                <View pointerEvents="none" style={{ opacity: 0.4 }}>
                    <AuthButton icon="logo-google" text="Continue with Google" onPress={() => {}} />
                    <AuthButton icon="logo-apple" text="Continue with Apple" onPress={() => {}} />
                    <AuthButton icon="logo-instagram" text="Continue with Instagram" onPress={() => {}} />
                    <AuthButton icon="logo-facebook" text="Continue with Facebook" onPress={() => {}} />
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footer_regular_text}>Don't have an account? </Text>
                <TouchableOpacity activeOpacity={0.5} onPress={toSignUpScreen}>
                    <Text style={styles.sign_up_text}> Sign Up</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const AuthButton = ({ icon, text, onPress }) => {
    return (
        <RNBounceable style={styles.button} onPress={onPress}>
            <Ionicons name={icon} size={scaleSize(19)} color="#000" style={styles.icon} />
            <Text style={styles.auth_button_text}>{text}</Text>
        </RNBounceable>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
        justifyContent: 'center',
        paddingBottom: scaleSize(35),
        backgroundColor: '#fff',
    },
    iconContainer: {
        position: 'absolute',
        top: '6%',
        left: scaleSize(15),
        right: scaleSize(15),
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    closeIcon: {
        padding: scaleSize(10),
    },
    top_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: scaleSize(21),
        fontFamily: 'Poppins_600SemiBold',
        marginLeft: scaleSize(1),
        marginBottom: scaleSize(10),
    },
    subtitle: {
        fontSize: scaleSize(12),
        marginHorizontal: scaleSize(45),
        textAlign: 'center',
        fontFamily: 'Mulish_400Regular',
        marginBottom: scaleSize(15),
        color: '#9a9a9a',
    },
    bottomContainer: {
        marginHorizontal: scaleSize(25),
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: scaleSize(1.3),
        borderColor: '#e1e1e1',
        paddingVertical: scaleSize(14),
        borderRadius: scaleSize(8),
        marginVertical: scaleSize(7),
        justifyContent: 'center',
    },
    icon: {
        position: 'absolute',
        left: scaleSize(17),
    },
    auth_button_text: {
        fontSize: scaleSize(14.5),
        fontFamily: 'SourceSansPro_600SemiBold',
        color: '#222',
    },
    footer: {
        position: 'absolute',
        flexDirection: 'row',
        bottom: '5.5%',
        left: 0,
        right: 0,
        height: scaleSize(68),
        backgroundColor: '#f7f7f7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer_regular_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSize(14.5),
    },
    sign_up_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(14.5),
        color: '#2D9EFF',
    },
});

export default LogIn;
