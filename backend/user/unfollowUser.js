import arrayErase from '../helper/firebase/arrayErase'
import incrementDocValue from '../helper/firebase/incrementDocValue'

export default async function unfollowUser(my_uid, user_uid) {
    arrayErase('users', my_uid, 'following', user_uid);
    incrementDocValue('users', my_uid, 'followingCount', -1);

    arrayErase('users', user_uid, 'followers', my_uid);
    incrementDocValue('users', user_uid, 'followerCount', -1);
}