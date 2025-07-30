import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    Image,
    ScrollView,
} from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import Footer from '../components/Footer';

// Local icons
import breakfastIcon from '../assets/breakfast.png';
import lunchIcon from '../assets/lunch.png';
import dinnerIcon from '../assets/dinner.png';

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

const OUTER_RING_SIZE = 300;
const RING_WIDTH = 24;
const RING_GAP = 6;


const getRingSize = (level) =>
    OUTER_RING_SIZE - (2 * level * RING_WIDTH) - (level === 0 ? 0 : level * RING_GAP);


export default function MacroTracking({ navigation }) {
    const [focusedDate, setFocusedDate] = useState(new Date());

    const calorieProgress = (currentMacros.calories / MACRO_GOALS.calories) * 100;
    // const carbProgress = (currentMacros.carbs / MACRO_GOALS.carbs) * 100;
    // const fatProgress = (currentMacros.fat / MACRO_GOALS.fat) * 100;
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
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => shiftDate(-1)}>
                        <Ionicons name="chevron-back" size={28} color="black" />
                    </Pressable>
                    <Text style={styles.headerText}>{formatDate(focusedDate)}</Text>
                    <Pressable onPress={() => shiftDate(1)}>
                        <Ionicons name="chevron-forward" size={28} color="black" />
                    </Pressable>
                </View>

                {/* Tracker Card */}
                <View style={styles.trackerCard}>
                    <View style={styles.trackerHeaderRow}>
                        <Text style={styles.trackerHeader}>Tracker</Text>
                        <Pressable style={styles.editBtn}>
                            <Text style={styles.editBtnText}>Edit</Text>
                        </Pressable>
                    </View>
                    <View style={styles.progressContainer}>
                        <AnimatedCircularProgress
                            size={getRingSize(0)}
                            width={RING_WIDTH}
                            fill={calorieProgress}
                            tintColor="#6FB8FF"
                            backgroundColor="#f5f5f5"
                            lineCap="round"
                            arcSweepAngle={360}
                            rotation={0}
                        >
                            {() => (
                                <AnimatedCircularProgress
                                    size={getRingSize(1)}
                                    width={RING_WIDTH}
                                    fill={proteinProgress}
                                    tintColor="#fec875"
                                    backgroundColor="#f5f5f5"
                                    arcSweepAngle={360}
                                    rotation={0}
                                    lineCap="round"
                                >
                                    {() => (
                                        <View style={styles.centerContent}>
                                            <View style={styles.fireCircle}>
                                                <SimpleLineIcons name="fire" size={26} color="#fff" />
                                            </View>
                                            <Text style={styles.goalText}>
                                                {`Of ${MACRO_GOALS.calories.toLocaleString()} Kcal`}
                                            </Text>
                                            <Text style={styles.valueText}>
                                                {currentMacros.calories.toLocaleString()}
                                            </Text>
                                        </View>
                                    )}
                                </AnimatedCircularProgress>
                            )}
                        </AnimatedCircularProgress>
                    </View>
                </View>

                {/* Macros Row */}
                <View style={styles.macroRow}>
                    {renderMacroCard('Carbs', currentMacros.carbs, MACRO_GOALS.carbs, '#baefbccd', '#59ce5dff')}
                    {renderMacroCard('Fat', currentMacros.fat, MACRO_GOALS.fat, '#d4cbf7dc', '#9482dfff')}
                    {renderMacroCard('Protein', currentMacros.protein, MACRO_GOALS.protein, '#ffdaa3e5', '#ffa41bff')}
                </View>

                {/* Daily Meals */}
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
                            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                                <Path
                                    d="M6 12h12M12 18V6"
                                    stroke="#000"
                                    strokeWidth={1.6}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                        </Pressable>
                    </View>
                ))}
            </ScrollView>
            <Footer navigation={navigation} currentScreenName={'MacroTracking'} />
        </View>
    );

}

