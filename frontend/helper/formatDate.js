export default function formatDate(date) {
    // Format the date to "M/D" format
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
}
