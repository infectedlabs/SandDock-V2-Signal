/**
 * Timezone utilities
 * Get user's timezone offset in minutes from UTC
 */

export function getTimezoneOffset() {
  // Get browser's timezone offset in minutes from UTC
  // Note: getTimezoneOffset() returns offset in OPPOSITE direction, so we negate it
  const browserOffset = -new Date().getTimezoneOffset();
  return browserOffset;
}

export function formatTimezoneOffset(minutes) {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  const sign = minutes >= 0 ? '+' : '-';
  return `UTC${sign}${hours}:${mins.toString().padStart(2, '0')}`;
}

export function getLocalCalendarDay(isoString, tzOffsetMinutes = null) {
  const offset = tzOffsetMinutes ?? getTimezoneOffset();
  const date = new Date(isoString);

  // Add timezone offset to get local time
  const localDate = new Date(date.getTime() + offset * 60 * 1000);

  return {
    year: localDate.getUTCFullYear(),
    month: localDate.getUTCMonth(),
    day: localDate.getUTCDate(),
  };
}

export function isToday(isoString, tzOffsetMinutes = null) {
  const offset = tzOffsetMinutes ?? getTimezoneOffset();
  const signalDate = getLocalCalendarDay(isoString, offset);
  const todayDate = getLocalCalendarDay(new Date().toISOString(), offset);

  return (
    signalDate.year === todayDate.year &&
    signalDate.month === todayDate.month &&
    signalDate.day === todayDate.day
  );
}
