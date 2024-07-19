import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome'; // You can choose any icon library

const { width, height } = Dimensions.get('window');

const Authentication = () => {
    return (
        <View style={styles.container}>
            <StatusBar style='light' />
            <View style={styles.circle} />
            <View style={styles.top_ctnr}>
                <View style={styles.logo}>
                    <Image source={require('../assets/logo.png')} style={styles.logo_image} />
                    <Text style={styles.title}>SPARTAN</Text>
                </View>
                <Text style={styles.motto}>Embrace Greatness. Together.</Text>
            </View>

            <View style={styles.bottomContainer}>
                <AuthButton
                    icon="user"
                    text="Use phone/email/username"
                    onPress={() => { }}
                />
                <AuthButton
                    icon="google"
                    text="Continue with Google"
                    onPress={() => { }}
                />
                <AuthButton
                    icon="apple"
                    text="Continue with Apple"
                    onPress={() => { }}
                />
                <AuthButton
                    icon="instagram"
                    text="Continue with Instagram"
                    onPress={() => { }}
                />
                <AuthButton
                    icon="facebook"
                    text="Continue with Facebook"
                    onPress={() => { }}
                />
            </View>
        </View>
    );
};

const AuthButton = ({ icon, text, onPress }) => {
    return (
        <TouchableOpacity style={styles.button} onPress={onPress}>
            <Icon name={icon} size={20} color="#000" style={styles.icon} />
            <Text style={styles.text}>{text}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    circle: {
        position: 'absolute',
        top: -height * 1.6,
        left: -(height - width / 2),
        height: height * 2,
        width: height * 2,
        backgroundColor: '#2D9EFF',
        borderBottomLeftRadius: 900, // Large radius to make it semi-circle
        borderBottomRightRadius: 900, // Large radius to make it semi-circle
        justifyContent: 'center',
        alignItems: 'center',
    },
    top_ctnr: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 140,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo_image: {
        width: 70,
        aspectRatio: 1,
    },
    logo: {
        flexDirection: 'row',
        marginBottom: 10
    },
    title: {
        fontSize: 54, // Large font size
        color: '#fff',
        fontFamily: 'Outfit_300Light',
        marginLeft: 10
    },
    motto: {
        fontSize: 23.5, // Adjust the font size for the motto
        color: '#fff',
        fontFamily: 'Outfit_500Medium',
        marginTop: 8, // Add some space between the title and the motto
    },
    bottomContainer: {
        position: 'absolute',
        top: height * 0.4,
        left: 0,
        right: 0,
        padding: 20,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 15,
        borderRadius: 8,
        marginVertical: 10,
    },
    icon: {
        marginRight: 10,
    },
    text: {
        fontSize: 17,
        fontFamily: 'SourceSansPro_400Regular'
    },
});

export default Authentication;
