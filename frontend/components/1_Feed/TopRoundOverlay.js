import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

import scaleSize from "../../helper/scaleSize";

// A tiny sticky item that renders directly after ActivityChips.
// It visually "glues" the rounded edge to the chips without any scroll math.
export default function TopRoundOverlay() {
  return <View style={styles.wrap} pointerEvents="none" />;
}

const RADIUS = 35;
// Slightly taller to ensure it fully covers corners during fast flings/overscroll
const HEIGHT = 20; // thin strip that draws the curved bottom edge

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: HEIGHT,
    backgroundColor: 'red',
    // Curve at the top, matching the bottom of the chips container
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
    // Align with ActivityChips, which uses a -6 top margin
    marginTop: scaleSize(-6),
    // Keep below chips, but above posts
    zIndex: 80,
    ...Platform.select({ android: { elevation: 5 } }),
  },
});
