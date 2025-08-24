// components/2_MacroTracking/MacroBar.js
import React from 'react';
import { View, Text } from 'react-native';

const MacroBar = ({ label, value, goal, color, textPrimary, textSecondary }) => {
    const progress = Math.min(value / Math.max(1, goal), 1);

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
                <Text style={{ fontFamily: 'Outfit_600SemiBold', color: textPrimary, fontSize: 13.5 }}>
                    {label}
                </Text>
                <Text style={{ fontFamily: 'Outfit_500Medium', color: textSecondary, fontSize: 12.5 }}>
                    {value} / {goal}g
                </Text>
            </View>

            <View
                style={{
                    height: 8,
                    borderRadius: 8,
                    backgroundColor: '#E2E8F0',
                    overflow: 'hidden',
                    borderWidth: 0.5,
                    borderColor: 'rgba(2,6,23,0.06)',
                }}
            >
                <View
                    style={{
                        height: 8,
                        width: `${progress * 100}%`,
                        backgroundColor: color,
                        borderRadius: 8,
                    }}
                />
            </View>
        </View>
    );
};

export default MacroBar;
