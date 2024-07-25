export default function getChatDisplayTime(dateMilliseconds) {
    const d = new Date(dateMilliseconds);
    const d_year = d.getFullYear();
    const d_month = d.getMonth();
    const d_weekDay = d.getDay();
    const d_date = d.getDate();
    const d_hours = d.getHours();
    const d_minutes = d.getMinutes();

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentDateDay = currentDate.getDate();

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const getOrdinalSuffix = (n) => {
        const s = ["th", "st", "nd", "rd"],
            v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    let returnString;

    if (currentYear !== d_year || currentMonth !== d_month || currentDateDay !== d_date) {
        const diff = currentDate - d;

        if (diff > 604800000) {
            returnString = `${months[d_month]} ${getOrdinalSuffix(d_date)}`;
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
        } else if (
            currentYear === d_year &&
            currentMonth === d_month &&
            currentDateDay === d_date + 1
        ) {
            returnString = `Yesterday ${d_hours <= 12 ? d_hours : d_hours - 12}:${d_minutes < 10 ? '0' + d_minutes : d_minutes
                } ${d_hours < 12 ? 'AM' : 'PM'}`;
        } else {
            returnString = `${d_hours <= 12 ? d_hours : d_hours - 12}:${d_minutes < 10 ? '0' + d_minutes : d_minutes
                } ${d_hours < 12 ? 'AM' : 'PM'}`;
        }
    } else {
        returnString = `Today ${d_hours <= 12 ? d_hours : d_hours - 12}:${d_minutes < 10 ? '0' + d_minutes : d_minutes
            } ${d_hours < 12 ? 'AM' : 'PM'}`;
    }

    return returnString;
}
