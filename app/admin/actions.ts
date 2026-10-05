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

export type Result = { ok: true } | { ok: false; error: string };

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

  const supabase = await createClient();
  const { error } = await supabase.from(table).update({ status }).eq('id', id);
  if (error) return fail(error.message);
  /* published_at is set the first time a menu opens and left alone after — it
     is when the material went live, not when it was last touched. Hence the
     `is null`: reopening a menu must not move it. */
  if (table === 'menus' && status === 'open') {
    await supabase.from('menus').update({ published_at: new Date().toISOString() }).eq('id', id).is('published_at', null);
  }

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
export async function createMenu(stageId: string | null, title: string): Promise<Result> {
  await requireAdmin();
  const en = title.trim();
  if (!en) return fail('A menu needs a title.');

  const supabase = await createClient();
  let query = supabase.from('menus').select('position');
  query = stageId ? query.eq('stage_id', stageId) : query.is('stage_id', null);
  const { data: last } = await query.order('position', { ascending: false }).limit(1).maybeSingle();

  const { error } = await supabase.from('menus').insert({
    stage_id: stageId,
    slug: await freeSlug(supabase, 'menus', en),
    position: (last?.position ?? 0) + 1,
    title_t: { en },
    subtitle_t: { en: '' },
    promise_t: { en: '' },
    level: 'all',
    status: 'draft',
  });
  if (error) return fail(error.message);

  revalidateCatalogue();
  return ok;
}

/** Appends a routine to a menu, on the first weekday the menu has nothing on
    yet. Starts empty: exercises are picked from the library. */
export async function createRoutine(menuId: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('routines')
    .select('position, weekday')
    .eq('menu_id', menuId);
  const taken = new Set((rows ?? []).map(r => (r as { weekday: number | null }).weekday));
  const position = Math.max(0, ...(rows ?? []).map(r => (r as { position: number }).position)) + 1;
  const weekday = [0, 1, 2, 3, 4, 5, 6].find(d => !taken.has(d)) ?? null;

  const { error } = await supabase.from('routines').insert({
    menu_id: menuId,
    position,
    weekday,
    title_t: { en: `Routine ${String(position).padStart(2, '0')}` },
    blurb_t: { en: '' },
    levels: [],
    status: 'draft',
  });
  if (error) return fail(error.message);

  revalidateCatalogue();
  return ok;
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
  if (fields.publish && !PUBLISH_STATUSES.includes(fields.publish as PublishStatus)) {
    return fail('Unknown status.');
  }
  if (fields.bpm != null && (fields.bpm <= 0 || fields.bpm > 400)) {
    return fail('BPM should be between 1 and 400.');
  }
  if (fields.beats_per_phrase != null && fields.beats_per_phrase < 1) {
    return fail('Beats per phrase must be at least 1.');
  }
  const { default_loop_start_ms: s, default_loop_end_ms: e } = fields;
  if (s != null && e != null && e <= s) {
    return fail('The loop has to end after it starts.');
  }

  const supabase = await createClient();
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
