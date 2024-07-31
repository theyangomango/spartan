import React, { useEffect, useState } from 'react';
import { Image, ActivityIndicator, View, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

const CachedImage = ({ source, style }) => {
    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadImage = async () => {
            try {
                // Load the asset using Expo's Asset module
                const asset = Asset.fromModule(source);
                await asset.downloadAsync();

                // Get the local file system path
                const localUri = `${FileSystem.cacheDirectory}${asset.name}`;

                // Check if the image is already cached
                const fileInfo = await FileSystem.getInfoAsync(localUri);
                if (!fileInfo.exists) {
                    // Download and cache the image
                    await FileSystem.downloadAsync(asset.uri, localUri);
                }

                // Set the local URI as the image source
                setImageUri(localUri);
            } catch (error) {
                console.warn(error);
            } finally {
                setLoading(false);
            }
        };

        loadImage();
    }, [source]);

    if (loading) {
        return (
            <View style={[styles.loadingContainer, style]}>
                <ActivityIndicator size="small" color="#0000ff" />
            </View>
        );
    }

    return <Image source={{ uri: imageUri }} style={style} />;
};

const styles = StyleSheet.create({
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default CachedImage;
