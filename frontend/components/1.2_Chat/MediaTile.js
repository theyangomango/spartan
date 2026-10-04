// One image or video tile of a chat message; reports its window rect when pressed.
import React, { useRef } from "react";
import { View, Pressable } from "react-native";
import FastImage from "react-native-fast-image";
import Video from "react-native-video";

import styles from "./MessageItem.styles";

const MediaTile = ({ m, item, onOpenMedia, onOpenActions }) => {
    const tileRef = useRef(null);
    const mediaUri = m?.uri || m?.url || "";
    if (!mediaUri) return null;
    const mediaType = typeof m?.type === "string" ? m.type.toLowerCase() : "";
    const isVideo = mediaType.includes("video");

    const handlePress = () => {
        tileRef.current?.measureInWindow?.((x, y, w, h) => {
            onOpenMedia?.(
                { uri: mediaUri, type: isVideo ? "video" : "image" },
                { x, y, width: w, height: h }
            );
        });
    };

    const handleLongPress = () => {
        tileRef.current?.measureInWindow?.((x, y, w, h) => {
            onOpenActions?.(item, { x, y, width: w, height: h });
        });
    };

    return (
        <Pressable onPress={handlePress} onLongPress={handleLongPress} delayLongPress={250}>
            <View ref={tileRef} collapsable={false}>
                {isVideo ? (
                    <View style={styles.videoOuter}>
                        <Video
                            source={{ uri: mediaUri }}
                            style={styles.media}
                            controls
                            paused
                            resizeMode="cover"
                            poster={m.thumbnailUrl || undefined}
                            posterResizeMode="cover"
                            onError={(e) => console.warn("Video error", e)}
                        />
                    </View>
                ) : (
                    <FastImage
                        source={{ uri: mediaUri }}
                        style={styles.media}
                        resizeMode={FastImage.resizeMode.cover}
                    />
                )}
            </View>
        </Pressable>
    );
};

export default MediaTile;
