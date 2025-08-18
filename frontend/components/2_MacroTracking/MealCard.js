// components/2_MacroTracking/MealCard.js
import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MealCard({
    item,
    PlusIcon,
    COLORS,
    onAddPress,
    onToggle,
    collapsed = false,
}) {
    const styles = makeStyles(COLORS);

    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <Pressable style={styles.left} onPress={onToggle} hitSlop={8}>
                    <View style={[styles.iconWrapper, { backgroundColor: item.bgColor }]}>
                        <Image source={item.icon} style={styles.icon} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{item.name}</Text>
                        <Text style={styles.subtitle}>{item.subtitle}</Text>
                    </View>
                    <Ionicons
                        name={collapsed ? 'chevron-down' : 'chevron-up'}
                        size={20}
                        color={COLORS.textSecondary}
                        style={{ marginLeft: 6 }}
                    />
                </Pressable>

                <Pressable style={styles.addBtn} onPress={() => onAddPress(item)} hitSlop={10}>
                    <PlusIcon size={22} color="#79b3ff" />
                </Pressable>
            </View>
        </View>
    );
}

const makeStyles = (COLORS) =>
    StyleSheet.create({
        card: {
            backgroundColor: '#fff',
            borderRadius: 24,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginHorizontal: 16,
            marginTop: 10,
            shadowColor: COLORS.mealCardShadow,
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 2,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        left: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        iconWrapper: {
            width: 44,
            height: 44,
            borderRadius: 15,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 10,
        },
        icon: {
            height: 26,
            width: 26,
            resizeMode: 'contain',
        },
        title: {
            fontSize: 15.5,
            color: COLORS.textPrimary,
            fontFamily: 'Nunito_800ExtraBold',
            marginBottom: 2,
        },
        subtitle: {
            fontSize: 12.5,
            color: COLORS.textSecondary,
            fontFamily: 'Outfit_400Regular',
        },
        addBtn: {
            height: 34,
            width: 34,
            borderRadius: 17,
            backgroundColor: '#eaeeffb0',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 10,
        },
    });