import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Home, Cup, Weight, Profile } from 'iconsax-react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const Footer = ({ navigation, currentScreenName }) => {
    function navigateTo(screen) {
        if (!global.userData) return;
        navigation.navigate(screen);
    }

    const getIconColor = (screenName) => {
        return currentScreenName === screenName ? '#000' : '#bbb';
    };

    return (
        <View style={styles.outer_view}>
            <View style={styles.main_ctnr}>
                <View style={styles.icon_ctnr}>
                    <Pressable onPress={() => navigateTo('Feed')}>
                        <View style={currentScreenName === 'Feed' ? styles.selectedIcon : styles.icon}>
                            <Home size="24.5" color={getIconColor('Feed')} variant="Bold" />
                        </View>
                    </Pressable>
                </View>
                <View style={styles.icon_ctnr}>
                    <Pressable onPress={() => navigateTo('Competition')}>
                        <View style={currentScreenName === 'Competition' ? styles.selectedIcon : styles.icon}>
                            <Cup size="24.5" color={getIconColor('Competition')} variant='Bold' />
                        </View>
                    </Pressable>
                </View>
                <View style={styles.workout_icon_ctnr}>
                    <Pressable onPress={() => navigateTo('Workout')}>
                        <View style={currentScreenName === 'Workout' ? styles.selectedIcon : styles.icon}>
                            <Weight size="25.5" color={getIconColor('Workout')} variant='Bold' />
                        </View>
                    </Pressable>
                </View>
                <View style={styles.icon_ctnr}>
                    <Pressable onPress={() => navigateTo('Explore')}>
                        <View style={currentScreenName === 'Explore' ? styles.selectedIcon : styles.icon}>
                            <Feather name='search' size={23.5} color={getIconColor('Explore')} />
                        </View>
                    </Pressable>
                </View>
                <View style={styles.icon_ctnr}>
                    <Pressable onPress={() => navigateTo('ProfileStack')}>
                        <View style={currentScreenName === 'Profile' ? styles.selectedIcon : styles.icon}>
                            <Profile size="22.5" color={getIconColor('Profile')} variant="Bold" />
                        </View>
                    </Pressable>
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
        height: 87,
    },
    main_ctnr: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        paddingHorizontal: 13,
        paddingBottom: 13,
        backgroundColor: '#fff',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,

        shadowColor: '#bbb',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.4,
        shadowRadius: 2,  
        elevation: 5
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
        borderRadius: 30,
    },
});

export default Footer;
