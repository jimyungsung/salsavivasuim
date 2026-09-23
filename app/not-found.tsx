import type { Metadata } from 'next';
import NotFoundView from './NotFoundView';
import './not-found.css';

/* Every unknown path, and every notFound() — a module slug that does not exist,
   a session id RLS will not show. Ported from the prototype's 404.html, which
   nothing served: without this, a wrong link was Next's bare default page with
   no way back. */

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false },
};

export default function NotFound() {
  return <NotFoundView />;
}
