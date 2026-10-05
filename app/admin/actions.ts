'use server';

/* Back office writes.

   Every one of these runs as the signed-in admin through the ordinary client,
   so the "admins write ..." RLS policies are what actually authorise them.
   requireAdmin() is there to give a redirect rather than a confusing failure —
   it is not the check that matters. Nothing here uses the secret key.

   Errors are returned, not thrown: a failed publish should say why on the row
   it came from, not replace the screen with a stack trace. */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/admin';
import {
  LEVEL_KEYS,
  PUBLISH_STATUSES,
  isTag,
  type LevelKey,
  type PublishStatus,
} from '@/lib/db';
import { DAY_NAMES } from '@/lib/i18n';
import { weekReadiness, type ReadinessRoutine } from './readiness';

export type Result = { ok: true } | { ok: false; error: string };
export type Created = { ok: true; id: string } | { ok: false; error: string };

export type CatalogueTable = 'stages' | 'menus' | 'routines' | 'videos';

/* The back office and the member screens read the same rows, so a write that
   changes the catalogue has to clear both caches.

   This is deliberately blunt: an exercise edit revalidates the week planner
   too, even if the exercise is in no menu. A wasted re-render costs one
   request; a missed one leaves a member's page showing yesterday's catalogue
   with nothing to suggest anything is wrong. */
const revalidateCatalogue = () => {
  revalidatePath('/admin', 'layout');
  revalidatePath('/week');
  revalidatePath('/today');
};

const ok: Result = { ok: true };
const fail = (error: string): Result => ({ ok: false, error });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ------------------------------------------------------------- publish ---- */

/** Moves a menu or a routine between draft / soon / open. */
export async function setStatus(
  table: 'menus' | 'routines',
  id: string,
  status: string,
): Promise<Result> {
  await requireAdmin();
  if (!PUBLISH_STATUSES.includes(status as PublishStatus)) return fail('Unknown status.');
  /* "Soon" means something only for a menu: a card members see with nothing
     to start. On a routine or an exercise it read as open to RLS and as draft
     to the player, so it is not offered there. */
  if (table === 'routines' && status === 'soon') return fail('A routine is draft or open.');
  /* A menu opens only through publishWeek, whichever control asked: that is
     where the week is checked and its parts opened with it. */
  if (table === 'menus' && status === 'open') return publishWeek(id);

  const supabase = await createClient();
  const { error } = await supabase.from(table).update({ status }).eq('id', id);
  if (error) return fail(error.message);

  revalidateCatalogue();
  return ok;
}

const WEEK_SELECT = `id, title_t, promise_t,
  routines ( id, weekday, title_t,
    routine_items ( repeats, video:videos ( id, status, publish, duration_ms, title_t ) ) )`;

/** Opens a week for members in one go: checks it (app/admin/readiness.ts),
    then opens its exercises that have footage, its day routines, and last the
    menu — in that order, so members never see an open menu with closed parts.
    Refuses, with the list, if anything would leave a member with an empty day
    or an exercise that cannot play. */
export async function publishWeek(menuId: string): Promise<Result> {
  await requireAdmin();
  if (!UUID.test(menuId)) return fail('Not a menu.');
  const supabase = await createClient();

  const { data, error } = await supabase.from('menus').select(WEEK_SELECT).eq('id', menuId).maybeSingle();
  if (error || !data) return fail(error?.message ?? 'No such menu.');
  const week = data as unknown as { title_t: { en: string }; promise_t: { en: string }; routines: ReadinessRoutine[] };
  const check = weekReadiness(week);
  if (check.blockers.length) return fail(`Not published. ${check.blockers.join(' ')}`);

  if (check.toOpen.length) {
    const { error: vError } = await supabase.from('videos').update({ publish: 'open' }).in('id', check.toOpen);
    if (vError) return fail(vError.message);
  }
  const { error: rError } = await supabase
    .from('routines').update({ status: 'open' }).eq('menu_id', menuId).not('weekday', 'is', null);
  if (rError) return fail(rError.message);
  const { error: mError } = await supabase.from('menus').update({ status: 'open' }).eq('id', menuId);
  if (mError) return fail(mError.message);
  /* published_at is set the first time a menu opens and left alone after — it
     is when the material went live, not when it was last touched. */
  await supabase.from('menus').update({ published_at: new Date().toISOString() }).eq('id', menuId).is('published_at', null);

  revalidateCatalogue();
  return ok;
}

