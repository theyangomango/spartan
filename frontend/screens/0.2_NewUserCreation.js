import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback, Platform } from 'react-native';
import { Ionicons, Octicons, Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const NewUserCreation = ({ navigation }) => {
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const emailOrPhoneInputRef = useRef(null);

    // Ensure keyboard is always open
    useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardDidHide', () => {
            if (Platform.OS === 'android') {
                // Re-focus the first TextInput to keep the keyboard open
                emailOrPhoneInputRef.current?.focus();
            }
        });

        return () => {
            showSubscription.remove();
        };
    }, []);

    function goBack() {
        navigation.goBack();
    }

    return (
        <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.container}>
                <View style={styles.iconContainer}>
                    <RNBounceable onPress={goBack}>
                        <Feather name="chevron-left" size={27} color="#888" style={styles.backIcon} />
                    </RNBounceable>
                    <RNBounceable>
                        <Octicons name="question" size={22} color="#888" style={styles.helpIcon} />
                    </RNBounceable>
                </View>

                <View style={styles.formWrapper}>
                    <View style={styles.formContainer}>
                        <Text style={styles.title}>Email / Phone Number</Text>
                        <TextInput
                            ref={emailOrPhoneInputRef}
                            style={styles.input}
                            placeholder="Enter your email or phone"
                            placeholderTextColor="#ccc"
                            value={emailOrPhone}
                            onChangeText={setEmailOrPhone}
                            keyboardType="email-address"
                            autoFocus={true}  // Autofocus on this TextInput
                        />

                        <Text style={styles.title}>Create a Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor="#ccc"
                            value={username}
                            onChangeText={setUsername}
                        />

                        <Text style={styles.title}>Create a Password</Text>
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
                        <RNBounceable style={styles.button}>
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
        left: 15,
        right: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    backIcon: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    helpIcon: {
        padding: 8,
    },
    formWrapper: {
        flex: 1,
        paddingTop: height * 0.15, // Adjusted padding for a better layout
    },
    formContainer: {
        alignItems: 'center',
        paddingHorizontal: 22,
    },
    title: {
        fontSize: 15,
        fontWeight: '400',
        color: '#000',
        paddingLeft: 3,
        marginBottom: 8,
        fontFamily: 'Outfit_500Medium',
        alignSelf: 'flex-start',
    },
    input: {
        width: '100%',
        paddingVertical: 11.5,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#f2f2f2',
        fontSize: 14,
        color: '#000',
        fontFamily: 'Outfit_500Medium',
        marginBottom: 20,
    },
    footerContainer: {
        alignItems: 'center',
        marginTop: 10,
        marginHorizontal: 22,
        marginBottom: 20, // Added bottom margin to ensure proper spacing with the keyboard
    },
    button: {
        backgroundColor: '#55A8FF',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 22,
        borderRadius: 8,
        width: '100%',
    },
    auth_button_text: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
        fontFamily: 'Outfit_600SemiBold',
        marginLeft: 6,
    },
});

export default NewUserCreation;
