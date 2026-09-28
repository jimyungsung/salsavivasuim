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

interface RoutineForCopy {
  id: string;
  weekday: number | null;
  title_t: { en: string; ko?: string | null };
  routine_items:
    | { video_id: string; position: number; loop_start_ms: number | null; loop_end_ms: number | null; speed: number | null; repeats: number }[]
    | null;
}

type Client = Awaited<ReturnType<typeof createClient>>;

/** Makes a day out of a routine: one drill, its items copied, one slot. The
    routine's own exercises are what the member's RLS lets them see, so a
    routine holding a draft exercise copies without it. */
async function copyRoutine(supabase: Client, userId: string, routine: RoutineForCopy, weekday: number): Promise<Result> {
  const { data: drill, error } = await supabase
    .from('drills')
    .insert({ user_id: userId, name: routine.title_t.en, routine_id: routine.id })
    .select('id')
    .single();
  if (error || !drill) return fail(error?.message ?? 'Could not copy the routine.');

  const items = [...(routine.routine_items ?? [])].sort((a, b) => a.position - b.position);
  if (items.length) {
    const { error: itemsError } = await supabase.from('drill_items').insert(
      items.map((i, k) => ({
        drill_id: drill.id,
        video_id: i.video_id,
        position: k + 1,
        loop_start_ms: i.loop_start_ms,
        loop_end_ms: i.loop_end_ms,
        speed: i.speed,
        repeats: i.repeats,
      })),
    );
    if (itemsError) {
      await supabase.from('drills').delete().eq('id', drill.id);
      return fail(itemsError.message);
    }
  }
  const { error: slotError } = await supabase
    .from('drill_slots')
    .insert({ user_id: userId, drill_id: drill.id, weekday });
  if (slotError) return fail(slotError.message);
  return ok;
}

/** Replaces the whole week with a menu's routines, one per weekday, and
    remembers the menu on the profile. What was there goes: a menu is a fresh
    start, and "Reset to menu" is how you get it back. */
export async function useMenu(menuId: string): Promise<Result> {
  const { supabase, userId } = await whoami();
  if (!userId) return fail('Sign in to plan your week.');
  if (!UUID.test(menuId)) return fail('Not a menu.');

  const { data: routines, error } = await supabase
    .from('routines')
    .select('id, weekday, title_t, routine_items ( video_id, position, loop_start_ms, loop_end_ms, speed, repeats )')
    .eq('menu_id', menuId)
    .not('weekday', 'is', null);
  if (error) return fail(error.message);

  const { error: clearError } = await supabase.from('drills').delete().eq('user_id', userId);
  if (clearError) return fail(clearError.message);

  for (const routine of (routines ?? []) as unknown as RoutineForCopy[]) {
    if (routine.weekday == null) continue;
    const result = await copyRoutine(supabase, userId, routine, routine.weekday);
    if (!result.ok) return result;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ menu_id: menuId, menu_started_on: new Date().toISOString().slice(0, 10) })
    .eq('id', userId);
  if (profileError) return fail(profileError.message);

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
    .select('id, weekday, title_t, routine_items ( video_id, position, loop_start_ms, loop_end_ms, speed, repeats )')
    .eq('id', routineId)
    .maybeSingle();
  if (error || !routine) return fail(error?.message ?? 'That routine is no longer available.');

  const { error: delError } = await supabase.from('drills').delete().eq('id', (slot as { drill_id: string }).drill_id);
  if (delError) return fail(delError.message);

  const result = await copyRoutine(supabase, userId, routine as unknown as RoutineForCopy, weekday);
  if (!result.ok) return result;
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
