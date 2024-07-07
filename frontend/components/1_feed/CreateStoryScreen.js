import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, TouchableOpacity, Text, Dimensions, FlatList, Modal, TouchableWithoutFeedback, StatusBar } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { EvilIcons, FontAwesome } from '@expo/vector-icons'; // Importing Ionicons from Expo's library
import PostStoryScreen from './PostStoryScreen';

const windowWidth = Dimensions.get('window').width;


export default function CreateStoryScreen({ closeModal }) {
    const [photos, setPhotos] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        (async () => {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === 'granted') {
                const media = await MediaLibrary.getAssetsAsync({
                    mediaType: MediaLibrary.MediaType.photo,
                    first: 20, // Adjust the number of photos you want to fetch
                });
                setPhotos(media.assets);
            } else {
                alert('Permission to access media library denied');
            }
        })();
    }, []);

    const renderItem = ({ item, index }) => {
        // Render the placeholder at the first position in the grid
        if (item.id === 'placeholder') {
            return (
                <View style={[styles.imageContainer, styles.placeholder]}>
                    <Text style={styles.placeholderText}>Placeholder</Text>
                </View>
            );
        }

        return (
            <TouchableOpacity
                activeOpacity={0.5}
                onPress={() => setSelectedImage(item.uri)} // Handle image selection
                style={styles.imageContainer}
            >
                <Image source={{ uri: item.uri }} style={styles.image} />
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.5} style={styles.close_button_ctnr} onPress={handlePressCloseButton}>
                <EvilIcons name="close" size={25} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Post to Story</Text>
        </View>
    );

    function handlePressCloseButton() {
        closeModal();
    }

    function deselectImage() {
        setSelectedImage(null);
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            {renderHeader()}
            <FlatList
                showsVerticalScrollIndicator={false}
                data={[{ id: 'placeholder' }, ...photos]} // Add a placeholder item at the beginning of the data
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => renderItem({ item, index })}
                numColumns={3} // Display 3 columns
                contentContainerStyle={styles.imageList}
                style={styles.flatlist}
            />
            <Modal
                visible={!!selectedImage}
                transparent={true}
                onRequestClose={() => setSelectedImage(null)}
            >
                <PostStoryScreen selectedImage={selectedImage} goBack={deselectImage}/>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    close_button_ctnr: {
        position: 'absolute',
        top: 50,
        left: 17
    },
    header: {
        height: 85,
        alignItems: 'flex-end',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingHorizontal: 10, // Add padding to align content properly
    },
    headerText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Inter_600SemiBold',
        padding: 15,
    },
    imageContainer: {
        width: windowWidth / 3, // Adjust margin based on number of columns
        aspectRatio: 0.5, // Height to width ratio of 2
        overflow: 'hidden',
    },
    image: {
        flex: 1,
        resizeMode: 'cover',
    },
    imageList: {},
    placeholder: {
        backgroundColor: 'red',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#fff',
        fontSize: 16,
    },
});
