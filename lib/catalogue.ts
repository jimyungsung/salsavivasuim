import 'server-only';
import { createClient } from './supabase/server';
import { isConfigured } from './supabase/config';
import { tr, type LevelKey, type LocalizedRow, type PublishStatus } from './db';
import {
  AREAS as STATIC_AREAS,
  LEVEL_LABELS,
  STATE,
  type Area,
  type Localized,
  type Program,
  type ProgramStatus,
} from './content';

/* The catalogue, read from the database.

   This is the seam lib/content.ts was written to be: the same Area[] the
   masterplan has always rendered, now assembled from Supabase instead of a
   hand-written file. Nothing above this module changes shape — Catalogue.tsx
   takes the areas as a prop rather than importing them, and that is the whole
   difference.

   Three things worth knowing about what this does NOT do:

   1. It does not filter drafts. The "published programs are public" policy
      already does, in the one place that cannot be forgotten. An admin browsing
      the masterplan therefore sees their own drafts, which is a preview rather
      than a leak.

   2. It does not count sessions in SQL. The rows come back anyway for the
      count, and counting them here keeps the query one round trip instead of
      an aggregate plus a join.

   3. It does not decide what a member may watch. This is the shelf, which is
      public by design; access is decided per video by private.can_access(). */

/* ----------------------------------------------------------------- shape --- */

/** A *_t column is `{ en, ko? }`; the view wants both, English standing in for
    a missing translation rather than an empty card. */
const localized = (value: LocalizedRow | null | undefined): Localized => ({
  en: tr(value, 'en'),
  ko: tr(value, 'ko'),
});

const weeksLabel = (n: number | null): Localized =>
  n && n > 0
    ? { en: `${n} ${n === 1 ? 'week' : 'weeks'}`, ko: `${n}주` }
    : { en: '', ko: '' };

const sessionsLabel = (n: number): Localized =>
  n > 0
    ? { en: `${n} ${n === 1 ? 'session' : 'sessions'}`, ko: `${n}개 세션` }
    : { en: '', ko: '' };

/* 'current' is not a column. The database knows draft/soon/open — whether a
   module is *the one you are in* is a fact about the dancer, not the shelf, and
   it lives in STATE until practice_events makes it real in P4. */
const statusOf = (slug: string, status: PublishStatus): ProgramStatus =>
  slug === STATE.program ? 'current' : status === 'open' ? 'open' : 'soon';

/* ----------------------------------------------------------------- query --- */

interface Row {
  slug: string;
  position: number;
  name_t: LocalizedRow;
  blurb_t: LocalizedRow;
  programs: {
    slug: string;
    position: number;
    title_t: LocalizedRow;
    subtitle_t: LocalizedRow;
    promise_t: LocalizedRow;
    level: LevelKey;
    weeks: number | null;
    status: PublishStatus;
    sessions: { id: string }[] | null;
  }[] | null;
}

const byPosition = <T extends { position: number }>(rows: T[] | null | undefined): T[] =>
  [...(rows ?? [])].sort((a, b) => a.position - b.position);

/** The whole shelf, ordered, ready for the masterplan.

    Falls back to the static catalogue when Supabase is not configured — the
    same guarantee lib/supabase/config.ts makes everywhere else, so the app
    renders without .env.local. It also falls back on a query error rather than
    blanking the marketing surface, and says so in the log. */
export async function getCatalogue(): Promise<Area[]> {
  if (!isConfigured) return STATIC_AREAS;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('areas')
    .select(
      `slug, position, name_t, blurb_t,
       programs ( slug, position, title_t, subtitle_t, promise_t,
                  level, weeks, status, sessions ( id ) )`,
    )
    .order('position');

  if (error || !data) {
    console.error('[catalogue] falling back to the static shelf:', error?.message);
    return STATIC_AREAS;
  }

  /* Postgres returns nested rows unordered; position is authoritative. */
  return byPosition(data as unknown as Row[]).map(area => ({
    id: area.slug,
    name: localized(area.name_t),
    blurb: localized(area.blurb_t),
    programs: byPosition(area.programs).map(
      (p): Program => ({
        id: p.slug,
        title: localized(p.title_t),
        subtitle: localized(p.subtitle_t),
        promise: localized(p.promise_t),
        weeks: weeksLabel(p.weeks),
        sessions: sessionsLabel(p.sessions?.length ?? 0),
        level: LEVEL_LABELS[p.level],
        status: statusOf(p.slug, p.status),
      }),
    ),
  }));
}