function renderMacroCard(label, value, goal, bgColor, sliderBgColor) {
    const percent = Math.min(100, (value / goal) * 100);

    // // Macro-specific background
    // if (label === "Carbs") bgColor = "#B5E6B7";
    // if (label === "Fat") bgColor = "#D6D1F7";
    // if (label === "Protein") bgColor = "#FFCE79";

    // For thumb positioning, clamp between 0% and 90% so it doesn't overflow
    let thumbLeft = percent < 5 ? '0%' : percent > 95 ? '90%' : `${percent - 5}%`;

    return (
        <View style={[styles.macroCard, { backgroundColor: bgColor }]}>
            <Text style={styles.macroLabel}>{label}</Text>
            <Text style={styles.macroValue}>{value + ' g'}</Text>

            <View style={styles.sliderWrapper}>
                <View style={[styles.sliderTrack, { backgroundColor: sliderBgColor }]}>
                    {/* Filled portion */}
                    <View style={[styles.sliderFill, { width: `${100 - percent}%` }, { backgroundColor: '#ddd' }]} />
                    {/* Pokéball thumb */}
                    <View style={[styles.sliderThumb, { left: thumbLeft }, { borderColor: sliderBgColor, backgroundColor: bgColor }]}>
                    </View>
                </View>
            </View>

            <View style={styles.benchmarkRow}>
                <Text style={styles.benchmarkText}>0</Text>
                <Text style={styles.benchmarkText}>{goal}</Text>
            </View>
        </View>
    );
}



const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 16,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    headerText: {
        fontSize: 18,
        fontWeight: '600',
    },
    progressAndMacros: {
        alignItems: 'center',
        marginBottom: 20,
    },
    circularContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    macroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    macroCard: {
        borderRadius: 16,
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 6,
        alignItems: 'center',
        width: '31.5%',
    },
    macroLabel: {
        fontSize: 13,
        fontFamily: 'Outfit_600SemiBold',
        color: '#444',
        letterSpacing: 0.1,
    },
    sliderWrapper: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 1,
    },
    sliderTrack: {
        width: '90%',
        marginTop: 4,
        height: 4.5,
        borderRadius: 12,
        position: 'relative',
        justifyContent: 'center',
    },
    sliderFill: {
        position: 'absolute',
        height: '100%',
        right: 0,
        top: 0,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        opacity: 0.5,
        zIndex: 0,
    },
    sliderThumb: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 16,
        top: -1.5,
        flexDirection: 'row',
        zIndex: 999,
        overflow: 'hidden',
        borderWidth: 2.5,
        backgroundColor: '#fff',
    },
    macroValue: {
        fontSize: 20,
        fontFamily: 'Outfit_600SemiBold',
    },
    sectionTitle: {
        fontSize: 21,
        fontWeight: '600',
        marginBottom: 12,
        fontFamily: 'Outfit_600SemiBold',
        marginLeft: 5,
        marginTop: 28,
    },
    mealCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        paddingLeft: 16,
        paddingRight: 18,
        paddingVertical: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        color: '#000',
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: 2
    },
    mealSubtitle: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
        fontFamily: 'Outfit_400Regular'
    },
    addButton: {
        backgroundColor: '#f2f2f2',
        padding: 6,
        borderRadius: 12,
    },

    trackerCard: {
        backgroundColor: '#fff',
        borderRadius: 36,
        elevation: 2,
        alignSelf: 'center',
        width: '100%%',
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginBottom: 12
    },
    trackerHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        paddingTop: 6,
    },
    trackerHeader: {
        fontSize: 21,
        marginLeft: 12,
        fontFamily: 'Outfit_600SemiBold',
    },
    editBtn: {
        borderWidth: 1.5,
        borderColor: '#E3E3E6',
        borderRadius: 22,
        paddingHorizontal: 24,
        paddingVertical: 11,
        backgroundColor: '#fff',
        marginRight: 4,
    },
    editBtnText: {
        fontSize: 14,
        color: '#646466ce',
        fontFamily: 'Outfit_600SemiBold',
    },
    progressContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        // marginTop: 6,
        marginBottom: 8,
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    fireCircle: {
        width: 66,
        height: 66,
        borderRadius: 60,
        backgroundColor: '#18181A',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 11,
    },
    goalText: {
        fontSize: 18,
        color: '#555',
        fontFamily: 'Outfit_400Regular',
        marginBottom: 2,
    },
    valueText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#18181A',
        fontFamily: 'Outfit_700Bold',
        marginTop: -2,
    },
    

    benchmarkRow: {
        flexDirection: 'row',
        width: '90%',
        justifyContent: 'space-between'
    },
    benchmarkText: {
        fontSize: 10,
        color: '#666',
        fontFamily: 'Outfit_700Bold'
    }
});
