import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthPanel from '../AuthPanel';
import { isConfigured } from '@/lib/supabase/config';
import '../auth.css';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'We send a link to your email. No password to remember.',
};

export default async function SignInPage() {
  if (isConfigured) {
    const { getUser } = await import('@/lib/supabase/server');
    if (await getUser()) redirect('/masterplan');
  }
  return <AuthPanel mode="signin" />;
}
