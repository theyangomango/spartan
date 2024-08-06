import arrayAppend from "../helper/firebase/arrayAppend";
import incrementDocValue from '../helper/firebase/incrementDocValue'

export default async function followUser(this_user, user) {
    arrayAppend('users', this_user.uid, 'following', user);
    incrementDocValue('users', this_user.uid, 'followingCount');

    arrayAppend('users', user.uid, 'followers', this_user);
    incrementDocValue('users', user.uid, 'followerCount');
}