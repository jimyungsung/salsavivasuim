import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthPanel from '../AuthPanel';
import { isConfigured } from '@/lib/supabase/config';
import { safeNext } from '@/lib/safe-next';
import '../auth.css';

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Three questions about your dancing, then your first session is ready.',
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  if (isConfigured) {
    const { getUser } = await import('@/lib/supabase/server');
    if (await getUser()) redirect(next);
  }
  return <AuthPanel mode="register" next={next} />;
}
