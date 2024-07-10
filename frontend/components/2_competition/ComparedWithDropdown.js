// import React, { useState } from 'react';
// import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { Dropdown } from 'react-native-element-dropdown';
// import { ArrowDown2 } from 'iconsax-react-native'

// const data = [
//     { label: 'All Followers', value: 'All Followers' },
//     { label: 'Close Friends', value: 'Close Friends' },
// ];

// export default function ComparedWithDropdown() {
//     const [value, setValue] = useState('All Followers');
//     const [isFocus, setIsFocus] = useState(false);

//     return (
//         <View style={{width: value.length * 13}}>
//             <Dropdown
//                 style={styles.dropdown}
//                 selectedTextStyle={styles.selected_text}
//                 inputSearchStyle={styles.search_text}
//                 containerStyle={styles.drop_ctnr}
//                 iconStyle={styles.iconStyle}
//                 showsVerticalScrollIndicator={false}
//                 data={data}
//                 maxHeight={200}
//                 labelField="label"
//                 valueField="value"
//                 searchPlaceholder="Search..."
//                 value={value}
//                 onFocus={() => setIsFocus(true)}
//                 onBlur={() => setIsFocus(false)}
//                 onChange={item => {
//                     setValue(item.label);
//                     setIsFocus(false);
//                 }}
//                 renderRightIcon={() => (
//                     <ArrowDown2 size={20} color="#000" style={styles.right_icon} />
//                 )}
//                 renderItem={item => {
//                     return (
//                         <View style={styles.item}>
//                             <Text style={styles.item_text}>{item.label}</Text>
//                         </View>
//                     )
//                 }}
//             />
//         </View>
//     );
// };

// const styles = StyleSheet.create({
//     dropdown: {
//         height: 50,
//         paddingHorizontal: 8,
//     },
//     drop_ctnr: {
//         borderRadius: 10,
//         backgroundColor: '#fff',
//         width: 300,
//         shadowColor: '#000',
//         shadowOffset: { width: -4, height: 4 },
//         shadowOpacity: 0.3,
//         shadowRadius: 4,
//     },
//     item: {
//         paddingLeft: 12,
//         paddingVertical: 10,
//     },
//     item_text: {
//         fontSize: 15,
//         fontFamily: 'Mulish_600SemiBold',
//     },
//     icon: {
//         marginRight: 5,
//     },
//     selected_text: {
//         fontFamily: 'Mulish_700Bold',
//         fontSize: 16,
//         textAlign: 'left'
//     },
//     iconStyle: {
//         width: 20,
//         height: 20,
//     },
//     right_icon: {
//         marginLeft: 5,
//         marginRight: 15,
//     }
// });