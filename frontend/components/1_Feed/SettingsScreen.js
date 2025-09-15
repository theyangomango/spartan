import React, { useState } from 'react';
import { View, Text, Dimensions, PixelRatio, StyleSheet, Pressable, TextInput, TouchableOpacity, Image, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Make sure to install @expo/vector-icons
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView as SafeAreaContextView } from 'react-native-safe-area-context'; // Import SafeAreaView from safe-area-context
import theme from '../../../theme/mfpDark';

import scaleSize from "../../helper/scaleSize";

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
                        <Ionicons name="chevron-down" size={24} color={theme.textPrimary} />
                    </Pressable>
                    <Text style={styles.title}>Beta Testing</Text>
                    <View style={{ width: scaleSize(normalize(24)) }} />
                </View>

                <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackTitle}>Report Bugs / Suggestions / Feedback</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Describe the issue or suggestion (the more specific the better)"
                        value={feedback}
                        onChangeText={setFeedback}
                        multiline
                        placeholderTextColor={theme.textSecondary}
                    />
                    <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                        <Text style={styles.imagePickerButtonText}>Select Screenshots (Optional)</Text>
                        <Ionicons name="image" size={24} color={theme.textPrimary} />
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
        backgroundColor: theme.surface,
        paddingTop: scaleSize(normalize(8)),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: scaleSize(normalize(10)),
        paddingHorizontal: scaleSize(normalize(20)),
    },
    title: {
        fontSize: scaleSize(normalize(16)),
        fontFamily: 'Mulish_800ExtraBold',
        color: theme.textPrimary,
    },
    body: {
        position: 'absolute',
        bottom: scaleSize(normalize(150)),
        paddingHorizontal: scaleSize(normalize(55)),
    },
    body_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: scaleSize(normalize(14)),
        textAlign: 'center',
        lineHeight: scaleSize(normalize(23)),
        color: theme.textPrimary,
    },
    name_text: {
        marginTop: scaleSize(normalize(13)),
        fontFamily: 'Mulish_700Bold',
        fontSize: scaleSize(normalize(14)),
        textAlign: 'right',
        color: theme.textPrimary,
    },
    name_title_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: scaleSize(normalize(13)),
        textAlign: 'right',
        lineHeight: scaleSize(normalize(23)),
        color: theme.textSecondary,
    },
    feedbackContainer: {
        marginTop: scaleSize(normalize(30)),
        paddingHorizontal: scaleSize(normalize(20)),
    },
    feedbackTitle: {
        fontFamily: 'Mulish_800ExtraBold',
        fontSize: scaleSize(normalize(14)),
        paddingHorizontal: scaleSize(normalize(4)),
        marginBottom: scaleSize(normalize(10)),
        color: theme.textPrimary,
    },
    textInput: {
        borderWidth: scaleSize(normalize(1.5)),
        borderColor: theme.hairline,
        borderRadius: scaleSize(normalize(8)),
        paddingHorizontal: scaleSize(normalize(10)),
        // textAlignVertical: 'top',
        height: scaleSize(normalize(100)),
        marginBottom: scaleSize(normalize(10)),

        fontFamily: 'Mulish_600SemiBold',
        color: theme.textPrimary,
        backgroundColor: theme.field,
    },
    imagePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.field,
        padding: scaleSize(normalize(12)),
        borderRadius: scaleSize(normalize(8)),
        marginBottom: scaleSize(normalize(8)),
    },
    imagePickerButtonText: {
        fontFamily: 'Mulish_600SemiBold',
        fontSize: scaleSize(normalize(14)),
        marginRight: scaleSize(normalize(10)),
        color: theme.textPrimary,
    },
    imagePreviewContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: scaleSize(normalize(10)),
    },
    imageWrapper: {
        position: 'relative',
        marginRight: scaleSize(normalize(10)),
        marginBottom: scaleSize(normalize(10)),
    },
    imagePreview: {
        width: scaleSize(normalize(50)),
        height: scaleSize(normalize(50)),
        borderRadius: scaleSize(normalize(8)),
    },
    removeImageButton: {
        position: 'absolute',
        top: scaleSize(normalize(-5)),
        right: scaleSize(normalize(-5)),
        backgroundColor: 'red',
        borderRadius: scaleSize(normalize(10)),
        padding: scaleSize(normalize(2)),
    },
    submitButton: {
        backgroundColor: theme.primary,
        paddingVertical: scaleSize(normalize(13)),
        borderRadius: scaleSize(normalize(8)),
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontFamily: 'Mulish_800ExtraBold',
        fontSize: scaleSize(normalize(15)),
    },
});
