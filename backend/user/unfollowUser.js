import arrayErase from '../helper/firebase/arrayErase'
import incrementDocValue from '../helper/firebase/incrementDocValue'

export default async function unfollowUser(this_user, user) {
    arrayErase('users', this_user.uid, 'following', user);
    incrementDocValue('users', this_user.uid, 'followingCount', -1);

    arrayErase('users', user.uid, 'followers', this_user);
    incrementDocValue('users', user.uid, 'followerCount', -1);
}