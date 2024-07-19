import { StyleSheet, KeyboardAvoidingView, SafeAreaView, Text, View, Pressable, Keyboard } from 'react-native'
import React, { useRef, useState } from 'react'
import PhoneInput from 'react-native-phone-number-input';

export default function Authentication() {
    const [focused, setFocused] = useState(false);
    const [showMobileNumberLabel, setShowMobileNumberLabel] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneNumberValid, setPhoneNumberValid] = useState(false);
    const [pressedContinue, setPressedContinue] = useState(false);
    const phoneInput = useRef(null);

    
    function onPressOutside() {
        console.log('press outside');
        setFocused(false);
        Keyboard.dismiss();
        if (phoneNumber == '') setShowMobileNumberLabel(false);
    }

    function onTextInputFocus() {
        console.log('focused');
        setShowMobileNumberLabel(true)
        setFocused(true);
    }

    function onChangeInputText(text) {
        setPhoneNumber(text);

        const checkValid = phoneInput.current?.isValidNumber(text);
        setPhoneNumberValid(checkValid);
    }

    function onPressContinue() {
        console.log('submit');
        setPressedContinue(true);
        setTimeout(() => {
            setPressedContinue(false);
        }, 100);
        if (true) signIn();
    }

    async function signIn() {
        console.log('signing in with ' + phoneNumber);
    }

    return (
        <SafeAreaView style={styles.safe_area_view}>
            <KeyboardAvoidingView style={styles.main_ctnr}>
                <Pressable style={styles.main_pressable} onPress={onPressOutside}>
                    <View>
                        <View style={styles.title_text_ctnr}>
                            <Text style={styles.title_text}>Enter your mobile phone number</Text>
                        </View>
                        <View style={styles.description_text_ctnr}>
                            <Text style={styles.description_text}>Please confirm your country code and enter your mobile phone number</Text>
                        </View>
                        <View style={styles.phone_input_ctnr}>
                            <View style={styles.phone_input_labels_ctnr}>
                                <Text style={styles.phone_input_label}>Country code</Text>
                                <Text style={[styles.mobile_number_label, phoneNumberValid && styles.mobile_number_valid_label]}>{showMobileNumberLabel ? 'Mobile Number' : ''}</Text>
                            </View>
                            <PhoneInput
                                ref={phoneInput}
                                defaultCode='US'
                                placeholder={focused ? ' ' : 'Mobile Number'}
                                layout="second"
                                textContainerStyle={styles.phone_input_text_ctnr}
                                countryPickerButtonStyle={styles.country_picker_btn}
                                codeTextStyle={styles.phone_country_code}
                                textInputStyle={[(!focused && styles.phone_input_text), (focused && styles.phone_input_text_selected), (phoneNumberValid && styles.phone_input_text_valid)]}
                                textInputProps={{
                                    onFocus: () => { onTextInputFocus() },
                                    keyboardType: 'number-pad',
                                    placeholderTextColor: 'grey',
                                }}
                                inputStyle={{
                                    background: "lightblue"
                                }}
                                onChangeFormattedText={onChangeInputText}
                            />
                        </View>
                    </View>
                    <Pressable onPress={onPressContinue}>
                        <View style={pressedContinue ? styles.continue_btn_submitted : styles.continue_btn}>
                            <Text style={pressedContinue ? styles.continue_btn_text_submitted : styles.continue_btn_text}>CONTINUE</Text>
                        </View>
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const COLORS = {
    BLUE: '#0699FF',
    GREEN: '#35CD88'
};

const styles = StyleSheet.create({
    safe_area_view: {
        flex: 1
    },
    main_ctnr: {
        padding: 25,
        flex: 1,
    },
    main_pressable: {
        flex: 1
    },
    title_text_ctnr: {
        paddingVertical: 10,
    },
    title_text: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    description_text_ctnr: {
        width: '70%'
    },
    description_text: {
        fontSize: 10,
        color: 'grey'
    },
    phone_input_labels_ctnr: {
        flexDirection: 'row',
    },
    phone_input_label: {
        fontSize: 10,
        color: 'grey'
    },
    mobile_number_label: {
        fontSize: 10,
        marginLeft: 40,
        color: 'red'
    },
    mobile_number_valid_label: {
        color: COLORS.GREEN,
    },
    phone_input_ctnr: {
        width: '100%',
        paddingVertical: 30,
    },
    country_picker_btn: {
        justifyContent: 'space-between',
        paddingRight: 20,
        borderBottomWidth: 1.5,
        borderBottomColor: 'grey',
    },
    phone_country_code: {
        fontSize: 13,
    },
    phone_input_text_ctnr: {
        height: 35,
        backgroundColor: 'white',
        width: '100%',
    },
    phone_input_text: {
        height: 35,
        fontSize: 13,
        width: '100%',
        borderBottomWidth: 1.5,
        borderBottomColor: 'grey',
    },
    phone_input_text_selected: {
        height: 35,
        fontSize: 13,
        width: '100%',
        borderBottomWidth: 1.5,
        borderBottomColor: 'red',
    },
    phone_input_text_valid: {
        borderBottomColor: COLORS.GREEN,
    },
    continue_btn: {
        width: '100%',
        height: 45,
        backgroundColor: '#51B8FF',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    continue_btn_text: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700'
    },
    continue_btn_submitted: {
        width: '100%',
        height: 45,
        backgroundColor: '#0699FF',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    continue_btn_text_submitted: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold'
    }
});