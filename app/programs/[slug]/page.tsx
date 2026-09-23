import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AppNav from '@/components/AppNav';
import { getProgram } from '@/lib/catalogue';
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
  if (!program) return {};
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

  return (
    <>
      <AppNav current="masterplan" />
      <ProgramView program={program} />
    </>
  );
}
