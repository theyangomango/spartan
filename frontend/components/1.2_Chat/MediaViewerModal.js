// components/1.2_Chat/MediaViewerModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Pressable, Animated, StyleSheet, Dimensions, Image } from "react-native";
import FastImage from "react-native-fast-image";
import Video from "react-native-video";

const { width: SW, height: SH } = Dimensions.get("window");

const fitRect = (nw, nh, sw, sh) => {
    if (!nw || !nh) return { x: 0, y: 0, width: sw, height: sh };
    const k = Math.min(sw / nw, sh / nh);
    const w = nw * k;
    const h = nh * k;
    return { x: (sw - w) / 2, y: (sh - h) / 2, width: w, height: h };
};

export default function MediaViewerModal({ visible, payload, onClose }) {
    // Always call the same hooks, regardless of props.
    const progress = useRef(new Animated.Value(0)).current; // 0→1 size/position
    const fade = useRef(new Animated.Value(0)).current;     // 0→1 opacity (backdrop + content)
    const closingRef = useRef(false);

    const [natW, setNatW] = useState(16);
    const [natH, setNatH] = useState(9);
    const [lastUri, setLastUri] = useState(null);

    const uri = payload?.uri ?? null;
    const type = payload?.type ?? "image";
    const anchor = payload?.anchor || { x: SW / 2 - 60, y: SH / 2 - 60, width: 120, height: 120 };

    // Load natural size for images (safe even when not visible; hooks order stays constant)
    useEffect(() => {
        if (type !== "image" || !uri) return;
        if (uri === lastUri) return;
        setLastUri(uri);
        Image.getSize(
            uri,
            (w, h) => {
                setNatW(w || 16);
                setNatH(h || 9);
            },
            () => {
                setNatW(16);
                setNatH(9);
            }
        );
    }, [type, uri, lastUri]);

    // Animate IN when becoming visible
    useEffect(() => {
        if (!visible || !uri) return;
        closingRef.current = false;
        progress.setValue(0);
        fade.setValue(0);
        Animated.parallel([
            Animated.timing(progress, { toValue: 1, duration: 240, useNativeDriver: true }),
            Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
        ]).start();
    }, [visible, uri, progress, fade]);

    const requestClose = () => {
        if (closingRef.current) return;
        closingRef.current = true;
        // Minimize (progress 1→0) AND fade out
        Animated.parallel([
            Animated.timing(progress, { toValue: 0, duration: 220, useNativeDriver: true }),
            Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished) onClose?.();
        });
    };

    // Compute target (full-screen fit) from natural size
    const target = fitRect(natW, natH, SW, SH);

    // Transform from anchor → target (center-based) with **height-based** scale
    const targetCx = target.x + target.width / 2;
    const targetCy = target.y + target.height / 2;
    const anchorCx = anchor.x + anchor.width / 2;
    const anchorCy = anchor.y + anchor.height / 2;

    const dx0 = anchorCx - targetCx;
    const dy0 = anchorCy - targetCy;

    // scale based on HEIGHT to avoid width-snaps on close
    const s0 = target.height ? anchor.height / target.height : 1;

    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [dx0, 0] });
    const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [dy0, 0] });
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [s0, 1] });

    // Render a Modal **always** (no early return) to keep hook order stable.
    return (
        <Modal transparent visible={!!visible} animationType="none" onRequestClose={requestClose}>
            {/* Backdrop (fade in/out) */}
            <Animated.View
                style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.7)", opacity: fade }]}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
            </Animated.View>

            {/* Content box transforms from anchor → target */}
            <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                <Animated.View
                    style={[
                        styles.box,
                        {
                            left: target.x,
                            top: target.y,
                            width: target.width,
                            height: target.height,
                            opacity: fade, // also fades the content
                            transform: [{ translateX }, { translateY }, { scale }],
                        },
                    ]}
                >
                    {type === "video" ? (
                        <>
                            <Video
                                source={{ uri: uri || undefined }}
                                style={StyleSheet.absoluteFill}
                                resizeMode="contain"
                                controls
                                onLoad={(meta) => {
                                    const w = meta?.naturalSize?.width || natW;
                                    const h = meta?.naturalSize?.height || natH;
                                    if (w && h && (w !== natW || h !== natH)) {
                                        setNatW(w);
                                        setNatH(h);
                                    }
                                }}
                            />
                            <Pressable style={styles.closeHit} onPress={requestClose} />
                        </>
                    ) : (
                        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose}>
                            {uri ? (
                                <FastImage
                                    source={{ uri }}
                                    style={StyleSheet.absoluteFill}
                                    resizeMode={FastImage.resizeMode.contain}
                                    onLoad={(e) => {
                                        const iw = e?.nativeEvent?.width;
                                        const ih = e?.nativeEvent?.height;
                                        if (iw && ih && (iw !== natW || ih !== natH)) {
                                            setNatW(iw);
                                            setNatH(ih);
                                        }
                                    }}
                                />
                            ) : null}
                        </Pressable>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    box: { position: "absolute", overflow: "hidden", backgroundColor: "#000", borderRadius: 8 },
    closeHit: { position: "absolute", right: 12, top: 12, width: 44, height: 44 },
});
