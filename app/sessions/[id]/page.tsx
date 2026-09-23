import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AppNav from '@/components/AppNav';
import { getSession } from '@/lib/catalogue';
import { isConfigured } from '@/lib/supabase/config';
import { getUser } from '@/lib/supabase/server';
import { t } from '@/lib/content';
import { getPlayback } from '../actions';
import SessionPlayer from './SessionPlayer';
import './session.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return {};
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
  const first = session.videos.find(v => v.status === 'ready');
  const initialPlayback = first ? await getPlayback(first.id) : null;
  const signedIn = !isConfigured || Boolean(await getUser());

  return (
    <>
      <AppNav current="masterplan" />
      <SessionPlayer
        session={session}
        initialVideoId={first?.id ?? null}
        initialPlayback={initialPlayback}
        signedIn={signedIn}
      />
    </>
  );
}
