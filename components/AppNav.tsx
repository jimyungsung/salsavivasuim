/* The navigation every app screen renders. The server half: it knows who is
   signed in and whether they are an admin, which the client bar cannot ask for
   itself. The bar is AppNavBar, which works out the current section from the
   path. */

import { getMember } from '@/lib/member';
import AppNavBar from './AppNavBar';

export default async function AppNav() {
  return <AppNavBar member={await getMember()} />;
}
