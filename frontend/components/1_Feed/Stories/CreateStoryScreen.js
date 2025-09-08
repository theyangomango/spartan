/**
 * Handles Camera for capturing an image
 * Controls MediaLibraryScreen modal - opens if user selects to upload from their device
 * * Involves Camera permissions
 */

import React, { useEffect, useState, useRef } from "react";
import {
    StyleSheet,
    View,
    TouchableOpacity,
    Dimensions,
    Modal,
    StatusBar,
    Text,
    Animated
} from "react-native";
import { Camera } from "expo-camera";
import { EvilIcons, Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView, PinchGestureHandler, State } from "react-native-gesture-handler";

import PostStoryScreen from "./PostStoryScreen";
import MediaLibraryScreen from "./MediaLibraryScreen";

// Constants for screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CreateStoryScreen({ closeModal, postStoryToFeeds }) {
    // Camera permissions + config
    const [hasCameraPermission, setHasCameraPermission] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);

    // Camera states
    const [zoom, setZoom] = useState(0), [lastZoom, setLastZoom] = useState(0);
    const [showMediaLibrary, setShowMediaLibrary] = useState(false);
    const [focusSquare, setFocusSquare] = useState({ visible: false, x: 0, y: 0 });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastTap, setLastTap] = useState(null);

    // Refs
    const cameraRef = useRef(null);
    const scaleValue = useRef(new Animated.Value(1)).current;

    // Ask for camera permission once
    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasCameraPermission(status === "granted");
        })();
    }, []);

    // Disable camera preview if user selected an image
    useEffect(() => {
        if (selectedImage) setIsCameraActive(false);
    }, [selectedImage]);

    // Close modal
    function handlePressCloseButton() {
        closeModal();
    }

    // Capture photo
    async function handleTakePicture() {
        if (!cameraRef.current) return;
        const photo = await cameraRef.current.takePictureAsync({
            quality: 1,
            base64: true,
            skipProcessing: false
        });
        setSelectedImage(photo.uri);
    }

    // Switch between front/back camera
    function toggleCameraType() {
        setCameraType(prev => (prev === Camera.Constants.Type.back
            ? Camera.Constants.Type.front
            : Camera.Constants.Type.back));
    }

    // Reset after user deselects an image
    function deselectImage() {
        setSelectedImage(null);
        setIsCameraActive(true);
    }

    // Handle pinch-to-zoom gesture
    const handlePinchEvent = event => {
        if (!cameraRef.current || !event.nativeEvent) return;
        const { scale } = event.nativeEvent;
        const newZoom = Math.max(0, Math.min(lastZoom + (scale - 1) * 0.2, 1));
        setZoom(newZoom);
    };
    const handlePinchEnd = () => setLastZoom(zoom);

    // Select image from gallery
    const handleSelectImage = uri => {
        setSelectedImage(uri);
        setShowMediaLibrary(false);
    };

    // Focus animation on tap
    const handleTouch = event => {
        const now = Date.now(), DOUBLE_PRESS_DELAY = 300;
        if (lastTap && now - lastTap < DOUBLE_PRESS_DELAY) return;
        setLastTap(now);

        const { locationX, locationY } = event.nativeEvent;
        if (locationY >= SCREEN_HEIGHT * 0.8) return; // ignore bottom area taps

        setFocusSquare({ visible: true, x: locationX, y: locationY });
        scaleValue.setValue(1.5);
        Animated.timing(scaleValue, { toValue: 1, duration: 150, useNativeDriver: true }).start(() => {
            setTimeout(() => setFocusSquare(v => ({ ...v, visible: false })), 300);
        });

        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 100);
    };

    // Open/close gallery
    function handlePressGallery() {
        setShowMediaLibrary(true);
    }
    function handleCloseGallery() {
        setShowMediaLibrary(false);
    }

    // Check camera permission
    if (hasCameraPermission === null) return <View />;
    if (hasCameraPermission === false) return <Text>No access to camera</Text>;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                <StatusBar hidden />

                {/* Camera preview */}
                {isCameraActive && !selectedImage && (
                    <PinchGestureHandler
                        onGestureEvent={handlePinchEvent}
                        onHandlerStateChange={({ nativeEvent }) => {
                            if (nativeEvent.state === State.END) handlePinchEnd();
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <Camera
                                style={styles.camera}
                                type={cameraType}
                                ref={cameraRef}
                                zoom={zoom}
                                ratio="16:9"
                                autoFocus={
                                    isRefreshing
                                        ? Camera.Constants.AutoFocus.off
                                        : Camera.Constants.AutoFocus.on
                                }
                                onStartShouldSetResponder={() => true}
                                onResponderRelease={handleTouch}
                            >
                                {/* Header with close button */}
                                <View style={styles.header}>
                                    <TouchableOpacity style={styles.closeButton} onPress={handlePressCloseButton}>
                                        <EvilIcons name="close" size={30} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                {/* Camera controls */}
                                <View style={styles.cameraInner}>
                                    <TouchableOpacity style={styles.cameraButton} onPress={handleTakePicture}>
                                        <View style={styles.innerCameraButton} />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.switchButton} onPress={toggleCameraType}>
                                        <Ionicons name="camera-reverse" size={30} color="#fff" />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.galleryButton} onPress={handlePressGallery}>
                                        <Ionicons name="images" size={30} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                {/* Focus indicator */}
                                {focusSquare.visible && (
                                    <Animated.View
                                        style={[
                                            styles.focusSquare,
                                            {
                                                top: focusSquare.y - 60,
                                                left: focusSquare.x - 60,
                                                transform: [{ scale: scaleValue }]
                                            }
                                        ]}
                                    >
                                        <View style={[styles.focusLineVertical, { top: 0, left: "50%" }]} />
                                        <View style={[styles.focusLineVertical, { bottom: 0, left: "50%" }]} />
                                        <View style={[styles.focusLineHorizontal, { left: 0, top: "50%" }]} />
                                        <View style={[styles.focusLineHorizontal, { right: 0, top: "50%" }]} />
                                    </Animated.View>
                                )}
                            </Camera>
                        </View>
                    </PinchGestureHandler>
                )}

                {/* Post captured image modal */}
                <Modal
                    visible={!!selectedImage}
                    transparent
                    onRequestClose={deselectImage}
                    animationType="fade"
                >
                    <PostStoryScreen
                        selectedImage={selectedImage}
                        goBack={deselectImage}
                        endStoryCreation={closeModal}
                        postStoryToFeeds={postStoryToFeeds}
                    />
                </Modal>

                {/* Media library modal */}
                <Modal visible={showMediaLibrary} transparent animationType="slide">
                    <MediaLibraryScreen
                        closeModal={handleCloseGallery}
                        onSelectImage={handleSelectImage}
                    />
                </Modal>
            </View>
        </GestureHandlerRootView>
    );
}

