import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Player from '@/components/Player';
import { getDrill, drillPlaylist } from '@/lib/drills';
import { getMember } from '@/lib/member';
import { signedPosters } from '@/lib/playback';
import { getPlayback } from '@/app/(app)/sessions/actions';
import '@/components/player.css';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const drill = await getDrill((await params).id);
  if (!drill) notFound();
  return { title: drill.name, robots: { index: false } };
}

/* A drill, played. The same player as a session; only the playlist differs.
   A drill is the member's own, so a signed-out visitor never finds one: RLS
   returns nothing and this is a 404 rather than a sign-in prompt. */
export default async function DrillPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const drill = await getDrill((await params).id);
  if (!drill) notFound();

  const playlist = drillPlaylist(drill);
  const firstIndex = playlist.entries.findIndex(e => e.video.status === 'ready');
  const first = firstIndex >= 0 ? playlist.entries[firstIndex].video : null;
  const [initialPlayback, posters, member] = await Promise.all([
    first ? getPlayback(first.id) : null,
    signedPosters([...new Set(playlist.entries.map(e => e.video.id))]),
    getMember(),
  ]);

  return (
    <>
      <Player
        playlist={playlist}
        initialIndex={first ? firstIndex : null}
        initialPlayback={initialPlayback}
        posters={posters}
        signedIn={Boolean(member)}
      />
    </>
  );
}
