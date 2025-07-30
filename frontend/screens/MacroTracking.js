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
    background: '#f5f6fa',
    textPrimary: '#1C1C1E',
    textSecondary: '#777',
    card: '#ffffffff',
    accentBlue: '#53B6F5',
    protein: '#B3B5FF',
    carbs: '#FFB3D1',
    fat: '#FFCBA0',
    mealCardShadow: '#99a5b7ff',
    addButton: '#eaeeffb0',
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

const MacroBar = ({ label, value, goal, color }) => {
    const progress = Math.min(value / goal, 1);
    return (
        <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, marginTop: 5, alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: 'Outfit_500Medium', color: COLORS.textPrimary, fontSize: 14 }}>{label}</Text>
                <Text style={{ fontFamily: 'Outfit_500Medium', color: COLORS.textSecondary, fontSize: 13 }}>
                    {value} / {goal}g
                </Text>
            </View>
            <View style={{
                height: 7,
                borderRadius: 7,
                backgroundColor: '#f0f0f0',
                overflow: 'hidden',
            }}>
                <View style={{
                    height: 7,
                    width: `${progress * 100}%`,
                    backgroundColor: color,
                    borderRadius: 7,
                }} />
            </View>
        </View>
    );
};

export default function MacroTracking({ navigation }) {
    const [focusedDate, setFocusedDate] = useState(new Date());

    const calorieProgress = (currentMacros.calories / MACRO_GOALS.calories) * 100;

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
                contentContainerStyle={{ paddingTop: 50, paddingBottom: 100 }}
                style={styles.body}
            >
                <Text style={styles.sectionTitle}>Nutrition</Text>
                <View style={styles.trackerCard}>
                    <View style={styles.trackerRow}>
                        <View style={styles.progressContainer}>
                            <AnimatedCircularProgress
                                size={135}
                                width={11}
                                fill={calorieProgress}
                                tintColor="#6FB8FF"
                                backgroundColor="#f0f0f0"
                                lineCap="round"
                                arcSweepAngle={360}
                                rotation={0}
                            >
                                {() => (
                                    <View style={styles.centerContent}>
                                        <Text style={styles.valueText}>
                                            {(MACRO_GOALS.calories - currentMacros.calories).toLocaleString()}
                                        </Text>
                                        {/* <Text style={styles.valueSubtitleText}>kcal remaining</Text> */}
                                        <Text style={styles.valueSubtitleText}>/{MACRO_GOALS.calories.toLocaleString()} Kcal</Text>
                                    </View>
                                )}
                            </AnimatedCircularProgress>
                        </View>

                        <View style={styles.macroSummary}>
                            <MacroBar label="Protein" value={currentMacros.protein} goal={MACRO_GOALS.protein} color={COLORS.protein} />
                            <MacroBar label="Carbs" value={currentMacros.carbs} goal={MACRO_GOALS.carbs} color={COLORS.carbs} />
                            <MacroBar label="Fat" value={currentMacros.fat} goal={MACRO_GOALS.fat} color={COLORS.fat} />
                        </View>
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
        backgroundColor: COLORS.background,
    },
    stickyHeader: {
        position: 'absolute',
        top: 48,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: COLORS.background,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 14,
    },
    body: {
        backgroundColor: COLORS.background,
    },
    headerText: {
        fontSize: 18,
        color: COLORS.textPrimary,
        fontFamily: 'Outfit_600SemiBold',
    },
    trackerCard: {
        backgroundColor: '#fff',
        borderRadius: 36,
        elevation: 2,
        paddingTop: 20,
        paddingBottom: 18,
        paddingLeft: 22,
        paddingRight: 25,
        marginBottom: 30,
        marginHorizontal: 16,

        shadowColor: COLORS.mealCardShadow,
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    trackerRow: {
        flexDirection: 'row',
        gap: 20,
    },
    progressContainer: {
        // justifyContent: 'center',
        // alignItems: 'center',
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    valueText: {
        fontSize: 26,
        color: '#18181A',
        fontFamily: 'Outfit_600SemiBold',
        // letterSpacing: 0.7,
        marginBottom: -2.5,
    },
    valueSubtitleText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 4
    },
    macroSummary: {
        flex: 1,
        // justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 19,
        marginBottom: 12,
        fontFamily: 'Outfit_700Bold',
        marginLeft: 18,
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
        shadowOpacity: 0.1,
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
