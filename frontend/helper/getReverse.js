export default function getReverse(arr) {
    let list = [];
    arr.forEach(element => {
        list.push(element);
    });
    list.reverse();
    return list;
}
