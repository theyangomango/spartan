import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    ScrollView,
} from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../components/Footer';

// Local icons
import breakfastIcon from '../assets/breakfast.png';
import lunchIcon from '../assets/lunch.png';
import dinnerIcon from '../assets/dinner.png';
import PlusIcon from '../assets/PlusIcon';

const COLORS = {
    background: '#fcfcfc',
    textPrimary: '#1C1C1E',
    textSecondary: '#777',
    card: '#ffffffff',
    accentBlue: '#53B6F5',
    protein: '#B3B5FF',
    carbs: '#FFB3D1',
    fat: '#FFCBA0',
    mealCardShadow: '#c9d0daff',
    addButton: '#f0ec004c',
};

const MACRO_GOALS = {
    calories: 2340,
    carbs: 285,
    fat: 70,
    protein: 140,
};

const currentMacros = {
    calories: 1210,
    carbs: 100,
    fat: 25,
    protein: 60,
};

const meals = [
    {
        name: 'Breakfast',
        subtitle: 'Breakfast fuels your day',
        icon: breakfastIcon,
        bgColor: '#fbedd9',
    },
    {
        name: 'Lunch',
        subtitle: 'Lunch fuels your goals',
        icon: lunchIcon,
        bgColor: '#ffe8e9',
    },
    {
        name: 'Dinner',
        subtitle: 'Dinner completes your nutrition',
        icon: dinnerIcon,
        bgColor: '#eaefce',
    },
];

