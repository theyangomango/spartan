import React from "react";
import { View } from "react-native";
import Reanimated from "react-native-reanimated";
import { SafeAreaView as SafeAreaInsetsView } from "react-native-safe-area-context";
import FeedHeader from "./FeedHeader";
import ActivityChips from "./Pulse/ActivityChips";
import theme from "../../theme/mfpDark";

// Encapsulates the overlaying FeedHeader + ActivityChips, plus the compact back header overlay
// shown while a post is focused. Handles height measurements via callbacks/refs provided by parent.
export default function FeedHeaderOverlay({
  // navigation & actions
  navigation,
  toMessagesScreen,
  onOpenNotifications,
  onBackPress,
  scrollToTop,
  allUsersRef,
  activeWorkout,
  timerRef,
  onPressActivityChip,
  // animated shared values and styles
  overlayHeaderStyle,
  normalHeaderOpacityStyle,
  chipsOpacityStyle,
  backHeaderOpacityStyle,
  // layout shared values/refs
  headerH,
  hidden,
  chipsH,
  visibleHeaderHRef,
  backHeaderHRef,
  setBackHeaderH,
  // state
  isSomePostFocused,
}) {
  return (
    <>
      {/* Ghost back-header sizer to pre-measure compact header height and avoid focus offset jitter */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: -10000, left: 0, right: 0, opacity: 0 }}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height || 0;
          if (h && Math.abs(h - (backHeaderHRef.current || 0)) > 1) {
            backHeaderHRef.current = h;
            setBackHeaderH(h);
          }
        }}
      >
        <SafeAreaInsetsView edges={['top']}>
          <FeedHeader
            navigation={navigation}
            toMessagesScreen={toMessagesScreen}
            onOpenNotifications={onOpenNotifications}
            backButton={true}
            onBackPress={onBackPress}
            scrollToTop={scrollToTop}
            allUsersRef={allUsersRef}
            workout={activeWorkout}
            timerRef={timerRef}
          />
        </SafeAreaInsetsView>
      </View>

      {/* Main overlay header (normal state) */}
      <Reanimated.View
        pointerEvents={isSomePostFocused ? "none" : "auto"}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height || 0;
          if (h && Math.abs(h - headerH.value) > 1) {
            headerH.value = h;
            hidden.value = 0; // start visible
            try { visibleHeaderHRef.current = h; } catch {}
          }
        }}
        style={[{ backgroundColor: theme.bg, zIndex: 20 }, overlayHeaderStyle]}
      >
        <Reanimated.View style={normalHeaderOpacityStyle}>
          <FeedHeader
            navigation={navigation}
            toMessagesScreen={toMessagesScreen}
            onOpenNotifications={onOpenNotifications}
            backButton={false}
            onBackPress={onBackPress}
            scrollToTop={scrollToTop}
            allUsersRef={allUsersRef}
            workout={activeWorkout}
            timerRef={timerRef}
            heightAdjust={-2}
          />
        </Reanimated.View>
        {/* <Reanimated.View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height || 0;
            if (h && Math.abs(h - chipsH.value) > 1) chipsH.value = h;
          }}
          style={chipsOpacityStyle}
        >
          <ActivityChips navigation={navigation} onPressChip={onPressActivityChip} />
        </Reanimated.View> */}
      </Reanimated.View>

      {/* Compact back header shown while a post is focused */}
      {isSomePostFocused && (
        <Reanimated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, backgroundColor: theme.bg }, backHeaderOpacityStyle]}>
          <SafeAreaInsetsView
            edges={['top']}
            onLayout={(e) => { const h = e.nativeEvent.layout.height || 0; backHeaderHRef.current = h; setBackHeaderH(h); }}
          >
            <FeedHeader
              navigation={navigation}
              toMessagesScreen={toMessagesScreen}
              onOpenNotifications={onOpenNotifications}
              backButton={true}
              onBackPress={onBackPress}
              scrollToTop={scrollToTop}
              allUsersRef={allUsersRef}
              workout={activeWorkout}
              timerRef={timerRef}
            />
          </SafeAreaInsetsView>
        </Reanimated.View>
      )}
    </>
  );
}
