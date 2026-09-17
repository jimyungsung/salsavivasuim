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
  METHOD_STEPS,
  PUBLISH_STATUSES,
  type LevelKey,
  type MethodStep,
  type PublishStatus,
} from '@/lib/db';

export type Result = { ok: true } | { ok: false; error: string };

const ok: Result = { ok: true };
const fail = (error: string): Result => ({ ok: false, error });

/* ------------------------------------------------------------- publish ---- */

/** Moves a program or session between draft / soon / open. */
export async function setStatus(
  table: 'programs' | 'sessions',
  id: string,
  status: string,
): Promise<Result> {
  await requireAdmin();
  if (!PUBLISH_STATUSES.includes(status as PublishStatus)) return fail('Unknown status.');

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  /* published_at is set the first time something opens and left alone after —
     it is when the material went live, not when it was last touched. */
  if (table === 'programs' && status === 'open') patch.published_at = new Date().toISOString();

  const { error } = await supabase.from(table).update(patch).eq('id', id);
  if (error) return fail(error.message);

  revalidatePath('/admin');
  return ok;
}

/* ---------------------------------------------------------------- order ---- */

/* Reordering is a swap of two `position` values, not a rewrite of the whole
   list. Every one of those unique constraints — areas(position), and
   (parent, position) below them — is deferrable, so two rows can trade places
   inside one transaction without the halfway duplicate tripping them. That is
   exactly why they were written that way in P1.

   Supabase's REST client cannot open a transaction, so the swap goes through a
   database function instead. See the swap_position migration. */
export async function movePosition(
  table: 'areas' | 'programs' | 'sessions' | 'videos',
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

  revalidatePath('/admin', 'layout');
  return ok;
}

/* -------------------------------------------------------------- create ---- */

/** Appends a session to a program. Starts empty: how many videos, and of which
    steps, is the session's own business. */
export async function createSession(programId: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: last } = await supabase
    .from('sessions')
    .select('position')
    .eq('program_id', programId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (last?.position ?? 0) + 1;

  const { error } = await supabase.from('sessions').insert({
    program_id: programId,
    position,
    title_t: { en: `Session ${String(position).padStart(2, '0')}` },
    outcome_t: { en: '' },
    focus_t: { en: '' },
    levels: [],
    status: 'draft',
  });
  if (error) return fail(error.message);

  revalidatePath('/admin');
  return ok;
}

/** Appends a video to a session, tagged with a step. The suggested position is
    the end of the list — the method's order is a hint for where it probably
    belongs, never a slot it must occupy. */
