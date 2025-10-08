import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';
import scaleSize from '../../../helper/scaleSize';
import theme from '../../../theme/mfpDark';

const { height: screenHeight } = Dimensions.get('window');
const scaledSize = (size) => scaleSize(size);

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
        fontSize: scaleSize(16),
        color: theme.textPrimary, // higher contrast for timer
        textAlign: 'center',
    }
});

export default React.memo(TimerDisplay);
