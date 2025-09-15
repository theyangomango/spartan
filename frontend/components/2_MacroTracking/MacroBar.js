// components/2_MacroTracking/MacroBar.js
import React from 'react';
import { View, Text } from 'react-native';

const MacroBar = ({ label, value, goal, color, textPrimary, textSecondary, trackColor }) => {
    const progress = Math.min(Math.max(value / Math.max(1, goal), 0), 1);
    const pct = progress * 100;
    const widthStyle = pct >= 99.2 ? '100%' : `${pct}%`;
    const TRACK_H = 10;

    return (
        <View style={{ marginBottom: 12 }}>
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginBottom: 4,
                    marginTop: 4,
                }}
            >
                <Text style={{ fontFamily: 'Outfit_600SemiBold', color: textPrimary, fontSize: require('../../helper/scaleSize').ts(13) }}>
                    {label}
                </Text>
                <Text style={{ fontFamily: 'Outfit_500Medium', color: textSecondary, fontSize: require('../../helper/scaleSize').ts(13) }}>
                    {value} / {goal}g
                </Text>
            </View>

            <View
                style={{
                    height: TRACK_H,
                    borderRadius: 999,
                    backgroundColor: '#bbdbff5d',
                    overflow: 'hidden',
                    borderWidth: 0, // avoid hairline gaps on dark backgrounds
                }}
            >
                <View
                    style={{
                        height: '100%',
                        width: widthStyle,
                        backgroundColor: color,
                        borderTopLeftRadius: 999,
                        borderBottomLeftRadius: 999,
                        borderTopRightRadius: 999,
                        borderBottomRightRadius: 999,
                    }}
                />
            </View>
        </View>
    );
};

export default MacroBar;