// Styles
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    camera: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
    cameraInner: {
        flex: 1,
        backgroundColor: "transparent",
        justifyContent: "flex-end",
        alignItems: "center",
        marginBottom: 20
    },
    cameraButton: {
        width: 76,
        aspectRatio: 1,
        borderRadius: 100,
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20
    },
    innerCameraButton: {
        position: "absolute",
        width: 66,
        aspectRatio: 1,
        borderRadius: 100,
        backgroundColor: "#fff"
    },
    header: {
        position: "absolute",
        top: 40,
        left: 23,
        zIndex: 1
    },
    closeButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 100,
        backgroundColor: "rgba(0, 0, 0, 0.1)"
    },
    switchButton: {
        position: "absolute",
        bottom: 30,
        right: 30,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 25,
        padding: 10
    },
    galleryButton: {
        position: "absolute",
        bottom: 30,
        left: 30,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 25,
        padding: 10
    },
    focusSquare: {
        position: "absolute",
        width: 80,
        aspectRatio: 1,
        borderWidth: 1,
        borderColor: "yellow",
        backgroundColor: "transparent",
        justifyContent: "center",
        alignItems: "center"
    },
    focusLineVertical: {
        position: "absolute",
        width: 1,
        height: 8,
        backgroundColor: "yellow"
    },
    focusLineHorizontal: {
        position: "absolute",
        height: 1,
        width: 8,
        backgroundColor: "yellow"
    }
});
