const restaurantDateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Karachi',
})

export function formatRestaurantDate(value: string | number | Date) {
    return restaurantDateFormatter.format(new Date(value))
}