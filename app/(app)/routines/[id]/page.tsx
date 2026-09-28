import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Player from '@/components/Player';
import { getRoutine } from '@/lib/menus';
import { routinePlaylist } from '@/lib/playlist';
import { getMember } from '@/lib/member';
import { signedPosters } from '@/lib/playback';
import { isConfigured } from '@/lib/supabase/config';
import { t } from '@/lib/i18n';
import { getPlayback } from '../../actions';
import '@/components/player.css';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const routine = await getRoutine((await params).id);
  if (!routine) notFound();
  return { title: t(routine.title, 'en'), robots: { index: false } };
}

/* A curated routine, played as it is: a quick drill from Today, or a preview
   from the back office. Exercises this viewer may not see are left out, and
   a draft routine is a 404 for anyone but an admin, because RLS returns
   nothing. */
export default async function RoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const routine = await getRoutine(id);
  if (!routine) notFound();

  const playlist = routinePlaylist(routine, { href: '/today', label: { en: 'Today', ko: '오늘' } }, `/routines/${id}`);
  const firstIndex = playlist.entries.findIndex(e => e.video.status === 'ready');
  const first = firstIndex >= 0 ? playlist.entries[firstIndex].video : null;
  const [initialPlayback, posters, member] = await Promise.all([
    first ? getPlayback(first.id) : null,
    signedPosters([...new Set(playlist.entries.map(e => e.video.id))]),
    getMember(),
  ]);

  return (
    <Player
      playlist={playlist}
      initialIndex={first ? firstIndex : null}
      initialPlayback={initialPlayback}
      posters={posters}
      signedIn={!isConfigured || Boolean(member)}
    />
  );
}
