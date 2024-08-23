import { Image, StyleSheet, Text, TouchableOpacity, View, Dimensions } from "react-native";
import { FontAwesome6 } from '@expo/vector-icons';

const { width, height } = Dimensions.get("window");

// Function to determine the styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            pfpSize: 65,
            pfpBorderRadius: 28,
            borderWidth: 3.5,
            fontSize: 14,
            createIconSize: 13,
            createIconPosition: { top: 40, right: 7 },
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            pfpSize: 60,
            pfpBorderRadius: 26,
            borderWidth: 3,
            fontSize: 12.5,
            createIconSize: 12,
            createIconPosition: { top: 37, right: 5 },
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            pfpSize: 58,
            pfpBorderRadius: 25,
            borderWidth: 2.8,
            fontSize: 12,
            createIconSize: 11,
            createIconPosition: { top: 36, right: 4 },
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            pfpSize: 55,
            pfpBorderRadius: 24,
            borderWidth: 2.5,
            fontSize: 11,
            createIconSize: 10,
            createIconPosition: { top: 35, right: 4 },
        };
    }
};

const dynamicStyles = getDynamicStyles();

export default function Story({ data, handlePress, index, isViewed, handlePressCreateButton }) {
    return (
        <View style={styles.main_ctnr}>
            <TouchableOpacity disabled={data.stories.length === 0} onPress={handlePress} activeOpacity={0.5}>
                <View style={data.stories.length === 0 ? styles.pfp_no_border : [styles.pfp_ctnr, isViewed && styles.pfp_ctnr_viewed]}>
                    <Image source={{ uri: data.pfp }} style={styles.pfp} />
                </View>
            </TouchableOpacity>
            <View style={styles.handle_ctnr}>
                <Text style={styles.handle_text}>{data.handle}</Text>
            </View>
            {index === 0 &&
                <TouchableOpacity onPress={handlePressCreateButton} activeOpacity={0.7} style={[styles.create_icon, dynamicStyles.createIconPosition]}>
                    <FontAwesome6 name='plus' size={dynamicStyles.createIconSize} color={'#222'} />
                </TouchableOpacity>
            }
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: dynamicStyles.pfpSize + 17,
        height: dynamicStyles.pfpSize + 26,
        alignItems: 'center',
    },
    handle_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: dynamicStyles.fontSize,
        paddingTop: 4,
        marginLeft: 3,
        color: '#666'
    },
    pfp_ctnr: {
        width: dynamicStyles.pfpSize,
        aspectRatio: 1,
        borderRadius: dynamicStyles.pfpBorderRadius,
        borderWidth: dynamicStyles.borderWidth,
        borderColor: '#2D9EFF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    pfp_no_border: {
        width: dynamicStyles.pfpSize,
        aspectRatio: 1,
        borderRadius: dynamicStyles.pfpBorderRadius,
        borderWidth: dynamicStyles.borderWidth,
        borderColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center'
    },
    pfp_ctnr_viewed: {
        borderColor: '#BEE1FF',
    },
    pfp: {
        width: dynamicStyles.pfpSize - 10.5,
        aspectRatio: 1,
        borderRadius: dynamicStyles.pfpBorderRadius - 4,
    },
    create_icon: {
        position: 'absolute',
        backgroundColor: '#FCF375',
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5
    }
});
