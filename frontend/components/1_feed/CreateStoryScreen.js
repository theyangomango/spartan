import React, { useEffect, useState, useRef } from 'react';
import { Image, StyleSheet, View, TouchableOpacity, Text, Dimensions, FlatList, Modal, StatusBar } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Camera } from 'expo-camera';
import { EvilIcons } from '@expo/vector-icons';
import PostStoryScreen from './PostStoryScreen';

const windowWidth = Dimensions.get('window').width;

export default function CreateStoryScreen({ closeModal }) {
    const [photos, setPhotos] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [hasCameraPermission, setHasCameraPermission] = useState(null);
    const cameraRef = useRef(null);

    useEffect(() => {
        (async () => {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission to access media library denied');
                return;
            }

            const media = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.photo,
                first: 20, // Adjust the number of photos you want to fetch
            });
            setPhotos(media.assets);
        })();
    }, []);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasCameraPermission(status === 'granted');
        })();
    }, []);

    function handlePressCloseButton() {
        closeModal();
    }

    function handleTakePicture() {
        if (cameraRef.current) {
            cameraRef.current.takePictureAsync()
                .then(photo => {
                    setSelectedImage(photo.uri);
                })
                .catch(error => {
                    console.log('Error taking picture: ', error);
                });
        }
    }

    function deselectImage() {
        setSelectedImage(null);
    }

    const renderItem = ({ item }) => {
        if (item.id === 'camera') {
            return (
                <TouchableOpacity
                    style={[styles.imageContainer, styles.cameraContainer]}
                    onPress={hasCameraPermission ? handleTakePicture : undefined}
                >
                    {hasCameraPermission ? (
                        <Camera
                            style={styles.camera}
                            type={Camera.Constants.Type.back}
                            ref={cameraRef}
                        >
                            <View style={styles.cameraInner}>
                                <TouchableOpacity style={styles.cameraButton} onPress={handleTakePicture}>
                                    <Text style={styles.cameraButtonText}>Take Photo</Text>
                                </TouchableOpacity>
                            </View>
                        </Camera>
                    ) : (
                        <Text style={styles.cameraPermissionText}>No access to camera</Text>
                    )}
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                style={styles.imageContainer}
                onPress={() => setSelectedImage(item.uri)}
            >
                <Image source={{ uri: item.uri }} style={styles.image} />
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity style={styles.close_button_ctnr} onPress={handlePressCloseButton}>
                <EvilIcons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Post to Story</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            {renderHeader()}
            <FlatList
                data={[{ id: 'camera' }, ...photos]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderItem({ item })}
                numColumns={3}
                contentContainerStyle={styles.imageList}
                ListHeaderComponent={<View style={{ height: 95 }} />}
            />
            <Modal
                visible={!!selectedImage}
                transparent={true}
                onRequestClose={() => setSelectedImage(null)}
                animationType='fade'
            >
                <PostStoryScreen selectedImage={selectedImage} goBack={deselectImage} />
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
        top: 65,
        left: 17,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1,
        height: 95,
        alignItems: 'flex-end',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingHorizontal: 10,
        backgroundColor: 'rgba(25,25,25,0.9)',
    },
    headerText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
        fontFamily: 'Lato_700Bold',
        padding: 11.5,
        letterSpacing: 0.25,
    },
    imageContainer: {
        width: windowWidth / 3,
        aspectRatio: 0.5,
        overflow: 'hidden',
    },
    image: {
        flex: 1,
        resizeMode: 'cover',
    },
    imageList: {
        flexGrow: 1,
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    camera: {
        width: '100%',
        aspectRatio: 0.5,
    },
    cameraInner: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 20,
    },
    cameraButton: {
        backgroundColor: '#fff',
        borderRadius: 25,
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    cameraButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    cameraPermissionText: {
        color: '#fff',
        fontSize: 16,
    },
});
