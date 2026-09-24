import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/catalogue';
import { sessionPlaylist } from '@/lib/playlist';
import { isConfigured } from '@/lib/supabase/config';
import { getMember } from '@/lib/member';
import { t } from '@/lib/content';
import { getPlayback } from '../actions';
import { signedPosters } from '@/lib/playback';
import Player from '@/components/Player';
import '@/components/player.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();
  return { title: t(session.title, 'en') };
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  /* The first playable video's playback is minted here, server-side, so the
     player has something to show on first paint. Switching videos afterwards
     asks getPlayback() again, client-side. */
  const playlist = sessionPlaylist(session);
  const firstIndex = playlist.entries.findIndex(e => e.video.status === 'ready');
  const first = firstIndex >= 0 ? playlist.entries[firstIndex].video : null;
  const [initialPlayback, member, posters] = await Promise.all([
    first ? getPlayback(first.id) : null,
    getMember(),
    signedPosters(session.videos.map(v => v.id)),
  ]);
  const signedIn = !isConfigured || Boolean(member);

  return (
    <>
      <Player
        playlist={playlist}
        initialIndex={first ? firstIndex : null}
        initialPlayback={initialPlayback}
        posters={posters}
        signedIn={signedIn}
      />
    </>
  );
}
