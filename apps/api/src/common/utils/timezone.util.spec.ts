import { resolveLocalTime } from './timezone.util';

describe('resolveLocalTime', () => {
  it('resolves day of week and minutes since midnight in a given timezone', () => {
    // 2024-01-15 is a Monday. 15:30 UTC.
    const date = new Date('2024-01-15T15:30:00Z');

    const utc = resolveLocalTime(date, 'UTC');
    expect(utc.dayOfWeek).toBe(1); // Monday
    expect(utc.minutesSinceMidnight).toBe(15 * 60 + 30);

    // New York is UTC-5 in January (no DST) -> 10:30 local, still Monday.
    const nyc = resolveLocalTime(date, 'America/New_York');
    expect(nyc.dayOfWeek).toBe(1);
    expect(nyc.minutesSinceMidnight).toBe(10 * 60 + 30);
  });

  it('rolls over to the previous day when the timezone offset crosses midnight', () => {
    // 2024-01-15T02:00:00Z is still 2024-01-14 21:00 in New York (UTC-5).
    const date = new Date('2024-01-15T02:00:00Z');
    const nyc = resolveLocalTime(date, 'America/New_York');
    expect(nyc.dayOfWeek).toBe(0); // Sunday
    expect(nyc.minutesSinceMidnight).toBe(21 * 60);
  });
});
