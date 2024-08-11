export default function roundToNearestMinute(milliseconds) {
    // Convert milliseconds to minutes
    const minutes = milliseconds / (1000 * 60);

    // Round to the nearest whole number
    const roundedMinutes = Math.round(minutes);

    // Return the rounded minutes
    return roundedMinutes;
}
