import 'server-only';
import { cache } from 'react';
import { createClient } from './supabase/server';
import { isConfigured } from './supabase/config';
import { tr, type CameraAngle, type LocalizedRow, type PublishStatus, type VideoStatus } from './db';
import type { ExerciseTag, LevelKey, Localized } from './i18n';

/* The curated side, read from the database: stages, the weekly menus in them,
   the routines in a menu, and the exercises each routine borrows.

   Three things worth knowing about what this does NOT do:

   1. It does not filter drafts. The "published menus are public" and
      "published routines are public" policies already do, in the one place
      that cannot be forgotten. An admin browsing the site therefore sees
      their own drafts, which is a preview rather than a leak.

   2. It does not decide what a member may play. An exercise row is gated per
      row by private.can_access(); a routine item whose exercise this viewer
      may not see comes back with `video: null`, and the player skips it.

   3. It does not count anything in SQL. The rows come back anyway. */

export const localized = (value: LocalizedRow | null | undefined): Localized => ({
  en: tr(value, 'en'),
  ko: tr(value, 'ko'),
});

export const byPosition = <T extends { position: number }>(rows: T[] | null | undefined): T[] =>
  [...(rows ?? [])].sort((a, b) => a.position - b.position);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* -------------------------------------------------------------- exercise ---- */

