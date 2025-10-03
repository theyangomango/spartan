import React, { memo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import scaleSize from "../../../../helper/scaleSize";
import { ss as scaledSize } from "../../../../utils/scale";
import theme from "../../../../theme/mfpDark";
import { withStrongPress } from "../../../../utils/haptics";

const WorkoutReminderModal = ({ visible, onDismiss, title, body }) => {
    const handleDismiss = () => {
        if (onDismiss) onDismiss();
    };

    return (
        <Modal
            key={`reminder-${visible ? 1 : 0}`}
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleDismiss}
            onDismiss={handleDismiss}
        >
            <Pressable style={styles.overlay} onPress={withStrongPress(handleDismiss)}>
                <View style={styles.card}>
                    <View style={styles.accentBar} />
                    <View style={styles.content}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.body}>{body}</Text>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};

WorkoutReminderModal.defaultProps = {
    title: "Track Reps Honestly",
    body: "Train for you, not anyone else. Maintain good form. Don't ego lift.\nProud of you king 👑",
};

export default memo(WorkoutReminderModal);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(8, 11, 20, 0.82)",
        paddingHorizontal: scaleSize(scaledSize(24)),
    },
    card: {
        width: "92%",
        maxWidth: scaleSize(scaledSize(340)),
        backgroundColor: theme.surface,
        borderRadius: scaleSize(scaledSize(20)),
        borderWidth: scaleSize(scaledSize(1)),
        borderColor: "rgba(255, 255, 255, 0.08)",
        shadowColor: "#000000",
        shadowOpacity: 0.2,
        shadowRadius: scaleSize(scaledSize(24)),
        shadowOffset: { width: 0, height: scaleSize(scaledSize(12)) },
        elevation: 16,
        overflow: "hidden",
    },
    accentBar: {
        height: scaleSize(scaledSize(3)),
        backgroundColor: theme.primary,
        width: "100%",
    },
    content: {
        paddingVertical: scaleSize(scaledSize(22)),
        paddingHorizontal: scaleSize(scaledSize(22)),
        alignItems: "center",
    },
    title: {
        fontSize: scaleSize(scaledSize(16.5)),
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        marginBottom: scaleSize(scaledSize(10)),
        letterSpacing: 0.15,
        textAlign: "center",
    },
    body: {
        fontSize: scaleSize(scaledSize(13.4)),
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
        textAlign: "center",
        lineHeight: scaleSize(scaledSize(19)),
    },
});
