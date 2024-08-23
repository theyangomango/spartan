import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';

const { width, height } = Dimensions.get('window');

// Function to determine the styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            buttonPaddingVertical: 15,
            buttonPaddingHorizontal: 22,
            buttonFontSize: 14,
            badgePaddingHorizontal: 9,
            badgePaddingVertical: 6,
            badgeFontSize: 11,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            buttonPaddingVertical: 14,
            buttonPaddingHorizontal: 20,
            buttonFontSize: 13,
            badgePaddingHorizontal: 8,
            badgePaddingVertical: 5,
            badgeFontSize: 10,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            buttonPaddingVertical: 13.5,
            buttonPaddingHorizontal: 19,
            buttonFontSize: 12.5,
            badgePaddingHorizontal: 7,
            badgePaddingVertical: 5,
            badgeFontSize: 10,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            buttonPaddingVertical: 13,
            buttonPaddingHorizontal: 18,
            buttonFontSize: 12,
            badgePaddingHorizontal: 7,
            badgePaddingVertical: 5,
            badgeFontSize: 9.5,
        };
    }
};

const dynamicStyles = getDynamicStyles();

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
        paddingVertical: dynamicStyles.buttonPaddingVertical,
        paddingHorizontal: dynamicStyles.buttonPaddingHorizontal,
        borderRadius: 20,
        marginRight: 8,
        position: 'relative', // Needed to position the badge
    },
    selectedButton: {
        backgroundColor: '#000',
    },
    buttonText: {
        color: '#000',
        fontSize: dynamicStyles.buttonFontSize,
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
        paddingHorizontal: dynamicStyles.badgePaddingHorizontal,
        paddingVertical: dynamicStyles.badgePaddingVertical,
    },
    badgeText: {
        color: 'white',
        fontSize: dynamicStyles.badgeFontSize,
        fontFamily: 'Outfit_600SemiBold',
    },
});
