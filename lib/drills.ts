import 'server-only';
import { createClient } from './supabase/server';
import { isConfigured } from './supabase/config';
import { tr, type LocalizedRow } from './db';
import type { Localized } from './content';
import { VIDEO_COLUMNS, toVideoSummary, type SessionVideoSummary, type VideoSummaryRow } from './catalogue';
import type { Playlist } from './playlist';

/* My drills, read from the database.

   A drill is a member's own run of videos, and the week is where each drill
   sits in it. Everything here is the member's own rows: the "own drills",
   "own drill items" and "own drill slots" policies decide what comes back,
   and the items policy also refuses a video the member may not watch or that
   is not drillable — so a drill can never hold a video the player would then
   refuse to sign.

   The library is every drillable video the member can see. BUILD-PLAN §7 wants
   it narrowed to videos the member has actually practised; that needs
   practice_events (P4), so until then the whole shelf of TRAIN and DRILL
   footage is on offer. */

const localized = (value: LocalizedRow | null | undefined): Localized => ({
  en: tr(value, 'en'),
  ko: tr(value, 'ko'),
});

/** A video with where it came from, so a drill can say "Session 03 · Build
    the base" rather than a bare title. */
export interface LibraryVideo extends SessionVideoSummary {
  session: { id: string; position: number; title: Localized };
  program: { slug: string; title: Localized };
}

export interface DrillItem {
  id: string;
  position: number;
  repeats: number;
  speed: number | null;
  /** Null when the video has since been unpublished or removed; the drill
      keeps its place so the member can see what is missing and fix it. */
  video: LibraryVideo | null;
}

export interface DrillSlot {
  id: string;
  /** 0 = Monday. */
  weekday: number;
  doneAt: string | null;
  /** Slots on the same day run in the order they were placed. */
  createdAt: string;
}

export interface Drill {
  id: string;
  name: string;
  createdAt: string;
  items: DrillItem[];
  slots: DrillSlot[];
}

interface LibraryRow extends VideoSummaryRow {
  session: {
    id: string;
    position: number;
    title_t: LocalizedRow;
    program: { slug: string; title_t: LocalizedRow } | null;
  } | null;
}

const VIDEO_WITH_PLACE = `${VIDEO_COLUMNS},
  session:sessions ( id, position, title_t, program:programs ( slug, title_t ) )`;

const toLibraryVideo = (row: LibraryRow): LibraryVideo => ({
  ...toVideoSummary(row),
  session: {
    id: row.session?.id ?? '',
    position: row.session?.position ?? 0,
    title: localized(row.session?.title_t),
  },
  program: {
    slug: row.session?.program?.slug ?? '',
    title: localized(row.session?.program?.title_t),
  },
});

const byPosition = <T extends { position: number }>(rows: T[] | null | undefined): T[] =>
  [...(rows ?? [])].sort((a, b) => a.position - b.position);

/** Every drillable video this member may watch, in catalogue order. */
export async function getDrillLibrary(): Promise<LibraryVideo[]> {
  if (!isConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('videos')
    .select(VIDEO_WITH_PLACE)
    .eq('is_drillable', true)
    .eq('status', 'ready');
  if (error) {
    console.error('[drills] library failed:', error.message);
    return [];
  }
  return (data as unknown as LibraryRow[])
    .map(toLibraryVideo)
    .sort(
      (a, b) =>
        a.program.slug.localeCompare(b.program.slug) ||
        a.session.position - b.session.position ||
        a.position - b.position,
    );
}

interface DrillRow {
  id: string;
  name: string;
  created_at: string;
  drill_items:
    | {
        id: string;
        position: number;
        repeats: number;
        speed: number | null;
        video: LibraryRow | null;
      }[]
    | null;
  drill_slots: { id: string; weekday: number; done_at: string | null; created_at: string }[] | null;
}

const DRILL_SELECT = `id, name, created_at,
  drill_items ( id, position, repeats, speed, video:videos ( ${VIDEO_WITH_PLACE} ) ),
  drill_slots ( id, weekday, done_at, created_at )`;

const toDrill = (row: DrillRow): Drill => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  items: byPosition(row.drill_items).map(i => ({
    id: i.id,
    position: i.position,
    repeats: i.repeats,
    speed: i.speed == null ? null : Number(i.speed),
    video: i.video ? toLibraryVideo(i.video) : null,
  })),
  slots: [...(row.drill_slots ?? [])]
    .sort((a, b) => a.weekday - b.weekday || a.created_at.localeCompare(b.created_at))
    .map(s => ({ id: s.id, weekday: s.weekday, doneAt: s.done_at, createdAt: s.created_at })),
});

