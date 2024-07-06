// import React, { useState } from 'react';
// import { Button, Image, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';

// export default function CreateStoryScreen() {
//     const [image, setImage] = useState(null);

//     const pickImage = async () => {
//         // Request permission to access the media library
//         const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
//         if (status !== 'granted') {
//             alert('Sorry, we need camera roll permissions to make this work!');
//             return;
//         }

//         // Launch the image picker
//         const result = await ImagePicker.launchImageLibraryAsync({
//             mediaTypes: ImagePicker.MediaTypeOptions.Images,
//             allowsEditing: true,
//             aspect: [4, 3],
//             quality: 1,
//         });

//         if (!result.canceled) {
//             setImage(result.assets[0].uri);
//         }
//     };

//     return (
//         <View style={styles.main_ctnr}>
//             <TouchableOpacity onPress={pickImage} style={styles.pickImageButton}>
//                 <Text style={styles.pickImageButtonText}>Pick an image from gallery</Text>
//             </TouchableOpacity>
//             {image && <Image source={{ uri: image }} style={styles.image} />}
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     main_ctnr: {
//         flex: 1,
//         backgroundColor: 'red',
//         borderTopLeftRadius: 20,
//         borderTopRightRadius: 20,
//         padding: 20,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     pickImageButton: {
//         backgroundColor: '#2196F3',
//         padding: 10,
//         borderRadius: 5,
//         marginBottom: 20,
//     },
//     pickImageButtonText: {
//         color: '#fff',
//         fontSize: 16,
//     },
//     image: {
//         width: 300,
//         height: 300,
//         borderRadius: 10,
//     },
// });
