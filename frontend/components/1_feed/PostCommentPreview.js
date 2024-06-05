import { Text, StyleSheet } from "react-native"

export default function PostCommentPreview({handle, content}) {
    return (
        <Text>
            <Text style={styles.handle_text}>
                {handle}
            </Text>
            <Text>{' '}</Text>
            <Text style={styles.content_text}>
                {content}
            </Text>
        </Text>
    )
}

const styles = StyleSheet.create({
    handle_text: {
        fontSize: 12.5,
        fontFamily: 'Lato_700Bold',
        color: '#555',
    },
    content_text: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular'
    },
});