import { storage } from '../../firebase.config';
import { ref, getDownloadURL } from 'firebase/storage';

export default async function getPFP(uid) {
    const downloadRef = ref(storage, `pfps/${uid}.png`);
    const url = await getDownloadURL(downloadRef);
    return url;
}
