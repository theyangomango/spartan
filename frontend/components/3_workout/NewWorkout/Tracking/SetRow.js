import React, { useRef } from "react";
import { View, StyleSheet, Text, Pressable, Dimensions } from "react-native";
import EditableStat from "./EditableStat";
import { FontAwesome5 } from "@expo/vector-icons";
import SwipeableItem, { OpenDirection, useSwipeableItemParams } from "react-native-swipeable-item";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844;
const scaledSize = (size) => Math.round(size * scale);

export default function SetRow({
    previousSet,
    set,
    updateSet,
    index,
    handleDelete,
    isDone,
    toggleIsDone,
    readOnly = false,
}) {
    const weight = set?.weight ?? 0;
    const reps = set?.reps ?? 0;

    const itemRefs = useRef(new Map());
    const renderUnderlayLeft = () => <UnderlayLeft handleDelete={handleDelete} />;

    return (
        <View style={styles.container}>
            <SwipeableItem
                key={index}
                item={set}
                ref={(ref) => { if (ref && !itemRefs.current.get(index)) itemRefs.current.set(index, ref); }}
                onChange={({ openDirection }) => {
                    if (openDirection !== OpenDirection.NONE) {
                        [...itemRefs.current.entries()].forEach(([key, ref]) => { if (key !== index && ref) ref.close(); });
                    }
                }}
                overSwipe={scaledSize(40)}
                renderUnderlayLeft={readOnly ? undefined : renderUnderlayLeft}
                snapPointsLeft={readOnly ? [] : [scaledSize(60)]}
                onSwipeableLeftOpen={readOnly ? undefined : () => handleDelete(index)}
            >
                <View style={[styles.stat_row, isDone && styles.done]} key={index}>
                    <View style={[styles.set_ctnr, isDone && { backgroundColor: "#DCFFDA" }]}>
                        <Text style={styles.set_number_text}>{index + 1}</Text>
                    </View>

                    <View style={styles.previous_ctnr}>
                        <Text style={[styles.previous_stat_text, isDone && { color: "#afafaf" }]}>
                            {previousSet ? `${previousSet.reps} x ${previousSet.weight}lbs` : "N/A"}
                        </Text>
                    </View>

                    {/* Keep grey visuals, just block focus when read-only */}
                    <View style={styles.weight_unit_ctnr} pointerEvents={readOnly ? "none" : "auto"}>
                        <EditableStat
                            isFinished={isDone}                          // ← do NOT tie visuals to readOnly
                            value={String(weight)}
                            setValue={(value) => updateSet(index, { ...set, weight: value })}
                        />
                    </View>

                    <View style={styles.reps_ctnr} pointerEvents={readOnly ? "none" : "auto"}>
                        <EditableStat
                            isFinished={isDone}                          // ← same here
                            value={String(reps)}
                            setValue={(value) => updateSet(index, { ...set, reps: value })}
                        />
                    </View>

                    <View style={styles.done_ctnr}>
                        <Pressable
                            style={isDone ? styles.checkmark_ctnr_selected : styles.checkmark_ctnr}
                            onPress={toggleIsDone}
                            disabled={readOnly}                          // cannot toggle in viewing mode
                        >
                            <FontAwesome5 name="check" size={scaledSize(14)} color={isDone ? "#fff" : "#444"} />
                        </Pressable>
                    </View>
                </View>
            </SwipeableItem>
        </View>
    );
}

const UnderlayLeft = ({ handleDelete }) => {
    const { percentOpen } = useSwipeableItemParams();
    const animStyle = useAnimatedStyle(
        () => ({
            backgroundColor: `rgba(255, 0, 0, ${percentOpen.value / 1.5})`,
            width: `${percentOpen.value * 16}%`,
        }),
        [percentOpen]
    );
    return (
        <Animated.View style={[styles.underlayLeft, animStyle]}>
            <Pressable onPressOut={handleDelete} style={styles.trashButton}>
                <FontAwesome5 name="trash" size={scaledSize(19)} color="#fff" />
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    stat_row: { flexDirection: "row", paddingVertical: scaledSize(8), alignItems: "center" },
    done: { backgroundColor: "#DCFFDA" },
    set_ctnr: {
        marginLeft: "5%",
        width: "8%",
        height: scaledSize(21),
        borderRadius: scaledSize(6),
        backgroundColor: "#eaeaea",
        alignItems: "center",
        justifyContent: "center",
    },
    previous_ctnr: { width: "38%", alignItems: "center", justifyContent: "center" },
    weight_unit_ctnr: { width: "18%", alignItems: "center" },
    reps_ctnr: { width: "18%", alignItems: "center" },
    set_number_text: { fontFamily: "Poppins_700Bold", fontSize: scaledSize(14) },
    previous_stat_text: { fontFamily: "Poppins_700Bold", fontSize: scaledSize(15), color: "#ccc" },
    done_ctnr: { width: "10.5%", height: scaledSize(22), alignItems: "center" },
    checkmark_ctnr: {
        paddingHorizontal: scaledSize(10),
        height: "100%",
        borderRadius: scaledSize(7),
        backgroundColor: "#eee",
        justifyContent: "center",
    },
    checkmark_ctnr_selected: {
        paddingHorizontal: scaledSize(8),
        height: "100%",
        borderRadius: scaledSize(7),
        justifyContent: "center",
        backgroundColor: "#58DD6F",
    },
    underlayLeft: {
        position: "absolute", right: 0, top: 0, bottom: 0,
        justifyContent: "center", alignItems: "flex-end",
        marginVertical: scaledSize(2), paddingRight: scaledSize(20),
    },
    trashButton: { flex: 1, alignItems: "center", justifyContent: "center" },
});
