import React, { useState } from 'react';
import { View, Text, Dimensions, PixelRatio, StyleSheet, Pressable, TextInput, TouchableOpacity, Image, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Make sure to install @expo/vector-icons
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView as SafeAreaContextView } from 'react-native-safe-area-context'; // Import SafeAreaView from safe-area-context

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Scale factor based on iPhone 13 width
const scale = SCREEN_WIDTH / 390;

function normalize(size) {
    return Math.round(PixelRatio.roundToNearestPixel(size * scale));
}

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
            <SafeAreaContextView style={styles.container}>
                <View style={styles.header}>
                    <Pressable onPress={closeBottomSheet}>
                        <Ionicons name="chevron-down" size={24} color="black" />
                    </Pressable>
                    <Text style={styles.title}>Beta Testing</Text>
                    <View style={{ width: normalize(24) }} />
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
            </SafeAreaContextView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: normalize(8),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: normalize(10),
        paddingHorizontal: normalize(20),
    },
    title: {
        fontSize: normalize(16),
        fontFamily: 'Mulish_800ExtraBold',
    },
    body: {
        position: 'absolute',
        bottom: normalize(150),
        paddingHorizontal: normalize(55),
    },
    body_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: normalize(14),
        textAlign: 'center',
        lineHeight: normalize(23),
    },
    name_text: {
        marginTop: normalize(13),
        fontFamily: 'Mulish_700Bold',
        fontSize: normalize(14),
        textAlign: 'right',
    },
    name_title_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: normalize(13),
        textAlign: 'right',
        lineHeight: normalize(23),
        color: '#888',
    },
    feedbackContainer: {
        marginTop: normalize(30),
        paddingHorizontal: normalize(20),
    },
    feedbackTitle: {
        fontFamily: 'Mulish_800ExtraBold',
        fontSize: normalize(14),
        paddingHorizontal: normalize(4),
        marginBottom: normalize(10),
    },
    textInput: {
        borderWidth: normalize(1.5),
        borderColor: '#ddd',
        borderRadius: normalize(8),
        paddingHorizontal: normalize(10),
        // textAlignVertical: 'top',
        height: normalize(100),
        marginBottom: normalize(10),

        fontFamily: 'Mulish_600SemiBold',
        color: '#444',
    },
    imagePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f3f3',
        padding: normalize(12),
        borderRadius: normalize(8),
        marginBottom: normalize(8),
    },
    imagePickerButtonText: {
        fontFamily: 'Mulish_600SemiBold',
        fontSize: normalize(14),
        marginRight: normalize(10),
    },
    imagePreviewContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: normalize(10),
    },
    imageWrapper: {
        position: 'relative',
        marginRight: normalize(10),
        marginBottom: normalize(10),
    },
    imagePreview: {
        width: normalize(50),
        height: normalize(50),
        borderRadius: normalize(8),
    },
    removeImageButton: {
        position: 'absolute',
        top: normalize(-5),
        right: normalize(-5),
        backgroundColor: 'red',
        borderRadius: normalize(10),
        padding: normalize(2),
    },
    submitButton: {
        backgroundColor: '#2D9EFF',
        paddingVertical: normalize(13),
        borderRadius: normalize(8),
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontFamily: 'Mulish_800ExtraBold',
        fontSize: normalize(15),
    },
});
