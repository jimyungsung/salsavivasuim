import type { Metadata } from 'next';
import { getMember } from '@/lib/member';
import LandingView from './LandingView';
import './landing.css';

export const metadata: Metadata = {
  title: 'Everyday Salsa — a routine a day',
  description: 'Fifteen minutes of solo salsa a day, taught by Suim on video. Timing, footwork, turns, styling, in an order that adds up.',
  openGraph: { title: 'Everyday Salsa', description: 'Fifteen minutes a day. Salsa that sticks.' },
};

/* The front door. Static apart from one question: is someone signed in, in
   which case the buttons lead to Today rather than to registration. */
export default async function LandingPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const [member, { deleted }] = await Promise.all([getMember(), searchParams]);
  return <LandingView signedIn={Boolean(member)} deleted={deleted === '1'} />;
}
