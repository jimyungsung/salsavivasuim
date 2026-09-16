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
import { METHOD_STEPS, PUBLISH_STATUSES, type MethodStep, type PublishStatus } from '@/lib/db';

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
   list. The unique constraints on (area_id, position) and (program_id, position)
   are deferrable, so both rows can move inside one transaction without the
   halfway state tripping them — which is exactly why they were written that way.

   Supabase's REST client cannot open a transaction, so the swap goes through a
   database function instead. See the swap_position migration. */
export async function movePosition(
  table: 'programs' | 'sessions' | 'videos',
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