/** The member's drills, oldest first — the order they were made in is the
    order they are used to seeing them. */
export async function getDrills(): Promise<Drill[]> {
  if (!isConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from('drills').select(DRILL_SELECT).order('created_at');
  if (error) {
    console.error('[drills] list failed:', error.message);
    return [];
  }
  return (data as unknown as DrillRow[]).map(toDrill);
}

export async function getDrill(id: string): Promise<Drill | null> {
  if (!isConfigured) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from('drills').select(DRILL_SELECT).eq('id', id).maybeSingle();
  if (error) {
    console.error('[drills] read failed:', error.message);
    return null;
  }
  return data ? toDrill(data as unknown as DrillRow) : null;
}

/* ------------------------------------------------------------ playlists ---- */

const BACK: Localized = { en: 'My drills', ko: '나의 드릴' };
const DONE: Localized = { en: 'Back to my drills →', ko: '나의 드릴로 →' };

/** A drill as the player plays it. Missing videos are left out; an item's
    repeats and speed ride along. (drill_items also carries a loop of its own;
    nothing sets it yet, so the video's default loop applies.) */
export function drillPlaylist(drill: Drill): Playlist {
  const n = drill.items.length;
  return {
    kind: 'drill',
    href: `/drills/${drill.id}/play`,
    title: { en: drill.name, ko: drill.name },
    kicker: { en: `Drill · ${n} video${n === 1 ? '' : 's'}`, ko: `드릴 · 영상 ${n}개` },
    back: { href: '/drills', label: BACK },
    prev: null,
    next: { href: '/drills', label: DONE },
    notes: [],
    entries: drill.items
      .filter(i => i.video)
      .map(i => ({ video: i.video!, repeats: i.repeats, speed: i.speed })),
  };
}

export const DAY_NAMES: Localized[] = [
  { en: 'Monday', ko: '월요일' },
  { en: 'Tuesday', ko: '화요일' },
  { en: 'Wednesday', ko: '수요일' },
  { en: 'Thursday', ko: '목요일' },
  { en: 'Friday', ko: '금요일' },
  { en: 'Saturday', ko: '토요일' },
  { en: 'Sunday', ko: '일요일' },
];

/** One day of the week: its drills, in the order they were placed, one after
    another. Each slot is its own run, so a drill placed twice plays twice. */
export function dayPlaylist(weekday: number, drills: Drill[]): Playlist {
  const runs = drills
    .flatMap(d => d.slots.filter(s => s.weekday === weekday).map(s => ({ slot: s, drill: d })))
    .sort((a, b) => a.slot.createdAt.localeCompare(b.slot.createdAt));
  const n = runs.length;
  return {
    kind: 'day',
    href: `/drills/day/${weekday}`,
    title: DAY_NAMES[weekday],
    kicker: { en: `${n} drill run${n === 1 ? '' : 's'}`, ko: `드릴 ${n}회` },
    back: { href: '/drills', label: BACK },
    prev: null,
    next: { href: '/drills', label: DONE },
    notes: [],
    entries: runs.flatMap(r => drillPlaylist(r.drill).entries),
  };
}