export default function MacroTracking({ navigation }) {
    const [focusedDate, setFocusedDate] = useState(new Date());

    const calorieProgress = (currentMacros.calories / MACRO_GOALS.calories) * 100;
    const carbProgress = (currentMacros.carbs / MACRO_GOALS.carbs) * 100;
    const fatProgress = (currentMacros.fat / MACRO_GOALS.fat) * 100;
    const proteinProgress = (currentMacros.protein / MACRO_GOALS.protein) * 100;

    const formatDate = (date) =>
        date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });

    const shiftDate = (days) => {
        const newDate = new Date(focusedDate);
        newDate.setDate(focusedDate.getDate() + days);
        setFocusedDate(newDate);
    };

    return (
        <View style={styles.container}>
            <View style={styles.stickyHeader}>
                <Pressable onPress={() => shiftDate(-1)}>
                    <Ionicons name="chevron-back" size={25} color={COLORS.textPrimary} />
                </Pressable>
                <Text style={styles.headerText}>{formatDate(focusedDate)}</Text>
                <Pressable onPress={() => shiftDate(1)}>
                    <Ionicons name="chevron-forward" size={25} color={COLORS.textPrimary} />
                </Pressable>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 60, paddingBottom: 100 }}
                style={styles.body}
            >
                <View style={styles.trackerCard}>
                    <View style={styles.ringsRow}>

                        <View style={styles.ringWrapper}>
                            <AnimatedCircularProgress
                                size={78} width={8} fill={fatProgress}
                                tintColor={COLORS.accentBlue} backgroundColor="#edededff"
                                arcSweepAngle={360} rotation={0} lineCap="round"
                            >
                                {() => (
                                    <View style={styles.smallRingContent}>
                                        <Text style={styles.ringValue}>{currentMacros.calories}</Text>
                                        <Text style={styles.goalText}>/ {MACRO_GOALS.calories}</Text>
                                    </View>
                                )}
                            </AnimatedCircularProgress>
                            <Text style={styles.ringLabel}>CALORIES</Text>
                        </View>


                        <View style={styles.ringWrapper}>
                            <AnimatedCircularProgress
                                size={78} width={8} fill={carbProgress}
                                tintColor={COLORS.carbs} backgroundColor="#edededff"
                                arcSweepAngle={360} rotation={0} lineCap="round"
                            >
                                {() => (
                                    <View style={styles.smallRingContent}>
                                        <Text style={styles.ringValue}>{currentMacros.carbs}g</Text>
                                        <Text style={styles.goalText}>/ {MACRO_GOALS.carbs}</Text>
                                    </View>
                                )}
                            </AnimatedCircularProgress>
                            <Text style={styles.ringLabel}>CARBS</Text>

                        </View>

                        <View style={styles.ringWrapper}>
                            <AnimatedCircularProgress
                                size={78} width={8} fill={fatProgress}
                                tintColor={COLORS.fat} backgroundColor="#edededff"
                                arcSweepAngle={360} rotation={0} lineCap="round"
                            >
                                {() => (
                                    <View style={styles.smallRingContent}>
                                        <Text style={styles.ringValue}>{currentMacros.fat}g</Text>
                                        <Text style={styles.goalText}>/ {MACRO_GOALS.fat}</Text>
                                    </View>
                                )}
                            </AnimatedCircularProgress>
                            <Text style={styles.ringLabel}>FAT</Text>
                        </View>

                        <View style={styles.ringWrapper}>
                            <AnimatedCircularProgress
                                size={78} width={8} fill={proteinProgress}
                                tintColor={COLORS.protein} backgroundColor="#edededff"
                                arcSweepAngle={360} rotation={0} lineCap="round"
                            >
                                {() => (
                                    <View style={styles.smallRingContent}>
                                        <Text style={styles.ringValue}>{currentMacros.protein}g</Text>
                                        <Text style={styles.goalText}>/ {MACRO_GOALS.protein}</Text>
                                    </View>
                                )}
                            </AnimatedCircularProgress>
                            <Text style={styles.ringLabel}>PROTEIN</Text>
                        </View>


                        {/* <View style={styles.bigRingWrapper}>
                            <AnimatedCircularProgress
                                size={100} width={11} fill={calorieProgress}
                                tintColor={COLORS.accentBlue} backgroundColor="#f3f3f3"
                                arcSweepAngle={360} rotation={0} lineCap="round"
                            >
                                {() => (
                                    <View style={styles.bigRingContent}>
                                        <Text style={styles.bigRingValue}>{currentMacros.calories}</Text>
                                        <Text style={styles.bigGoalText}>/ {MACRO_GOALS.calories}</Text>
                                    </View>
                                )}
                            </AnimatedCircularProgress>
                        </View> */}


                    </View>
                </View>

                <Text style={styles.sectionTitle}>Daily meals</Text>
                {meals.map((item) => (
                    <View style={styles.mealCard} key={item.name}>
                        <View style={styles.mealInfo}>
                            <View style={[styles.iconWrapper, { backgroundColor: item.bgColor }]}>
                                <Image source={item.icon} style={styles.mealIcon} />
                            </View>
                            <View>
                                <Text style={styles.mealTitle}>{item.name}</Text>
                                <Text style={styles.mealSubtitle}>{item.subtitle}</Text>
                            </View>
                        </View>
                        <Pressable style={styles.addButton}>
                            <PlusIcon color='#414422ff' />
                        </Pressable>
                    </View>
                ))}
            </ScrollView>

            <Footer navigation={navigation} currentScreenName={'MacroTracking'} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 48,
        backgroundColor: '#fff',
    },
    stickyHeader: {
        position: 'absolute',
        top: 48,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 14,
        shadowColor: '#bbb',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    body: {
        backgroundColor: COLORS.background,
    },
    headerText: {
        fontSize: 18,
        color: COLORS.textPrimary,
        fontFamily: 'Outfit_600SemiBold',
    },
    ringsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 18,
    },
    ringWrapper: {
        // width: 80,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    bigRingWrapper: {
        width: 100,
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginLeft: 3,
    },
    ringLabel: {
        color: COLORS.textSecondary,
        fontSize: 12.5,
        fontFamily: 'Outfit_700Bold',
        marginTop: 9,
        letterSpacing: 0.3,
    },
    ringWithBadge: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    smallRingContent: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 7,
    },
    ringValue: {
        fontSize: 16,
        color: COLORS.textPrimary,
        fontFamily: 'Outfit_700Bold',
    },
    goalText: {
        fontSize: 12,
        color: '#BBB',
        fontFamily: 'Outfit_500Medium',
        marginTop: -1,
        marginBottom: 5,
    },
    bigGoalText: {
        fontSize: 12,
        color: '#BBB',
        fontFamily: 'Outfit_500Medium',
        marginTop: -1.5,
        marginBottom: 10.5,
    },
    bigRingContent: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    bigRingValue: {
        fontSize: 20,
        color: COLORS.textPrimary,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 0,
        marginTop: 4,
    },
    trackerCard: {
        // backgroundColor: COLORS.card,
        borderRadius: 26,
        paddingTop: 6,
        marginHorizontal: 20,
        shadowColor: '#bbb',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        marginBottom: 6,
    },
    trackerHeading: {
        fontFamily: 'Outfit_700Bold',
        color: COLORS.textPrimary,
        paddingBottom: 16,
        paddingLeft: 18,
        fontSize: 19,
    },
    sectionTitle: {
        fontSize: 19,
        marginBottom: 12,
        fontFamily: 'Outfit_700Bold',
        marginLeft: 18,
        marginTop: 10,
        color: COLORS.textPrimary,
        letterSpacing: 0.2,
    },
    mealCard: {
        backgroundColor: COLORS.card,
        borderRadius: 18,
        paddingLeft: 16,
        paddingRight: 18,
        paddingVertical: 15,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: COLORS.mealCardShadow,
        shadowOpacity: 0.14,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 6,
        marginHorizontal: 12,
    },
    mealInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    mealIcon: {
        width: 26,
        height: 26,
        resizeMode: 'contain',
    },
    mealTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: 2,
        letterSpacing: 0.1,
    },
    mealSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
        fontFamily: 'Outfit_400Regular',
        letterSpacing: 0.1,
    },
    addButton: {
        backgroundColor: COLORS.addButton,
        padding: 7,
        borderRadius: 13,
        shadowColor: COLORS.mealCardShadow,
        shadowOpacity: 0.13,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 1.5 },
        elevation: 3,
    },
});