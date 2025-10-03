import React, { memo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

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
                <BlurView style={StyleSheet.absoluteFill} intensity={28} tint="dark" />
                <LinearGradient
                    colors={["#60A5FA", "#2D9EFF", "#5EEAD4"]}
                    locations={[0, 0.55, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.wrapper}
                >
                    <View style={styles.container}>
                        <View style={styles.content}>
                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.body}>{body}</Text>
                        </View>
                    </View>
                </LinearGradient>
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
        backgroundColor: "rgba(8, 13, 24, 0.78)",
        paddingHorizontal: scaleSize(scaledSize(24)),
    },
    wrapper: {
        width: "92%",
        borderRadius: scaleSize(scaledSize(20)),
        padding: scaleSize(scaledSize(3)),
        backgroundColor: "#60A5FA",
        shadowColor: "#0F172A",
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(24),
        shadowOffset: { width: 0, height: scaleSize(scaledSize(12)) },
        elevation: 16,
    },
    container: {
        backgroundColor: theme.surface,
        borderRadius: scaleSize(scaledSize(18)),
    },
    content: {
        paddingVertical: scaleSize(scaledSize(18)),
        paddingHorizontal: scaleSize(scaledSize(20)),
        alignItems: "center",
    },
    title: {
        fontSize: scaleSize(16),
        color: theme.textPrimary,
        fontFamily: "Nunito_800ExtraBold",
        marginBottom: scaleSize(scaledSize(14)),
    },
    body: {
        fontSize: scaleSize(14),
        color: theme.textSecondary,
        fontFamily: "Nunito_700Bold",
        textAlign: "center",
    },
});
