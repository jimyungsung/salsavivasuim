import 'server-only';
import type { createClient } from './supabase/server';
import { startingMenu } from './menus';

/* Copying a menu into a member's week. Shared by "Use this menu" on the
   planner and by the first sign-in, which starts a new member on their first
   week without asking them to choose. Everything runs as the member through
   their own client, so RLS authorises every write. */

type Client = Awaited<ReturnType<typeof createClient>>;
type Copied = { ok: true; id: string } | { ok: false; error: string };

export interface RoutineForCopy {
  id: string;
  weekday: number | null;
  title_t: { en: string; ko?: string | null };
  routine_items:
    | { video_id: string; position: number; loop_start_ms: number | null; loop_end_ms: number | null; speed: number | null; repeats: number }[]
    | null;
}

export const ROUTINE_FOR_COPY = 'id, weekday, title_t, routine_items ( video_id, position, loop_start_ms, loop_end_ms, speed, repeats )';

/* What a member reads when copying fails. The database's own message goes to
   the log; it means nothing to a dancer. */
export const COPY_FAILED = 'Your week could not be set up just now. Nothing was changed. Please try again.';

/** Makes a day out of a routine: one drill, its items copied, one slot.
    Returns the new drill's id, or leaves nothing behind.

    Only what the member can play is copied. A routine's items are readable
    with the routine, but "own drill items" refuses an exercise can_access()
    does not allow, so one draft or still-encoding exercise used to fail the
    whole day. Reading the exercises first is the same RLS question asked
    without the insert: what comes back is what may go in. */
export async function copyRoutine(
  supabase: Client,
  userId: string,
  routine: RoutineForCopy,
  weekday: number,
): Promise<Copied> {
  const all = [...(routine.routine_items ?? [])].sort((a, b) => a.position - b.position);
  const ids = [...new Set(all.map(i => i.video_id))];
  const { data: playable } = ids.length
    ? await supabase.from('videos').select('id').in('id', ids)
    : { data: [] as { id: string }[] };
  const can = new Set((playable ?? []).map(v => v.id));
  const items = all.filter(i => can.has(i.video_id));

  const { data: drill, error } = await supabase
    .from('drills')
    .insert({ user_id: userId, name: routine.title_t.en, routine_id: routine.id })
    .select('id')
    .single();
  if (error || !drill) return { ok: false, error: error?.message ?? 'Could not copy the routine.' };

  const undo = async (message: string) => {
    await supabase.from('drills').delete().eq('id', drill.id);
    return { ok: false as const, error: message };
  };

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
    if (itemsError) return undo(itemsError.message);
  }
  const { error: slotError } = await supabase
    .from('drill_slots')
    .insert({ user_id: userId, drill_id: drill.id, weekday });
  if (slotError) return undo(slotError.message);
  return { ok: true, id: drill.id };
}

/** Replaces the member's whole week with a menu's routines, one per weekday,
    and remembers the menu on the profile. The new week is built first and the
    old one removed only once it stands, so a failure halfway leaves the week
    as it was, not empty. */
export async function applyMenu(
  supabase: Client,
  userId: string,
  menuId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: routines, error } = await supabase
    .from('routines')
    .select(ROUTINE_FOR_COPY)
    .eq('menu_id', menuId)
    .not('weekday', 'is', null);
  if (error) return { ok: false, error: error.message };

  const { data: before, error: beforeError } = await supabase.from('drills').select('id').eq('user_id', userId);
  if (beforeError) return { ok: false, error: beforeError.message };

  const built: string[] = [];
  for (const routine of (routines ?? []) as unknown as RoutineForCopy[]) {
    if (routine.weekday == null) continue;
    const result = await copyRoutine(supabase, userId, routine, routine.weekday);
    if (!result.ok) {
      console.error('[week] menu copy failed:', result.error);
      if (built.length) await supabase.from('drills').delete().in('id', built);
      return { ok: false, error: COPY_FAILED };
    }
    built.push(result.id);
  }

  const old = (before ?? []).map(d => d.id);
  if (old.length) {
    const { error: clearError } = await supabase.from('drills').delete().in('id', old);
    if (clearError) console.error('[week] could not clear the old week:', clearError.message);
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ menu_id: menuId, menu_started_on: new Date().toISOString().slice(0, 10) })
    .eq('id', userId);
  if (profileError) return { ok: false, error: profileError.message };
  return { ok: true };
}

/** A new member's first week, set up the moment they first sign in, so Today
    has a routine on it instead of asking them to go and choose one. Only for
    someone with no menu and no days yet; a returning member is never touched.
    If no menu is open yet, nothing happens and Today says so. */
export async function startFirstWeek(supabase: Client, userId: string): Promise<void> {
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from('profiles').select('menu_id').eq('id', userId).maybeSingle(),
    supabase.from('drills').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  if (!profile || profile.menu_id || count) return;

  const { data: menus } = await supabase
    .from('menus')
    .select('id, slug, status, position, stage:stages ( position ), routines ( weekday )')
    .eq('status', 'open');
  const first = startingMenu(
    (menus ?? []) as unknown as {
      id: string; slug: string; status: string; position: number;
      stage: { position: number } | null; routines: { weekday: number | null }[];
    }[],
  );
  if (!first) return;
  const result = await applyMenu(supabase, userId, first.id);
  if (!result.ok) console.error('[week] first week not set up:', result.error);
}
