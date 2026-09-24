import type { Metadata } from 'next';
import AppNav from '@/components/AppNav';
import { getDrillLibrary, getDrills } from '@/lib/drills';
import { getMember } from '@/lib/member';
import { signedPosters } from '@/lib/playback';
import DrillsView from './DrillsView';
import './drills.css';

export const metadata: Metadata = {
  title: 'My drills',
  description: 'Build your own drill from the videos you train, then place it in your week.',
  robots: { index: false },
};

/* My drills: the member's own practice. Everything on this page is theirs —
   RLS returns nothing for anyone else — so signed out it is an invitation. */
export default async function DrillsPage() {
  const member = await getMember();
  const [drills, library] = member ? await Promise.all([getDrills(), getDrillLibrary()]) : [[], []];

  const videoIds = new Set<string>(library.map(v => v.id));
  for (const d of drills) for (const i of d.items) if (i.video) videoIds.add(i.video.id);
  const posters = await signedPosters([...videoIds]);

  return (
    <>
      <AppNav current="drills" />
      <DrillsView drills={drills} library={library} posters={posters} signedIn={Boolean(member)} />
    </>
  );
}
