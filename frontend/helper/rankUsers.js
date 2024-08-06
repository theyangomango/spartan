export default function rankUsers(users, exercise) {
    let result = [];
    users.forEach(element => {
        result.push(element)
    });
    result.sort((user1, user2) => {
        console.log(user1.statsExercises[exercise]['1RM'], user2.statsExercises[exercise]['1RM']);
        return user2.statsExercises[exercise]['1RM'] - user1.statsExercises[exercise]['1RM'];
    })

    return result;
}