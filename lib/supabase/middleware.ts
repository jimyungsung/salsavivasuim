import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isConfigured, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

/* Refreshes the auth session on every request and writes the rotated cookies
   onto the response. Without this a session expires mid-visit and the member is
   silently signed out. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: cookiesToSet => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  /* Do not put anything between the client above and this call: it is what
     rotates the token, and a slow import in between is a logged-out member.
     getClaims() rather than getUser(): it refreshes an expired session the
     same way, but verifies the token against the project's signing keys
     instead of asking the auth server — one round trip fewer on every page. */
  await supabase.auth.getClaims();

  return response;
}
