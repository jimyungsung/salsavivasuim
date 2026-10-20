import type { Metadata } from 'next';
import { getMember } from '@/lib/member';
import { isConfigured } from '@/lib/supabase/config';
import AccountView from './AccountView';
import '../legal/legal.css';

export const metadata: Metadata = { title: 'Account', robots: { index: false } };

/* Your account: who you are signed in as, the legal pages, and the way to
   delete everything. */
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const member = await getMember();
  let email: string | null = null;
  if (member && isConfigured) {
    const { createClient } = await import('@/lib/supabase/server');
    const { data } = await (await createClient()).auth.getUser();
    email = data.user?.email ?? null;
  }
  return <AccountView name={member?.name ?? null} email={email} signedIn={Boolean(member)} error={error ?? null} />;
}
