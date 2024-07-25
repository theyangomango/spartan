export default function getDisplayTime(dateMiliseconds) {
    const d = new Date(dateMiliseconds);
    // const d_year = d.getFullYear();
    const d_month = d.getMonth();
    const d_weekDay = d.getDay();
    const d_date = d.getDate();
    const d_hours = d.getHours();
    const d_minutes = d.getMinutes();

    const currentDateMiliseconds = Date.now();
    const diff = currentDateMiliseconds - dateMiliseconds;
    let returnString;

    if (diff > 604800000) {
        returnString = `${d_month + 1}/${d_date}`
    } else if (diff > 86400000 * 2) {
        switch (d_weekDay) {
            case 0:
                returnString = 'Sunday';
                break;
            case 1:
                returnString = 'Monday';
                break;
            case 2:
                returnString = 'Tuesday';
                break;
            case 3:
                returnString = 'Wednesday';
                break;
            case 4:
                returnString = 'Thursday';
                break;
            case 5:
                returnString = 'Friday';
                break;
            case 6:
                returnString = 'Saturday';
                break;
        }
    } else if (diff > 86400000) {
        returnString = 'Yesterday';
    } else {
        returnString = `${d_hours <= 12 ? d_hours : d_hours - 12}:${d_minutes < 10 ? '0' + d_minutes : d_minutes} ${d_hours < 12 ? 'AM' : 'PM'}`;
    }

    return returnString;
}
