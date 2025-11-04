export default function getReverse(arr) {
    if (!Array.isArray(arr)) {
        return [];
    }
    const list = [];
    arr.forEach((element) => {
        list.push(element);
    });
    list.reverse();
    return list;
}
