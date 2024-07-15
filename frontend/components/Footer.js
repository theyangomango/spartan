import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Home, Cup, Weight, SearchNormal1, Profile } from 'iconsax-react-native';
import { BlurView } from 'expo-blur';

const Footer = ({ navigation, currentScreenName }) => {
    function navigateTo(screen) {
        if (!global.userData) return;
        navigation.navigate(screen);
    }

    return (
        <View style={styles.outer_view}>
            <View style={styles.main_ctnr_wrapper}>
                <BlurView intensity={10} style={styles.blurview_ctnr} />
                <View style={styles.main_ctnr}>
                    <View style={styles.icon_ctnr}>
                        <Pressable onPress={() => navigateTo('Feed')}>
                            <View style={currentScreenName === 'Feed' ? styles.selectedIcon : styles.icon}>
                                <Home size="23" color="#fff" variant="Broken" />
                            </View>
                        </Pressable>
                    </View>
                    <View style={styles.icon_ctnr}>
                        <Pressable onPress={() => navigateTo('Competition')}>
                            <View style={currentScreenName === 'Competition' ? styles.selectedIcon : styles.icon}>
                                <Cup size="23" color="#fff" />
                            </View>
                        </Pressable>
                    </View>
                    <View style={styles.workout_icon_ctnr}>
                        <Pressable onPress={() => navigateTo('Workout')}>
                            <View style={currentScreenName === 'Workout' ? styles.selectedIcon : styles.icon}>
                                <Weight size="27" color="#fff" />
                            </View>
                        </Pressable>
                    </View>
                    <View style={styles.icon_ctnr}>
                        <Pressable onPress={() => navigateTo('Explore')}>
                            <View style={currentScreenName === 'Explore' ? styles.selectedIcon : styles.icon}>
                                <SearchNormal1 size="21" color="#fff" />
                            </View>
                        </Pressable>
                    </View>
                    <View style={styles.icon_ctnr}>
                        <Pressable onPress={() => navigateTo('ProfileStack')}>
                            <View style={currentScreenName === 'Profile' ? styles.selectedIcon : styles.icon}>
                                <Profile size="23" color="#fff" variant="Broken" />
                            </View>
                        </Pressable>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    outer_view: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    main_ctnr_wrapper: {
        width: '93.5%',
        height: 69.7,
        borderRadius: 60,
        overflow: 'hidden',
    },
    blurview_ctnr: {
        ...StyleSheet.absoluteFillObject, // Ensures the blur covers the entire wrapper
        zIndex: -1, // Ensure the blur is behind other content
    },
    main_ctnr: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        paddingHorizontal: 2,
        backgroundColor: 'rgba(169, 202, 238, 0.85)',
    },
    icon_ctnr: {
        flex: 1,
        alignItems: 'center',
        padding: 10,
    },
    workout_icon_ctnr: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8.2,
    },
    icon: {
        padding: 13.5,
        borderRadius: 25,
    },
    selectedIcon: {
        padding: 13.5,
        backgroundColor: '#6AB2F8',
        borderRadius: 30,
    },
});

export default Footer;
