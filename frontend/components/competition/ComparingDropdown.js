import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { ArrowDown2 } from 'iconsax-react-native'

const data = [
    { label: 'Ab Wheel', value: 'abWheel' },
    { label: 'Arnold Press', value: 'arnoldPress' },
    { label: 'Around the World', value: 'aroundTheWorld' },
    { label: 'Back Extention', value: 'backExtention' },
    { label: 'Bench Dip', value: 'benchDip' },
    { label: 'Bench Press', value: 'benchPress' },
    { label: 'Bench Press (Smith Machine)', value: 'benchPressSmithMachine' },
    { label: 'Bench Press (Dumbell)', value: 'benchPressDumbell' },

    { label: 'Bent Over One Arm Row', value: 'bentOverOneArmRow' },
    { label: 'Bent Over Row (Barbell)', value: 'bentOverRowBarbell' },
    { label: 'Bent Over Row (Dumbell)', value: 'bentOverRowDumbell' },
    { label: 'Bicep Curls (Barbell)', value: 'bicepCurlsBarbell' },
    { label: 'Bicep Curls (Dumbell)', value: 'bicepCurlsDumbell' },
    { label: 'Bulgarian Split Squats', value: 'bulgarianSplitSquats' },
    { label: 'Burpees', value: 'burpees' },
];

export default function ComparingDropdown({ selectCategoryCompared }) {
    const [value, setValue] = useState('benchPress');
    const [isFocus, setIsFocus] = useState(false);

    return (
        <View style={styles.container}>
            <Dropdown
                style={styles.dropdown}
                selectedTextStyle={styles.selected_text}
                inputSearchStyle={styles.search_text}
                containerStyle={styles.drop_ctnr}
                iconStyle={styles.iconStyle}
                showsVerticalScrollIndicator={false}
                data={data}
                search
                maxHeight={250}
                labelField="label"
                valueField="value"
                searchPlaceholder="Search..."
                value={value}
                onFocus={() => setIsFocus(true)}
                onBlur={() => setIsFocus(false)}
                onChange={item => {
                    setValue(item.value);
                    selectCategoryCompared(item.value);
                    setIsFocus(false);
                }}
                renderRightIcon={() => (
                    <ArrowDown2 size={20} color="#fff" style={styles.right_icon} />
                )}
                renderItem={item => {
                    return (
                        <View style={styles.item}>
                            <Text style={styles.item_text}>{item.label}</Text>
                        </View>
                    )
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#2D9EFF',
        position: 'absolute',
        top: 40,
        right: 0,
        width: '70%',
    },
    dropdown: {
        height: 50,
        paddingHorizontal: 8,
    },
    drop_ctnr: {
        borderRadius: 10,
        backgroundColor: '#fff',
        width: '65%',
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    item: {
        paddingLeft: 12,
        paddingVertical: 10,
    },
    item_text: {
        fontSize: 15,
        fontFamily: 'Mulish_600SemiBold',
    },
    icon: {
        marginRight: 5,
    },
    selected_text: {
        fontSize: 16,
        color: '#fff',
        fontFamily: 'Inter_600SemiBold',
        textAlign: 'right'
    },
    iconStyle: {
        width: 20,
        height: 20,
    },
    search_text: {
        height: 32,
        paddingBottom: 2,
        fontFamily: 'Mulish_600SemiBold',
        fontSize: 16,
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
    },
    right_icon: {
        marginLeft: 5,
        marginRight: 15
    }
});