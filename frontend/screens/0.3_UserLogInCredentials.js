import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback, Platform } from 'react-native';
import { Ionicons, Octicons, Feather } from '@expo/vector-icons';
import readDoc from '../../backend/helper/firebase/readDoc';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

const UserLogInCredentials = ({ navigation }) => {
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [password, setPassword] = useState('');
    const usersRef = useRef(null);

    const emailOrPhoneInputRef = useRef(null);

    // Ensure keyboard is always open
    useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardDidHide', () => {
            if (Platform.OS === 'android') {
                emailOrPhoneInputRef.current?.focus();
            }
        });

        return () => {
            showSubscription.remove();
        };
    }, []);

    useEffect(() => {
        readDoc('global', 'users')
            .then(data => {
                usersRef.current = data.all;
            })
    }, []);

    function goBack() {
        navigation.goBack();
    }

    function logIn() {
        const input = emailOrPhone.trim().toLowerCase();
        const enteredPassword = password.trim();

        if (usersRef.current) {
            // Loop through the users to find a match
            const user = usersRef.current.find(user => {
                const emailMatch = user.email?.toLowerCase() === input;
                const phoneMatch = user.phoneNumber === input;
                const passwordMatch = user.password === enteredPassword;

                return (emailMatch || phoneMatch) && passwordMatch;
            });

            if (user) {
                // Successfully found a matching user
                console.log('Login successful', user.uid);
                // You can navigate to another screen or update the UI here
                // For example:
                AsyncStorage.setItem('uid', user.uid, () => {
                    console.log('async storage set uid');
                });
                navigation.navigate('FeedStack', { uid: user.uid }); // Replace with your home screen or dashboard
            } else {
                // No matching user found
                console.log('Login failed: Invalid credentials');
            }
        } else {
            console.log('Login failed: No user data available');
        }
    }

    return (
        <TouchableWithoutFeedback onPress={() => { }}>
            <View style={styles.container}>
                <View style={styles.iconContainer}>
                    <RNBounceable onPress={goBack}>
                        <Feather name="chevron-left" size={scaleSize(27)} color="#888" style={styles.backIcon} />
                    </RNBounceable>
                    <RNBounceable>
                        <Octicons name="question" size={scaleSize(22)} color="#888" style={styles.helpIcon} />
                    </RNBounceable>
                </View>

                <View style={styles.formWrapper}>
                    <View style={styles.formContainer}>
                        <Text style={styles.title}>Username / Email / Phone Number</Text>
                        <TextInput
                            ref={emailOrPhoneInputRef}
                            style={styles.input}
                            placeholder="Enter your email or phone"
                            placeholderTextColor="#ccc"
                            value={emailOrPhone}
                            onChangeText={setEmailOrPhone}
                            keyboardType="email-address"
                            autoFocus={true}
                        />

                        <Text style={styles.title}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#ccc"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.footerContainer}>
                        <RNBounceable style={styles.button} onPress={logIn}>
                            <Text style={styles.auth_button_text}>Continue</Text>
                        </RNBounceable>
                    </View>
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
    },
    iconContainer: {
        position: 'absolute',
        top: '6%',
        left: scaleSize(15),
        right: scaleSize(15),
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    backIcon: {
        paddingHorizontal: scaleSize(8),
        paddingVertical: scaleSize(6),
    },
    helpIcon: {
        padding: scaleSize(8),
    },
    formWrapper: {
        flex: 1,
        paddingTop: scaleSize(screenHeight * 0.15),
    },
    formContainer: {
        alignItems: 'center',
        paddingHorizontal: scaleSize(22),
    },
    title: {
        fontSize: scaleSize(15),
        fontWeight: '400',
        color: '#000',
        paddingLeft: scaleSize(3),
        marginBottom: scaleSize(8),
        fontFamily: 'Outfit_500Medium',
        alignSelf: 'flex-start',
    },
    input: {
        width: '100%',
        paddingVertical: scaleSize(11.5),
        paddingHorizontal: scaleSize(12),
        borderRadius: scaleSize(6),
        backgroundColor: '#f2f2f2',
        fontSize: scaleSize(14),
        color: '#000',
        fontFamily: 'Outfit_500Medium',
        marginBottom: scaleSize(20),
    },
    footerContainer: {
        alignItems: 'center',
        marginTop: scaleSize(10),
        marginHorizontal: scaleSize(22),
        marginBottom: scaleSize(20),
    },
    button: {
        backgroundColor: '#55A8FF',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: scaleSize(12),
        paddingHorizontal: scaleSize(22),
        borderRadius: scaleSize(8),
        width: '100%',
    },
    auth_button_text: {
        color: '#fff',
        fontSize: scaleSize(15),
        fontWeight: '500',
        fontFamily: 'Outfit_600SemiBold',
        marginLeft: scaleSize(6),
    },
});

export default UserLogInCredentials;
