import { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import Gallery from 'react-native-awesome-gallery';
import PhotosBottomSheet from './PhotosBottomSheet';

const { width, height } = Dimensions.get('screen');

export default function SelectPhotosScreen({ navigation, route }) {
    const { userData } = route.params;
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
        const fetchedObj = await MediaLibrary.getAssetsAsync({ mediaType: 'photo', first: 10000 });
        setAssets(fetchedObj.assets);
    }

    function goBack() {
        navigation.goBack();
    }

    function next() {
        if (images.length === 0) return;
        navigation.navigate('PostOptions', {
            userData: userData,
            images: images
        });
    }

    const selectedImages = images.map((img, index) => ({ uri: img }));

    return (
        <View style={styles.container}>
            <View style={styles.header_ctnr}>
                <TouchableOpacity onPress={goBack}>
                    <View style={styles.close_icon_ctnr}>
                        <Ionicons name='close' size={23} color={'#aaa'} />
                    </View>
                </TouchableOpacity>
                <View style={styles.header_text_ctnr}>
                    <Text style={styles.title_text}>New Post</Text>
                </View>
                <TouchableOpacity onPress={next}>
                    <View style={styles.next_icon_ctnr}>
                        <FontAwesome6 name='chevron-right' size={17} color={images.length > 0 ? '#0699FF' : '#aaa'} />
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.preview_ctnr}>
                {selectedImages.length > 0 && (
                    <Gallery
                        data={selectedImages}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item, setImageDimensions }) => (
                            <Image
                                source={{ uri: item.uri }}
                                style={{ width: '100%', aspectRatio: 0.8 }}
                                onLoad={(e) => {
                                    // const { width, height } = e.nativeEvent.source;
                                    // setImageDimensions({ width: 100, height: 100 });
                                }}
                            />
                        )}
                        displayName={false}
                        showThumbs={false}
                        activeImage={0}
                        emptySpaceWidth={0}
                        disableVerticalSwipe
                        pinchEnabled={false}
                    />
                )}
            </View>

            <PhotosBottomSheet assets={assets} images={images} setImages={setImages} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header_ctnr: {
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: 5,
        paddingBottom: 4,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    close_icon_ctnr: {
        paddingHorizontal: 18
    },
    header_text_ctnr: {
        alignItems: 'center',
    },
    next_icon_ctnr: {
        paddingHorizontal: 23
    },
    title_text: {
        padding: 10,
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
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
