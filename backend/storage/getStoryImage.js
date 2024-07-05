import { storage } from '../../firebase.config';
import { ref, getDownloadURL } from 'firebase/storage';

export default async function getStoryImage(sid) {
    const downloadRef = ref(storage, `stories/${sid}.png`);
    const url = await getDownloadURL(downloadRef);
    return url;
}
