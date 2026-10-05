/* What stands between a week and its members — the one list, read the same
   way by the menu's Publish panel (to show it) and by publishWeek() (to
   enforce it). RLS still decides the real answer; this reads the same facts
   back, so the panel never says "ready" about a week a member could not use.

   Blockers stop publishing: a member who copies the week would get a day with
   nothing in it, or an exercise that cannot play. Warnings do not: a missing
   Korean title is worth fixing, not worth keeping the week from members. */

export interface ReadinessVideo {
  id: string;
  status: string;
  publish: string;
  duration_ms: number | null;
  title_t: { en: string; ko?: string | null };
}

export interface ReadinessRoutine {
  id: string;
  weekday: number | null;
  title_t: { en: string; ko?: string | null };
  routine_items: { repeats: number; video: ReadinessVideo | null }[];
}

export interface Readiness {
  blockers: string[];
  warnings: string[];
  /** Exercises in the week with footage that are not open yet: publishing opens them. */
  toOpen: string[];
  days: number;
}

const DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const noKo = (t: { ko?: string | null }) => !t.ko?.trim();

export function weekReadiness(menu: {
  title_t: { en: string; ko?: string | null };
  promise_t: { en: string; ko?: string | null };
  routines: ReadinessRoutine[];
}): Readiness {
  const days = menu.routines.filter(r => r.weekday != null).sort((a, b) => a.weekday! - b.weekday!);
  const blockers: string[] = [];
  const warnings: string[] = [];
  const toOpen = new Set<string>();

  if (days.length === 0) blockers.push('No routine is on a day of the week, so there is no week to copy.');

  for (const r of days) {
    /* "Tuesday", or "Tuesday · Turns" when the day has a title of its own. */
    const title = r.title_t.en.trim();
    const day = title && title !== DAY[r.weekday!] ? `${DAY[r.weekday!]} · ${title}` : DAY[r.weekday!];
    const items = r.routine_items;
    if (items.length === 0) {
      blockers.push(`${day}: no exercises.`);
      continue;
    }
    const missing = items.filter(i => !i.video || i.video.status !== 'ready');
    if (missing.length) {
      blockers.push(
        `${day}: ${missing.length} exercise${missing.length === 1 ? ' has' : 's have'} no finished footage` +
          (missing[0]?.video ? ` (${missing.map(i => i.video?.title_t.en || 'untitled').join(', ')}).` : '.'),
      );
    }
    for (const i of items) if (i.video && i.video.status === 'ready' && i.video.publish !== 'open') toOpen.add(i.video.id);

    const minutes = items.reduce((n, i) => n + (i.video?.duration_ms ?? 0) * i.repeats, 0) / 60000;
    if (!missing.length && (minutes < 8 || minutes > 20)) warnings.push(`${day}: ${Math.round(minutes)} minutes; a day is 10–15.`);
    if (noKo(r.title_t)) warnings.push(`${day}: no Korean title.`);
  }

  if (noKo(menu.title_t)) warnings.push('The week has no Korean title.');
  if (!menu.promise_t.en.trim()) warnings.push('No "what the week does" line; members see it on the menu card.');

  return { blockers, warnings, toOpen: [...toOpen], days: days.length };
}
