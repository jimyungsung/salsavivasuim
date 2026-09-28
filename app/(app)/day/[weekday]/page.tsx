import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMember } from '@/lib/member';
import { DAY_NAMES, todayWeekday } from '@/lib/i18n';
import DayPage from '../DayPage';

const dayOf = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : null;
};

export async function generateMetadata({ params }: { params: Promise<{ weekday: string }> }): Promise<Metadata> {
  const day = dayOf((await params).weekday);
  if (day == null) notFound();
  return { title: DAY_NAMES[day].en, robots: { index: false } };
}

/* Any day of the week, played straight through. */
export default async function WeekdayPage({ params }: { params: Promise<{ weekday: string }> }) {
  const day = dayOf((await params).weekday);
  if (day == null) notFound();
  const member = await getMember();
  return <DayPage weekday={day} isToday={day === todayWeekday()} member={member} />;
}
