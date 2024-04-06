import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

export default function Profile () {
    return (
        <View style={styles.main_ctnr}>
            <Text>Profile</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1
    }
});