/* ---------------------------------------------------------------- order ---- */

/* Reordering is a swap of two `position` values, not a rewrite of the whole
   list. Every one of those unique constraints is deferrable, so two rows can
   trade places inside one transaction without the halfway duplicate tripping
   them. Supabase's REST client cannot open a transaction, so the swap goes
   through a database function instead. See the swap_position migration. */
export async function movePosition(
  table: 'stages' | 'menus' | 'routines' | 'routine_items',
  id: string,
  direction: 'up' | 'down',
): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc('swap_position', {
    p_table: table,
    p_id: id,
    p_direction: direction,
  });
  if (error) return fail(error.message);

  revalidateCatalogue();
  return ok;
}

/* -------------------------------------------------------------- create ---- */

/* A slug is a stable identifier, so it is derived once from the English title
   and then left alone unless someone changes it deliberately. Renaming a menu
   should not silently change its address. */
const slugify = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

/** A slug nothing else is using. Suffixes -2, -3 … rather than failing. */
async function freeSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: 'stages' | 'menus',
  base: string,
): Promise<string> {
  const root = slugify(base) || table.slice(0, -1);
  const { data } = await supabase.from(table).select('slug').like('slug', `${root}%`);
  const taken = new Set((data ?? []).map(r => (r as { slug: string }).slug));
  if (!taken.has(root)) return root;
  for (let n = 2; n < 500; n++) if (!taken.has(`${root}-${n}`)) return `${root}-${n}`;
  return `${root}-${Date.now()}`;
}

export async function createStage(name: string): Promise<Result> {
  await requireAdmin();
  const en = name.trim();
  if (!en) return fail('A stage needs a name.');

  const supabase = await createClient();
  const { data: last } = await supabase
    .from('stages').select('position').order('position', { ascending: false }).limit(1).maybeSingle();

  const { error } = await supabase.from('stages').insert({
    slug: await freeSlug(supabase, 'stages', en),
    position: (last?.position ?? 0) + 1,
    name_t: { en },
    blurb_t: { en: '' },
  });
  if (error) return fail(error.message);

  revalidateCatalogue();
  return ok;
}

/** A menu is a week. It belongs to a stage, or to none: the quick drills are
    a stageless menu. */
export async function createMenu(stageId: string | null, title: string, days: number[] = []): Promise<Created> {
  await requireAdmin();
  const en = title.trim();
  if (!en) return { ok: false, error: 'A menu needs a title.' };
  if (days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) return { ok: false, error: 'Not a day of the week.' };

  const supabase = await createClient();
  let query = supabase.from('menus').select('position');
  query = stageId ? query.eq('stage_id', stageId) : query.is('stage_id', null);
  const { data: last } = await query.order('position', { ascending: false }).limit(1).maybeSingle();

  const { data: menu, error } = await supabase
    .from('menus')
    .insert({
      stage_id: stageId,
      slug: await freeSlug(supabase, 'menus', en),
      position: (last?.position ?? 0) + 1,
      title_t: { en },
      subtitle_t: { en: '' },
      promise_t: { en: '' },
      level: 'all',
      status: 'draft',
    })
    .select('id')
    .single();
  if (error || !menu) return { ok: false, error: error?.message ?? 'Could not create the menu.' };

  /* A week laid out at once: one routine per chosen day, named after it in
     both languages, so the menu opens on its days rather than on "Routine 01". */
  const unique = [...new Set(days)].sort();
  if (unique.length) {
    const { error: rError } = await supabase.from('routines').insert(
      unique.map((d, i) => ({
        menu_id: menu.id,
        position: i + 1,
        weekday: d,
        title_t: { en: DAY_NAMES[d].en, ko: DAY_NAMES[d].ko },
        blurb_t: { en: '' },
        levels: [],
        status: 'draft',
      })),
    );
    if (rError) return { ok: false, error: rError.message };
  }

  revalidateCatalogue();
  return { ok: true, id: menu.id };
}

