import RNBounceable from '@freakycoder/react-native-bounceable';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { Ionicons, Octicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

const SignUp = ({ navigation, route }) => {
    function toLogInScreen() {
        navigation.navigate('LogIn')
    }

    return (
        <View style={styles.container}>
            {/* <StatusBar style='light' /> */}
            {/* <View style={styles.circle} /> */}
            <View style={styles.iconContainer}>
                <RNBounceable>
                    <Ionicons name="close" size={24} color="#666" style={styles.closeIcon} />
                </RNBounceable>
                <RNBounceable>
                    <Octicons name="question" size={23} color="#666" style={styles.helpIcon} />
                </RNBounceable>
            </View>
            <View style={styles.top_ctnr}>
                {/* <View style={styles.logo}>
                    <Image source={require('../assets/inverted_logo.png')} style={styles.logo_image} />
                    <Text style={styles.title}>SPARTAN</Text>
                </View> */}
                {/* <Text style={styles.motto}>Embrace Greatness. Together.</Text> */}
                <Text style={styles.title}>Sign Up for Spartan</Text>
                <Text style={styles.subtitle}>Create an account to view posts, track workouts, connect with friends, and more.</Text>
            </View>

            <View style={styles.bottomContainer}>
                <AuthButton
                    icon="person"
                    text="Phone / Email"
                    onPress={() => { }}
                />
                <AuthButton
                    icon="logo-google"
                    text="Continue with Google"
                    onPress={() => { }}
                />
                <AuthButton
                    icon="logo-apple"
                    text="Continue with Apple"
                    onPress={() => { }}
                />
                <AuthButton
                    icon="logo-instagram"
                    text="Continue with Instagram"
                    onPress={() => { }}
                />
                <AuthButton
                    icon="logo-facebook"
                    text="Continue with Facebook"
                    onPress={() => { }}
                />
            </View>

            <View style={styles.footer}>
                <Text style={styles.footer_regular_text}>Already have an account? </Text>
                <TouchableOpacity activeOpacity={0.5} onPress={toLogInScreen}>
                    <Text style={styles.log_in_text}> Log in</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const AuthButton = ({ icon, text, onPress }) => {
    return (
        <RNBounceable style={styles.button} onPress={onPress}>
            <Ionicons name={icon} size={19} color="#000" style={styles.icon} />
            <Text style={styles.auth_button_text}>{text}</Text>
        </RNBounceable>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
        justifyContent: 'center',
        // paddingTop: 50,
        paddingBottom: 35,
        backgroundColor: '#fff'
    },
    iconContainer: {
        position: 'absolute',
        top: '6%',
        left: 15,
        right: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    closeIcon: {
        padding: 10,
    },
    helpIcon: {
        padding: 10,
    },
    // circle: {
    //     position: 'absolute',
    //     top: -height * 1.6,
    //     left: -(height - width / 2),
    //     height: height * 2,
    //     width: height * 2,
    //     backgroundColor: '#2D9EFF',
    //     borderBottomLeftRadius: 900, // Large radius to make it semi-circle
    //     borderBottomRightRadius: 900, // Large radius to make it semi-circle
    //     justifyContent: 'center',
    //     alignItems: 'center',
    // },
    top_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo_image: {
        width: 70,
        aspectRatio: 1,
    },
    logo: {
        alignItems: 'center',
        flexDirection: 'row',
        marginBottom: 10
    },
    title: {
        fontSize: 21, // Large font size
        // color: '#2D9EFF',
        fontFamily: 'Poppins_600SemiBold',
        marginLeft: 1,
        marginBottom: 10
    },
    subtitle: {
        fontSize: 12, // Large font size
        marginHorizontal: 45,
        textAlign: 'center',
        fontFamily: 'Mulish_400Regular',
        // lineHeight: 15
        marginBottom: 15,
        color: '#9a9a9a'
    },
    motto: {
        fontSize: 23.5, // Adjust the font size for the motto
        color: '#fff',
        fontFamily: 'Outfit_500Medium',
        marginTop: 8, // Add some space between the title and the motto
    },
    bottomContainer: {
        marginHorizontal: 25
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.3,
        borderColor: '#e1e1e1',
        paddingVertical: 14,
        borderRadius: 8,
        marginVertical: 7,
        justifyContent: 'center'
    },
    icon: {
        position: 'absolute',
        left: 17,
    },
    auth_button_text: {
        fontSize: 14.5,
        fontFamily: 'SourceSansPro_600SemiBold',
        color: '#222'
    },
    footer: {
        position: 'absolute',
        flexDirection: 'row',
        bottom: '5.5%',
        left: 0,
        right: 0,
        height: 68,
        backgroundColor: '#f7f7f7',
        alignItems: 'center',
        justifyContent: 'center'
    },
    footer_regular_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14.5
    },
    log_in_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14.5,
        color: '#2D9EFF',
    }
});

export default SignUp;
