import { redirect } from 'next/navigation';

/* The landing page has not been ported yet. It is one self-contained file —
   inline CSS, inline JS, photos as base64 — so it can be shared on its own, and
   that property is worth keeping; it moves into app/ last, not first.
   Until then / hands off to it, and the whole prototype flow still runs from
   its own base path so its relative links keep resolving. */
export default function Home() {
  redirect('/prototype/index.html');
}
