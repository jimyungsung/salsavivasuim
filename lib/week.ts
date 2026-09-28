import 'server-only';
import { cache } from 'react';
import { createClient } from './supabase/server';
import { isConfigured } from './supabase/config';
import type { Localized } from './i18n';
import { DAY_NAMES } from './i18n';
import { VIDEO_COLUMNS, toExercise, type Exercise, type VideoSummaryRow } from './menus';
import type { Playlist } from './playlist';

/* The member's week, read from the database.

   Under the hood it is still My drills: a `drill` is one day of the member's
   week — its exercises in order, each with a loop, speed and repeat count of
   its own — and a `drill_slot` is the weekday it sits on. "Use this menu"
   copies the menu's routines into drills, one per weekday; the member then
   edits days freely. Everything here is the member's own rows: the "own
   drills", "own drill items" and "own drill slots" policies decide what comes
   back, and the items policy refuses an exercise the member may not play, so
   a day can never hold one the player would then refuse to sign. */

export interface DayItem {
  id: string;
  position: number;
  repeats: number;
  speed: number | null;
  /** Null when the exercise has since been unpublished; the day keeps its
      place so the member can see what is missing and fix it. */
  video: Exercise | null;
}

export interface Day {
  /** The drill row behind this day. */
  id: string;
  /** 0 = Monday. */
  weekday: number;
  /** The slot row, which carries done_at. */
  slotId: string;
  name: string;
  /** The routine this day was copied from, if any. */
  routineId: string | null;
  doneAt: string | null;
  items: DayItem[];
}

interface DrillRow {
  id: string;
  name: string;
  routine_id: string | null;
  created_at: string;
  drill_items:
    | {
        id: string;
        position: number;
        repeats: number;
        speed: number | null;
        video: VideoSummaryRow | null;
      }[]
    | null;
  drill_slots: { id: string; weekday: number; done_at: string | null; created_at: string }[] | null;
}

const DRILL_SELECT = `id, name, routine_id, created_at,
  drill_items ( id, position, repeats, speed, video:videos ( ${VIDEO_COLUMNS} ) ),
  drill_slots ( id, weekday, done_at, created_at )`;

/** The member's week: one entry per weekday that has something on it. A drill
    with two slots is two days; a drill with none is not shown. Two drills on
    the same day is a state the planner never writes, but if it exists the
    newer one wins and the other keeps its rows. */
export interface Week {
  /** Index 0 = Monday. Null for an empty day. */
  days: (Day | null)[];
}

async function loadWeek(): Promise<Week> {
  const days: (Day | null)[] = Array(7).fill(null);
  if (!isConfigured) return { days };
  const supabase = await createClient();
  const { data, error } = await supabase.from('drills').select(DRILL_SELECT).order('created_at');
  if (error) {
    console.error('[week] read failed:', error.message);
    return { days };
  }
  for (const row of data as unknown as DrillRow[]) {
    for (const slot of row.drill_slots ?? []) {
      days[slot.weekday] = {
        id: row.id,
        weekday: slot.weekday,
        slotId: slot.id,
        name: row.name,
        routineId: row.routine_id,
        doneAt: slot.done_at,
        items: [...(row.drill_items ?? [])]
          .sort((a, b) => a.position - b.position)
          .map(i => ({
            id: i.id,
            position: i.position,
            repeats: i.repeats,
            speed: i.speed == null ? null : Number(i.speed),
            video: i.video ? toExercise(i.video) : null,
          })),
      };
    }
  }
  return { days };
}

/** This week's menu, from the profile: which menu the member is on and when
    they started it. Null when they have not chosen one. */
export interface CurrentMenu {
  menuId: string;
  startedOn: string | null;
}

async function loadCurrentMenu(): Promise<CurrentMenu | null> {
  if (!isConfigured) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('menu_id, menu_started_on')
    .eq('id', auth.user.id)
    .maybeSingle();
  const row = data as { menu_id: string | null; menu_started_on: string | null } | null;
  return row?.menu_id ? { menuId: row.menu_id, startedOn: row.menu_started_on } : null;
}

/* ------------------------------------------------------------ playlists ---- */

const BACK: Localized = { en: 'My week', ko: '나의 주간' };
const TODAY: Localized = { en: 'Today', ko: '오늘' };

export const dayLengthMs = (day: Pick<Day, 'items'>): number =>
  day.items.reduce((n, i) => n + (i.video?.durationMs ?? 0) * i.repeats, 0);

/** One day as the player plays it. Missing exercises are left out; an item's
    repeats and speed ride along. */
export function dayPlaylist(weekday: number, day: Day | null, isToday: boolean): Playlist {
  const n = day?.items.length ?? 0;
  const mins = day ? Math.round(dayLengthMs(day) / 60000) : 0;
  return {
    kind: 'day',
    href: isToday ? '/today' : `/day/${weekday}`,
    title: day ? { en: day.name, ko: day.name } : DAY_NAMES[weekday],
    kicker: {
      en: `${DAY_NAMES[weekday].en}${n ? ` · ${n} exercise${n === 1 ? '' : 's'} · ${mins} min` : ''}`,
      ko: `${DAY_NAMES[weekday].ko}${n ? ` · 운동 ${n}개 · ${mins}분` : ''}`,
    },
    back: { href: '/week', label: BACK },
    prev: null,
    next: { href: '/today', label: { en: 'Back to today →', ko: '오늘로 →' } },
    notes: [],
    entries: (day?.items ?? [])
      .filter(i => i.video)
      .map(i => ({ video: i.video!, repeats: i.repeats, speed: i.speed })),
  };
}

export { TODAY };

/* Cached per request: the page's metadata and body both ask. */
export const getWeek = cache(loadWeek);
export const getCurrentMenu = cache(loadCurrentMenu);
