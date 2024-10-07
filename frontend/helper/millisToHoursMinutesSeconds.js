export default function millisToHoursMinutesSeconds(millis) {
    var hours = Math.floor(millis / 3600000).toString().padStart(2, '0');
    var minutes = Math.floor((millis % 3600000) / 60000).toString().padStart(2, '0');
    var seconds = Math.floor((millis % 60000) / 1000).toString().padStart(2, '0');

    if (hours > 0) {
        return hours + ":" + minutes + ":" + seconds;
    } else {
        return minutes + ":" + seconds;
    }
}
