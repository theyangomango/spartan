import React from 'react';
import { View, Text, Animated } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import SpectatingWorkoutModal from '../../3_Workout/NewWorkout/SpectatingWorkoutModal';
import { canViewWorkout } from '../../../utils/workoutPrivacy';
import { styles } from './UserStatsStyles';

export default function UserStatsWorkoutViewerScreen({
    visible,
    gesture,
    translateX,
    handleOpacity,
    workout,
    viewerUid,
    viewerData,
    statsForViewer,
    onClose,
    user,
    timerRef,
}) {
    if (!visible) return null;

    const canView = workout ? canViewWorkout(workout, viewerUid, viewerData) : false;

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.workoutOverlay, { transform: [{ translateX }] }]} pointerEvents="auto">
                <View style={styles.viewerHandleWrap}>
                    <Animated.View style={[styles.viewerHandleIndicator, { opacity: handleOpacity }]} />
                </View>
                {workout ? (
                    <View style={{ flex: 1 }}>
                        {canView ? (
                            <SpectatingWorkoutModal
                                timerRef={timerRef}
                                workout={workout}
                                userWorkoutStats={statsForViewer || undefined}
                                onPressBack={onClose}
                                onCheer={() => { }}
                                onCopyTemplate={() => { }}
                                onPressPfp={onClose}
                                forceViewingFriend={String(user?.uid || "")}
                                friendPfp={user?.image || user?.pfp || null}
                                streamLive={false}
                            />
                        ) : (
                            <View style={styles.lockedWrap}>
                                <Text style={styles.lockedTitle}>Workout is private</Text>
                                <Text style={styles.lockedSubtitle}>You do not have permission to view this workout.</Text>
                            </View>
                        )}
                    </View>
                ) : null}
            </Animated.View>
        </GestureDetector>
    );
}
