export default function getDisplayTimeDifference(initialTimestamp, finalTimestamp) {
    // Work with a positive difference no matter which timestamp is earlier
    let difference = Math.abs(finalTimestamp - initialTimestamp);

    const weeks   = Math.floor(difference / (1000 * 60 * 60 * 24 * 7));
    difference   -= weeks * 1000 * 60 * 60 * 24 * 7;

    const days    = Math.floor(difference / (1000 * 60 * 60 * 24));
    difference   -= days * 1000 * 60 * 60 * 24;

    const hours   = Math.floor(difference / (1000 * 60 * 60));
    difference   -= hours * 1000 * 60 * 60;

    const minutes = Math.floor(difference / (1000 * 60));
    difference   -= minutes * 1000 * 60;

    const seconds = Math.floor(difference / 1000);

    if (weeks   > 0) return `${weeks}w`;
    if (days    > 0) return `${days}d`;
    if (hours   > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}
