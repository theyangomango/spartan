import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, TouchableWithoutFeedback, Keyboard, ScrollView, Pressable } from "react-native";
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Ionicons';

const GroupModal = ({ closeGroupModal }) => {
    const [followingUsers, setFollowingUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [keyboardOpen, setKeyboardOpen] = useState(false);

    useEffect(() => {
        if (global.userData) {
            setFollowingUsers(global.userData.following);
        }

        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardOpen(true);
        });

        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardOpen(false);
        });

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, [global.userData]);

    const handleOutsidePress = () => {
        closeGroupModal();
    };

    const handleGroupModalPress = () => {
        if (keyboardOpen) {
            Keyboard.dismiss();
        }
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);

    useEffect(() => {
        if (searchQuery === '') {
            setFilteredUsers(followingUsers);
        } else {
            setFilteredUsers(
                followingUsers.filter(user =>
                    user.handle.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }
    }, [searchQuery, followingUsers]);

    const handleSelectUser = (userUid) => {
        setSelectedUsers(prevSelectedUsers =>
            prevSelectedUsers.includes(userUid)
                ? prevSelectedUsers.filter(uid => uid !== userUid)
                : [...prevSelectedUsers, userUid]
        );
    };

    return (
        <View style={styles.modalOverlay}>
            <Pressable onPress={handleOutsidePress} style={{ height: '14%' }} />
            <View style={styles.group_modal_ctnr}>
                <View style={styles.groupModal}>
                    <View style={styles.header}>
                        <Text style={styles.modalText}>Invite to Workout</Text>
                        <TouchableOpacity
                            style={[styles.inviteButton, { opacity: selectedUsers.length === 0 ? 0.5 : 1 }]}
                            disabled={selectedUsers.length === 0}
                        >
                            <Text style={styles.inviteButtonText}>
                                Invite {selectedUsers.length > 0 && `(${selectedUsers.length})`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.searchContainer}>
                        <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchBar}
                            placeholder="Search"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <ScrollView>
                        <View style={styles.flatlistContainer}>
                            {filteredUsers.slice(0, 9).map((user, index) => {
                                const isSelected = selectedUsers.includes(user.uid);
                                return (
                                    <Pressable
                                        key={index}
                                        style={styles.itemContainer}
                                        onPress={() => handleSelectUser(user.uid)}
                                    >
                                        <View style={[styles.pfp_ctnr, { opacity: isSelected ? 1 : 0.7 }]}>
                                            <FastImage
                                                source={{ uri: user.pfp }}
                                                style={styles.pfp}
                                                resizeMode={FastImage.resizeMode.cover}
                                            />
                                        </View>
                                        <Text style={styles.handle_text}>{user.handle}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            </View>
            <Pressable onPress={handleOutsidePress} style={{ height: '14%' }} />
        </View>
    );
};

export default GroupModal;

const { width } = Dimensions.get('window');
const modalWidth = width * 0.92; // Modal width as a percentage of the screen width
const ITEM_MARGIN = 5;
const ITEM_WIDTH = (modalWidth - ITEM_MARGIN * 6) / 3; // Adjusting margin calculation

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    group_modal_ctnr: {
        width: '100%',
        height: '72%',
        alignItems: 'center',
    },
    groupModal: {
        width: modalWidth,
        height: '100%',
        paddingTop: 20,
        borderRadius: 30,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '90%',
        marginBottom: 15,
        position: 'relative',
    },
    modalText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
    },
    inviteButton: {
        position: 'absolute',
        right: 0,
        backgroundColor: '#E1F0FF',
        paddingHorizontal: 12.5,
        height: 29,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 2
    },
    inviteButtonText: {
        color: '#0499FE',
        fontFamily: 'Outfit_700Bold',
        fontSize: 15.5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
        borderRadius: 8,
        width: '90%',
        paddingHorizontal: 8,
        marginBottom: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchBar: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    flatlistContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%', // Ensure the container takes full width
    },
    itemContainer: {
        width: ITEM_WIDTH,
        alignItems: 'center',
        marginHorizontal: ITEM_MARGIN / 2,
        marginVertical: ITEM_MARGIN,
    },
    pfp_ctnr: {
        width: 82,
        aspectRatio: 1,
        borderRadius: 40,
        backgroundColor: 'gray',
    },
    pfp: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    handle_text: {
        marginTop: 8,
        textAlign: 'center',
        fontFamily: 'Poppins_400Regular',
        fontSize: 11,
        color: '#555',
    },
});
