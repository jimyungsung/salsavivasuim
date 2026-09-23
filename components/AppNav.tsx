/* The navigation every app screen renders. The server half: it knows who is
   signed in and whether they are an admin, which the client bar cannot ask for
   itself. The bar is AppNavBar. */

import { getMember } from '@/lib/member';
import AppNavBar, { type NavSection } from './AppNavBar';

export type { NavSection };

export default async function AppNav({ current }: { current?: NavSection }) {
  return <AppNavBar current={current} member={await getMember()} />;
}
