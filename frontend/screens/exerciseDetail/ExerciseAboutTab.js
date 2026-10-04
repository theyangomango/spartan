// About tab of the ExerciseDetail screen: image, muscle and equipment, favourite toggle and how-to steps.
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import theme from '../../theme/mfpDark';
import { scaleSize } from '../../components/2_Competition/layoutConstants';
import ExerciseImagePreview from '../../components/3_Workout/NewWorkout/SelectExercise/ExerciseImagePreview';
import { withStrongPress } from '../../utils/haptics';
import styles from './ExerciseDetail.styles';

const ExerciseAboutTab = ({
    name,
    muscleGroup,
    equipment,
    isFavorite,
    favoriteButtonLabel,
    favoriteAccessibilityLabel,
    onToggleFavorite,
    howToSteps,
    displayTitle,
}) => (
    <View style={styles.sectionSpacing}>
        <View style={styles.heroCard}>
            <View style={styles.heroImageWrapper}>
                <ExerciseImagePreview
                    exercise={name}
                    size={scaleSize(260)}
                    style={styles.heroImagePreview}
                    imageStyle={styles.heroImage}
                />
            </View>
        </View>

        <View style={styles.metaRow}>
            <View style={[styles.metaItem, styles.metaItemLeft]}>
                <Text style={styles.metaLabel}>Primary Muscle</Text>
                <Text style={styles.metaValue}>{muscleGroup}</Text>
            </View>
            <View style={[styles.metaItem, styles.metaItemRight]}>
                <Text style={styles.metaLabel}>Equipment</Text>
                <Text style={styles.metaValue}>{equipment}</Text>
            </View>
        </View>

        <Pressable
            style={[styles.actionButton, styles.shareButton]}
            onPress={withStrongPress(onToggleFavorite)}
            accessibilityRole="button"
            accessibilityLabel={favoriteAccessibilityLabel}
            accessibilityState={{ selected: isFavorite }}
        >
            <View
                style={[
                    styles.actionIcon,
                    styles.shareIcon,
                    isFavorite && styles.favoriteIconActive,
                ]}
            >
                <Ionicons
                    name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                    size={scaleSize(16)}
                    color={isFavorite ? theme.primary : theme.surface}
                />
            </View>
            <Text style={styles.shareText}>{favoriteButtonLabel}</Text>
            <View style={styles.actionIconSpacer} />
        </Pressable>

        {howToSteps.length > 0 && (
            <View style={styles.howToBlock}>
                <Text style={styles.howToTitle}>{`How to do ${displayTitle}`}</Text>
                {howToSteps.map((step, index) => (
                    <View
                        key={`howTo-${index}`}
                        style={[
                            styles.howToRow,
                            index === howToSteps.length - 1 && styles.howToRowLast,
                        ]}
                    >
                        <Text style={styles.howToIndex}>{`${index + 1}.`}</Text>
                        <Text style={styles.howToText}>{step}</Text>
                    </View>
                ))}
            </View>
        )}
    </View>
);

export default ExerciseAboutTab;
