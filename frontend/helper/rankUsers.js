export default function rankUsers(users, exercise) {
    let result = [];
    users.forEach(element => {
        result.push(element)
    });
    result.sort((user1, user2) => {
        const user1_max = (exercise in user1.statsExercises && '1RM' in user1.statsExercises[exercise]) ? user1.statsExercises[exercise]['1RM'] : 0;
        const user2_max = (exercise in user2.statsExercises && '1RM' in user2.statsExercises[exercise]) ? user2.statsExercises[exercise]['1RM'] : 0;
        return user2_max - user1_max;
    })

    return result;
}