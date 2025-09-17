// components/3_Workout/DayDetails/OverlayContainer.js
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { Animated } from 'react-native';
import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';

export default function OverlayContainer({ translateX, gesture, visible, children }) {
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          top: 0,
          transform: [{ translateX }],
          backgroundColor: theme.bg,
          zIndex: 5,
          elevation: 5,
          borderTopLeftRadius: scaleSize(20),
          borderTopRightRadius: scaleSize(20),
          overflow: 'hidden',
          // Reduced top padding so the overlayed screens sit closer to the handle
          paddingTop: scaleSize(0),
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1 }}>
          {children}
        </View>
      </GestureDetector>
    </Animated.View>
  );
}
