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
