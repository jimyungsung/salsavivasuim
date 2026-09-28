import type { Metadata } from 'next';
import { getMember } from '@/lib/member';
import { todayWeekday } from '@/lib/i18n';
import DayPage from '../day/DayPage';

export const metadata: Metadata = {
  title: 'Today',
  description: 'Your routine for today.',
  robots: { index: false },
};

/* Home: today's routine in the player, with the week above it and the quick
   drills under it. The same screen as /day/[weekday], for today. */
export default async function TodayPage() {
  const member = await getMember();
  return <DayPage weekday={todayWeekday()} isToday member={member} />;
}
