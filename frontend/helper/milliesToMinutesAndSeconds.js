export default function millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000).toString().padStart(2, '0');
    var seconds = ((millis % 60000) / 1000).toFixed(0).toString().padStart(2, '0');
    return minutes + ":" + seconds;
}
