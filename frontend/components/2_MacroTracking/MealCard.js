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
                        <Image source={item.icon} style={[styles.icon, item.iconSize ? { width: item.iconSize, height: item.iconSize } : null]} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{item.name}</Text>
                        <Text style={styles.subtitle}>{item.subtitle}</Text>
                    </View>
                    <Ionicons
                        name={collapsed ? 'chevron-down' : 'chevron-up'}
                        size={20}
                        color={COLORS.subtext}
                        style={{ marginLeft: 6 }}
                    />
                </Pressable>

                <Pressable style={styles.addBtn} onPress={() => onAddPress(item)} hitSlop={10}>
                    <Ionicons name="add-circle" size={28} color={COLORS.accent ?? '#64aaf6ff'} />
                </Pressable>
            </View>
        </View>
    );
}

const makeStyles = (COLORS) =>
    StyleSheet.create({
        card: {
            backgroundColor: COLORS.card,
            borderRadius: 20,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginHorizontal: 16,
            marginTop: 10,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: COLORS.hairline,
            shadowColor: '#000',
            shadowOpacity: 0.03,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
        },
        row: { flexDirection: 'row', alignItems: 'center' },
        left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
        iconWrapper: {
            width: 44,
            height: 44,
            borderRadius: 15,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        icon: { height: 26, width: 26, resizeMode: 'contain' },
        title: {
            fontSize: 15.5,
            color: COLORS.text,
            fontFamily: 'Outfit_700Bold',
            marginBottom: 2,
        },
        subtitle: {
            fontSize: 12.5,
            color: COLORS.subtext,
            fontFamily: 'Outfit_400Regular',
        },
        addBtn: {
            height: 40,            // was 34
            width: 40,             // was 34
            borderRadius: 20,
            backgroundColor: COLORS.addBtnBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 10,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: COLORS.hairline,
        }

    });
