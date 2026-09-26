/**
 * Local calendar date as YYYY-MM-DD.
 *
 * `toISOString()` converts to UTC first, so in any zone ahead of UTC a local
 * midnight lands on the previous day — a month picked as September would be
 * sent to the server as Aug 31 .. Sep 29. Read the local components instead.
 */
export const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** First and last calendar day of the given month, as YYYY-MM-DD. */
export const monthRange = (year, monthIndex) => ({
  startDate: toISODate(new Date(year, monthIndex, 1)),
  endDate: toISODate(new Date(year, monthIndex + 1, 0)),
});

/**
 * The last N ISO weeks, Monday-start, ending on the Sunday of the current week.
 * Mirrors the backend's weekly summary so the panels on a "last 8 weeks" view
 * all describe the same span.
 */
export const lastNWeeksRange = (weeks) => {
  const today = new Date();
  const dayOffset = (today.getDay() + 6) % 7; // Monday = 0
  const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOffset);
  const start = new Date(thisMonday);
  start.setDate(start.getDate() - (weeks - 1) * 7);
  const end = new Date(thisMonday);
  end.setDate(end.getDate() + 6);
  return { startDate: toISODate(start), endDate: toISODate(end) };
};
