import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from "expo-file-system";

export async function compressUnder250KB(uri) {
    let quality = 0.8;
    let resized = uri;

    for (let i = 0; i < 4; i++) {          // max 4 passes
        const { uri: out } = await ImageManipulator.manipulateAsync(
            resized,
            [{ resize: { width: 1080 } }],
            { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
        );

        const info = await FileSystem.getInfoAsync(out);
        if (info.size / 1024 <= 250) return out; // KB

        quality -= 0.15;                        // step down quality
        resized = out;
    }
    return resized; // last attempt
}
