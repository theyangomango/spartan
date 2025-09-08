import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

const TimerDisplay = ({ timerRef }) => {
    const [timer, setTimer] = useState(timerRef.current);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setTimer(timerRef.current);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [timerRef]);

    return (
        <Text style={styles.timer_text}>{timer}</Text>
    );
};

const styles = StyleSheet.create({
    timer_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(18),
        color: '#aaa',
        textAlign: 'center',
    }
});

export default React.memo(TimerDisplay);
