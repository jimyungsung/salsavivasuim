import 'server-only';
import { createClient } from './supabase/server';
import { isConfigured } from './supabase/config';
import {
  tr,
  type CameraAngle,
  type LevelKey,
  type LocalizedRow,
  type MethodStep,
  type PublishStatus,
  type VideoStatus,
} from './db';
import {
  ALL_PROGRAMS,
  AREAS as STATIC_AREAS,
  LEVEL_LABELS,
  SESSIONS,
  STATE,
  areaOf,
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

/* 'current' is not a column. Whether a module is *the one you are in* is a
   fact about the dancer, and until practice_events makes it real in P4 there is
   no honest answer — so no program claims it. It used to come from STATE, which
   told every member they were 4% into Improvisation 01. */
const statusOf = (status: PublishStatus): ProgramStatus => (status === 'open' ? 'open' : 'soon');

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
        status: statusOf(p.status),
        /* p.sessions is already what "published sessions are public" let this
           viewer see (or every session, for an admin previewing a draft) — so
           a non-empty array already means there is somewhere to send them. */
        linkable: (p.sessions?.length ?? 0) > 0,
      }),
    ),
  }));
}

/* ------------------------------------------------------------- module ---- */

export interface SessionSummary {
  id: string;
  position: number;
  title: Localized;
  outcome: Localized;
  focus: Localized;
  levels: LevelKey[];
  status: PublishStatus;
  durationMs: number;
  videoCount: number;
}

export interface ProgramDetail {
  id: string;
  title: Localized;
  subtitle: Localized;
  promise: Localized;
  level: Localized;
  weeks: Localized;
  area: { id: string; name: Localized };
  sessions: SessionSummary[];
}

interface ProgramDetailRow {
  slug: string;
  title_t: LocalizedRow;
  subtitle_t: LocalizedRow;
  promise_t: LocalizedRow;
  level: LevelKey;
  weeks: number | null;
  area: { slug: string; name_t: LocalizedRow } | null;
  sessions:
    | {
        id: string;
        position: number;
        title_t: LocalizedRow;
        outcome_t: LocalizedRow;
        focus_t: LocalizedRow;
        levels: LevelKey[];
        status: PublishStatus;
        videos: { id: string; duration_ms: number | null }[] | null;
      }[]
    | null;
}

/** One module's page: its sessions, ordered, each with the running time and
    video count worked out from the videos this viewer may actually see —
    never a stored total, for the same reason sessionLength() in lib/db.ts
    sums instead of storing.

    Falls back to the static catalogue when Supabase is not configured, same as
    getCatalogue() — but the static data only has sessions for STATE.program,
    so any other slug falls back to not-found rather than an empty page. */
