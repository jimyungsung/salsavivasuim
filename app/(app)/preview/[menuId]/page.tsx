import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Player from '@/components/Player';
import { getMenus } from '@/lib/menus';
import { routinePlaylist } from '@/lib/playlist';
import { getMember } from '@/lib/member';
import { signedPosters } from '@/lib/playback';
import { DAY_NAMES } from '@/lib/i18n';
import { getPlayback } from '../../actions';
import '@/components/player.css';
import './preview.css';

export const metadata: Metadata = { title: 'Preview', robots: { index: false } };

/* The week being built, played the way a member will play it — drafts
   included, because an admin may see them. "Preview in the planner" used to
   open the admin's own planner, which showed their own old test week rather
   than this one.

   Admins only: anyone else gets a 404. The player here does not log practice:
   checking a week is not practising it. */
export default async function PreviewWeek({
  params,
  searchParams,
}: {
  params: Promise<{ menuId: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const [{ menuId }, { day }, member] = await Promise.all([params, searchParams, getMember()]);
  if (!member?.isAdmin) notFound();
  const menu = (await getMenus()).find(m => m.id === menuId);
  if (!menu) notFound();

  const days = menu.routines.filter(r => r.weekday != null).sort((a, b) => a.weekday! - b.weekday!);
  const chosen = days.find(r => String(r.weekday) === day) ?? days[0] ?? null;
  const back = { href: `/admin/menus/${menu.id}`, label: { en: 'Back to the week builder', ko: '주간 편집으로' } };

  const strip = (
    <section className="pv">
      <div className="wrap">
        <p className="pvk">Preview · {menu.status === 'open' ? 'live' : menu.status} · admin view, drafts included</p>
        <h1>{menu.title.en}</h1>
        <nav className="pvdays" aria-label="Days">
          {days.map(r => (
            <Link
              key={r.id}
              href={`/preview/${menu.id}?day=${r.weekday}`}
              aria-current={r.id === chosen?.id ? 'page' : undefined}
            >
              <b>{DAY_NAMES[r.weekday!].en.slice(0, 3)}</b>
              <span>{r.title.en}</span>
              <i>{r.items.filter(i => i.video).length} ex</i>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );

  if (!chosen) {
    return (
      <div className="sp">
        {strip}
        <p className="wrap pvnone">This week has no days yet. <Link href={back.href}>Back to the week builder</Link></p>
      </div>
    );
  }

  const playlist = { ...routinePlaylist(chosen, back, `/preview/${menu.id}?day=${chosen.weekday}`), kind: 'day' as const };
  const firstIndex = playlist.entries.findIndex(e => e.video.status === 'ready');
  const first = firstIndex >= 0 ? playlist.entries[firstIndex].video : null;
  const [initialPlayback, posters] = await Promise.all([
    first ? getPlayback(first.id) : null,
    signedPosters([...new Set(playlist.entries.map(e => e.video.id))]),
  ]);

  return (
    <Player
      key={chosen.id}
      playlist={playlist}
      initialIndex={first ? firstIndex : null}
      initialPlayback={initialPlayback}
      posters={posters}
      signedIn
      logPractice={false}
      above={strip}
    />
  );
}
