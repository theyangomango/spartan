import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

const ChatHeader = ({ usersExcludingSelf, toMessages }) => {
    const handles = usersExcludingSelf.map(user => user.handle).join(', ');
    const names = usersExcludingSelf.map(user => user.name).join(', ');

    return (
        <View style={styles.header}>
            <View style={styles.arrowIconContainer}>
                <TouchableOpacity activeOpacity={0.5} onPress={toMessages}>
                    <FontAwesome6 name='chevron-left' size={18.5} color="#2D9EFF" />
                </TouchableOpacity>
            </View>
            <View style={styles.headerContent}>
                <View style={[styles.pfpContainer, { width: 42 + 15 * (usersExcludingSelf.length - 1) }]}>
                    {usersExcludingSelf.map((user, idx) => (
                        <Image
                            key={user.uid}
                            source={{ uri: user.pfp }}
                            style={[styles.pfp, { left: idx * 15 }]}
                        />
                    ))}
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.nameText} numberOfLines={1} ellipsizeMode='tail'>{names}</Text>
                    <Text style={styles.handleText} numberOfLines={1} ellipsizeMode='tail'>{handles}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: 53,
        backgroundColor: '#fff',
        shadowColor: '#aaa',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 3.84,
        elevation: 5,
        paddingLeft: '16.5%',
    },
    arrowIconContainer: {
        position: 'absolute',
        top: 51,
        zIndex: 1,
        left: 32,
        height: 58,
        width: 50,
        justifyContent: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 7,
        paddingTop: 2,
    },
    pfpContainer: {
        flexDirection: 'row',
        position: 'relative',
        alignItems: 'center',
        marginRight: 7,
    },
    pfp: {
        width: 42,
        height: 42,
        borderRadius: 21,
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#fff',
    },
    textContainer: {
        justifyContent: 'center',
        flex: 1,
        marginRight: 10,
    },
    nameText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 15,
    },
    handleText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 12.5,
        color: '#888',
    },
});

export default ChatHeader;
