// The weather of a point at the time-slider hour. `w.hours` holds the next
// 24 hours (index 0 = the current hour) from the same batched request as the
// current conditions; with hour 0, or no hourly data, it is just `w`.
export function atHour(w, hour) {
  if (!w || !hour || !w.hours?.[hour]) return w
  return { ...w, ...w.hours[hour] }
}
