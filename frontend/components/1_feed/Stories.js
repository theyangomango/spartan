import { StyleSheet, Text, View } from "react-native";
import InstaStory from "react-native-insta-story";

export default function Stories({ displayStories }) {
    return (
        <View style={styles.stories_view_ctnr}>
            <View style={styles.stories_ctnr}>
                {displayStories && <InstaStory
                    data={displayStories}
                    avatarSize={56}
                    unPressedBorderColor={'#fff'}
                    pressedBorderColor={'#8dcbfc'}
                    unPressedAvatarTextColor={'#fff'}
                    pressedAvatarTextColor={'#fff'}
                    avatarTextStyle={styles.story_text}
                    avatarImageStyle ={styles.story_image}
                    avatarWrapperStyle={styles.story_border}
                    duration={10}
                />}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    stories_ctnr: {
        backgroundColor: '#2D9EFF',
        paddingLeft: 8,
    },
    story_text: {
        fontFamily: 'Inter_500Medium',
        fontSize: 10,
        paddingTop: 3,
        paddingBottom: 10
    },
    story_image: {
        width: 48,
        height: 48,
    },
    story_border: {
        width: 58,
        height: 58,
        borderWidth: 2,
    },
});