/** Appends a routine to a menu, on the first weekday the menu has nothing on
    yet. Starts empty: exercises are picked from the library. */
export async function createRoutine(menuId: string): Promise<Created> {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: rows }, { data: menu }] = await Promise.all([
    supabase.from('routines').select('position, weekday').eq('menu_id', menuId),
    supabase.from('menus').select('slug').eq('id', menuId).maybeSingle(),
  ]);
  const taken = new Set((rows ?? []).map(r => (r as { weekday: number | null }).weekday));
  const position = Math.max(0, ...(rows ?? []).map(r => (r as { position: number }).position)) + 1;
  /* The quick drills are not a week: their routines sit on no day. */
  const quick = (menu as { slug: string } | null)?.slug === 'quick-drills';
  const weekday = quick ? null : ([0, 1, 2, 3, 4, 5, 6].find(d => !taken.has(d)) ?? null);

  const { data, error } = await supabase
    .from('routines')
    .insert({
      menu_id: menuId,
      position,
      weekday,
      title_t: weekday == null
        ? { en: `Quick drill ${String(position).padStart(2, '0')}` }
        : { en: DAY_NAMES[weekday].en, ko: DAY_NAMES[weekday].ko },
      blurb_t: { en: '' },
      levels: [],
      status: 'draft',
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? 'Could not create the routine.' };

  revalidateCatalogue();
  return { ok: true, id: data.id };
}

/** A new exercise, as a draft with no footage. Returns its id so the library
    can open its editor at once. */
export async function createExercise(
  title: string,
): Promise<Result & { id?: string }> {
  await requireAdmin();
  const en = title.trim();
  if (!en) return fail('An exercise needs a title.');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('videos')
    .insert({
      title_t: { en },
      description_t: { en: '' },
      tags: [],
      difficulty: 'beginner',
      publish: 'draft',
      mirror_default: true,
      status: 'uploading',
    })
    .select('id')
    .single();
  if (error || !data) return fail(error?.message ?? 'Could not create the exercise.');

  revalidateCatalogue();
  return { ok: true, id: data.id as string };
}

/* ---------------------------------------------------------------- edit ---- */

/** Writes one localized field. Korean may be blank — that is what makes the
    "needs Korean" badge honest rather than a guess. */
export async function setLocalized(
  table: CatalogueTable,
  id: string,
  column: string,
  value: { en: string; ko: string },
): Promise<Result> {
  await requireAdmin();
  if (!column.endsWith('_t')) return fail('Not a translatable column.');
  if (!value.en.trim()) return fail('English is required.');

  const supabase = await createClient();
  const payload: { en: string; ko?: string } = { en: value.en.trim() };
  if (value.ko.trim()) payload.ko = value.ko.trim();

  const { error } = await supabase.from(table).update({ [column]: payload }).eq('id', id);
  if (error) return fail(error.message);

  revalidateCatalogue();
  return ok;
}

/** Which levels a routine sits in. The scale is not a ladder — a routine can
    sit in two at once — so this is a set, kept in the scale's order. */
export async function setRoutineLevels(id: string, levels: string[]): Promise<Result> {
  await requireAdmin();
  if (levels.some(l => !LEVEL_KEYS.includes(l as LevelKey))) return fail('Unknown level.');
  const ordered = LEVEL_KEYS.filter(k => levels.includes(k));

  const supabase = await createClient();
  const { error } = await supabase.from('routines').update({ levels: ordered }).eq('id', id);
  if (error) return fail(error.message);

  revalidateCatalogue();
  return ok;
}

