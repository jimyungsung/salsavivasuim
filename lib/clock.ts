import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { TZ_COOKIE } from './i18n';

/* What day and hour it is for the member, not for the server.

   Vercel runs in UTC, so new Date() on the server is nine hours behind a
   member in Seoul: before 09:00 there, "today" was still yesterday. The
   browser tells us its time zone once (TimeZoneSync sets a cookie); until it
   has, the guess is Seoul, where most members are. Every server-side "today",
   greeting and "done this week" goes through here. */

export const DEFAULT_TZ = 'Asia/Seoul';

const isZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** YYYY-MM-DD of an instant, in a time zone. Sorts as a string. */
export const localDate = (at: Date | string, tz: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(at),
  );

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface Clock {
  tz: string;
  /** 0 = Monday. */
  weekday: number;
  /** 0–23, for the greeting. */
  hour: number;
  /** YYYY-MM-DD of this week's Monday: a day ticked before it is last week's. */
  weekStart: string;
}

export const getClock = cache(async (): Promise<Clock> => {
  const raw = (await cookies()).get(TZ_COOKIE)?.value;
  const tz = raw && isZone(decodeURIComponent(raw)) ? decodeURIComponent(raw) : DEFAULT_TZ;
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', hourCycle: 'h23' })
      .formatToParts(now)
      .map(p => [p.type, p.value]),
  );
  const weekday = WEEKDAYS.indexOf(parts.weekday);
  const [y, m, d] = localDate(now, tz).split('-').map(Number);
  const weekStart = new Date(Date.UTC(y, m - 1, d - weekday)).toISOString().slice(0, 10);
  return { tz, weekday, hour: Number(parts.hour) % 24, weekStart };
});