/** An exercise as the player and the planner see it. */
export interface Exercise {
  id: string;
  title: Localized;
  description: Localized;
  tags: ExerciseTag[];
  difficulty: LevelKey;
  publish: PublishStatus;
  durationMs: number | null;
  angle: CameraAngle;
  mirrorDefault: boolean;
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

/** The columns the player needs from `videos`, and the row they come back as.
    Shared by every reader of the table. */
export const VIDEO_COLUMNS = `id, title_t, description_t, tags, difficulty, publish, duration_ms, angle,
  mirror_default, status, width, height,
  bpm, first_beat_ms, beats_per_phrase, default_loop_start_ms, default_loop_end_ms`;

export interface VideoSummaryRow {
  id: string;
  title_t: LocalizedRow;
  description_t: LocalizedRow;
  tags: string[];
  difficulty: LevelKey;
  publish: PublishStatus;
  duration_ms: number | null;
  angle: CameraAngle;
  mirror_default: boolean;
  status: VideoStatus;
  width: number | null;
  height: number | null;
  bpm: number | null;
  first_beat_ms: number | null;
  beats_per_phrase: number;
  default_loop_start_ms: number | null;
  default_loop_end_ms: number | null;
}

export const toExercise = (v: VideoSummaryRow): Exercise => ({
  id: v.id,
  title: localized(v.title_t),
  description: localized(v.description_t),
  tags: v.tags as ExerciseTag[],
  difficulty: v.difficulty,
  publish: v.publish,
  durationMs: v.duration_ms,
  angle: v.angle,
  mirrorDefault: v.mirror_default,
  status: v.status,
  aspect: v.width && v.height ? v.width / v.height : null,
  bpm: v.bpm,
  firstBeatMs: v.first_beat_ms,
  beatsPerPhrase: v.beats_per_phrase,
  loopStartMs: v.default_loop_start_ms,
  loopEndMs: v.default_loop_end_ms,
});

/** Every exercise members may play: open and ready. The library of the week
    planner. In the order the back office keeps them, newest last. */
export async function getLibrary(): Promise<Exercise[]> {
  if (!isConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('videos')
    .select(VIDEO_COLUMNS)
    .eq('publish', 'open')
    .eq('status', 'ready')
    .order('created_at');
  if (error) {
    console.error('[menus] library failed:', error.message);
    return [];
  }
  return (data as unknown as VideoSummaryRow[]).map(toExercise);
}

/* --------------------------------------------------------------- routine ---- */

export interface RoutineItem {
  id: string;
  position: number;
  repeats: number;
  speed: number | null;
  loopStartMs: number | null;
  loopEndMs: number | null;
  /** Null when this viewer may not see the exercise, or it was unpublished. */
  video: Exercise | null;
}

export interface Routine {
  id: string;
  menuId: string;
  position: number;
  /** 0 = Monday; null for a routine that is not a day of anything. */
  weekday: number | null;
  title: Localized;
  blurb: Localized;
  levels: LevelKey[];
  status: PublishStatus;
  items: RoutineItem[];
}

interface RoutineItemRow {
  id: string;
  position: number;
  repeats: number;
  speed: number | null;
  loop_start_ms: number | null;
  loop_end_ms: number | null;
  video: VideoSummaryRow | null;
}

interface RoutineRow {
  id: string;
  menu_id: string;
  position: number;
  weekday: number | null;
  title_t: LocalizedRow;
  blurb_t: LocalizedRow;
  levels: LevelKey[];
  status: PublishStatus;
  routine_items: RoutineItemRow[] | null;
}

export const ROUTINE_SELECT = `id, menu_id, position, weekday, title_t, blurb_t, levels, status,
  routine_items ( id, position, repeats, speed, loop_start_ms, loop_end_ms,
    video:videos ( ${VIDEO_COLUMNS} ) )`;

export const toRoutine = (r: RoutineRow): Routine => ({
  id: r.id,
  menuId: r.menu_id,
  position: r.position,
  weekday: r.weekday,
  title: localized(r.title_t),
  blurb: localized(r.blurb_t),
  levels: r.levels,
  status: r.status,
  items: byPosition(r.routine_items).map(i => ({
    id: i.id,
    position: i.position,
    repeats: i.repeats,
    speed: i.speed == null ? null : Number(i.speed),
    loopStartMs: i.loop_start_ms,
    loopEndMs: i.loop_end_ms,
    video: i.video ? toExercise(i.video) : null,
  })),
});

/* ------------------------------------------------------------------ menu ---- */

export interface Menu {
  id: string;
  slug: string;
  position: number;
  title: Localized;
  subtitle: Localized;
  promise: Localized;
  level: LevelKey;
  status: PublishStatus;
  isFree: boolean;
  stage: { id: string; slug: string; name: Localized; position: number } | null;
  /** In weekday order, then position. */
  routines: Routine[];
}

interface MenuRow {
  id: string;
  slug: string;
  position: number;
  title_t: LocalizedRow;
  subtitle_t: LocalizedRow;
  promise_t: LocalizedRow;
  level: LevelKey;
  status: PublishStatus;
  is_free: boolean;
  stage: { id: string; slug: string; name_t: LocalizedRow; position: number } | null;
  routines: RoutineRow[] | null;
}

const MENU_SELECT = `id, slug, position, title_t, subtitle_t, promise_t, level, status, is_free,
  stage:stages ( id, slug, name_t, position ),
  routines ( ${ROUTINE_SELECT} )`;

const toMenu = (m: MenuRow): Menu => ({
  id: m.id,
  slug: m.slug,
  position: m.position,
  title: localized(m.title_t),
  subtitle: localized(m.subtitle_t),
  promise: localized(m.promise_t),
  level: m.level,
  status: m.status,
  isFree: m.is_free,
  stage: m.stage
    ? { id: m.stage.id, slug: m.stage.slug, name: localized(m.stage.name_t), position: m.stage.position }
    : null,
  routines: byPosition(m.routines)
    .map(toRoutine)
    .sort((a, b) => (a.weekday ?? 99) - (b.weekday ?? 99) || a.position - b.position),
});

/** The slug of the menu whose routines are the "Got 5 minutes?" row: one
    exercise each, no stage. Made in the back office like any other menu. */
export const QUICK_MENU_SLUG = 'quick-drills';

/** Where a new member starts: the first open menu of the earliest stage that
    has days on it. The onboarding answer (profiles.start_point) is stored for
    when there is more than one stage to choose between; with one stage, every
    answer starts at its first week. Takes the list rather than reading it, so
    the page and the first sign-in pick the same way. */
export function startingMenu<M extends { slug: string; status: string; stage: { position: number } | null; position: number; routines: { weekday: number | null }[] }>(
  menus: M[],
): M | null {
  return (
    menus
      .filter(m => m.status === 'open' && m.stage && m.slug !== QUICK_MENU_SLUG && m.routines.some(r => r.weekday != null))
      .sort((a, b) => a.stage!.position - b.stage!.position || a.position - b.position)[0] ?? null
  );
}

/** Every menu this viewer may see, with its routines and their exercises, in
    stage order then position. Stageless menus come last. One query: the week
    planner shows them all. */
export async function getMenus(): Promise<Menu[]> {
  if (!isConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from('menus').select(MENU_SELECT);
  if (error) {
    console.error('[menus] list failed:', error.message);
    return [];
  }
  return (data as unknown as MenuRow[])
    .map(toMenu)
    .sort(
      (a, b) =>
        (a.stage?.position ?? 999) - (b.stage?.position ?? 999) || a.position - b.position,
    );
}

async function loadMenu(id: string): Promise<Menu | null> {
  if (!isConfigured || !UUID.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from('menus').select(MENU_SELECT).eq('id', id).maybeSingle();
  if (error) {
    console.error('[menus] read failed:', error.message);
    return null;
  }
  return data ? toMenu(data as unknown as MenuRow) : null;
}

async function loadRoutine(id: string): Promise<(Routine & { menu: Pick<Menu, 'id' | 'slug' | 'title'> | null }) | null> {
  if (!isConfigured || !UUID.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('routines')
    .select(`${ROUTINE_SELECT}, menu:menus ( id, slug, title_t )`)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[menus] routine failed:', error.message);
    return null;
  }
  if (!data) return null;
  const row = data as unknown as RoutineRow & { menu: { id: string; slug: string; title_t: LocalizedRow } | null };
  return {
    ...toRoutine(row),
    menu: row.menu ? { id: row.menu.id, slug: row.menu.slug, title: localized(row.menu.title_t) } : null,
  };
}

/* Cached per request: generateMetadata and the page both ask for the same row. */
export const getMenu = cache(loadMenu);
export const getRoutine = cache(loadRoutine);
