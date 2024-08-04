import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import Photo from './Photo';

const PhotosModal = ({ assets, images, setImages }) => {
    return (
        <>
            {/* <View style={styles.images_header_ctnr}>
                <Text style={styles.images_header_text}>Photos</Text>
            </View> */}
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
        </>
    );
}

const styles = StyleSheet.create({
    images_scrollview: {
        backgroundColor: '#e7e7e7'
    },
    images_header_ctnr: {},
    images_header_text: {
        fontFamily: 'Mulish_700Bold',
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

export default PhotosModal;
