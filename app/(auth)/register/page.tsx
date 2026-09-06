import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthPanel from '../AuthPanel';
import { isConfigured } from '@/lib/supabase/config';
import '../auth.css';

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Three questions about your dancing, then your first session is ready.',
};

export default async function RegisterPage() {
  if (isConfigured) {
    const { getUser } = await import('@/lib/supabase/server');
    if (await getUser()) redirect('/masterplan');
  }
  return <AuthPanel mode="register" />;
}
