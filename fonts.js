import * as Font from 'expo-font';
import { Entypo, FontAwesome } from '@expo/vector-icons';

import { Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import {
    Mulish_500Medium,
    Mulish_700Bold,
    Mulish_800ExtraBold,
} from '@expo-google-fonts/mulish';
import {
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import {
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import {
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
} from '@expo-google-fonts/poppins';

export const customFonts = {
    Inter_600SemiBold,
    Inter_700Bold,
    Mulish_500Medium,
    Mulish_700Bold,
    Mulish_800ExtraBold,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    ...Entypo.font,
    ...FontAwesome.font,
};

let loadPromise = null;

export const ensureFontsLoaded = () => {
    if (!loadPromise) {
        loadPromise = Font.loadAsync(customFonts);
    }
    return loadPromise;
};
