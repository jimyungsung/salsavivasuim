import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './config';

/* The service-role client. Bypasses row-level security entirely.

   There are exactly two legitimate callers:
   - the Cloudflare encoding webhook, which arrives from Cloudflare with no user
     session and therefore cannot write videos.status through RLS as anybody;
   - deleting your own account (app/api/account/delete), because removing an
     auth user is an admin API. It is reached only after the member's own
     session has identified them, and it deletes only that one user.

   Anything with a signed-in user must use lib/supabase/server.ts instead, so
   that RLS still decides what it can touch. If you are reaching for this file
   to make an admin screen work, the policy is the thing to fix. */

export function createServiceClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error(
      'SUPABASE_SECRET_KEY is not set. The encoding webhook cannot write without it.',
    );
  }
  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const hasServiceKey = (): boolean => Boolean(process.env.SUPABASE_SECRET_KEY);
