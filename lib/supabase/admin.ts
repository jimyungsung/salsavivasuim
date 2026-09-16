import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from './server';
import { isConfigured } from './config';

/* The back office gate.

   This is a convenience, not the security boundary. Every write the admin
   screens make still goes through RLS as the signed-in user, and the
   "admins write ..." policies are what actually stop a member editing the
   catalogue — so a bug here leaks a layout, not data. Keep it that way: never
   reach for the secret key to make an admin screen work. If a write is refused,
   the policy is the thing to fix.

   `profiles.role` is deliberately not self-updatable, so the first admin is made
   by hand:

     update public.profiles set role = 'admin' where id = '<uuid>'; */

export type AdminGate =
  | { ok: true; userId: string; email: string | null }
  | { ok: false; reason: 'unconfigured' | 'signed-out' | 'not-admin' };

/** Checks the caller without redirecting, so a screen can explain itself. */
export async function adminGate(): Promise<AdminGate> {
  if (!isConfigured) return { ok: false, reason: 'unconfigured' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false, reason: 'signed-out' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') return { ok: false, reason: 'not-admin' };
  return { ok: true, userId: data.user.id, email: data.user.email ?? null };
}

/** For server actions, where there is no page to render an explanation on. */
export async function requireAdmin(): Promise<{ userId: string }> {
  const gate = await adminGate();
  if (!gate.ok) redirect('/admin');
  return { userId: gate.userId };
}
