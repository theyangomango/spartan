import { useState, useEffect } from 'react';
import { Button, Text, SafeAreaView, ScrollView, StyleSheet, Image, View, Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

export default function CreatePostModal() {
    const [assets, setAssets] = useState([]);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

    async function getAssets() {
        if (!permissionResponse || permissionResponse.status !== 'granted') {
            await requestPermission();
        }
        const fetchedObj = await MediaLibrary.getAssetsAsync();
        setAssets(fetchedObj.assets);
        // console.log(fetchedAlbums);

        console.log(fetchedObj.assets);
    }

    useEffect(() => {
        getAssets();
    }, [])

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.images_ctnr}>
                {assets && assets.map((asset, index) => (
                    <View style={styles.image_ctnr} key={index}>
                        <Image source={{ uri: asset.uri }} style={styles.image} />
                    </View>
                ))}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    images_ctnr: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: 'blue',
    },
    image_ctnr: {
        width: `${100 / 3}%`,
        aspectRatio: 1
    },
    image: {
        flex: 1
    }
});