/** Which day of its menu's week a routine is, or none. */
export async function setRoutineWeekday(id: string, weekday: number | null): Promise<Result> {
  await requireAdmin();
  if (weekday !== null && (!Number.isInteger(weekday) || weekday < 0 || weekday > 6)) {
    return fail('Not a day of the week.');
  }
  const supabase = await createClient();

  /* One routine per weekday in a menu (a unique index holds it). Moving a
     routine onto a taken day swaps the two, rather than refusing or silently
     shadowing: members copy one routine per weekday, so two on a Tuesday lost
     one of them. The other routine is parked on null first so the index never
     sees two at once. */
  const { data: self, error: selfError } = await supabase
    .from('routines')
    .select('menu_id, weekday')
    .eq('id', id)
    .single();
  if (selfError || !self) return fail(selfError?.message ?? 'No such routine.');

  let other: string | null = null;
  if (weekday !== null && self.weekday !== weekday) {
    const { data: clash } = await supabase
      .from('routines')
      .select('id')
      .eq('menu_id', self.menu_id)
      .eq('weekday', weekday)
      .neq('id', id)
      .maybeSingle();
    other = clash?.id ?? null;
  }
  if (other) {
    const { error: parkError } = await supabase.from('routines').update({ weekday: null }).eq('id', other);
    if (parkError) return fail(parkError.message);
  }
  const { error } = await supabase.from('routines').update({ weekday }).eq('id', id);
  if (error) return fail(error.message);
  if (other) {
    const { error: swapError } = await supabase.from('routines').update({ weekday: self.weekday }).eq('id', other);
    if (swapError) return fail(swapError.message);
  }

  revalidateCatalogue();
  return ok;
}

/* --------------------------------------------------------- routine items ---- */

/** Puts an exercise at the end of a routine. The same exercise may go in
    twice; each appearance is its own item. */
