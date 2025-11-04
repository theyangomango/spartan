import createDoc from "./helper/firebase/createDoc";
import makeID from "./helper/makeID";

export default async function initUser(handle, name = null, phoneNumber) {
    let uid = makeID();
    const timestamp = Date.now();
    await Promise.all([
        createDoc('usersPublic', uid, {
            uid,
            handle,
            displayName: name,
            phoneNumber,
            joined: timestamp,
            instagramHandle: null,
            lastActive: timestamp,
            photoURL: null,
            bio: '',
            followers: [],
            following: [],
            feedPosts: [],
            progressPhotos: [],
            posts: [],
            workouts: [],
            stats: {
                totalReps: 0,
                totalVolume: 0,
                totalTime: 0,
                workoutCount: 0,
            },
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            isPrivate: false,
        }),
        createDoc('usersPrivate', uid, {
            uid,
            phoneNumber,
            followRequestsIn: [],
            followRequestsOut: [],
            messages: [],
            blocked: [],
            blockedUidList: [],
            blockedBy: [],
            blockedByUidList: [],
            deviceTokens: [],
            settings: {
                profilePrivate: false,
                units: 'lb',
                push: true,
            },
        }),
    ]);
}
