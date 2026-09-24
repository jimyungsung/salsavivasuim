import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Player from '@/components/Player';
import { DAY_NAMES, dayPlaylist, getDrills } from '@/lib/drills';
import { getMember } from '@/lib/member';
import { signedPosters } from '@/lib/playback';
import { getPlayback } from '@/app/(app)/sessions/actions';
import '@/components/player.css';

const dayOf = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : null;
};

export async function generateMetadata({ params }: { params: Promise<{ weekday: string }> }): Promise<Metadata> {
  const day = dayOf((await params).weekday);
  if (day == null) notFound();
  return { title: `${DAY_NAMES[day].en} · My drills`, robots: { index: false } };
}

/* A day of the week, played straight through: every drill placed on it, in
   order, one run per slot. */
export default async function DayPlayPage({ params }: { params: Promise<{ weekday: string }> }) {
  const day = dayOf((await params).weekday);
  if (day == null) notFound();

  const [drills, member] = await Promise.all([getDrills(), getMember()]);
  const playlist = dayPlaylist(day, drills);
  const firstIndex = playlist.entries.findIndex(e => e.video.status === 'ready');
  const first = firstIndex >= 0 ? playlist.entries[firstIndex].video : null;
  const [initialPlayback, posters] = await Promise.all([
    first ? getPlayback(first.id) : null,
    signedPosters([...new Set(playlist.entries.map(e => e.video.id))]),
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
