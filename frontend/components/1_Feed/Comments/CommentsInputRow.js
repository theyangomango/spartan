import { useMemo } from 'react';
import { View, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';
import DismissableTextInput from '../../common/DismissableTextInput';

const useInputStyles = (dynamicStyles) => useMemo(() => ({
    container: {
        flex: 1,
        marginHorizontal: scaleSize(18),
        marginTop: scaleSize(8),
        marginBottom: scaleSize(10),
        backgroundColor: theme.field,
        borderRadius: scaleSize(30),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(12),
        height: dynamicStyles.inputHeight,
    },
    imageWrapper: {
        width: dynamicStyles.pfpSize,
        aspectRatio: 1,
    },
    pfp: {
        flex: 1,
        borderRadius: scaleSize(100),
    },
    textInput: {
        flex: 1,
        borderRadius: scaleSize(20),
        paddingHorizontal: scaleSize(15),
        paddingVertical: dynamicStyles.inputPaddingVertical,
        color: '#E5E7EB',
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(dynamicStyles.inputFontSize),
    },
    sendButton: {
        paddingHorizontal: scaleSize(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
}), [dynamicStyles]);

export default function CommentsInputRow({
    value,
    onChangeText,
    onFocus,
    onBlur,
    onPressSend,
    editable,
    canSend,
    replyingToHandle,
    dynamicStyles,
    inputRef,
}) {
    const styles = useInputStyles(dynamicStyles);
    const placeholder = replyingToHandle ? `Replying to ${replyingToHandle}` : 'Add comment';

    return (
        <View style={styles.container}>
            <View style={styles.imageWrapper}>
                <Image source={{ uri: global.userData.image }} style={styles.pfp} />
            </View>
            <DismissableTextInput
                ref={inputRef}
                placeholder={placeholder}
                placeholderTextColor="#C9D2E3"
                style={styles.textInput}
                onFocus={onFocus}
                onBlur={onBlur}
                value={value}
                onChangeText={onChangeText}
                editable={editable}
                multiline
                returnKeyType="send"
            />
            <Pressable style={styles.sendButton} onPress={onPressSend} disabled={!canSend}>
                <Ionicons name="send" size={dynamicStyles.sendButtonSize} color="#E5E7EB" />
            </Pressable>
        </View>
    );
}
