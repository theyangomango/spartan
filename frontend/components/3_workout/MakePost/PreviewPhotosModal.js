import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import PreviewPhoto from './PreviewPhoto';

const PreviewPhotosModal = ({ assets, images, setImages }) => {
    const renderPhoto = ({ item }) => (
        <PreviewPhoto
            uri={item.uri}
            images={images}
            setImages={setImages}
        />
    );

    return (
        <FlatList
            data={assets}
            renderItem={renderPhoto}
            keyExtractor={(item, index) => index.toString()}
            numColumns={3}
            contentContainerStyle={styles.images_ctnr}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            style={styles.flatlist}
        />
    );
}

const styles = StyleSheet.create({
    flatlist: {
        backgroundColor: '#e7e7e7',
    },
    images_header_ctnr: {},
    images_header_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 18,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
});

export default PreviewPhotosModal;
