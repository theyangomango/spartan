import { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Image, Dimensions, SafeAreaView } from 'react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import Gallery from 'react-native-awesome-gallery';
import PreviewPhotosBottomSheet from './PreviewPhotosBottomSheet';

const screenHeight = Dimensions.get('window').height;
const scale = screenHeight / 844; // Scaling based on iPhone 13 screen height

const scaledSize = (size) => Math.round(size * scale);

export default function SelectPhotosScreen({ navigation, route }) {
    const [assets, setAssets] = useState([]);
    const [images, setImages] = useState([]);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

    useEffect(() => {
        getAssets();
    }, []);

    async function getAssets() {
        if (!permissionResponse || permissionResponse.status !== 'granted') {
            await requestPermission();
        }
        const fetchedObj = await MediaLibrary.getAssetsAsync({ mediaType: ['photo'], first: 10000 });
        setAssets(fetchedObj.assets);
    }

    function goBack() {
        navigation.navigate('ProfileStack', { screen: 'Profile' });
    }

    function next() {
        if (images.length === 0) return;
        navigation.navigate('PostOptions', {
            userData: global.userData,
            images: images,
            workout: (('workout' in route.params) ? route.params.workout : null)
        });
    }

    const selectedImages = images.length > 0 ? images.map((img, index) => ({ uri: img })) : assets.map((asset) => ({ uri: asset.uri }));

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header_ctnr}>
                <TouchableOpacity onPress={goBack}>
                    <View style={styles.close_icon_ctnr}>
                        <Ionicons name='close' size={scaledSize(23)} color={'#aaa'} />
                    </View>
                </TouchableOpacity>
                <View style={styles.header_text_ctnr}>
                    <Text style={styles.title_text}>New Post</Text>
                </View>
                <TouchableOpacity onPress={next}>
                    <View style={styles.next_icon_ctnr}>
                        <FontAwesome6 name='chevron-right' size={scaledSize(17)} color={images.length > 0 ? '#0699FF' : '#aaa'} />
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.preview_ctnr}>
                {selectedImages.length > 0 ? (
                    <Gallery
                        data={selectedImages}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item, setImageDimensions }) => (
                            <Image
                                source={{ uri: item.uri }}
                                style={{ width: '100%', aspectRatio: 0.8 }}
                                onLoad={(e) => {
                                    const { width, height } = e.nativeEvent.source;
                                    setImageDimensions({ width, height });
                                }}
                            />
                        )}
                        displayName={false}
                        showThumbs={false}
                        activeImage={0}
                        initialIndex={0}
                        emptySpaceWidth={0}
                        disableVerticalSwipe
                        pinchEnabled={false}
                    />
                ) : assets.length > 0 ? (
                    <Image
                        source={{ uri: assets[0].uri }}
                        style={{ width: '100%', aspectRatio: 0.8 }}
                    />
                ) : null}
            </View>

            <PreviewPhotosBottomSheet assets={assets} images={images} setImages={setImages} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f3f3'
    },
    header_ctnr: {
        alignItems: 'center',
        paddingHorizontal: scaledSize(5),
        paddingTop: scaledSize(5),
        paddingBottom: scaledSize(15),
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f3f3f3'
    },
    close_icon_ctnr: {
        paddingHorizontal: scaledSize(18)
    },
    header_text_ctnr: {
    },
    next_icon_ctnr: {
        paddingHorizontal: scaledSize(23)
    },
    title_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(16),
    },
    preview_ctnr: {
        width: '100%',
        aspectRatio: 0.8,
        backgroundColor: '#aaa'
    },
    preview_image: {
        flex: 1
    }
});
