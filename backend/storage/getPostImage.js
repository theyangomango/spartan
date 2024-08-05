import { storage } from '../../firebase.config';
import { ref, getDownloadURL } from 'firebase/storage';

export default async function getPostImage(iid) {
    const downloadRef = ref(storage, `posts/${iid}`);
    const url = await getDownloadURL(downloadRef);
    return url;
}
