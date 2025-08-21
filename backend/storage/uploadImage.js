// uploadImage.js (expected shape)
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase.config';

export default async function uploadImage(fileUri, path) {
    const res = await fetch(fileUri);
    const blob = await res.blob();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef); // ← must RETURN the URL
}
