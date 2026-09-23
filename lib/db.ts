/* The database, as types.

   Hand-written rather than generated, and checked against the live schema —
   the generated file is ~600 lines of mapped-type boilerplate for the same
   information, and this codebase reads better than that. Regenerate and diff
   against this if the schema moves:

     supabase gen types typescript --project-id incumqqgmueyovtzvenl

   Only the columns the app actually touches are here. Adding one is a one-line
   change; leaving out a column you do not read is the point. */

import type { Lang } from './content';

/* ---------------------------------------------------------------- enums ---- */

export type PublishStatus = 'draft' | 'soon' | 'open';
export type LevelKey = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'pro';
export type MethodStep = 'watch' | 'understand' | 'train' | 'drill' | 'transform' | 'improvise';
export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'failed';
export type CameraAngle = 'front' | 'back' | 'detail';
export type MemberRole = 'member' | 'admin';

export const PUBLISH_STATUSES: PublishStatus[] = ['draft', 'soon', 'open'];
export const LEVEL_KEYS: LevelKey[] = ['all', 'beginner', 'intermediate', 'advanced', 'pro'];

/* The method's order. A session draws from this vocabulary and is under no
   obligation to use all of it, or to use any of it only once — but when the
   back office suggests where a new video goes, this is the order it suggests. */
export const METHOD_STEPS: MethodStep[] = [
  'watch', 'understand', 'train', 'drill', 'transform', 'improvise',
];

export const DRILLABLE_STEPS: MethodStep[] = ['train', 'drill'];

/* ------------------------------------------------------------ localized ---- */

/* The shape of every *_t column. English is required by a check constraint;
   Korean is optional, which is what makes an "untranslated" state visible in
   the back office rather than invented silently. */
export interface LocalizedRow {
  en: string;
  ko?: string | null;
}

/** Reads a *_t column, falling back to English when Korean is missing. */
export const tr = (value: LocalizedRow | null | undefined, lang: Lang): string =>
  (lang === 'ko' ? value?.ko : null) || value?.en || '';

/** Whether a row still needs a Korean translation. Drives the back office badge. */
export const untranslated = (...values: (LocalizedRow | null | undefined)[]): boolean =>
  values.some(v => !v?.ko?.trim());

/* ----------------------------------------------------------------- rows ---- */

export interface AreaRow {
  id: string;
  slug: string;
  position: number;
  name_t: LocalizedRow;
  blurb_t: LocalizedRow;
}

export interface ProgramRow {
  id: string;
  area_id: string;
  slug: string;
  position: number;
  title_t: LocalizedRow;
  subtitle_t: LocalizedRow;
  promise_t: LocalizedRow;
  level: LevelKey;
  weeks: number | null;
  status: PublishStatus;
  is_free: boolean;
  published_at: string | null;
}

export interface SessionRow {
  id: string;
  program_id: string;
  position: number;
  title_t: LocalizedRow;
  outcome_t: LocalizedRow;
  focus_t: LocalizedRow;
  levels: LevelKey[];
  status: PublishStatus;
}

export interface VideoRow {
  id: string;
  session_id: string;
  step: MethodStep;
  position: number;
  title_t: LocalizedRow;
  description_t: LocalizedRow;
  angle: CameraAngle;
  duration_ms: number | null;
  provider: string;
  provider_uid: string | null;
  hls_playback_id: string | null;
  mp4_url: string | null;
  poster_url: string | null;
  status: VideoStatus;
  /** Picture size after rotation, from Cloudflare. Null until encoded. */
  width: number | null;
  height: number | null;
  /* The beat grid. Everything about counts is derived from these three; nothing
     about counts is ever hand-drawn. */
  bpm: number | null;
  first_beat_ms: number | null;
  beats_per_phrase: number;
  default_loop_start_ms: number | null;
  default_loop_end_ms: number | null;
  mirror_default: boolean;
  /** Generated in Postgres from `step`, so it always follows the method. */
  is_drillable: boolean;
}

/* ----------------------------------------------------------- formatting ---- */

export const mmss = (ms: number | null | undefined): string => {
  if (!ms || ms < 0) return '—';
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** A session's running time is the sum of its videos — never a stored number. */
export const sessionLength = (videos: Pick<VideoRow, 'duration_ms'>[]): number =>
  videos.reduce((n, v) => n + (v.duration_ms ?? 0), 0);

/* A video is only playable once the host has finished with it. `ready` is
   enforced by a check constraint too, so this and the database agree. */
export const isPlayable = (v: Pick<VideoRow, 'status' | 'provider_uid'>): boolean =>
  v.status === 'ready' && Boolean(v.provider_uid);
