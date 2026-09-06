import 'server-only';

/* The server client, for server components, route handlers and server actions.

   Cookies are how the session travels. A server component cannot set them — only
   a route handler or a server action can — so the setAll failure is swallowed:
   the middleware refreshes the session on every request and writes the cookies
   there instead. */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireConfig } from './config';

export async function createClient() {
  const { url, key } = requireConfig();
  const store = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: cookiesToSet => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* Called from a server component. The middleware has already
             refreshed the session, so there is nothing to recover from. */
        }
      },
    },
  });
}

/** The signed-in user, or null. Never trust a cookie for this — it asks the
    auth server, which is the only answer worth acting on. */
export async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}
