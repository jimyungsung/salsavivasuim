'use server';

/* My drills: the member's own writes.

   Every one runs as the signed-in member through the ordinary client, so the
   "own drills", "own drill items" and "own drill slots" policies are what
   authorise them — including the rule that only a drillable video the member
   may watch can go in a drill. Nothing here checks that itself.

   Errors are returned, not thrown, so the page can say why. */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type Result = { ok: true } | { ok: false; error: string };
const ok: Result = { ok: true };
const fail = (error: string): Result => ({ ok: false, error });

const MAX_ITEMS = 40;

async function whoami() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

const cleanName = (name: string) => name.trim().slice(0, 80);
const cleanIds = (ids: string[]) =>
  ids.filter(id => /^[0-9a-f-]{36}$/i.test(id)).slice(0, MAX_ITEMS);

/** Makes a drill from a name and its videos in order. The same video may
    appear more than once; each appearance is its own item. */
export async function createDrill(name: string, videoIds: string[]): Promise<Result> {
  const { supabase, userId } = await whoami();
  if (!userId) return fail('Sign in to make a drill.');
  const ids = cleanIds(videoIds);
  const label = cleanName(name);
  if (!label) return fail('Give the drill a name.');
  if (ids.length === 0) return fail('Add at least one video.');

  const { data: drill, error } = await supabase
    .from('drills')
    .insert({ user_id: userId, name: label })
    .select('id')
    .single();
  if (error || !drill) return fail(error?.message ?? 'Could not save the drill.');

  const { error: itemsError } = await supabase.from('drill_items').insert(
    ids.map((video_id, i) => ({ drill_id: drill.id, video_id, position: i + 1 })),
  );
  if (itemsError) {
    /* No transactions over REST: undo the header rather than leave an empty
       drill behind. A refused item is almost always one the policy blocked. */
    await supabase.from('drills').delete().eq('id', drill.id);
    return fail(
      itemsError.code === '42501'
        ? 'One of those videos cannot go in a drill.'
        : itemsError.message,
    );
  }

  revalidatePath('/drills');
  return ok;
}

/** Replaces a drill's name and videos wholesale — simpler than diffing, and a
    drill is short. */
export async function updateDrill(drillId: string, name: string, videoIds: string[]): Promise<Result> {
  const { supabase, userId } = await whoami();
  if (!userId) return fail('Sign in first.');
  const ids = cleanIds(videoIds);
  const label = cleanName(name);
  if (!label) return fail('Give the drill a name.');
  if (ids.length === 0) return fail('A drill needs at least one video.');

  const { error } = await supabase.from('drills').update({ name: label }).eq('id', drillId);
  if (error) return fail(error.message);

  const { error: clearError } = await supabase.from('drill_items').delete().eq('drill_id', drillId);
  if (clearError) return fail(clearError.message);

  const { error: itemsError } = await supabase.from('drill_items').insert(
    ids.map((video_id, i) => ({ drill_id: drillId, video_id, position: i + 1 })),
  );
  if (itemsError) return fail(itemsError.message);

  revalidatePath('/drills');
  return ok;
}

export async function deleteDrill(drillId: string): Promise<Result> {
  const { supabase, userId } = await whoami();
  if (!userId) return fail('Sign in first.');
  const { error } = await supabase.from('drills').delete().eq('id', drillId);
  if (error) return fail(error.message);
  revalidatePath('/drills');
  return ok;
}

/** Puts a drill on a day. Doing it twice makes two runs. */
export async function addSlot(drillId: string, weekday: number): Promise<Result> {
  const { supabase, userId } = await whoami();
  if (!userId) return fail('Sign in first.');
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return fail('Not a day of the week.');
  const { error } = await supabase
    .from('drill_slots')
    .insert({ user_id: userId, drill_id: drillId, weekday });
  if (error) return fail(error.message);
  revalidatePath('/drills');
  return ok;
}

export async function removeSlot(slotId: string): Promise<Result> {
  const { supabase, userId } = await whoami();
  if (!userId) return fail('Sign in first.');
  const { error } = await supabase.from('drill_slots').delete().eq('id', slotId);
  if (error) return fail(error.message);
  revalidatePath('/drills');
  return ok;
}
