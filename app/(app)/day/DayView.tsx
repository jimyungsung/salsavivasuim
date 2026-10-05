'use client';

/* The top of Today: a greeting, where the week stands, and the Mon–Sun strip.
   And the bottom: the quick drills, for a day with five minutes in it. */

import Link from 'next/link';
import { useCopy, useLang } from '@/lib/lang';
import type { Copy } from '@/lib/lang';
import { mmss } from '@/lib/db';
import { DAY_NAMES, DAY_SHORT, TAG_LABELS, type Localized } from '@/lib/i18n';
import type { Menu } from '@/lib/menus';
import { routineLengthMs } from '@/lib/playlist';

type Key =
  | 'morning' | 'afternoon' | 'evening' | 'hello' | 'weekOf' | 'takes' | 'nothing' | 'planWeek'
  | 'restDay' | 'quickT' | 'quickP' | 'aWeek' | 'min';

const C: Copy<Key> = {
  en: {
    morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', hello: 'Hello',
    weekOf: 'Week', takes: 'Today takes', nothing: 'Nothing planned for', planWeek: 'Plan your week →',
    restDay: 'A rest day. Rest is part of the week.', quickT: 'Got 5 minutes?', quickP: 'Short drills for a coffee break.',
    aWeek: 'This week', min: 'min',
  },
  ko: {
    morning: '좋은 아침이에요', afternoon: '좋은 오후예요', evening: '좋은 저녁이에요', hello: '안녕하세요',
    weekOf: '주차', takes: '오늘은', nothing: '계획이 없어요:', planWeek: '주간 계획하기 →',
    restDay: '휴식일입니다. 휴식도 한 주의 일부예요.', quickT: '5분 있으세요?', quickP: '잠깐 쉬는 시간의 짧은 드릴.',
    aWeek: '이번 주', min: '분',
  },
};

/* The hour comes from the server, in the member's time zone (lib/clock.ts):
   reading it here would differ between the server's render and the browser's. */
const greeting = (c: Record<Key, string>, h: number) => (h < 12 ? c.morning : h < 18 ? c.afternoon : c.evening);

export default function DayHead({
  weekday,
  isToday,
  name,
  week,
  menu,
  minutes,
  empty,
  signedIn,
  hour,
  done,
}: {
  weekday: number;
  isToday: boolean;
  /** The member's hour, 0–23, for the greeting. */
  hour: number;
  /** The day's Done button, when there is a day to finish. */
  done?: React.ReactNode;
  name: string | null;
  week: { planned: boolean; done: boolean }[];
  menu: { title: Localized; week: number; stage: { name: Localized; weeks: number } | null } | null;
  minutes: number;
  empty: boolean;
  signedIn: boolean;
}) {
  const { T, lang } = useLang();
  const c = useCopy(C);

  return (
    <section className="td">
      <div className="wrap in">
        <div>
          <p className="kicker">
            {T(DAY_NAMES[weekday])}
            {menu && (
              <>
                {' · '}
                {menu.stage
                  ? lang === 'ko'
                    ? `${T(menu.stage.name)} ${menu.week}/${menu.stage.weeks}${c.weekOf}`
                    : `${c.weekOf} ${menu.week} of ${menu.stage.weeks} · ${T(menu.stage.name)}`
                  : T(menu.title)}
              </>
            )}
          </p>
          <h1>
            {isToday ? greeting(c, hour) : c.hello}
            {name ? `, ${name}.` : '.'}
          </h1>
          {/* Signed out, the card under the head is the way in; a second
              invitation up here only competed with it. */}
          {signedIn && (
            <p className="sub">
              {empty ? (
                <>
                  {c.nothing} {T(DAY_NAMES[weekday])}. {c.restDay}{' '}
                  <Link href="/week">{c.planWeek}</Link>
                </>
              ) : (
                <>
                  {c.takes} <b>{minutes} {c.min}</b>. <Link href="/week">{c.planWeek}</Link>
                </>
              )}
            </p>
          )}
          {done && <div className="doneslot">{done}</div>}
        </div>

        <div className="week" aria-label={c.aWeek}>
          {week.map((d, di) => {
            const cls = `day${d.done ? ' done' : ''}${di === weekday ? ' now' : ''}${!d.planned ? ' rest' : ''}`;
            const inner = (
              <>
                <i>
                  {d.done && (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </i>
                {T(DAY_SHORT[di])}
              </>
            );
            /* The day you are on is where you are, not a link to it. */
            return di === weekday ? (
              <span key={di} className={cls} aria-current="date">
                {inner}
              </span>
            ) : (
              <Link key={di} href={`/day/${di}`} className={cls}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function QuickDrills({ menu, posters }: { menu: Menu; posters: Record<string, string> }) {
  const { T } = useLang();
  const c = useCopy(C);
  return (
    <section className="tq">
      <div className="wrap">
        <div className="qhead">
          <h2>{c.quickT}</h2>
          <p>{c.quickP}</p>
        </div>
        <div className="qrow">
          {menu.routines.map(r => {
            const first = r.items.find(i => i.video)?.video ?? null;
            return (
              <Link className="qcard" href={`/routines/${r.id}`} key={r.id}>
                <span className="thumb">
                  {first && posters[first.id] && <img src={posters[first.id]} alt="" loading="lazy" />}
                  <span className="g" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
                <span className="info">
                  <span className="top">
                    <span>{first?.tags[0] ? T(TAG_LABELS[first.tags[0]]) : ''}</span>
                    <span>{mmss(routineLengthMs(r) || null)}</span>
                  </span>
                  <b>{T(r.title)}</b>
                  {T(r.blurb) && <span className="blurb">{T(r.blurb)}</span>}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
