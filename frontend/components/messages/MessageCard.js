import { View, StyleSheet, Text, Image, TouchableOpacity } from "react-native"
import getDisplayTime from '../../helper/getDisplayTime'
import { useEffect, useState } from "react";
import getPFP from '../../../backend/storage/getPFP'

export default function MessageCard({ uid, handle, content, timestamp, toChat }) {
    const [image, setImage] = useState(null);
    
    useEffect(() => {
        getPFP(uid)
            .then(url => {
                setImage(url);
            });
    }, []);
    
    return (
        <TouchableOpacity onPress={toChat} style={styles.main_ctnr}>
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
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        height: 58,
        marginVertical: 9,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    pfp_ctnr: {
        width: 58,
        height: 58,
        marginRight: 12,
        // backgroundColor: 'red',
    },
    pfp: {
        flex: 1,
        borderRadius: 29
    },
    left_ctnr: {
        flexDirection: 'row'
    },
    handle_text: {
        fontSize: 16.2,
        color: '#707078',
        paddingVertical: 5,
        fontFamily: 'SourceSansPro_600SemiBold'
    },
    content_text: {
        fontSize: 12.5,
        fontFamily: 'SourceSansPro_400Regular',
        color: '#707078',
    },
    right_ctnr: {
        justifyContent: 'center'
    },
    date_text: {
        padding: 5,
        color: '#707078',
        fontSize: 12.5,
        fontFamily: 'SourceSansPro_400Regular',
    }
});