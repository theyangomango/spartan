import readDoc from "./helper/firebase/readDoc";

export default async function retrieveFollowingUsers(followingUsers) {
    let db_following_users = [];
    for (user of followingUsers) {
        const uid = user.uid;
        let userData = await readDoc('users', uid);
        db_following_users.push(userData);
    }

    return db_following_users;
}