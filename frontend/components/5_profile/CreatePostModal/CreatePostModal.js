import { useState, useEffect } from 'react';
import { Button, Text, SafeAreaView, ScrollView, StyleSheet, Image, View, Platform, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons'
import * as MediaLibrary from 'expo-media-library';
import Photo from './Photo';

export default function CreatePostModal({ closeModal }) {
    const [assets, setAssets] = useState([]);
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

    return (
        <View style={styles.container}>
            <View style={styles.header_ctnr}>
                <View style={styles.close_icon_ctnr}>
                    <TouchableOpacity onPress={closeModal}>
                        <AntDesign name='close' size={24} />
                    </TouchableOpacity>
                </View>
                <View style={styles.header_text_ctnr}>
                    <Text style={styles.title_text}>New Post</Text>
                </View>
                <View style={styles.next_icon_ctnr}>
                    <TouchableOpacity>
                        <AntDesign name='right' size={24} />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.preview_ctnr}>
            </View>

            <View style={styles.images_header_ctnr}>
                <Text style={styles.images_header_text}>Photos</Text>
            </View>
            <ScrollView style={styles.images_scrollview}>
                <View style={styles.images_ctnr}>
                    {assets && assets.map((asset, index) => (
                        <Photo
                            uri={asset.uri}
                            images={images}
                            setImages={setImages}
                            key={index}
                        />
                    ))}
                </View>
            </ScrollView>

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
        paddingHorizontal: 18
    },
    title_text: {
        fontFamily: 'Inter_700Bold',
        fontSize: 18,
        padding: 10,
    },
    preview_ctnr: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#aaa'
    },
    images_header_ctnr: {

    },
    images_header_text: {
        fontFamily: 'Inter_700Bold',
        fontSize: 18,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    images_ctnr: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
});