export async function getProgram(slug: string): Promise<ProgramDetail | null> {
  if (!isConfigured) return staticProgram(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('programs')
    .select(
      `slug, title_t, subtitle_t, promise_t, level, weeks,
       area:areas ( slug, name_t ),
       sessions ( id, position, title_t, outcome_t, focus_t, levels, status,
                  videos ( id, duration_ms ) )`,
    )
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[catalogue] getProgram failed:', error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as ProgramDetailRow;
  return {
    id: row.slug,
    title: localized(row.title_t),
    subtitle: localized(row.subtitle_t),
    promise: localized(row.promise_t),
    level: LEVEL_LABELS[row.level],
    weeks: weeksLabel(row.weeks),
    area: { id: row.area?.slug ?? '', name: localized(row.area?.name_t) },
    sessions: byPosition(row.sessions).map(s => ({
      id: s.id,
      position: s.position,
      title: localized(s.title_t),
      outcome: localized(s.outcome_t),
      focus: localized(s.focus_t),
      levels: s.levels,
      status: s.status,
      durationMs: (s.videos ?? []).reduce((n, v) => n + (v.duration_ms ?? 0), 0),
      videoCount: (s.videos ?? []).length,
    })),
  };
}

function staticProgram(slug: string): ProgramDetail | null {
  if (slug !== STATE.program) return null;
  const program = ALL_PROGRAMS.find(p => p.id === slug);
  const area = areaOf(slug);
  if (!program || !area) return null;

  return {
    id: program.id,
    title: program.title,
    subtitle: program.subtitle,
    promise: program.promise,
    level: program.level,
    weeks: program.weeks,
    area: { id: area.id, name: area.name },
    sessions: SESSIONS.map(s => ({
      id: `${slug}-s${s.position}`,
      position: s.position,
      title: s.title,
      outcome: s.outcome,
      focus: s.focus,
      levels: s.levels,
      status: 'open',
      durationMs: s.videos.reduce((n, v) => n + secondsOf(v.length) * 1000, 0),
      videoCount: s.videos.length,
    })),
  };
}

const secondsOf = (mmss: string): number => {
  const [m, s] = mmss.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
};

/* ------------------------------------------------------------- session ---- */

export interface SessionVideoSummary {
  id: string;
  step: MethodStep;
  position: number;
  title: Localized;
  description: Localized;
  durationMs: number | null;
  angle: CameraAngle;
  mirrorDefault: boolean;
  isDrillable: boolean;
  status: VideoStatus;
  /** width / height, from the encode. Below 1 is portrait. Null until known —
      the player then measures it off the loaded video instead. */
  aspect: number | null;
  /** The beat grid. Counts, phrase marks and "loop eight counts" all derive
      from these; without a bpm the player offers none of them. */
  bpm: number | null;
  firstBeatMs: number | null;
  beatsPerPhrase: number;
  /** The loop a member gets before touching anything, set in the back office. */
  loopStartMs: number | null;
  loopEndMs: number | null;
}

export interface SessionDetail {
  id: string;
  position: number;
  title: Localized;
  outcome: Localized;
  focus: Localized;
  levels: LevelKey[];
  program: { id: string; title: Localized };
  videos: SessionVideoSummary[];
  prevSessionId: string | null;
  nextSessionId: string | null;
}

/** The columns a player needs from `videos`, and the row they come back as.
    Shared with the drills, which play the same videos in a different order. */
export const VIDEO_COLUMNS = `id, step, position, title_t, description_t, duration_ms, angle,
  mirror_default, is_drillable, status, width, height,
  bpm, first_beat_ms, beats_per_phrase, default_loop_start_ms, default_loop_end_ms`;

export interface VideoSummaryRow {
  id: string;
  step: MethodStep;
  position: number;
  title_t: LocalizedRow;
  description_t: LocalizedRow;
  duration_ms: number | null;
  angle: CameraAngle;
  mirror_default: boolean;
  is_drillable: boolean;
  status: VideoStatus;
  width: number | null;
  height: number | null;
  bpm: number | null;
  first_beat_ms: number | null;
  beats_per_phrase: number;
  default_loop_start_ms: number | null;
  default_loop_end_ms: number | null;
}

export const toVideoSummary = (v: VideoSummaryRow): SessionVideoSummary => ({
  id: v.id,
  step: v.step,
  position: v.position,
  title: localized(v.title_t),
  description: localized(v.description_t),
  durationMs: v.duration_ms,
  angle: v.angle,
  mirrorDefault: v.mirror_default,
  isDrillable: v.is_drillable,
  status: v.status,
  aspect: v.width && v.height ? v.width / v.height : null,
  bpm: v.bpm,
  firstBeatMs: v.first_beat_ms,
  beatsPerPhrase: v.beats_per_phrase,
  loopStartMs: v.default_loop_start_ms,
  loopEndMs: v.default_loop_end_ms,
});

interface SessionDetailRow {
  id: string;
  program_id: string;
  position: number;
  title_t: LocalizedRow;
  outcome_t: LocalizedRow;
  focus_t: LocalizedRow;
  levels: LevelKey[];
  program: { slug: string; title_t: LocalizedRow } | null;
  videos: VideoSummaryRow[] | null;
}

/** One session's page: its videos in order, each still gated by
    `private.can_access()` through the "videos need entitlement" policy — a
    video this viewer isn't entitled to simply never comes back, exactly as
    lib/catalogue.ts does not filter drafts itself elsewhere.

    Falls back to the static session data only for STATE.program; every other
    id falls back to not-found, same reasoning as getProgram(). */
export async function getSession(id: string): Promise<SessionDetail | null> {
  if (!isConfigured) return staticSession(id);
  /* Any mistyped URL would otherwise reach Postgres and log a uuid cast error. */
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select(
      `id, program_id, position, title_t, outcome_t, focus_t, levels,
       program:programs ( slug, title_t ),
       videos ( ${VIDEO_COLUMNS} )`,
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[catalogue] getSession failed:', error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as SessionDetailRow;

  const { data: siblingsData } = await supabase
    .from('sessions')
    .select('id, position')
    .eq('program_id', row.program_id)
    .order('position');
  const siblings = byPosition((siblingsData ?? []) as { id: string; position: number }[]);
  const at = siblings.findIndex(s => s.id === row.id);

  return {
    id: row.id,
    position: row.position,
    title: localized(row.title_t),
    outcome: localized(row.outcome_t),
    focus: localized(row.focus_t),
    levels: row.levels,
    program: { id: row.program?.slug ?? '', title: localized(row.program?.title_t) },
    videos: byPosition(row.videos).map(toVideoSummary),
    prevSessionId: at > 0 ? siblings[at - 1].id : null,
    nextSessionId: at >= 0 && at < siblings.length - 1 ? siblings[at + 1].id : null,
  };
}

function staticSession(id: string): SessionDetail | null {
  const match = /^(.+)-s(\d+)$/.exec(id);
  if (!match || match[1] !== STATE.program) return null;
  const position = parseInt(match[2], 10);
  const session = SESSIONS.find(s => s.position === position);
  const program = ALL_PROGRAMS.find(p => p.id === STATE.program);
  if (!session || !program) return null;

  return {
    id,
    position: session.position,
    title: session.title,
    outcome: session.outcome,
    focus: session.focus,
    levels: session.levels,
    program: { id: program.id, title: program.title },
    videos: session.videos.map(v => ({
      id: v.id,
      step: v.step,
      position: v.position,
      title: v.title,
      description: v.description,
      durationMs: secondsOf(v.length) * 1000,
      angle: 'front',
      mirrorDefault: v.step === 'train',
      isDrillable: v.isDrillable,
      status: 'ready',
      aspect: 16 / 9,
      bpm: null,
      firstBeatMs: null,
      beatsPerPhrase: 8,
      loopStartMs: null,
      loopEndMs: null,
    })),
    prevSessionId: position > 1 ? `${STATE.program}-s${position - 1}` : null,
    nextSessionId: position < SESSIONS.length ? `${STATE.program}-s${position + 1}` : null,
  };
}
