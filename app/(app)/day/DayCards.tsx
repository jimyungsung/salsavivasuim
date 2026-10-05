'use client';

/* The cards Today shows in place of the player, or over it.

   JoinCard        a visitor: one way in, to a free account, not four
                   scattered Sign in links.
   FirstWeekCard   a member with no week yet: the starting menu, one tap.
                   The first sign-in usually does this already
                   (lib/week-copy.ts startFirstWeek); this is for whoever it
                   could not, and for the days before any menu is open.
   DoneToggle      marks a day done, or undoes it; on Today's head and on the
                   card the player shows after the last exercise. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useCopy, useLang } from '@/lib/lang';
import type { Copy } from '@/lib/lang';
import type { Localized } from '@/lib/i18n';
import { signInHref } from '@/lib/safe-next';
import { setDone, useMenu } from '../week/actions';

type Key =
  | 'joinT' | 'joinP' | 'joinGo' | 'joinHave'
  | 'firstK' | 'firstGo' | 'firstDays' | 'firstMin' | 'firstSoonT' | 'firstSoonP' | 'firstOther'
  | 'done' | 'markDone' | 'undo' | 'finishT' | 'finishP' | 'finishWeek';

const C: Copy<Key> = {
  en: {
    joinT: 'Your routine for today is ready.',
    joinP: 'Make a free account and your first week is waiting: a short routine each day, with the player made for practice.',
    joinGo: 'Create a free account', joinHave: 'I have an account',
    firstK: 'Your first week', firstGo: 'Start this week', firstDays: 'days', firstMin: 'min a day',
    firstSoonT: 'Your first week is on its way.',
    firstSoonP: 'The first stage is being filmed. It will be here the day it opens, with nothing for you to set up.',
    firstOther: 'or choose another week',
    done: 'Done', markDone: 'Mark today done', undo: 'Undo',
    finishT: 'That’s today.', finishP: 'Mark it done, and tomorrow’s routine is waiting.', finishWeek: 'See the week',
  },
  ko: {
    joinT: '오늘의 루틴이 준비되어 있어요.',
    joinP: '무료 계정을 만들면 첫 주가 기다리고 있어요. 매일 짧은 루틴 하나와 연습을 위한 플레이어.',
    joinGo: '무료 계정 만들기', joinHave: '이미 계정이 있어요',
    firstK: '나의 첫 주', firstGo: '이번 주 시작하기', firstDays: '일', firstMin: '하루 분',
    firstSoonT: '첫 주가 곧 열려요.',
    firstSoonP: '첫 단계를 촬영하고 있어요. 열리는 날 바로 여기에 나타나고, 따로 설정할 것은 없어요.',
    firstOther: '또는 다른 주 고르기',
    done: '완료', markDone: '오늘 완료로 표시', undo: '되돌리기',
    finishT: '오늘은 여기까지.', finishP: '완료로 표시하면 내일의 루틴이 기다리고 있어요.', finishWeek: '한 주 보기',
  },
};

export function JoinCard({ next }: { next: string }) {
  const c = useCopy(C);
  return (
    <section className="tcard">
      <h2>{c.joinT}</h2>
      <p>{c.joinP}</p>
      <div className="acts">
        <Link className="pill primary" href={signInHref(next, 'register')}>
          {c.joinGo}
        </Link>
        <Link className="pill ghost onpaper" href={signInHref(next)}>
          {c.joinHave}
        </Link>
      </div>
    </section>
  );
}

export function FirstWeekCard({
  menu,
}: {
  menu: { id: string; title: Localized; promise: Localized; days: number; minutes: number } | null;
}) {
  const { T } = useLang();
  const c = useCopy(C);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!menu) {
    return (
      <section className="tcard">
        <h2>{c.firstSoonT}</h2>
        <p>{c.firstSoonP}</p>
      </section>
    );
  }
  return (
    <section className="tcard">
      <p className="kicker">{c.firstK}</p>
      <h2>{T(menu.title)}</h2>
      {T(menu.promise) && <p>{T(menu.promise)}</p>}
      <p className="meta">
        <b>
          {menu.days} {c.firstDays}
        </b>{' '}
        · ~{menu.minutes} {c.firstMin}
      </p>
      {error && <p className="err">{error}</p>}
      <div className="acts">
        <button
          className="pill primary"
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await useMenu(menu.id);
              if (!r.ok) setError(r.error);
              else router.refresh();
            })
          }
        >
          {c.firstGo}
        </button>
        <Link className="other" href="/week">
          {c.firstOther}
        </Link>
      </div>
    </section>
  );
}

export function DoneToggle({ slotId, done, size = 'sm' }: { slotId: string; done: boolean; size?: 'sm' | 'lg' }) {
  const c = useCopy(C);
  const router = useRouter();
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      const r = await setDone(slotId, !done);
      if (r.ok) router.refresh();
    });
  return done ? (
    <span className="donechip">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {c.done}
      <button type="button" className="undo" disabled={pending} onClick={toggle}>
        {c.undo}
      </button>
    </span>
  ) : (
    <button className={`pill primary${size === 'sm' ? ' sm' : ''}`} type="button" disabled={pending} onClick={toggle}>
      {c.markDone}
    </button>
  );
}

export function FinishCard({ slotId, done }: { slotId: string; done: boolean }) {
  const c = useCopy(C);
  return (
    <div className="finish">
      <h2>{c.finishT}</h2>
      {!done && <p>{c.finishP}</p>}
      <DoneToggle slotId={slotId} done={done} size="lg" />
      <Link className="week" href="/week">
        {c.finishWeek}
      </Link>
    </div>
  );
}
