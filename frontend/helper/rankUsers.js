export default function rankUsers(usersList, exercise) {
    let result = usersList
    result.sort((user1, user2) => {
        return user1.stats.exercises[exercise] < user2.stats.exercises[exercise];
    })

    return result;
}