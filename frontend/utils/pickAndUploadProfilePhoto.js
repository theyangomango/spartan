import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { deleteObject, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../firebase.config';
import getPFP from '../../backend/storage/getPFP';
import updateDoc from '../../backend/helper/firebase/updateDoc';

const DEFAULT_COMPRESS_QUALITY = 0.01;

async function compressImage(uri, quality = DEFAULT_COMPRESS_QUALITY) {
    if (!uri) return uri;
    try {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [],
            { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
        );
        return result?.uri || uri;
    } catch {
        return uri;
    }
}

export async function pickAndUploadProfilePhoto({
    onPreview,
    onUploaded,
    compressQuality = DEFAULT_COMPRESS_QUALITY,
    alertOnPermissionDenied = true,
    imagePickerOptions = {},
} = {}) {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            if (alertOnPermissionDenied) {
                Alert.alert(
                    'Permission Required',
                    'Media library access is needed to choose a new profile picture.'
                );
            }
            return null;
        }

        const pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
            presentationStyle:
                Platform.OS === 'ios'
                    ? ImagePicker.PresentationStyle?.FULL_SCREEN ?? 'fullScreen'
                    : undefined,
            ...imagePickerOptions,
        });

        if (pickerResult?.canceled || !Array.isArray(pickerResult?.assets) || pickerResult.assets.length === 0) {
            return null;
        }

        const selectedUri = pickerResult.assets[0]?.uri;
        if (!selectedUri) return null;

        onPreview?.(selectedUri);

        const compressedUri = await compressImage(selectedUri, compressQuality);
        if (compressedUri && compressedUri !== selectedUri) {
            onPreview?.(compressedUri);
        }

        const currentUid = global?.userData?.uid;
        if (!currentUid) return { localUri: compressedUri || selectedUri, firebaseUri: null };

        const pfpRef = ref(storage, `pfps/${currentUid}.png`);
        try {
            await deleteObject(pfpRef);
        } catch {
            // ignore if there was no previous image
        }

        const uploadUri = compressedUri || selectedUri;
        const response = await fetch(uploadUri);
        const bytes = await response.blob();
        await uploadBytes(pfpRef, bytes);

        const firebaseUri = await getPFP(currentUid);
        await updateDoc('usersPublic', currentUid, { image: firebaseUri, photoURL: firebaseUri });
        onUploaded?.(firebaseUri);

        return { localUri: uploadUri, firebaseUri };
    } catch (error) {
        console.warn('pickAndUploadProfilePhoto failed', error);
        return null;
    }
}

export default pickAndUploadProfilePhoto;