export async function addRoutineItem(routineId: string, videoId: string): Promise<Result> {
  await requireAdmin();
  if (!UUID.test(videoId)) return fail('Not an exercise.');
  const supabase = await createClient();

  const { data: last } = await supabase
    .from('routine_items')
    .select('position')
    .eq('routine_id', routineId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('routine_items').insert({
    routine_id: routineId,
    video_id: videoId,
    position: (last?.position ?? 0) + 1,
  });
  if (error) return fail(error.message);

  revalidateCatalogue();
  return ok;
}

export async function removeRoutineItem(itemId: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('routine_items').delete().eq('id', itemId);
  if (error) return fail(error.message);

  revalidateCatalogue();
  return ok;
}

/** How an exercise plays in this routine: its own speed and repeat count.
    Null speed means the exercise's default. */
export async function setRoutineItem(
  itemId: string,
  fields: { speed?: number | null; repeats?: number },
): Promise<Result> {
  await requireAdmin();
  if (fields.speed != null && (fields.speed < 0.25 || fields.speed > 2)) {
    return fail('Speed should be between 0.25× and 2×.');
  }
  if (fields.repeats != null && (!Number.isInteger(fields.repeats) || fields.repeats < 1 || fields.repeats > 20)) {
    return fail('Repeats should be a whole number from 1 to 20.');
  }
  const supabase = await createClient();
  const { error } = await supabase.from('routine_items').update(fields).eq('id', itemId);
  if (error) return fail(error.message);

  revalidateCatalogue();
  return ok;
}

/* ------------------------------------------------------- exercise edit ---- */

/** The scalar half of an exercise: what it works, how hard it is, whether
    members may play it, how it was filmed, and its beat grid.

    Nothing here touches the delivery columns (provider_uid, hls_playback_id,
    mp4_url, poster_url, status) — those are written by the upload flow and the
    encoding webhook, never by hand, so that a row can never claim to be
    playable when no footage exists. */
export async function setVideoFields(
  id: string,
  fields: {
    tags?: string[];
    difficulty?: string;
    publish?: string;
    mirror_default?: boolean;
    bpm?: number | null;
    first_beat_ms?: number | null;
    beats_per_phrase?: number;
    default_loop_start_ms?: number | null;
    default_loop_end_ms?: number | null;
  },
): Promise<Result> {
  await requireAdmin();

  if (fields.tags && fields.tags.some(t => !isTag(t))) return fail('Unknown tag.');
  if (fields.difficulty && !LEVEL_KEYS.includes(fields.difficulty as LevelKey)) {
    return fail('Unknown difficulty.');
  }
  if (fields.publish && fields.publish !== 'draft' && fields.publish !== 'open') {
    return fail('An exercise is draft or open.');
  }
  if (fields.bpm != null && (fields.bpm <= 0 || fields.bpm > 400)) {
    return fail('BPM should be between 1 and 400.');
  }
  if (fields.beats_per_phrase != null && fields.beats_per_phrase < 1) {
    return fail('Beats per phrase must be at least 1.');
  }
  const supabase = await createClient();

  /* The editor saves one field per blur, so the loop's other end is usually
     the stored one: check against it, not just against what arrived. */
  if ('default_loop_start_ms' in fields || 'default_loop_end_ms' in fields) {
    const { data: row } = await supabase
      .from('videos').select('default_loop_start_ms, default_loop_end_ms, duration_ms').eq('id', id).maybeSingle();
    const s = 'default_loop_start_ms' in fields ? fields.default_loop_start_ms : row?.default_loop_start_ms;
    const e = 'default_loop_end_ms' in fields ? fields.default_loop_end_ms : row?.default_loop_end_ms;
    if ((s != null && s < 0) || (e != null && e < 0)) return fail('A loop point cannot be before the start of the video.');
    if (s != null && e != null && e <= s) return fail('The loop has to end after it starts.');
    if (e != null && row?.duration_ms && e > row.duration_ms) return fail('The loop ends after the video does.');
  }

  const { error } = await supabase.from('videos').update(fields).eq('id', id);
  if (error) return fail(error.message);

  revalidateCatalogue();
  return ok;
}

/* ------------------------------------------------------ stages and menus ---- */

/** The scalar half of a menu. Copy goes through setLocalized. */
export async function setMenuFields(
  id: string,
  fields: { slug?: string; level?: string; stage_id?: string | null },
): Promise<Result> {
  await requireAdmin();

  const patch: Record<string, unknown> = {};
  if (fields.slug !== undefined) {
    const slug = slugify(fields.slug);
    if (!slug) return fail('A slug cannot be empty.');
    patch.slug = slug;
  }
  if (fields.level !== undefined) {
    if (!LEVEL_KEYS.includes(fields.level as LevelKey)) return fail('Unknown level.');
    patch.level = fields.level;
  }
  if (fields.stage_id !== undefined) {
    if (fields.stage_id !== null && !UUID.test(fields.stage_id)) return fail('Not a stage.');
    patch.stage_id = fields.stage_id;
  }

  const supabase = await createClient();
  const { error } = await supabase.from('menus').update(patch).eq('id', id);
  if (error) {
    return fail(error.code === '23505' ? 'Another menu already uses that slug or position.' : error.message);
  }

  revalidateCatalogue();
  return ok;
}

export async function setStageSlug(id: string, slug: string): Promise<Result> {
  await requireAdmin();
  const clean = slugify(slug);
  if (!clean) return fail('A slug cannot be empty.');

  const supabase = await createClient();
  const { error } = await supabase.from('stages').update({ slug: clean }).eq('id', id);
  if (error) {
    return fail(error.code === '23505' ? 'Another stage already uses that slug.' : error.message);
  }

  revalidateCatalogue();
  return ok;
}

/* -------------------------------------------------------------- delete ---- */

/* A stage refuses to go while it still holds menus — menus.stage_id is
   ON DELETE RESTRICT, precisely so a whole branch cannot disappear behind one
   click. Move or delete the menus first. */
export async function deleteStage(id: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from('stages').delete().eq('id', id);
  if (error) {
    return fail(
      error.code === '23503'
        ? 'This stage still has menus in it. Move or delete those first.'
        : error.message,
    );
  }

  revalidateCatalogue();
  return ok;
}

/* A menu takes its routines with it; the exercises they borrowed stay in the
   library. The caller shows what is about to go. */
export async function deleteMenu(id: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from('menus').delete().eq('id', id);
  if (error) return fail(error.message);

  revalidateCatalogue();
  return ok;
}

export async function deleteRoutine(id: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) return fail(error.message);

  revalidateCatalogue();
  return ok;
}

