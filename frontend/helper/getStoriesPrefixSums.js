// Utility function to calculate prefix sums
export default getStoriesPrefixSums = (userList) => {
    const prefixSum = [];
    let totalStories = 0;

    userList.forEach(user => {
        totalStories += user.stories.length;
        prefixSum.push(totalStories);
    });

    return prefixSum;
};