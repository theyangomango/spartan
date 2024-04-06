import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

export default function Feed () {
    return (
        <View style={styles.main_ctnr}>
            <Text>Feed</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1
    }
});