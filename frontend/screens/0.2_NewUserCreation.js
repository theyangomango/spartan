import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Dimensions, Keyboard, TouchableWithoutFeedback, Platform, Alert } from 'react-native';
import { Ionicons, Octicons, Feather } from '@expo/vector-icons';
import createDoc from '../../backend/helper/firebase/createDoc'
import readDoc from '../../backend/helper/firebase/readDoc'; // Import the function to read from Firestore
import makeID from '../../backend/helper/makeID';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

const NewUserCreation = ({ navigation }) => {
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

    const emailOrPhoneInputRef = useRef(null);

    function goBack() {
        navigation.goBack();
    }

    async function signUp() {
        // Trim and check if any field is empty
        if (!emailOrPhone.trim() || !username.trim() || !name.trim() || !password.trim()) {
            return; // Return early if any field is empty
        }

        // Convert inputs to lowercase and trim spaces
        const trimmedEmailOrPhone = emailOrPhone.toLowerCase().trim();
        const trimmedUsername = username.toLowerCase().trim();
        const trimmedName = name.trim();

        // Fetch existing users to check for duplicate email or phone number
        const users = await readDoc('global', 'users'); // Fetch all users

        // Check if the email or phone number is already in use
        const userExists = users.all.some(user => {
            return user.email === trimmedEmailOrPhone || user.phoneNumber === trimmedEmailOrPhone;
        });

        if (userExists) {
            return; // Return early if email or phone number is already in use
        }

        const newID = makeID();
        const newUser = {
            bio: "",
            completedWorkouts: [],
            currentWorkout: null,
            email: trimmedEmailOrPhone.includes('@') ? trimmedEmailOrPhone : null, // Store as email if it's an email
            phoneNumber: trimmedEmailOrPhone.includes('@') ? null : trimmedEmailOrPhone, // Store as phone number if it's not an email
            exploreFeedPosts: [],
            feedPosts: [],
            feedStories: [{
                handle: trimmedUsername,
                name: trimmedName,
                pfp: 'https://firebasestorage.googleapis.com/v0/b/spartan-8a55f.appspot.com/o/pfps%2Fdefault.jpg?alt=media&token=32983ee5-4732-446d-9484-d551c0aae1d1',
                stories: [],
                uid: newID
            }],
            followerCount: 0,
            followers: [],
            following: [],
            followingCount: 0,
            handle: trimmedUsername,
            image: 'https://firebasestorage.googleapis.com/v0/b/spartan-8a55f.appspot.com/o/pfps%2Fdefault.jpg?alt=media&token=32983ee5-4732-446d-9484-d551c0aae1d1',
            joined: Date.now(),
            lastActive: Date.now(),
            messages: [],
            name: trimmedName,
            notificationEvents: [],
            notificationNewComments: 0,
            notificationNewEvents: 0,
            notificationNewLikes: 0,
            password: password,
            postCount: 0,
            posts: [],
            progressPhotos: [],
            savedPosts: [],
            statsExercises: [],
            statsHexagon: [],
            statsTotalHours: 0,
            statsTotalVolume: 0,
            statsTotalWorkouts: 0,
            templates: [],
            uid: newID,
        };

        // Proceed with the account creation
        await createDoc('users', newID, newUser);
        navigation.navigate('FeedStack', { uid: newID });
    }


    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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

                        <Text style={styles.title}>Enter Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your name"
                            placeholderTextColor="#ccc"
                            value={name}
                            onChangeText={setName}
                            autoFocus={true}
                        />

                        <Text style={styles.title}>Create a Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor="#ccc"
                            value={username}
                            onChangeText={setUsername}
                        />

                        <Text style={styles.title}>Email / Phone Number</Text>
                        <TextInput
                            ref={emailOrPhoneInputRef}
                            style={styles.input}
                            placeholder="Enter your email or phone"
                            placeholderTextColor="#ccc"
                            value={emailOrPhone}
                            onChangeText={setEmailOrPhone}
                            keyboardType="email-address"
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
                        <RNBounceable style={styles.button} onPress={signUp}>
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

export default NewUserCreation;
