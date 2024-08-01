import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, TouchableOpacity, Image, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Make sure to install @expo/vector-icons
import * as ImagePicker from 'expo-image-picker';

export default function SettingsScreen({ closeBottomSheet }) {
    const [feedback, setFeedback] = useState('');
    const [selectedImages, setSelectedImages] = useState([]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 1,
        });

        if (!result.canceled) {
            setSelectedImages([...selectedImages, ...result.assets.map((asset) => asset.uri)]);
        }
    };

    const removeImage = (uri) => {
        setSelectedImages(selectedImages.filter(imageUri => imageUri !== uri));
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Pressable onPress={closeBottomSheet}>
                        <Ionicons name="chevron-down" size={24} color="black" />
                    </Pressable>
                    <Text style={styles.title}>Beta Testing</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackTitle}>Report Bugs / Suggestions / Feedback</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Describe the issue or suggestion (the more specific the better)"
                        value={feedback}
                        onChangeText={setFeedback}
                        multiline
                    />
                    <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                        <Text style={styles.imagePickerButtonText}>Select Screenshots (Optional)</Text>
                        <Ionicons name="image" size={24} color="black" />
                    </TouchableOpacity>
                    <View style={styles.imagePreviewContainer}>
                        {selectedImages.map((uri, index) => (
                            <View key={index} style={styles.imageWrapper}>
                                <Image source={{ uri }} style={styles.imagePreview} />
                                <Pressable style={styles.removeImageButton} onPress={() => removeImage(uri)}>
                                    <Ionicons name="close" size={16} color="white" />
                                </Pressable>
                            </View>
                        ))}
                    </View>
                    <TouchableOpacity style={styles.submitButton} onPress={() => { /* handle submit action */ }}>
                        <Text style={styles.submitButtonText}>Submit Feedback</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.body}>
                    <Text style={styles.body_text}>
                        Thank you so much for helping to test Spartan's Beta.
                        I earnestly believe this app has the potential to impact the lives of millions,
                        and I am incredibly grateful to have you be a part of that journey.
                    </Text>
                    <Text style={styles.name_text}>
                        - Yang Bai
                    </Text>
                    <Text style={styles.name_title_text}>
                        Spartan's Founder
                    </Text>
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 55,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 10,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 16,
        fontFamily: 'Mulish_800ExtraBold',
    },
    body: {
        position: 'absolute',
        bottom: 125,
        paddingHorizontal: 55,
    },
    body_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 23
    },
    name_text: {
        marginTop: 13,
        fontFamily: 'Mulish_700Bold',
        fontSize: 14,
        textAlign: 'right',
    },
    name_title_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 13,
        textAlign: 'right',
        lineHeight: 23,
        color: '#888'
    },
    feedbackContainer: {
        marginTop: 30,
        paddingHorizontal: 20,
    },
    feedbackTitle: {
        fontFamily: 'Mulish_800ExtraBold',
        fontSize: 14,
        marginBottom: 10,
    },
    textInput: {
        borderWidth: 1.5,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        textAlignVertical: 'top',
        height: 100,
        marginBottom: 10,

        fontFamily: 'Mulish_700Bold',
        color: '#444'
    },
    imagePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f3f3',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    imagePickerButtonText: {
        fontFamily: 'Mulish_600SemiBold',
        fontSize: 14,
        marginRight: 10,
    },
    imagePreviewContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    imageWrapper: {
        position: 'relative',
        marginRight: 10,
        marginBottom: 10,
    },
    imagePreview: {
        width: 50,
        height: 50,
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: 'red',
        borderRadius: 10,
        padding: 2,
    },
    submitButton: {
        backgroundColor: '#2D9EFF',
        paddingVertical: 13,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontFamily: 'Mulish_800ExtraBold',
        fontSize: 15,
    },
});
