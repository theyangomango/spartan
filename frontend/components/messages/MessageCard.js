import { View, StyleSheet, Text, Image, TouchableOpacity } from "react-native"
import getDisplayTime from '../../helper/getDisplayTime'
import { useEffect, useState } from "react";
import getPFP from '../../../backend/storage/getPFP'
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function MessageCard({ uid, handle, content, timestamp, toChat, index }) {
    const [image, setImage] = useState(null);
    
    useEffect(() => {
        getPFP(uid)
            .then(url => {
                setImage(url);
            });
    }, []);
    
    return (
        <RNBounceable onPress={() => toChat(index, uid, handle)} style={styles.main_ctnr}>
            <View style={styles.left_ctnr}>
                <View style={styles.pfp_ctnr}>
                    <Image
                        source={{uri: image}}
                        style={styles.pfp}
                    />
                </View>
                <View>
                    <Text style={styles.handle_text}>{handle}</Text>
                    <Text style={styles.content_text}>{content}</Text>
                </View>
            </View>
            <View style={styles.right_ctnr}>
                <Text style={styles.date_text}>{getDisplayTime(timestamp)}</Text>
            </View>
        </RNBounceable>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        height: 80,
        marginHorizontal: 15,
        paddingHorizontal: 15,
        borderRadius: 25,
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f8f8f8',
        marginBottom: 8
    },
    pfp_ctnr: {
        width: 48,
        aspectRatio: 1,
        marginRight: 12,
        // backgroundColor: 'red',
    },
    pfp: {
        flex: 1,
        borderRadius: 100
    },
    left_ctnr: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    handle_text: {
        fontSize: 16,
        // color: '#707078',
        paddingVertical: 5,
        fontFamily: 'Outfit_500Medium',
        letterSpacing: 0.2
    },
    content_text: {
        fontSize: 12,
        fontFamily: 'Outfit_400Regular',
        color: '#999',
        marginBottom: 7
    },
    right_ctnr: {
        // justifyContent: 'center'
        paddingTop: 15
    },
    date_text: {
        padding: 5,
        color: '#707078',
        fontSize: 12,
        fontFamily: 'Outfit_400Regular',
        letterSpacing: 0.1,
        color: '#999',
    }
});