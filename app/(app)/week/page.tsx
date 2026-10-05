import type { Metadata } from 'next';
import { getLibrary, getMenus, QUICK_MENU_SLUG } from '@/lib/menus';
import { getCurrentMenu, getWeek } from '@/lib/week';
import { getMember } from '@/lib/member';
import { signedPosters } from '@/lib/playback';
import { getClock } from '@/lib/clock';
import WeekView from './WeekView';
import './week.css';

export const metadata: Metadata = {
  title: 'My week',
  description: 'Pick this week’s menu, then make it yours.',
  robots: { index: false },
};

/* The week planner: the menus on top, then the library and the seven days.
   Everything below the menus is the member's own — RLS returns nothing for
   anyone else — so signed out it is an invitation. */
export default async function WeekPage() {
  const member = await getMember();
  const [menus, week, current, library] = member
    ? await Promise.all([getMenus(), getWeek(), getCurrentMenu(), getLibrary()])
    : [await getMenus(), { days: Array(7).fill(null) }, null, []];

  const videoIds = new Set<string>(library.map(v => v.id));
  for (const d of week.days) for (const i of d?.items ?? []) if (i.video) videoIds.add(i.video.id);
  const posters = await signedPosters([...videoIds]);

  return (
    <WeekView
      menus={menus.filter(m => m.slug !== QUICK_MENU_SLUG)}
      week={week}
      currentMenuId={current?.menuId ?? null}
      library={library}
      posters={posters}
      signedIn={Boolean(member)}
      today={(await getClock()).weekday}
    />
  );
}
