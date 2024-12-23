/**
 * Checks if a user is this device's current user
 * @param uid - user's UID
 * @return bool
 */

export default isThisUser = (uid) => { 
    return uid === global.userData.uid;
}