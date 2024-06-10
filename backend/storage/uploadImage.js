import { storage } from '../../firebase.config';
import { ref, uploadBytes } from 'firebase/storage';

export default async function uploadImage(uri, path) {
    const res = await fetch(uri);
    const bytes = await res.blob();
    uploadBytes(ref(storage, path), bytes).then(() => {
        console.log('Successfully Uploaded Image');
    });
}