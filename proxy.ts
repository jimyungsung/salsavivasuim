import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/* Next 16's name for what was middleware.ts: runs before every matched
   request, here only to keep the Supabase session fresh. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /* Everything except Next's own assets, image files, and the static
       prototype under /prototype — none of which carry a session. */
    '/((?!_next/static|_next/image|prototype|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
