import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import { FontAwesome6 } from '@expo/vector-icons';
import { usePfp } from '../../helper/usePFPs';

const ChatHeader = ({ usersExcludingSelf = [], toMessages }) => {
    const handles = usersExcludingSelf.map(u => u.handle).join(', ');
    const names = usersExcludingSelf.map(u => u.name).join(', ');

    const u0 = usersExcludingSelf[0];
    const u1 = usersExcludingSelf[1];

    // Resolve PFPs by uid (+ optional version)
    const p0 = u0 ? usePfp(u0.uid, u0.pfpVersion ?? 0) : null;
    const p1 = u1 ? usePfp(u1.uid, u1.pfpVersion ?? 0) : null;

    return (
        <View style={styles.header}>
            <View style={styles.arrowIconContainer}>
                <TouchableOpacity activeOpacity={0.5} onPress={toMessages}>
                    <FontAwesome6 name="chevron-left" size={18.5} color="#2D9EFF" />
                </TouchableOpacity>
            </View>

            <View style={styles.headerContent}>
                <View style={styles.pfpContainer}>
                    {usersExcludingSelf.length > 1 ? (
                        <>
                            {p0 ? (
                                <FastImage
                                    source={{ uri: p0, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                                    style={[styles.pfp, styles.topLeftPfp]}
                                    resizeMode={FastImage.resizeMode.cover}
                                />
                            ) : (
                                <View style={[styles.pfp, styles.topLeftPfp, styles.pfpPlaceholder]} />
                            )}
                            {p1 ? (
                                <FastImage
                                    source={{ uri: p1, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                                    style={[styles.pfp, styles.bottomRightPfp]}
                                    resizeMode={FastImage.resizeMode.cover}
                                />
                            ) : (
                                <View style={[styles.pfp, styles.bottomRightPfp, styles.pfpPlaceholder]} />
                            )}
                        </>
                    ) : (
                        <>
                            {p0 ? (
                                <FastImage
                                    source={{ uri: p0, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                                    style={styles.singlePfp}
                                    resizeMode={FastImage.resizeMode.cover}
                                />
                            ) : (
                                <View style={[styles.singlePfp, styles.pfpPlaceholder]} />
                            )}
                        </>
                    )}
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.nameText} numberOfLines={1} ellipsizeMode="tail">
                        {names}
                    </Text>
                    <Text style={styles.handleText} numberOfLines={1} ellipsizeMode="tail">
                        {handles}
                    </Text>
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
        paddingLeft: '16%',
    },
    arrowIconContainer: {
        position: 'absolute',
        top: 51,
        zIndex: 1,
        left: 32,
        height: 58,
        justifyContent: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        paddingBottom: 7,
        paddingTop: 2,
    },
    pfpContainer: {
        width: 48,
        height: 48,
        position: 'relative',
        marginRight: 7,
    },
    pfp: {
        width: 35,
        height: 35,
        borderRadius: 30,
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#fff',
    },
    topLeftPfp: { top: 0, left: 0 },
    bottomRightPfp: { bottom: 0, right: 0 },
    singlePfp: {
        width: 42,
        height: 42,
        borderRadius: 21,
        marginTop: 4,
    },
    pfpPlaceholder: { backgroundColor: '#EEE' },
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
