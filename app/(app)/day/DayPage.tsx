import Player from '@/components/Player';
import { getMenus, QUICK_MENU_SLUG } from '@/lib/menus';
import { dayPlaylist, getCurrentMenu, getWeek } from '@/lib/week';
import { signedPosters } from '@/lib/playback';
import { isConfigured } from '@/lib/supabase/config';
import type { Member } from '@/lib/member';
import { getPlayback } from '../actions';
import DayHead, { QuickDrills } from './DayView';
import '@/components/player.css';
import './day.css';

/* One day of the member's week: the greeting and the week strip over the
   player, the quick drills under it. Shared by /today and /day/[weekday].

   Signed out, the player shows its sign-in invitation; the head still draws,
   so the page says what it is. */
export default async function DayPage({
  weekday,
  isToday,
  member,
}: {
  weekday: number;
  isToday: boolean;
  member: Member | null;
}) {
  const [week, current, menus] = member
    ? await Promise.all([getWeek(), getCurrentMenu(), getMenus()])
    : [{ days: Array(7).fill(null) }, null, await getMenus()];
  const day = week.days[weekday];
  const menu = menus.find(m => m.id === current?.menuId) ?? null;
  const quick = menus.find(m => m.slug === QUICK_MENU_SLUG) ?? null;

  const playlist = dayPlaylist(weekday, day, isToday);
  const firstIndex = playlist.entries.findIndex(e => e.video.status === 'ready');
  const first = firstIndex >= 0 ? playlist.entries[firstIndex].video : null;
  const quickIds = quick?.routines.flatMap(r => r.items.map(i => i.video?.id)).filter((id): id is string => Boolean(id)) ?? [];
  const [initialPlayback, posters] = await Promise.all([
    first ? getPlayback(first.id) : null,
    signedPosters([...new Set([...playlist.entries.map(e => e.video.id), ...quickIds])]),
  ]);
  const signedIn = !isConfigured || Boolean(member);

  const head = (
    <DayHead
      weekday={weekday}
      isToday={isToday}
      name={member?.name ?? null}
      week={week.days.map(d => ({ planned: Boolean(d && d.items.length), done: Boolean(d?.doneAt) }))}
      menu={menu ? { title: menu.title, week: menu.position, stage: menu.stage ? { name: menu.stage.name, weeks: menus.filter(m => m.stage?.id === menu.stage!.id).length } : null } : null}
      minutes={Math.round(playlist.entries.reduce((n, e) => n + (e.video.durationMs ?? 0) * e.repeats, 0) / 60000)}
      empty={playlist.entries.length === 0}
      signedIn={signedIn}
    />
  );
  const quickRow = quick && quick.routines.length > 0 ? <QuickDrills menu={quick} posters={posters} /> : null;

  return (
    <Player
      playlist={playlist}
      initialIndex={first ? firstIndex : null}
      initialPlayback={initialPlayback}
      posters={posters}
      signedIn={signedIn}
      above={head}
      below={quickRow}
    />
  );
}
