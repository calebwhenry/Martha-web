// Time helpers. All instants are stored as ISO UTC strings and shown in the
// chapter's IANA time zone (DST-aware, no hardcoded offsets).
(function () {
  const DEFAULT_TZ = 'America/Los_Angeles';
  const partsCache = new Map();

  function fmt(tz, opts) {
    const key = tz + JSON.stringify(opts);
    if (!partsCache.has(key)) partsCache.set(key, new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }));
    return partsCache.get(key);
  }

  function zonedParts(date, tz = DEFAULT_TZ) {
    const p = fmt(tz, { hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }).formatToParts(date);
    const g = (t) => p.find((x) => x.type === t).value;
    return { y: +g('year'), m: +g('month'), d: +g('day'), h: +g('hour'), min: +g('minute'), s: +g('second'), wd: g('weekday') };
  }

  function offsetMinutes(date, tz) {
    const z = zonedParts(date, tz);
    return (Date.UTC(z.y, z.m - 1, z.d, z.h, z.min, z.s) - Math.floor(date.getTime() / 1000) * 1000) / 60000;
  }

  // Local wall-clock time in tz -> Date (UTC instant)
  function zonedToDate(y, m, d, h = 0, min = 0, tz = DEFAULT_TZ) {
    const guess = Date.UTC(y, m - 1, d, h, min);
    let off = offsetMinutes(new Date(guess), tz);
    let t = guess - off * 60000;
    const off2 = offsetMinutes(new Date(t), tz);
    if (off2 !== off) t = guess - off2 * 60000;
    return new Date(t);
  }

  function today(tz = DEFAULT_TZ) {
    const z = zonedParts(new Date(), tz);
    return { y: z.y, m: z.m, d: z.d };
  }

  function shiftDay(day, n) {
    const dt = new Date(Date.UTC(day.y, day.m - 1, day.d + n));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }

  function dayKey(day) {
    return `${day.y}-${String(day.m).padStart(2, '0')}-${String(day.d).padStart(2, '0')}`;
  }

  function dayOf(iso, tz = DEFAULT_TZ) {
    const z = zonedParts(new Date(iso), tz);
    return { y: z.y, m: z.m, d: z.d };
  }

  function weekdayIndex(day) {
    return new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay(); // 0 = Sunday
  }

  function startOfWeek(day) {
    return shiftDay(day, -weekdayIndex(day));
  }

  function daysBetween(a, b) {
    return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
  }

  function formatTime(iso, tz = DEFAULT_TZ) {
    return fmt(tz, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)).replace(':00', '');
  }

  function formatRange(startIso, endIso, tz = DEFAULT_TZ) {
    const a = formatTime(startIso, tz), b = formatTime(endIso, tz);
    const am = (s) => s.slice(-2);
    return am(a) === am(b) ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`;
  }

  function formatDate(iso, tz = DEFAULT_TZ, style = 'short') {
    const opts = style === 'long'
      ? { weekday: 'long', month: 'long', day: 'numeric' }
      : style === 'medium' ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' };
    const now = today(tz), d = dayOf(iso, tz);
    if (d.y !== now.y && style !== 'short') opts.year = 'numeric';
    return fmt(tz, opts).format(new Date(iso));
  }

  function relativeDay(iso, tz = DEFAULT_TZ) {
    const n = daysBetween(today(tz), dayOf(iso, tz));
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    if (n > 1 && n < 7) return fmt(tz, { weekday: 'long' }).format(new Date(iso));
    if (n < 0 && n > -15) return `${-n} days ago`;
    return formatDate(iso, tz, 'medium');
  }

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function monthDay(m, d, y) {
    if (!m || !d) return null;
    return `${MONTHS[m - 1]} ${d}${y ? ', ' + y : ''}`;
  }

  window.MarthaTime = { DEFAULT_TZ, zonedParts, zonedToDate, today, shiftDay, dayKey, dayOf, weekdayIndex, startOfWeek, daysBetween, formatTime, formatRange, formatDate, relativeDay, monthDay, MONTHS };
})();
