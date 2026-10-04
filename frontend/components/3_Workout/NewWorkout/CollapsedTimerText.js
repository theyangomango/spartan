// Timer label of the collapsed active-workout sheet; re-reads the shared timer ref once per second.
import React, { memo, useEffect, useState } from "react";
import { Text } from "react-native";

import styles from "./ActiveWorkoutModal.styles";

const CollapsedTimerText = memo(({ timerRef }) => {
    const [timer, setTimer] = useState(() => timerRef?.current || "00:00");

    useEffect(() => {
        const update = () => {
            setTimer(timerRef?.current || "00:00");
        };
        update();
        const intervalId = setInterval(update, 1000);
        return () => clearInterval(intervalId);
    }, [timerRef]);

    return (
        <Text style={styles.collapsedHudTimer} numberOfLines={1}>
            {timer}
        </Text>
    );
});

export default CollapsedTimerText;
