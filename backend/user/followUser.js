import arrayAppend from "../helper/firebase/arrayAppend";
import incrementDocValue from '../helper/firebase/incrementDocValue'

export default async function followUser(my_uid, user_uid) {
    arrayAppend('users', my_uid, 'following', user_uid);
    incrementDocValue('users', my_uid, 'followingCount');

    arrayAppend('users', user_uid, 'followers', my_uid);
    incrementDocValue('users', user_uid, 'followerCount');
}