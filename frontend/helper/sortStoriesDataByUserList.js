// Utility function to sort data based on user list
export default function sortStoriesDataByUserList(data, userList) {
    const idOrderMap = new Map();

    // Create an order map for fast sorting
    userList.forEach((user, userIndex) => {
        user.stories.forEach((id, storyIndex) => {
            idOrderMap.set(id, userIndex * 1000 + storyIndex);
        });
    });

    // Sort the data based on the order map
    return data.sort((a, b) => {
        const orderA = idOrderMap.get(a.sid);
        const orderB = idOrderMap.get(b.sid);

        if (orderA === undefined) return 1;
        if (orderB === undefined) return -1;

        return orderA - orderB;
    });
}