export async function createVideo(sessionId: string, step: string): Promise<Result> {
  await requireAdmin();
  if (!METHOD_STEPS.includes(step as MethodStep)) return fail('Unknown step.');

  const supabase = await createClient();

  const { data: last } = await supabase
    .from('videos')
    .select('position')
    .eq('session_id', sessionId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('videos').insert({
    session_id: sessionId,
    step,
    position: (last?.position ?? 0) + 1,
    title_t: { en: '' },
    description_t: { en: '' },
    /* Train is filmed facing you, so it opens mirrored; everything else does not. */
    mirror_default: step === 'train',
    status: 'uploading',
  });
  if (error) return fail(error.message);

  revalidatePath(`/admin/sessions/${sessionId}`);
  return ok;
}

export async function deleteVideo(videoId: string, sessionId: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from('videos').delete().eq('id', videoId);
  if (error) return fail(error.message);

  revalidatePath(`/admin/sessions/${sessionId}`);
  return ok;
}

/* ---------------------------------------------------------------- edit ---- */

/** Writes one localized field. Korean may be blank — that is what makes the
    "needs Korean" badge honest rather than a guess. */
export async function setLocalized(
  table: 'areas' | 'programs' | 'sessions' | 'videos',
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

  revalidatePath('/admin', 'layout');
  return ok;
}

/* ----------------------------------------------------------- video edit ---- */

/** The scalar half of a video: what it is, how it was filmed, and its beat grid.

    Nothing here touches the delivery columns (provider_uid, hls_playback_id,
    mp4_url, poster_url, status) — those are written by the upload flow and the
    encoding webhook, never by hand, so that a row can never claim to be
    playable when no footage exists. */
export async function setVideoFields(
  id: string,
  fields: {
    step?: string;
    angle?: string;
    mirror_default?: boolean;
    bpm?: number | null;
    first_beat_ms?: number | null;
    beats_per_phrase?: number;
    default_loop_start_ms?: number | null;
    default_loop_end_ms?: number | null;
  },
): Promise<Result> {
  await requireAdmin();

  if (fields.step && !METHOD_STEPS.includes(fields.step as MethodStep)) {
    return fail('Unknown step.');
  }
  if (fields.angle && !['front', 'back', 'detail'].includes(fields.angle)) {
    return fail('Unknown camera angle.');
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

  revalidatePath('/admin', 'layout');
  return ok;
}

/* ------------------------------------------------- areas and programs ---- */

/* A slug is a stable identifier, so it is derived once from the English title
   and then left alone unless someone changes it deliberately. Renaming a
   program should not silently change its URL. */
const slugify = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

/** A slug nothing else is using. Suffixes -2, -3 … rather than failing. */
async function freeSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: 'areas' | 'programs',
  base: string,
): Promise<string> {
  const root = slugify(base) || table.slice(0, -1);
  const { data } = await supabase.from(table).select('slug').like('slug', `${root}%`);
  const taken = new Set((data ?? []).map(r => (r as { slug: string }).slug));
  if (!taken.has(root)) return root;
  for (let n = 2; n < 500; n++) if (!taken.has(`${root}-${n}`)) return `${root}-${n}`;
  return `${root}-${Date.now()}`;
}

export async function createArea(name: string): Promise<Result> {
  await requireAdmin();
  const en = name.trim();
  if (!en) return fail('An area needs a name.');

  const supabase = await createClient();
  const { data: last } = await supabase
    .from('areas').select('position').order('position', { ascending: false }).limit(1).maybeSingle();

  const { error } = await supabase.from('areas').insert({
    slug: await freeSlug(supabase, 'areas', en),
    position: (last?.position ?? 0) + 1,
    name_t: { en },
    blurb_t: { en: '' },
  });
  if (error) return fail(error.message);

  revalidatePath('/admin', 'layout');
  return ok;
}

export async function createProgram(areaId: string, title: string): Promise<Result> {
  await requireAdmin();
  const en = title.trim();
  if (!en) return fail('A program needs a title.');

  const supabase = await createClient();
  const { data: last } = await supabase
    .from('programs').select('position').eq('area_id', areaId)
    .order('position', { ascending: false }).limit(1).maybeSingle();

  const { error } = await supabase.from('programs').insert({
    area_id: areaId,
    slug: await freeSlug(supabase, 'programs', en),
    position: (last?.position ?? 0) + 1,
    title_t: { en },
    subtitle_t: { en: '' },
    promise_t: { en: '' },
    level: 'all',
    status: 'draft',
  });
  if (error) return fail(error.message);

  revalidatePath('/admin', 'layout');
  return ok;
}

/** The scalar half of a program. Copy goes through setLocalized. */
export async function setProgramFields(
  id: string,
  fields: { slug?: string; level?: string; weeks?: number | null; is_free?: boolean },
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
  if (fields.weeks !== undefined) {
    if (fields.weeks !== null && (!Number.isInteger(fields.weeks) || fields.weeks < 1)) {
      return fail('Weeks must be a whole number of at least 1.');
    }
    patch.weeks = fields.weeks;
  }
  if (fields.is_free !== undefined) patch.is_free = fields.is_free;

  const supabase = await createClient();
  const { error } = await supabase.from('programs').update(patch).eq('id', id);
  if (error) {
    return fail(
      error.code === '23505' ? 'Another program already uses that slug.' : error.message,
    );
  }

  revalidatePath('/admin', 'layout');
  return ok;
}

export async function setAreaSlug(id: string, slug: string): Promise<Result> {
  await requireAdmin();
  const clean = slugify(slug);
  if (!clean) return fail('A slug cannot be empty.');

  const supabase = await createClient();
  const { error } = await supabase.from('areas').update({ slug: clean }).eq('id', id);
  if (error) {
    return fail(error.code === '23505' ? 'Another area already uses that slug.' : error.message);
  }

  revalidatePath('/admin', 'layout');
  return ok;
}

/* -------------------------------------------------------------- delete ---- */

/* An area refuses to go while it still holds programs — programs.area_id is
   ON DELETE RESTRICT, precisely so a whole branch of the catalogue cannot
   disappear behind one click. Move or delete the programs first. */
export async function deleteArea(id: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from('areas').delete().eq('id', id);
  if (error) {
    return fail(
      error.code === '23503'
        ? 'This area still has programs in it. Move or delete those first.'
        : error.message,
    );
  }

  revalidatePath('/admin', 'layout');
  return ok;
}

/* A program takes its sessions and their videos with it — sessions.program_id
   and videos.session_id both cascade. The caller shows what is about to go. */
export async function deleteProgram(id: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) return fail(error.message);

  revalidatePath('/admin', 'layout');
  return ok;
}

export async function deleteSession(id: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) return fail(error.message);

  revalidatePath('/admin', 'layout');
  return ok;
}