/* An exercise a routine still uses cannot go: routine_items.video_id is
   ON DELETE RESTRICT, so a routine members are on is never quietly shortened.
   Members' own days cascade, as they always did. */
export async function deleteExercise(id: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: row } = await supabase
    .from('videos').select('provider_uid').eq('id', id).maybeSingle();
  const uid = (row as { provider_uid: string | null } | null)?.provider_uid;

  const { error } = await supabase.from('videos').delete().eq('id', id);
  if (error) {
    return fail(
      error.code === '23503'
        ? 'A routine still uses this exercise. Take it out of the routine first.'
        : error.message,
    );
  }

  if (uid) {
    const { streamConfig, deleteVideo } = await import('@/lib/cloudflare');
    const cfg = streamConfig();
    if (cfg) {
      try {
        await deleteVideo(cfg, uid);
      } catch {
        /* Already gone, or Cloudflare is unhappy. The row is gone either way. */
      }
    }
  }

  revalidateCatalogue();
  return ok;
}

/* --------------------------------------------------------------- upload ---- */

export type UploadTicket =
  | { ok: true; uploadURL: string; uid: string }
  | { ok: false; error: string };

/** Asks Cloudflare for somewhere to put one file, and records the id before the
    browser sends anything.

    Writing provider_uid first matters: if the upload dies halfway, the row still
    knows which Cloudflare asset it was reaching for, so the webhook can still
    find it and a retry does not orphan storage. Status goes to `processing`
    rather than `ready` — only the webhook may say a video is playable. */
