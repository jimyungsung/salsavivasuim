import type { Metadata } from 'next';
import { getMember } from '@/lib/member';
import { getClock } from '@/lib/clock';
import DayPage from '../day/DayPage';

export const metadata: Metadata = {
  title: 'Today',
  description: 'Your routine for today.',
  robots: { index: false },
};

/* Home: today's routine in the player, with the week above it and the quick
   drills under it. The same screen as /day/[weekday], for today. */
export default async function TodayPage() {
  const [member, clock] = await Promise.all([getMember(), getClock()]);
  return <DayPage weekday={clock.weekday} isToday member={member} />;
}
