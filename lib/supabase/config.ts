/* Whether Supabase is wired up yet.

   The project does not exist while Phase 1 is being built, so every screen that
   talks to it has to render sensibly without it rather than crash. `isConfigured`
   is that check: the auth screens show what they would do and say plainly that
   they cannot do it yet, and the moment .env.local is filled in they work.

   Delete this once the project is up and the env vars are a deployment
   requirement rather than an optional extra. */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export function requireConfig() {
  if (!isConfigured) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env.local and fill in ' +
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY };
}
