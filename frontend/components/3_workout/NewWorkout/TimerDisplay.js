import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';

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
        fontSize: 18,
        color: '#aaa',
        textAlign: 'center'
    }
});

export default React.memo(TimerDisplay);
