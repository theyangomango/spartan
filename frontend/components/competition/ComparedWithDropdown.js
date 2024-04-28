import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { ArrowDown2 } from 'iconsax-react-native'

const data = [
    { label: 'Bench Press', value: '1' },
    { label: 'Total', value: '2' },
    { label: 'Item 3', value: '3' },
    { label: 'Ite3334m 4', value: '4' },
    { label: 'Item 5', value: '5' },
    { label: 'Item 6', value: '6' },
    { label: 'Item 7', value: '7' },
    { label: 'Item 8', value: '8' },
];

export default function ComparedWithDropdown() {
    const [value, setValue] = useState('1');
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
                maxHeight={200}
                labelField="label"
                valueField="value"
                searchPlaceholder="Search..."
                value={value}
                onFocus={() => setIsFocus(true)}
                onBlur={() => setIsFocus(false)}
                onChange={item => {
                    setValue(item.value);
                    setIsFocus(false);
                }}
                renderRightIcon={() => (
                    <ArrowDown2 size={20} color="#000" style={styles.right_icon} />
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
        width: 110
    },
    dropdown: {
        height: 50,
        paddingHorizontal: 8,
    },
    drop_ctnr: {
        borderRadius: 10,
        backgroundColor: '#fff',
        width: 300,
        shadowColor: '#000',
        shadowOffset: { width: -4, height: -4 },
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
        fontFamily: 'Mulish_700Bold',
        fontSize: 16,
        textAlign: 'left'
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
        marginRight: 15,
    }
});