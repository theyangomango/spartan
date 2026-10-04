export default function millisToHoursMinutesSeconds(millis) {
    const hours = Math.floor(millis / 3600000).toString().padStart(2, '0');
    const minutes = Math.floor((millis % 3600000) / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((millis % 60000) / 1000).toString().padStart(2, '0');

    if (hours > 0) {
        return hours + ":" + minutes + ":" + seconds;
    } else {
        return minutes + ":" + seconds;
    }
}
