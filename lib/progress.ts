import 'server-only';
import { cache } from 'react';
import { createClient } from './supabase/server';
import { isConfigured } from './supabase/config';
import { getClock } from './clock';

/* The member's practice, read back from the log (practice_events, via the
   practice_days() function, which runs as the member and so sees only their
   rows). Everything here is a sum over days in the member's own time zone.

   Minutes are wall-clock, as the player records them. A day counts towards
   the streak once it has a minute of practice in it: a video opened and
   closed is not a day practised. */

const COUNTS_AS_A_DAY_MS = 60_000;

export interface Progress {
  /** Days in a row with practice, ending today, or yesterday if today has
      not been practised yet (so the morning does not read as a broken streak). */
  streak: number;
  practisedToday: boolean;
  /** Wall-clock minutes since this week's Monday. */
  minutesThisWeek: number;
  minutesToday: number;
  /** Exercises watched to 90% this week. */
  completesThisWeek: number;
}

const EMPTY: Progress = { streak: 0, practisedToday: false, minutesThisWeek: 0, minutesToday: 0, completesThisWeek: 0 };

/** YYYY-MM-DD, n days before a YYYY-MM-DD. */
const daysBefore = (date: string, n: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
};

async function loadProgress(): Promise<Progress> {
  if (!isConfigured) return EMPTY;
  const [supabase, clock] = await Promise.all([createClient(), getClock()]);
  const { data, error } = await supabase.rpc('practice_days', { p_tz: clock.tz, p_days: 400 });
  if (error) {
    console.error('[progress] read failed:', error.message);
    return EMPTY;
  }
  const rows = (data ?? []) as { day: string; wall_ms: number; completes: number }[];
  const byDay = new Map(rows.map(r => [r.day, r]));
  const today = clock.today;

  const practised = (day: string) => (byDay.get(day)?.wall_ms ?? 0) >= COUNTS_AS_A_DAY_MS;
  const practisedToday = practised(today);
  let streak = 0;
  for (let n = practisedToday ? 0 : 1; practised(daysBefore(today, n)); n++) streak++;

  const thisWeek = rows.filter(r => r.day >= clock.weekStart);
  return {
    streak,
    practisedToday,
    minutesThisWeek: Math.round(thisWeek.reduce((n, r) => n + Number(r.wall_ms), 0) / 60_000),
    minutesToday: Math.round(Number(byDay.get(today)?.wall_ms ?? 0) / 60_000),
    completesThisWeek: thisWeek.reduce((n, r) => n + r.completes, 0),
  };
}

/* Cached per request: Today and the planner may both ask. */
export const getProgress = cache(loadProgress);
