// MealCard.js
import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';

const MealCard = ({ item, PlusIcon, COLORS }) => (
    <View style={styles(COLORS).mealCard}>
        <View style={styles(COLORS).mealInfo}>
            <View style={[styles(COLORS).iconWrapper, { backgroundColor: item.bgColor }]}>
                <Image source={item.icon} style={styles(COLORS).mealIcon} />
            </View>
            <View>
                <Text style={styles(COLORS).mealTitle}>{item.name}</Text>
                <Text style={styles(COLORS).mealSubtitle}>{item.subtitle}</Text>
            </View>
        </View>
        <Pressable style={styles(COLORS).addButton}>
            <PlusIcon color='#414422ff' />
        </Pressable>
    </View>
);

const styles = (COLORS) => StyleSheet.create({
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

export default MealCard;