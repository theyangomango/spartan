import { createDoc } from "./helper/firebase/createDoc";
import makeID from "./helper/makeID";

export default async function initUser(handle, name = null, phoneNumber) {
    let uid = makeID();
    createDoc('users', uid, {
        uid: uid,
        handle: handle,
        name: name,
        phoneNumber: phoneNumber,
        joined: Date.now(),
        instagramHandle: null,
        lastActive: Date.now(),
        pfp: null,
        bio: '',
        followers: [],
        following: [],
        feedPosts: [],
        feedStories: [],
        workouts: [],
        progressPhotos: [],
        messages: [],
        stats: {
            totalReps: 0,
            totalVolume: 0,
            workoutCount: 0,
        },
        followerCount: 0,
        followingCount: 0,
        postCount: 0
    });
}