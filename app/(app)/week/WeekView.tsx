'use client';

/* Plan your week. The mockup public/mockups/daily-week.html made real.

   Two departures from the mockup, both deliberate. Adding an exercise to a day
   is a tap, not a drag: HTML5 drag does not fire on touch, and a phone in a
   practice room is the likely device. So the library carries "Add to Tuesday"
   buttons for whichever day was last chosen, and each day's own "Add exercise"
   chooses it. And on a phone the library is a dialog opened from a day, since
   two columns do not fit. */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useCopy, useLang } from '@/lib/lang';
import type { Copy } from '@/lib/lang';
import { mmss } from '@/lib/db';
import { DAY_NAMES, DAY_SHORT, EXERCISE_TAGS, LEVEL_LABELS, TAG_LABELS, type ExerciseTag } from '@/lib/i18n';
import { signInHref } from '@/lib/safe-next';
import type { Exercise, Menu } from '@/lib/menus';
import { routineLengthMs } from '@/lib/playlist';
import type { Day, Week } from '@/lib/week';
import { addToDay, clearDay, moveInDay, removeFromDay, resetDay, setDone, useMenu, type Result } from './actions';

type Key =
  | 'kicker' | 'h1' | 'sub' | 'menusT' | 'menusP' | 'inWeek' | 'useMenu' | 'recommended' | 'days' | 'aDay'
  | 'buildT' | 'buildP' | 'buildFrom' | 'total' | 'practiceDays' | 'reset' | 'resetDay' | 'clearDay'
  | 'libT' | 'libN' | 'search' | 'all' | 'addTo' | 'noLib' | 'noMatch' | 'sheetOpen' | 'close'
  | 'today' | 'done' | 'markDone' | 'undone' | 'rest' | 'restP' | 'addEx' | 'play' | 'missing'
  | 'aUp' | 'aDown' | 'aRemove' | 'signInT' | 'signInGo' | 'confirmMenu' | 'confirmClear'
  | 'footer' | 'signout';

const C: Copy<Key> = {
  en: {
    kicker: 'My week', h1: 'Plan your week',
    sub: 'Pick this week’s menu, then make it yours. Add, move or drop exercises until each day feels right.',
    menusT: 'This week’s menu', menusP: 'Each menu is a theme for the whole week. Choose one to fill your days.',
    inWeek: 'In your week', useMenu: 'Use this menu', recommended: 'Recommended', days: 'days', aDay: 'a day',
    buildT: 'Build your week', buildP: 'Tap Add on a day, then tap an exercise. Aim for 10–15 minutes a day.',
    buildFrom: 'Started from', total: 'this week', practiceDays: 'practice days', reset: 'Reset the week to the menu',
    resetDay: 'Reset to menu', clearDay: 'Clear',
    libT: 'Mini exercises', libN: 'in the library', search: 'Search exercises', all: 'All', addTo: 'Add to',
    noLib: 'Nothing to add yet. Exercises appear here as they are published.', noMatch: 'Nothing matches.',
    sheetOpen: 'Add exercise', close: 'Close',
    today: 'Today', done: 'Done', markDone: 'Mark done', undone: 'Not done', rest: 'Rest', restP: 'Nothing planned. Rest is part of the week.',
    addEx: 'Add exercise', play: 'Play', missing: 'No longer available',
    aUp: 'Move earlier', aDown: 'Move later', aRemove: 'Remove',
    signInT: 'Your week is your own practice, so it needs an account.', signInGo: 'Sign in ↗',
    confirmMenu: 'Replace your whole week with this menu? What you have planned goes.',
    confirmClear: 'Clear this day?',
    footer: 'Solo salsa training · A routine a day', signout: 'Sign out',
  },
  ko: {
    kicker: '나의 주간', h1: '이번 주 계획하기',
    sub: '이번 주 메뉴를 고른 뒤 나에게 맞게 바꿉니다. 하루하루가 알맞게 느껴질 때까지 운동을 더하고, 옮기고, 빼세요.',
    menusT: '이번 주 메뉴', menusP: '메뉴 하나가 한 주의 주제입니다. 하나를 고르면 요일이 채워집니다.',
    inWeek: '지금 사용 중', useMenu: '이 메뉴 사용', recommended: '추천', days: '일', aDay: '하루',
    buildT: '나의 주간 만들기', buildP: '요일의 추가를 누른 뒤 운동을 누르세요. 하루 10~15분이 적당합니다.',
    buildFrom: '시작 메뉴', total: '이번 주', practiceDays: '연습일', reset: '메뉴대로 주간 되돌리기',
    resetDay: '메뉴대로', clearDay: '비우기',
    libT: '미니 운동', libN: '개', search: '운동 검색', all: '전체', addTo: '추가:',
    noLib: '아직 추가할 운동이 없습니다. 공개되는 대로 여기에 나타납니다.', noMatch: '검색 결과가 없습니다.',
    sheetOpen: '운동 추가', close: '닫기',
    today: '오늘', done: '완료', markDone: '완료 표시', undone: '미완료', rest: '휴식', restP: '계획 없음. 휴식도 한 주의 일부입니다.',
    addEx: '운동 추가', play: '재생', missing: '더 이상 볼 수 없음',
    aUp: '앞으로', aDown: '뒤로', aRemove: '빼기',
    signInT: '나의 주간은 나만의 연습이라 계정이 필요합니다.', signInGo: '로그인 ↗',
    confirmMenu: '이 메뉴로 한 주를 통째로 바꿀까요? 지금 계획은 사라집니다.',
    confirmClear: '이 날을 비울까요?',
    footer: '연습을 중심으로 설계한 솔로 살사 트레이닝', signout: '로그아웃',
  },
};

