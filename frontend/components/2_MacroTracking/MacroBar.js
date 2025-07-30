// MacroBar.js
import React from 'react';
import { View, Text } from 'react-native';

const MacroBar = ({ label, value, goal, color, textPrimary, textSecondary }) => {
    const progress = Math.min(value / goal, 1);
    return (
        <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, marginTop: 5, alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: 'Outfit_500Medium', color: textPrimary, fontSize: 14 }}>{label}</Text>
                <Text style={{ fontFamily: 'Outfit_500Medium', color: textSecondary, fontSize: 13 }}>{value} / {goal}g</Text>
            </View>
            <View style={{ height: 7, borderRadius: 7, backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
                <View style={{ height: 7, width: `${progress * 100}%`, backgroundColor: color, borderRadius: 7 }} />
            </View>
        </View>
    );
};

export default MacroBar;