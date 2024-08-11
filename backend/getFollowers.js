import readDoc from "./helper/firebase/readDoc";

export default async function getFollowers(followers) {
    let db_followers = [];
    for (user of followers) {
        const uid = user.uid;
        let userData = await readDoc('users', uid);
        db_followers.push(userData);
    }

    return db_followers;
}