import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import theme from '../../theme/mfpDark';
import scaleSize from '../../helper/scaleSize';
import { withStrongPress } from "../../utils/haptics";

const ViewProfileOptionsSheet = ({ isVisible, setIsVisible, handle = '', isBlocked = false, onBlock, onUnblock, onReport }) => {
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['28%'], []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.45}
      />
    ),
    []
  );

  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex?.(0));
    } else {
      bottomSheetRef.current?.close?.();
    }
  }, [isVisible]);

  const close = () => setIsVisible(false);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isVisible ? 0 : -1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      handleStyle={{ display: 'none' }}
      backgroundStyle={{
        backgroundColor: theme.bg,
        borderTopLeftRadius: scaleSize(20),
        borderTopRightRadius: scaleSize(20),
      }}
      enablePanDownToClose
      onClose={close}
    >
      <View style={styles.content}>
        <Text style={styles.headerText}>Options</Text>

        <Pressable style={styles.row} onPress={withStrongPress(() => { onReport && onReport(); close(); })}>
          <View style={styles.rowLeft}>
            <Feather name="flag" size={scaleSize(22)} color="#F87171" />
          </View>
          <Text style={[styles.rowText, styles.reportText]}>
            Report {handle ? `@${handle}` : 'user'}
          </Text>
        </Pressable>

        {isBlocked ? (
          <Pressable style={styles.row} onPress={withStrongPress(() => { onUnblock && onUnblock(); close(); })}>
            <View style={styles.rowLeft}>
              <Feather name="unlock" size={scaleSize(22)} color={theme.success || '#10B981'} />
            </View>
            <Text style={[styles.rowText, { color: theme.success || '#10B981' }]}>
              Unblock {handle ? `@${handle}` : 'user'}
            </Text>
          </Pressable>
        ) : (
          <Pressable style={styles.row} onPress={withStrongPress(() => { onBlock && onBlock(); })}>
            <View style={styles.rowLeft}>
              <Feather name="user-x" size={scaleSize(22)} color={theme.danger || '#ef4444'} />
            </View>
            <Text style={[styles.rowText, { color: theme.danger || '#ef4444' }]}>
              Block {handle ? `@${handle}` : 'user'}
            </Text>
          </Pressable>
        )}

        <Pressable style={styles.row} onPress={withStrongPress(close)}>
          <View style={styles.rowLeft}>
            <Feather name="x" size={scaleSize(22)} color={theme.textSecondary} />
          </View>
          <Text style={styles.rowText}>Cancel</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
};

export default React.memo(ViewProfileOptionsSheet);

const styles = StyleSheet.create({
  content: {
    paddingTop: scaleSize(18),
    paddingBottom: scaleSize(10),
    paddingHorizontal: scaleSize(18),
  },
  headerText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: scaleSize(16),
    color: theme.textPrimary,
    marginBottom: scaleSize(8),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleSize(14),
  },
  rowLeft: {
    width: scaleSize(28),
    alignItems: 'center',
  },
  rowText: {
    marginLeft: scaleSize(8),
    fontFamily: 'Outfit_600SemiBold',
    fontSize: scaleSize(14.5),
    color: theme.textPrimary,
  },
  reportText: {
    color: '#F87171',
  },
});
