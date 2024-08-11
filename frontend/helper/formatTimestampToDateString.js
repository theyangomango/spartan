export default function formatTimestampToDateString(timestamp) {
    // Create a new Date object using the timestamp
    const date = new Date(timestamp);

    // Array of weekday names
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // Array of month names
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Get the day of the week
    const weekday = weekdays[date.getDay()];

    // Get the month
    const month = months[date.getMonth()];

    // Get the day of the month and add the ordinal suffix
    const day = date.getDate();
    const ordinalSuffix = (day) => {
        if (day > 3 && day < 21) return 'th'; // Covers 11th to 19th
        switch (day % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    };

    // Construct the formatted date string
    const formattedDate = `${weekday}, ${month} ${day}${ordinalSuffix(day)}`;

    return formattedDate;
}