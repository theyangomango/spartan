export default function rankUsers(users, exercise) {
    console.log(users, exercise);

    let result = users;
    result.sort((user1, user2) => {
        console.log(user1.stats.exercises[exercise], user2.stats.exercises[exercise]);
        return user2.stats.exercises[exercise] - user1.stats.exercises[exercise];
    })

    return result;
}