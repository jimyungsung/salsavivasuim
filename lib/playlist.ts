/* What the player plays: a playlist, never a bare video.

   A routine is its exercises in order. A member's day is the same shape with
   the member's own entries — possibly the same exercise twice — each with a
   loop, a speed and a repeat count of its own. One shape, one player
   (BUILD-PLAN §5, "built now so it doesn't need rebuilding later").

   No 'server-only' here: the player is a client component and needs the type,
   and routinePlaylist() is pure. The builders that read the database live in
   lib/menus.ts and lib/week.ts. */

import { LEVEL_LABELS, type Localized } from './i18n';
import type { Exercise, Routine } from './menus';

export interface PlaylistEntry {
  video: Exercise;
  /** Play the whole video this many times before moving on. */
  repeats: number;
  /** A speed of this entry's own; otherwise the remembered speed. */
  speed: number | null;
}

export interface PlaylistLink {
  href: string;
  label: Localized;
}

export interface Playlist {
  kind: 'routine' | 'day';
  /** The page this playlist is on, for coming back after sign-in. */
  href: string;
  title: Localized;
  /** The small line above the title — "Tuesday · 14 min", "Beginner". */
  kicker: Localized;
  /** One level up, as the back link. */
  back: PlaylistLink;
  prev: PlaylistLink | null;
  /** Where to go when the last entry has played. */
  next: PlaylistLink | null;
  /** What to focus on, shown under the player alongside the current video's
      own description. */
  notes: Localized[];
  entries: PlaylistEntry[];
}

/** A curated routine as the player plays it: the quick drills, or a preview
    from the back office. Exercises this viewer may not see are left out. */
export function routinePlaylist(
  routine: Routine,
  back: PlaylistLink,
  href: string,
): Playlist {
  const levels = (lang: 'en' | 'ko') => routine.levels.map(k => LEVEL_LABELS[k][lang]).join(' · ');
  return {
    kind: 'routine',
    href,
    title: routine.title,
    kicker: { en: levels('en') || 'Routine', ko: levels('ko') || '루틴' },
    back,
    prev: null,
    next: back,
    notes: [routine.blurb],
    entries: routine.items
      .filter(i => i.video)
      .map(i => ({ video: i.video!, repeats: i.repeats, speed: i.speed })),
  };
}

/** Running time of a routine or a day: its exercises' lengths, repeats
    included. Pure, so the planner (a client component) can sum too. */
export const routineLengthMs = (routine: {
  items: { video: { durationMs: number | null } | null; repeats: number }[];
}): number => routine.items.reduce((n, i) => n + (i.video?.durationMs ?? 0) * i.repeats, 0);

/** Running time of the whole list, repeats included. */
export const playlistLengthMs = (entries: PlaylistEntry[]): number =>
  entries.reduce((n, e) => n + (e.video.durationMs ?? 0) * e.repeats, 0);
