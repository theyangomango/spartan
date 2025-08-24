import React, { useRef, memo } from 'react';
import { StyleSheet, View, Text, Pressable, Animated, Dimensions } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';

import PlayIcon from './PlayIcon';
import CalendarIcon from './CalendarIcon';
import WeightIcon from './WeightIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375;
const scaleSize = (size) => Math.round(size * (SCREEN_WIDTH / BASE_WIDTH));

const COLORS = {
  card: '#FFFFFF',
  text: '#0F172A',
  subtext: '#64748B',
  hairline: 'rgba(2,6,23,0.06)',
  playBg: '#E1F0FF',
  playIcon: '#2D9EFF',
  titleBlue: '#2d9dffcc',
  subtitleGray: '#777',
};

const CIRCLE_SIZE = scaleSize(36);

const TemplateCard = memo(
  ({ template, handleLongPress, handlePressEditButton, handlePressStartButton }) => {
    const scaleValue = useRef(new Animated.Value(1)).current;

    const handleStartButtonPressIn = () => {
      Animated.spring(scaleValue, { toValue: 0.9, friction: 3, tension: 40, useNativeDriver: true }).start();
    };
    const handleStartButtonPressOut = () => {
      Animated.spring(scaleValue, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
    };

    return (
      <RNBounceable onPress={handlePressEditButton} onLongPress={handleLongPress} delayLongPress={200}>
        <View style={styles.card}>
          <View style={styles.textCol}>
            {/* Title from 2nd snippet */}
            <Text style={styles.title} numberOfLines={1}>
              {template.name}
            </Text>

            {/* Subtitle row from 2nd snippet */}
            <View style={styles.infoContainer}>
              <View style={styles.dateContainer}>
                <CalendarIcon width={scaleSize(13.9)} height={scaleSize(13.9)} />
                <Text style={styles.dateText}>
                  {template.lastDate ? template.lastDate : 'New!'}
                </Text>
              </View>

              <View style={styles.exercisesContainer}>
                <WeightIcon width={scaleSize(15.9)} height={scaleSize(15.9)} />
                <Text style={styles.exercisesText}>
                  <Text>{template.exercises.length > 0 && (template.exercises.length + ' ')}</Text>
                  <Text>
                    {template.exercises.length === 0 && 'No '}
                    {`Exercise${template.exercises.length === 1 ? '' : 's'}`}
                  </Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Play button like the macro tracker */}
          <Pressable
            onPress={handlePressStartButton}
            onPressIn={handleStartButtonPressIn}
            onPressOut={handleStartButtonPressOut}
            style={styles.startBtn}
            hitSlop={8}
          >
            <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
              <View style={styles.circle}>
                <PlayIcon size={scaleSize(15)} color={COLORS.playIcon} />
              </View>
            </Animated.View>
          </Pressable>
        </View>
      </RNBounceable>
    );
  }
);

export default TemplateCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: scaleSize(20),
    marginHorizontal: scaleSize(16),
    marginTop: scaleSize(11),
    paddingVertical: scaleSize(13),
    paddingLeft: scaleSize(27),
    paddingRight: scaleSize(24), // a bit more horizontal padding
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 7,
    elevation: 1,
  },

  textCol: { flex: 1, paddingRight: scaleSize(12) },

  // Title (2nd snippet)
  title: {
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.titleBlue,
    fontSize: 16,
    marginBottom: scaleSize(4),
  },

  // Subtitle text (2nd snippet)
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: scaleSize(10),
  },
  dateText: {
    fontFamily: 'Outfit_500Medium',
    color: COLORS.subtitleGray,
    marginLeft: scaleSize(4),
    marginBottom: scaleSize(0.2),
    letterSpacing: -0.1,
    fontSize: 13,
  },
  exercisesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: scaleSize(1.8),
  },
  exercisesText: {
    fontFamily: 'Outfit_500Medium',
    color: COLORS.subtitleGray,
    marginLeft: scaleSize(4),
    marginBottom: scaleSize(0.47),
    letterSpacing: -0.1,
    fontSize: 13,
  },

  startBtn: { marginLeft: scaleSize(10) },

  circle: {
    backgroundColor: COLORS.playBg,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    paddingLeft: 2,
  },
});
