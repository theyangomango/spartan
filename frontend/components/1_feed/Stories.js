import { Button, Pressable, StyleSheet, Text, View } from "react-native";
import InstaStory from "react-native-insta-story";
import StoryHeaderButtons from "./StoryHeaderButtons";

export default function Stories({ displayStories }) {
    
    return (
        <View style={styles.stories_ctnr}>
            {displayStories && <InstaStory
                data={displayStories}
                avatarSize={45}
                unPressedBorderColor={'#fff'}
                pressedBorderColor={'#8dcbfc'}
                unPressedAvatarTextColor={'#fff'}
                pressedAvatarTextColor={'#fff'}
                avatarTextStyle={styles.story_text}
                avatarImageStyle={styles.story_image}
                avatarWrapperStyle={styles.story_border}
                renderCloseComponent={({ item, onPress }) => (
                    <StoryHeaderButtons data={item}/>
                )}
                duration={10}
            />}
        </View>
    )
}

const styles = StyleSheet.create({
    stories_ctnr: {
        backgroundColor: '#2D9EFF',
        paddingBottom: 8,
    },
    story_text: {
        fontFamily: 'Inter_500Medium',
        fontSize: 10,
        paddingTop: 3,
        marginLeft: 5,
    },
    story_image: {
        width: 44,
        height: 44,
    },
    story_border: {
        width: 52,
        height: 52,
        borderWidth: 2,
        marginLeft: 5,
    },
});