export async function requestUploadUrl(
  videoId: string,
  origin: string,
  size: number,
): Promise<UploadTicket> {
  await requireAdmin();

  /* Cloudflare's own ceiling for one file is 30 GB. */
  if (!Number.isSafeInteger(size) || size <= 0 || size > 30 * 1024 ** 3) {
    return { ok: false, error: 'That file size is not one Cloudflare will take.' };
  }

  const { streamConfig, createDirectUpload } = await import('@/lib/cloudflare');
  const cfg = streamConfig();
  if (!cfg) {
    return {
      ok: false,
      error:
        'Cloudflare Stream is not configured. Set CLOUDFLARE_ACCOUNT_ID and ' +
        'CLOUDFLARE_STREAM_API_TOKEN.',
    };
  }

  try {
    const ticket = await createDirectUpload(cfg, { videoId, origin, size });

    const supabase = await createClient();
    const { error } = await supabase
      .from('videos')
      .update({ provider: 'cloudflare', provider_uid: ticket.uid, status: 'processing' })
      .eq('id', videoId);
    if (error) return { ok: false, error: error.message };

    revalidateCatalogue();
    return { ok: true, uploadURL: ticket.uploadURL, uid: ticket.uid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Reads the current state from Cloudflare and writes it back.

    The webhook is the normal path; this is the manual one, for when a callback
    was missed or the webhook is not registered yet. Same rules apply — it can
    only ever set `ready` on something Cloudflare says is ready. */
export async function refreshVideoStatus(videoId: string): Promise<Result> {
  await requireAdmin();

  const { streamConfig, getVideo, enableDownloads, customerCodeFrom, dimensionsOf } = await import(
    '@/lib/cloudflare'
  );
  const cfg = streamConfig();
  if (!cfg) return fail('Cloudflare Stream is not configured.');

  const supabase = await createClient();
  const { data: row } = await supabase
    .from('videos').select('provider_uid').eq('id', videoId).maybeSingle();
  const uid = (row as { provider_uid: string | null } | null)?.provider_uid;
  if (!uid) return fail('This exercise has no upload yet.');

  try {
    const v = await getVideo(cfg, uid);
    const ready = v.status?.state === 'ready' || v.readyToStream;
    const duration = v.duration ? Math.round(v.duration * 1000) : null;

    if (ready && duration) {
      /* MP4 renditions are opt-in per video, and the loop needs one. Asking
         twice is harmless. */
      try {
        await enableDownloads(cfg, uid);
      } catch {
        /* Downloads can be requested again later; not worth failing the sync. */
      }
      const { error } = await supabase.from('videos').update({
        status: 'ready',
        duration_ms: duration,
        poster_url: v.thumbnail ?? null,
        hls_playback_id: customerCodeFrom(v.playback?.hls),
        ...dimensionsOf(v),
      }).eq('id', videoId);
      if (error) return fail(error.message);
    } else if (v.status?.state === 'error') {
      await supabase.from('videos').update({ status: 'failed' }).eq('id', videoId);
      return fail(v.status.errorReasonText || 'Cloudflare could not encode that file.');
    } else {
      await supabase.from('videos').update({ status: 'processing' }).eq('id', videoId);
    }

    revalidateCatalogue();
    return ok;
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

/** Detaches the footage without deleting the exercise, so its tags and beat
    grid survive a re-upload. */
export async function clearVideoUpload(videoId: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: row } = await supabase
    .from('videos').select('provider_uid').eq('id', videoId).maybeSingle();
  const uid = (row as { provider_uid: string | null } | null)?.provider_uid;

  const { error } = await supabase.from('videos').update({
    status: 'uploading',
    provider_uid: null,
    hls_playback_id: null,
    mp4_url: null,
    poster_url: null,
    duration_ms: null,
  }).eq('id', videoId);
  if (error) return fail(error.message);

  /* Remove it from Cloudflare too, or storage quietly accumulates orphans. */
  if (uid) {
    const { streamConfig, deleteVideo } = await import('@/lib/cloudflare');
    const cfg = streamConfig();
    if (cfg) {
      try {
        await deleteVideo(cfg, uid);
      } catch {
        /* Already gone, or Cloudflare is unhappy. The row is clean either way. */
      }
    }
  }

  revalidateCatalogue();
  return ok;
}

/* ------------------------------------------------------------------ bulk ---- */

/** One change to many exercises at once, from the media library's selection
    bar: a tag added or taken off, a difficulty, mirror, or open/draft. */
export async function bulkVideos(
  ids: string[],
  change:
    | { addTag: string }
    | { removeTag: string }
    | { difficulty: string }
    | { publish: 'draft' | 'open' }
    | { mirror_default: boolean },
): Promise<Result> {
  await requireAdmin();
  const list = [...new Set(ids)].filter(id => UUID.test(id));
  if (!list.length) return fail('Nothing selected.');
  const supabase = await createClient();

  if ('addTag' in change || 'removeTag' in change) {
    const tag = 'addTag' in change ? change.addTag : change.removeTag;
    if (!isTag(tag)) return fail('Unknown tag.');
    const { data, error } = await supabase.from('videos').select('id, tags').in('id', list);
    if (error) return fail(error.message);
    for (const v of (data ?? []) as { id: string; tags: string[] }[]) {
      const next = 'addTag' in change ? [...new Set([...v.tags, tag])] : v.tags.filter(t => t !== tag);
      if (next.length === v.tags.length && next.every((t, i) => t === v.tags[i])) continue;
      const { error: uError } = await supabase.from('videos').update({ tags: next }).eq('id', v.id);
      if (uError) return fail(uError.message);
    }
  } else {
    if ('difficulty' in change && !LEVEL_KEYS.includes(change.difficulty as LevelKey)) return fail('Unknown difficulty.');
    if ('publish' in change && change.publish !== 'draft' && change.publish !== 'open') return fail('Unknown status.');
    let query = supabase.from('videos').update(change).in('id', list);
    /* Only footage that has finished encoding can open; the rest stay draft. */
    if ('publish' in change && change.publish === 'open') query = query.eq('status', 'ready');
    const { error } = await query;
    if (error) return fail(error.message);
  }

  revalidateCatalogue();
  return ok;
}
