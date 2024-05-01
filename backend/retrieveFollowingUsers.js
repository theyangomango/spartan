import readDoc from "./helper/firebase/readDoc";

export default async function retrieveFollowingUsers(followingUsers) {
    let db_following_users = [];
    for (uid of followingUsers) {
        let userData = await readDoc('users', uid);
        db_following_users.push(userData);
    }

    return db_following_users;
}