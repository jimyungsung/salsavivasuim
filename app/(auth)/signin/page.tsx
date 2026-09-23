import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthPanel from '../AuthPanel';
import { isConfigured } from '@/lib/supabase/config';
import { safeNext } from '@/lib/safe-next';
import '../auth.css';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'We send a link to your email. No password to remember.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: nextParam, error } = await searchParams;
  const next = safeNext(nextParam);
  if (isConfigured) {
    const { getUser } = await import('@/lib/supabase/server');
    if (await getUser()) redirect(next);
  }
  /* `error` is what /auth/callback sends back when a link has expired or was
     already used — without showing it, a failed sign-in is a blank form. */
  return <AuthPanel mode="signin" next={next} linkError={error?.slice(0, 200)} />;
}
