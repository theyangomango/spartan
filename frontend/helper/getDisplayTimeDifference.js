export default function getDisplayTimeDifference(initialTimestamp, finalTimestamp) {
    var difference = initialTimestamp - finalTimestamp;

    var daysDifference = Math.floor(difference / 1000 / 60 / 60 / 24);
    difference -= daysDifference * 1000 * 60 * 60 * 24

    var hoursDifference = Math.floor(difference / 1000 / 60 / 60);
    difference -= hoursDifference * 1000 * 60 * 60

    var minutesDifference = Math.floor(difference / 1000 / 60);
    difference -= minutesDifference * 1000 * 60

    var secondsDifference = Math.floor(difference / 1000);

    if (daysDifference > 0) return `${daysDifference}d`;
    else if (hoursDifference > 0) return `${hoursDifference}h`
    else if (minutesDifference > 0) return `${minutesDifference}m`
    else return `${secondsDifference}s`
}