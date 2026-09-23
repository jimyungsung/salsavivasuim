import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthPanel from '../AuthPanel';
import { isConfigured } from '@/lib/supabase/config';
import '../auth.css';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'We send a link to your email. No password to remember.',
};

/* A path on this site, never an open redirect. Stricter than /auth/callback,
   which prefixes the origin: a bare "/\evil.com" in a Location header is read
   by browsers as "//evil.com". */
const safePath = (value: string | undefined) =>
  value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '/masterplan';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safePath((await searchParams).next);
  if (isConfigured) {
    const { getUser } = await import('@/lib/supabase/server');
    if (await getUser()) redirect(next);
  }
  return <AuthPanel mode="signin" next={next} />;
}
