import 'server-only';
import { cache } from 'react';
import { isConfigured } from './supabase/config';
import { createClient } from './supabase/server';

/* Who is looking at the page, for the chrome around it — the nav's name chip
   and whether it offers the back office.

   Not an access check. `isAdmin` decides whether a link is shown; what an admin
   can actually do is decided by the "admins write ..." policies, so a wrong
   answer here shows a link that leads to a refusal, never to data.

   Cached per request: the nav and the page both ask, and it is one auth round
   trip rather than two. */

export interface Member {
  /** First name, for the chip. */
  name: string;
  initials: string;
  isAdmin: boolean;
}

const initialsOf = (words: string[]) =>
  (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0]?.slice(0, 2) ?? '?')
    .toUpperCase();

export const getMember = cache(async (): Promise<Member | null> => {
  if (!isConfigured) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const user = data.user;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const full =
    (profile?.display_name as string | null)?.trim() ||
    meta.full_name?.trim() ||
    meta.name?.trim() ||
    user.email?.split('@')[0] ||
    '';
  const words = full.split(/\s+/).filter(Boolean);

  return {
    name: words[0] ?? full,
    initials: initialsOf(words),
    isAdmin: profile?.role === 'admin',
  };
});
