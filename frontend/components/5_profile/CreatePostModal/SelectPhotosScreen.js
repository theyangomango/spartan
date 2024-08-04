import { useState, useEffect } from 'react';
import { Button, Text, SafeAreaView, ScrollView, StyleSheet, Image, View, Platform, TouchableOpacity } from 'react-native';
import { FontAwesome6, Ionicons, Entypo } from '@expo/vector-icons'
import * as MediaLibrary from 'expo-media-library';
import PhotosBottomSheet from './PhotosBottomSheet';

export default function SelectPhotosScreen({ navigation, route }) {
    const { userData } = route.params;
    const [assets, setAssets] = useState(null);
    const [images, setImages] = useState([]);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

    useEffect(() => {
        getAssets();
    }, [])

    async function getAssets() {
        if (!permissionResponse || permissionResponse.status !== 'granted') {
            await requestPermission();
        }
        const fetchedObj = await MediaLibrary.getAssetsAsync();
        setAssets(fetchedObj.assets);
    }

    function goBack() {
        navigation.goBack();
    }

    function next() {
        navigation.navigate('PostOptions', {
            userData: userData,
            images: images
        });
    }

    return (
        <View style={styles.container}>
            <View style={styles.header_ctnr}>
                <View style={styles.close_icon_ctnr}>
                    <TouchableOpacity onPress={goBack}>
                        <Ionicons name='close' size={23} color={'#aaa'} />
                    </TouchableOpacity>
                </View>
                <View style={styles.header_text_ctnr}>
                    <Text style={styles.title_text}>New Post</Text>
                </View>
                <View style={styles.next_icon_ctnr}>
                    <TouchableOpacity onPress={next}>
                        <FontAwesome6 name='chevron-right' size={17} color={images.length > 0 ? '#0699FF' : '#aaa'} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.preview_ctnr}>
                {assets && <Image
                    source={{ uri: images.length > 0 ? images[images.length - 1] : (assets.length > 0 && assets[0].uri) }}
                    style={styles.preview_image}
                />}
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
