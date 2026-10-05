import Player from '@/components/Player';
import { getMenus, QUICK_MENU_SLUG, startingMenu } from '@/lib/menus';
import { routineLengthMs } from '@/lib/playlist';
import { dayPlaylist, getCurrentMenu, getWeek } from '@/lib/week';
import { signedPosters } from '@/lib/playback';
import { isConfigured } from '@/lib/supabase/config';
import { getClock } from '@/lib/clock';
import type { Member } from '@/lib/member';
import { getPlayback } from '../actions';
import DayHead, { QuickDrills } from './DayView';
import { DoneToggle, FinishCard, FirstWeekCard, JoinCard } from './DayCards';
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
  const [[week, current, menus], clock] = await Promise.all([
    member
      ? Promise.all([getWeek(), getCurrentMenu(), getMenus()])
      : Promise.all([{ days: Array(7).fill(null) }, null, getMenus()] as const),
    getClock(),
  ]);
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

  /* "Week 2 of 8": where this menu sits among its stage's menus that members
     can see. Counting drafts, or taking the raw position, gave "week 5 of 3". */
  const stageMenus = menu?.stage
    ? menus.filter(m => m.stage?.id === menu.stage!.id && m.status !== 'draft').sort((a, b) => a.position - b.position)
    : [];
  const weekNo = menu ? stageMenus.findIndex(m => m.id === menu.id) + 1 : 0;

  const planned = Boolean(day && day.items.length);
  const hasWeek = week.days.some(d => d);
  const start = startingMenu(menus);
  const startDays = start ? start.routines.filter(r => r.weekday != null) : [];
  const nextPath = isToday ? '/today' : `/day/${weekday}`;

  /* What stands in for the player when there is nothing to play. */
  const empty =
    isConfigured && !member ? (
      <JoinCard next={nextPath} />
    ) : member && !hasWeek && !current ? (
      <FirstWeekCard
        menu={
          start
            ? {
                id: start.id,
                title: start.title,
                promise: start.promise,
                days: startDays.length,
                minutes: startDays.length
                  ? Math.round(startDays.reduce((n, r) => n + routineLengthMs(r), 0) / startDays.length / 60000)
                  : 0,
              }
            : null
        }
      />
    ) : playlist.entries.length === 0 ? (
      /* A rest day: the head already says so; the quick drills follow. */
      <></>
    ) : undefined;

  const head = (
    <DayHead
      weekday={weekday}
      isToday={isToday}
      name={member?.greetName ?? null}
      week={week.days.map(d => ({ planned: Boolean(d && d.items.length), done: Boolean(d?.doneAt) }))}
      menu={menu ? { title: menu.title, week: weekNo, stage: menu.stage && weekNo > 0 ? { name: menu.stage.name, weeks: stageMenus.length } : null } : null}
      minutes={Math.round(playlist.entries.reduce((n, e) => n + (e.video.durationMs ?? 0) * e.repeats, 0) / 60000)}
      empty={playlist.entries.length === 0}
      signedIn={signedIn}
      hour={clock.hour}
      done={member && day && planned ? <DoneToggle slotId={day.slotId} done={Boolean(day.doneAt)} /> : null}
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
      empty={empty}
      finish={member && day && planned ? <FinishCard slotId={day.slotId} done={Boolean(day.doneAt)} /> : undefined}
    />
  );
}
