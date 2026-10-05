'use server';

/* The member's week: their own writes.

   A day is a drill row with one slot; its exercises are drill items. Every
   write runs as the signed-in member through the ordinary client, so the
   "own drills", "own drill items" and "own drill slots" policies are what
   authorise them — including the rule that only an exercise the member may
   play can go on a day. Nothing here checks that itself.

   Errors are returned, not thrown, so the page can say why. */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { DAY_NAMES } from '@/lib/i18n';
import { applyMenu, copyRoutine, COPY_FAILED, ROUTINE_FOR_COPY, type RoutineForCopy } from '@/lib/week-copy';

export type Result = { ok: true } | { ok: false; error: string };
const ok: Result = { ok: true };
const fail = (error: string): Result => ({ ok: false, error });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 20;

async function whoami() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

const refresh = () => {
  revalidatePath('/week');
  revalidatePath('/today');
  revalidatePath('/day', 'layout');
};

const isDay = (n: number) => Number.isInteger(n) && n >= 0 && n <= 6;

/** Replaces the whole week with a menu's routines (lib/week-copy.ts). */
export async function useMenu(menuId: string): Promise<Result> {
  const { supabase, userId } = await whoami();
  if (!userId) return fail('Sign in to plan your week.');
  if (!UUID.test(menuId)) return fail('Not a menu.');
  /* Only an open week can be started; a "coming soon" one is shown, not used. */
  const { data: menu } = await supabase.from('menus').select('status').eq('id', menuId).maybeSingle();
  if (menu?.status !== 'open') return fail('This week is not open yet.');
  const result = await applyMenu(supabase, userId, menuId);
  if (!result.ok) return result;
  refresh();
  return ok;
}

/** Puts one day back the way its routine has it. A day that was not copied
    from a routine has nothing to reset to. */
export async function resetDay(weekday: number): Promise<Result> {
  const { supabase, userId } = await whoami();
  if (!userId) return fail('Sign in first.');
  if (!isDay(weekday)) return fail('Not a day of the week.');

  const { data: slot } = await supabase
    .from('drill_slots')
    .select('drill_id, drill:drills ( routine_id )')
    .eq('weekday', weekday)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const routineId = (slot as { drill: { routine_id: string | null } | null } | null)?.drill?.routine_id;
  if (!slot || !routineId) return fail('This day was not copied from a menu, so there is nothing to reset it to.');

  const { data: routine, error } = await supabase
    .from('routines')
    .select(ROUTINE_FOR_COPY)
    .eq('id', routineId)
    .maybeSingle();
  if (error || !routine) return fail(error?.message ?? 'That routine is no longer available.');

  /* The fresh copy first; the old day goes only once it exists. */
  const result = await copyRoutine(supabase, userId, routine as unknown as RoutineForCopy, weekday);
  if (!result.ok) {
    console.error('[week] resetDay copy failed:', result.error);
    return fail(COPY_FAILED);
  }
  const { error: delError } = await supabase.from('drills').delete().eq('id', (slot as { drill_id: string }).drill_id);
  if (delError) console.error('[week] resetDay could not remove the old day:', delError.message);
  refresh();
  return ok;
}

/** Adds an exercise to the end of a day, making the day if it is empty. The
    same exercise may go in twice; each appearance is its own item. */
export async function addToDay(weekday: number, videoId: string): Promise<Result> {
  const { supabase, userId } = await whoami();
  if (!userId) return fail('Sign in first.');
  if (!isDay(weekday)) return fail('Not a day of the week.');
  if (!UUID.test(videoId)) return fail('Not an exercise.');

  const { data: slot } = await supabase
    .from('drill_slots')
    .select('drill_id')
    .eq('weekday', weekday)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  let drillId = (slot as { drill_id: string } | null)?.drill_id ?? null;

  if (!drillId) {
    const { data: drill, error } = await supabase
      .from('drills')
      .insert({ user_id: userId, name: DAY_NAMES[weekday].en })
      .select('id')
      .single();
    if (error || !drill) return fail(error?.message ?? 'Could not make the day.');
    drillId = drill.id as string;
    const { error: slotError } = await supabase
      .from('drill_slots')
      .insert({ user_id: userId, drill_id: drillId, weekday });
    if (slotError) return fail(slotError.message);
  }

  const { data: items } = await supabase.from('drill_items').select('position').eq('drill_id', drillId);
  if ((items?.length ?? 0) >= MAX_ITEMS) return fail(`A day holds up to ${MAX_ITEMS} exercises.`);
  const position = Math.max(0, ...(items ?? []).map(i => (i as { position: number }).position)) + 1;

  const { error } = await supabase.from('drill_items').insert({ drill_id: drillId, video_id: videoId, position });
  if (error) {
    /* A refused item is almost always one the policy blocked. */
    return fail(error.code === '42501' ? 'That exercise cannot go on your week.' : error.message);
  }

  refresh();
  return ok;
}

export async function removeFromDay(itemId: string): Promise<Result> {
  const { supabase, userId } = await whoami();
  if (!userId) return fail('Sign in first.');
  const { error } = await supabase.from('drill_items').delete().eq('id', itemId);
  if (error) return fail(error.message);
  refresh();
  return ok;
}

/** Swaps an item with its neighbour. One upsert of two rows, so the deferred
    unique constraint on (drill_id, position) sees both at once. */
export async function moveInDay(itemId: string, direction: 'up' | 'down'): Promise<Result> {
  const { supabase, userId } = await whoami();
  if (!userId) return fail('Sign in first.');

  const { data: me } = await supabase
    .from('drill_items')
    .select('id, drill_id, video_id, position, repeats, speed, loop_start_ms, loop_end_ms')
    .eq('id', itemId)
    .maybeSingle();
  if (!me) return fail('That exercise is no longer on the day.');
  const row = me as { id: string; drill_id: string; video_id: string; position: number; repeats: number; speed: number | null; loop_start_ms: number | null; loop_end_ms: number | null };

  const { data: other } = await supabase
    .from('drill_items')
    .select('id, drill_id, video_id, position, repeats, speed, loop_start_ms, loop_end_ms')
    .eq('drill_id', row.drill_id)
    [direction === 'up' ? 'lt' : 'gt']('position', row.position)
    .order('position', { ascending: direction === 'down' })
    .limit(1)
    .maybeSingle();
  if (!other) return ok;
  const o = other as typeof row;

  const { error } = await supabase
    .from('drill_items')
    .upsert([{ ...row, position: o.position }, { ...o, position: row.position }], { onConflict: 'id' });
  if (error) return fail(error.message);

  refresh();
  return ok;
}

/** Ticks a day off, or un-ticks it. Until practice events land, this is how
    "Done" is decided. */
export async function setDone(slotId: string, done: boolean): Promise<Result> {
  const { supabase, userId } = await whoami();
  if (!userId) return fail('Sign in first.');
  const { error } = await supabase
    .from('drill_slots')
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq('id', slotId);
  if (error) return fail(error.message);
  refresh();
  return ok;
}

/** Empties a day: the drill goes, its items and slot with it. */
export async function clearDay(weekday: number): Promise<Result> {
  const { supabase, userId } = await whoami();
  if (!userId) return fail('Sign in first.');
  if (!isDay(weekday)) return fail('Not a day of the week.');
  const { data: slots } = await supabase.from('drill_slots').select('drill_id').eq('weekday', weekday);
  const ids = (slots ?? []).map(s => (s as { drill_id: string }).drill_id);
  if (ids.length) {
    const { error } = await supabase.from('drills').delete().in('id', ids);
    if (error) return fail(error.message);
  }
  refresh();
  return ok;
}
