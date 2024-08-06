import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function ButtonRow({ buttons, selectedButton, setSelectedButton, newLikes, newComments }) {
    return (
        <View style={styles.buttonRowContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.buttonRow}>
                {buttons.map((button) => (
                    <RNBounceable
                        key={button}
                        style={[
                            styles.button,
                            selectedButton === button && styles.selectedButton
                        ]}
                        onPress={() => setSelectedButton(button)}
                    >
                        <Text
                            style={[
                                styles.buttonText,
                                selectedButton === button && styles.selectedButtonText
                            ]}
                        >
                            {button}
                        </Text>
                        {(button === 'Likes' && newLikes > 0) && (
                            <View style={styles.badgeContainer}>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{newLikes}</Text>
                                </View>
                            </View>
                        )}
                        {(button === 'Comments' && newComments > 0) && (
                            <View style={styles.badgeContainer}>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{newComments}</Text>
                                </View>
                            </View>
                        )}
                    </RNBounceable>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    buttonRowContainer: {},
    buttonRow: {
        paddingTop: 30,
        paddingBottom: 9,
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    button: {
        backgroundColor: '#f3f3f3',
        paddingVertical: 13.5,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginRight: 8,
        position: 'relative', // Needed to position the badge
    },
    selectedButton: {
        backgroundColor: '#000',
    },
    buttonText: {
        color: '#000',
        fontSize: 12.5,
        fontFamily: 'Outfit_600SemiBold',
    },
    selectedButtonText: {
        color: '#fff',
    },
    badgeContainer: {
        position: 'absolute',
        alignItems: 'center',
        left: 0,
        right: 0,
        top: -12,
    },
    badge: {
        backgroundColor: '#FF387E',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontFamily: 'Outfit_600SemiBold',
    },
});
