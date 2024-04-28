import { createDoc } from "./helper/firebase/createDoc";

export default async function initWorkout(wid, creatorUID) {
    createDoc('workouts', wid, {
        wid: wid,
        creatorUID: creatorUID,
        created: Date.now(),
        users: [creatorUID],
        exercises: [],
    });
}