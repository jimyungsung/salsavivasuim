import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProgram } from '@/lib/catalogue';
import { isConfigured } from '@/lib/supabase/config';
import { getMember } from '@/lib/member';
import { t } from '@/lib/content';
import ProgramView from './ProgramView';
import './program.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) notFound();
  return {
    title: t(program.title, 'en'),
    description: t(program.promise, 'en'),
  };
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) notFound();

  /* Signed out, RLS returns no videos at all, so every session would read as
     unfilmed. Knowing who is asking lets the page say "sign in" instead. */
  const signedIn = !isConfigured || Boolean(await getMember());

  return (
    <>
      <ProgramView program={program} signedIn={signedIn} />
    </>
  );
}
