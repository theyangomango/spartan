/**
 * Handles MediaLibrary for choosing an image
 * * Involves MediaLibrary permissions
 */

import React, { useEffect, useState } from "react";
import {
    Image,
    StyleSheet,
    View,
    TouchableOpacity,
    Dimensions,
    FlatList,
    Modal,
    StatusBar
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import { EvilIcons } from "@expo/vector-icons";
import PostStoryScreen from "./PostStoryScreen";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function MediaLibraryScreen({ closeModal, onSelectImage }) {
    // Local state for photos & selected image
    const [photos, setPhotos] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);

    // Request permissions and fetch photos on mount
    useEffect(() => {
        (async () => {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== "granted") {
                alert("Permission to access media library denied");
                return;
            }
            const media = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.photo,
                first: 10000 // First 10000 photos in camera roll
            });
            setPhotos(media.assets);
        })();
    }, []);

    // Close entire Media Library screen
    function handlePressCloseButton() {
        closeModal();
    }

    // Deselect currently chosen image
    function deselectImage() {
        setSelectedImage(null);
    }

    // Render each photo as a touchable thumbnail
    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => {
                setSelectedImage(item.uri);
                onSelectImage(item.uri);
            }}
        >
            <Image source={{ uri: item.uri }} style={styles.image} />
        </TouchableOpacity>
    );

    // Custom header with close button
    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity style={styles.close_button_ctnr} onPress={handlePressCloseButton}>
                <EvilIcons name="close" size={30} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            {renderHeader()}

            {/* Photo Grid */}
            <FlatList
                data={photos}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                numColumns={3}
                contentContainerStyle={styles.imageList}
                ListHeaderComponent={<View style={{ height: 95 }} />}
            />

            {/* Display selected image in PostStoryScreen modal */}
            <Modal
                visible={!!selectedImage}
                transparent
                onRequestClose={deselectImage}
                animationType="fade"
            >
                <PostStoryScreen selectedImage={selectedImage} goBack={deselectImage} />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    close_button_ctnr: {
        position: "absolute",
        top: 40,
        left: 23,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 100,
        backgroundColor: "#rgba(0, 0, 0, 0.1)"
    },
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1,
        height: 95,
        alignItems: "flex-end",
        justifyContent: "center",
        flexDirection: "row",
        paddingHorizontal: 10,
        backgroundColor: "rgba(25,25,25,0.9)"
    },
    imageContainer: {
        width: SCREEN_WIDTH / 3,
        aspectRatio: 0.5,
        overflow: "hidden"
    },
    image: {
        flex: 1,
        resizeMode: "cover"
    },
    imageList: {
        flexGrow: 1
    }
});