const PLAY = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const dayMs = (day: Day | null) => (day ? day.items.reduce((n, i) => n + (i.video?.durationMs ?? 0) * i.repeats, 0) : 0);
const mins = (ms: number) => Math.round(ms / 60000);

export default function WeekView({
  menus,
  week,
  currentMenuId,
  library,
  posters,
  signedIn,
  today,
}: {
  menus: Menu[];
  week: Week;
  currentMenuId: string | null;
  library: Exercise[];
  posters: Record<string, string>;
  signedIn: boolean;
  today: number;
}) {
  const { lang, T } = useLang();
  const c = useCopy(C);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState(today);
  const [sheet, setSheet] = useState(false);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const result = await fn();
      if (result.ok) {
        setError(null);
        after?.();
      } else {
        setError(result.error);
      }
    });

  const current = menus.find(m => m.id === currentMenuId) ?? null;
  const totalMs = week.days.reduce((n, d) => n + dayMs(d), 0);
  const practiceDays = week.days.filter(d => d && d.items.length > 0).length;
  const add = (videoId: string) => run(() => addToDay(target, videoId), () => setSheet(false));

  return (
    <div className="wk">
      <main className="wrap main">
        <section className="head">
          <div>
            <div className="kicker">{c.kicker}</div>
            <h1>{c.h1}</h1>
            <p>{c.sub}</p>
          </div>
          {!signedIn && (
            <Link className="pill primary" href={signInHref('/week')}>
              {c.signInGo}
            </Link>
          )}
        </section>

        {error && <p className="banner">{error}</p>}

        <section className="menus">
          <div className="sechead">
            <h2>{c.menusT}</h2>
            <p>{c.menusP}</p>
          </div>
          <div className="mrow">
            {menus.map((m, i) => {
              const on = m.id === currentMenuId;
              const days = m.routines.filter(r => r.weekday != null).length;
              const perDay = days ? Math.round(m.routines.reduce((n, r) => n + routineLengthMs(r), 0) / days / 60000) : 0;
              const tags = [...new Set(m.routines.flatMap(r => r.items.flatMap(it => it.video?.tags ?? [])))].slice(0, 3) as ExerciseTag[];
              return (
                <article className={`menu${on ? ' on' : ''}`} key={m.id}>
                  <div className="pic">
                    {on ? <span className="flag on">{c.inWeek}</span> : i === 0 && !current ? <span className="flag rec">{c.recommended}</span> : null}
                    <b>{T(m.title).split(' ')[0]}</b>
                  </div>
                  <div className="body">
                    <h3>{T(m.title)}</h3>
                    {T(m.promise) && <p className="desc">{T(m.promise)}</p>}
                    <p className="meta">
                      {m.stage && <span>{T(m.stage.name)} · </span>}
                      <b>{days} {c.days}</b> · <b>~{perDay} min</b> {c.aDay} · {T(LEVEL_LABELS[m.level])}
                    </p>
                    {tags.length > 0 && (
                      <div className="focus">
                        {tags.map(t => (
                          <span key={t}>{T(TAG_LABELS[t])}</span>
                        ))}
                      </div>
                    )}
                    {signedIn ? (
                      <button
                        className={`pill sm ${on ? 'ghost onpaper' : 'primary'}`}
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (practiceDays === 0 || confirm(c.confirmMenu)) run(() => useMenu(m.id));
                        }}
                      >
                        {on ? c.reset : c.useMenu}
                      </button>
                    ) : (
                      <Link className="pill sm primary" href={signInHref('/week')}>
                        {c.useMenu}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {signedIn ? (
          <section className="build">
            <div className="buildhead">
              <div>
                <h2>{c.buildT}</h2>
                <p>
                  {current && (
                    <>
                      {c.buildFrom} <b>{T(current.title)}</b>.{' '}
                    </>
                  )}
                  {c.buildP}
                </p>
              </div>
              <div className="acts">
                <span className="total">
                  <b>{mins(totalMs)} min</b> {c.total} · {practiceDays} {c.practiceDays}
                </span>
              </div>
            </div>

            <div className="cols">
              <div className="libpanel">
                <Library
                  library={library}
                  posters={posters}
                  target={target}
                  onTarget={setTarget}
                  pending={pending}
                  onAdd={add}
                />
              </div>

              <div className="week">
                {week.days.map((day, di) => (
                  <DayCard
                    key={di}
                    weekday={di}
                    day={day}
                    isToday={di === today}
                    targeted={di === target}
                    pending={pending}
                    onRun={run}
                    onAdd={() => {
                      setTarget(di);
                      setSheet(true);
                    }}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : (
          <p className="signin-note">{c.signInT}</p>
        )}
      </main>

      {sheet && (
        <Sheet onClose={() => setSheet(false)} title={`${c.addTo} ${T(DAY_NAMES[target])}`} close={c.close}>
          <Library library={library} posters={posters} target={target} onTarget={setTarget} pending={pending} onAdd={add} inSheet />
        </Sheet>
      )}

      <footer>
        <div className="wrap foot">
          <b>
            Everyday Salsa<span className="dot">.</span>
          </b>
          <span>{c.footer}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="signout">{c.signout}</button>
          </form>
        </div>
      </footer>
      <span hidden>{lang}</span>
    </div>
  );
}

function DayCard({
  weekday,
  day,
  isToday,
  targeted,
  pending,
  onRun,
  onAdd,
}: {
  weekday: number;
  day: Day | null;
  isToday: boolean;
  targeted: boolean;
  pending: boolean;
  onRun: (fn: () => Promise<Result>, after?: () => void) => void;
  onAdd: () => void;
}) {
  const { T } = useLang();
  const c = useCopy(C);
  const total = dayMs(day);
  const empty = !day || day.items.length === 0;
  const done = Boolean(day?.doneAt);

  return (
    <article className={`day${isToday ? ' today' : ''}${done ? ' done' : ''}${empty ? ' rest' : ''}${targeted ? ' target' : ''}`}>
      <div className="dh">
        <span className="dn">
          {T(DAY_SHORT[weekday])}
          {isToday && <em>{c.today}</em>}
        </span>
        {!empty && (
          <span className="meter" aria-hidden="true">
            <i style={{ width: `${Math.min(100, (total / 900000) * 100)}%` }} />
          </span>
        )}
        <span className="dm">
          {empty ? c.rest : done ? `${c.done} · ${mins(total)} min` : `${mins(total)} min`}
        </span>
      </div>

      {empty ? (
        <p className="restp">{c.restP}</p>
      ) : (
        <ul>
          {day!.items.map((item, i) => (
            <li key={item.id}>
              <span className="nm">{item.video ? T(item.video.title) : c.missing}</span>
              <span className="tg">{item.video?.tags[0] ? T(TAG_LABELS[item.video.tags[0]]) : ''}</span>
              <span className="min">{item.video ? mmss(item.video.durationMs ? item.video.durationMs * item.repeats : null) : '—'}</span>
              <span className="ops">
                <button type="button" disabled={pending || i === 0} onClick={() => onRun(() => moveInDay(item.id, 'up'))} aria-label={c.aUp} title={c.aUp}>↑</button>
                <button type="button" disabled={pending || i === day!.items.length - 1} onClick={() => onRun(() => moveInDay(item.id, 'down'))} aria-label={c.aDown} title={c.aDown}>↓</button>
                <button type="button" disabled={pending} onClick={() => onRun(() => removeFromDay(item.id))} aria-label={c.aRemove} title={c.aRemove}>×</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="dacts">
        <button className="more" type="button" disabled={pending} onClick={onAdd}>
          <i>+</i>
          {c.addEx}
        </button>
        {!empty && (
          <>
            <Link className="more play" href={isToday ? '/today' : `/day/${weekday}`}>
              <i>{PLAY}</i>
              {c.play}
            </Link>
            <button className="more" type="button" disabled={pending} onClick={() => onRun(() => setDone(day!.slotId, !done))}>
              {done ? c.undone : c.markDone}
            </button>
            {day!.routineId && (
              <button className="more" type="button" disabled={pending} onClick={() => onRun(() => resetDay(weekday))}>
                {c.resetDay}
              </button>
            )}
            <button
              className="more"
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm(c.confirmClear)) onRun(() => clearDay(weekday));
              }}
            >
              {c.clearDay}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

/* The library: chips, a search, and one card per exercise with an Add button
   for the chosen day. */
function Library({
  library,
  posters,
  target,
  onTarget,
  pending,
  onAdd,
  inSheet = false,
}: {
  library: Exercise[];
  posters: Record<string, string>;
  target: number;
  onTarget: (weekday: number) => void;
  pending: boolean;
  onAdd: (videoId: string) => void;
  inSheet?: boolean;
}) {
  const { T } = useLang();
  const c = useCopy(C);
  const [tag, setTag] = useState<ExerciseTag | 'all'>('all');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const used = useMemo(() => new Set(library.flatMap(v => v.tags)), [library]);
  const shown = library.filter(
    v => (tag === 'all' || v.tags.includes(tag)) && (!q || T(v.title).toLowerCase().includes(q) || v.title.en.toLowerCase().includes(q)),
  );

  return (
    <div className="lib">
      {!inSheet && (
        <div className="lhead">
          <h3>{c.libT}</h3>
          <span>
            {library.length} {c.libN}
          </span>
        </div>
      )}
      <div className="target" role="group" aria-label={c.addTo}>
        <span>{c.addTo}</span>
        {DAY_SHORT.map((d, di) => (
          <button key={di} type="button" className={`dayb${di === target ? ' on' : ''}`} aria-pressed={di === target} onClick={() => onTarget(di)}>
            {T(d)}
          </button>
        ))}
      </div>
      <input
        type="search"
        className="search"
        placeholder={c.search}
        aria-label={c.search}
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="chips">
        <button type="button" className={`chip${tag === 'all' ? ' on' : ''}`} aria-pressed={tag === 'all'} onClick={() => setTag('all')}>
          {c.all}
        </button>
        {EXERCISE_TAGS.filter(t => used.has(t)).map(t => (
          <button key={t} type="button" className={`chip${tag === t ? ' on' : ''}`} aria-pressed={tag === t} onClick={() => setTag(t)}>
            {T(TAG_LABELS[t])}
          </button>
        ))}
      </div>

      {library.length === 0 ? (
        <p className="none">{c.noLib}</p>
      ) : shown.length === 0 ? (
        <p className="none">{c.noMatch}</p>
      ) : (
        <div className="exlist">
          {shown.map(v => (
            <div className="ex" key={v.id}>
              <span className="thumb">
                {posters[v.id] && <img src={posters[v.id]} alt="" loading="lazy" />}
                <span className="d">{mmss(v.durationMs)}</span>
              </span>
              <span className="body">
                <b>{T(v.title)}</b>
                <span>
                  {v.tags.slice(0, 2).map(t => T(TAG_LABELS[t])).join(' · ') || T(LEVEL_LABELS[v.difficulty])}
                </span>
              </span>
              <button className="add" type="button" disabled={pending} onClick={() => onAdd(v.id)}>
                + {T(DAY_SHORT[target])}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* A native <dialog> for the phone-sized library, so Escape, focus and the
   backdrop are free. */
function Sheet({ title, close, onClose, children }: { title: string; close: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.open) el.showModal();
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener('cancel', onCancel);
    return () => el.removeEventListener('cancel', onCancel);
  }, [onClose]);

  return (
    <dialog
      className="sheet"
      ref={ref}
      aria-label={title}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="shead">
        <span className="grab" aria-hidden="true" />
        <h3>{title}</h3>
        <button className="close" type="button" onClick={onClose} aria-label={close}>
          ×
        </button>
      </div>
      <div className="sbody">{children}</div>
    </dialog>
  );
}
