const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Returns { dayOfWeek: 0-6 (Sun-Sat), minutesSinceMidnight } for a given
 * instant, evaluated in the supplied IANA timezone - used to check
 * restaurant open/closed status against RestaurantHours without relying on
 * the server's local timezone.
 */
export function resolveLocalTime(
  date: Date,
  timeZone: string,
): { dayOfWeek: number; minutesSinceMidnight: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);

  return {
    dayOfWeek: WEEKDAY_INDEX[weekday] ?? 0,
    minutesSinceMidnight: hour * 60 + minute,
  };
}
