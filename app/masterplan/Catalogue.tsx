'use client';

/* The catalogue: a quiet rail of the seven training areas, and an editorial grid
   of the programs inside the selected one.

   Built to stay readable as the catalogue grows — the rail scrolls, the grid is
   auto-fill, and a status filter plus an "All programs" view keep 37 programs
   (and more) navigable. Area and filter live in the URL, so a view can be linked
   to; the server reads them off the query string, and changes are written back
   with replaceState so filtering never pushes a history entry. */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCopy, useLang } from '@/lib/lang';
import type { Copy } from '@/lib/lang';
import { AREAS, STATE, type Area, type Program } from '@/lib/content';
import { ALL_AREAS, FILTERS, FILTER_COPY_KEY, type Filter } from './view';

type Key =
  | 'railLabel' | 'railTotal' | 'allAreas' | 'resumeDim' | 'resumeGo'
  | 'yourPath' | 'everything' | 'heroCountL' | 'heroCountAll'
  | 'chooseT' | 'chooseS' | 'fAll' | 'fOpen' | 'fNow' | 'fSoon'
  | 'stNow' | 'stOpen' | 'stSoon' | 'stGuest' | 'empty'
  | 'footer' | 'signout' | 'allBlurb';

const C: Copy<Key> = {
  en: {
    railLabel: 'Training areas', railTotal: 'programs across 7 areas',
    allAreas: 'All programs', resumeDim: 'Improvisation 01 ·', resumeGo: 'Continue training ↗',
    yourPath: 'Your selected path', everything: 'Everything on the shelf',
    heroCountL: 'programs in this area', heroCountAll: 'programs in total',
    chooseT: 'Choose a program', chooseS: 'Open one to see its modules and sessions',
    fAll: 'All', fOpen: 'Open', fNow: 'In progress', fSoon: 'In production',
    stNow: 'In progress', stOpen: 'Open', stSoon: 'In production', stGuest: 'Guest edition',
    empty: 'Nothing in this area matches that filter.',
    footer: 'Solo salsa training · Built around practice', signout: 'Sign out',
    allBlurb: 'Every area, every program. Filter by what is open, or narrow to one area on the left.',
  },
  ko: {
    railLabel: '트레이닝 영역', railTotal: '개 프로그램 · 7개 영역',
    allAreas: '전체 프로그램', resumeDim: '즉흥 01 ·', resumeGo: '이어서 트레이닝 ↗',
    yourPath: '선택한 경로', everything: '전체 목록',
    heroCountL: '이 영역의 프로그램', heroCountAll: '전체 프로그램',
    chooseT: '프로그램 선택', chooseS: '열어서 모듈과 세션을 확인하세요',
    fAll: '전체', fOpen: '이용 가능', fNow: '진행 중', fSoon: '제작 중',
    stNow: '진행 중', stOpen: '이용 가능', stSoon: '제작 중', stGuest: '게스트 에디션',
    empty: '이 영역에 해당하는 프로그램이 없습니다.',
    footer: '연습을 중심으로 설계한 솔로 살사 트레이닝', signout: '로그아웃',
    allBlurb: '모든 영역의 모든 프로그램. 이용 가능한 것만 보거나, 왼쪽에서 영역을 좁혀 보세요.',
  },
};

/* One entry per card in view: the program, its index inside its own area, and
   the area it came from — the "All programs" view needs the area to label the
   card, since the program's own title is no longer enough context. */
interface Entry {
  program: Program;
  index: number;
  area: Area;
}

const sessionCount = (p: Program) => parseInt(p.sessions.en, 10) || 0;
const two = (n: number) => String(n).padStart(2, '0');

const matches = (p: Program, f: Filter) =>
  f === 'all' ||
  (f === 'open' && p.status === 'open') ||
  (f === 'now' && p.status === 'current') ||
  (f === 'soon' && p.status === 'soon');

/* Card look is decided by what the program is, then by position, so a long grid
   keeps a rhythm instead of turning into a wall of identical boxes. */
function variant(e: Entry, coachCardId: string | null) {
  if (e.program.status === 'current') return 'photo stage featured';
  if (e.program.status === 'soon') return 'soon';
  if (e.area.id === 'guest' && e.program.id === coachCardId) return 'photo coach';
  return e.index % 3 === 1 ? 'lime' : '';
}

export default function Catalogue({
  initialArea,
  initialFilter,
}: {
  initialArea: number;
  initialFilter: Filter;
}) {
  const { T } = useLang();
  const c = useCopy(C);
  const [area, setArea] = useState(initialArea);
  const [filter, setFilter] = useState<Filter>(initialFilter);

  /* Keep the address bar in step without pushing history — the prototype's
     replaceState, unchanged in behaviour. */
  useEffect(() => {
    const url = new URLSearchParams(window.location.search);
    url.set('area', area === ALL_AREAS ? 'all' : String(area));
    if (filter === 'all') url.delete('f');
    else url.set('f', filter);
    window.history.replaceState(null, '', `?${url}`);
  }, [area, filter]);

  const all = area === ALL_AREAS;
  const section = all ? null : AREAS[area];
  const total = AREAS.reduce((n, a) => n + a.programs.length, 0);

  const list: Entry[] = all
    ? AREAS.flatMap(a => a.programs.map((program, index) => ({ program, index, area: a })))
    : section!.programs.map((program, index) => ({ program, index, area: section! }));

  const shown = list.filter(e => matches(e.program, filter));

  /* Only one card per view carries the coach portrait. */
  const coachCardId =
    shown.find(e => e.area.id === 'guest' && e.program.status === 'open')?.program.id ?? null;

  const statusLabel = (e: Entry) =>
    e.program.status === 'current' ? `${c.stNow} · 4%`
      : e.program.status === 'soon' ? c.stSoon
        : e.area.id === 'guest' ? c.stGuest
          : c.stOpen;

  return (
    <div className="mp">
      <div className="page">
        <aside className="rail">
          <p className="rail-label">{c.railLabel}</p>
          <div className="areas" role="tablist" aria-label={c.railLabel}>
            <button
              className="area all"
              role="tab"
              type="button"
              aria-current={all}
              onClick={() => setArea(ALL_AREAS)}
            >
              <span className="n">＊</span>
              <span className="nm">{c.allAreas}</span>
              <span className="ct">{total}</span>
            </button>
            {AREAS.map((a, i) => (
              <button
                key={a.id}
                className="area"
                role="tab"
                type="button"
                aria-current={i === area}
                onClick={() => setArea(i)}
              >
                <span className="n">{two(i + 1)}</span>
                <span className="nm">{T(a.name)}</span>
                <span className="ct">{a.programs.length}</span>
              </button>
            ))}
          </div>
          <div className="rail-foot">
            <b>{total}</b>
            <span>{c.railTotal}</span>
          </div>
        </aside>

        <main className="main">
          <div className="resume">
            <Link href={`/prototype/session.html?s=${STATE.session}`}>
              <span className="dim">{c.resumeDim}</span>
              <span>{c.resumeGo}</span>
            </Link>
          </div>

          <section className="hero">
            <div>
              <div className="kicker">{all ? c.everything : `${two(area + 1)} · ${c.yourPath}`}</div>
              <h1>{all ? c.allAreas : T(section!.name)}</h1>
              <p>{all ? c.allBlurb : T(section!.blurb)}</p>
            </div>
            <div className="hero-side">
              <strong>{list.length}</strong>
              <span>{all ? c.heroCountAll : c.heroCountL}</span>
            </div>
          </section>

          <div className="bar">
            <div>
              <h2>{c.chooseT}</h2>
              <p className="sub">{c.chooseS}</p>
            </div>
            <div className="filters">
              {FILTERS.map(f => (
                <button
                  key={f}
                  className="f"
                  type="button"
                  aria-pressed={f === filter}
                  onClick={() => setFilter(f)}
                >
                  {c[FILTER_COPY_KEY[f]]}
                  <i>{list.filter(e => matches(e.program, f)).length}</i>
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="empty">{c.empty}</p>
          ) : (
            <div className="grid fade">
              {shown.map(e => (
                <ProgramCard
                  key={e.program.id}
                  entry={e}
                  className={variant(e, coachCardId)}
                  label={statusLabel(e)}
                  showAreaName={all}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <footer>
        <div className="wrap foot">
          <b>
            SUIM<span className="dot">.</span>
          </b>
          <span>{c.footer}</span>
          {/* A POST, so a link prefetch cannot sign someone out by accident. */}
          <form action="/auth/signout" method="post">
            <button type="submit" className="signout">{c.signout}</button>
          </form>
        </div>
      </footer>
    </div>
  );
}

function ProgramCard({
  entry,
  className,
  label,
  showAreaName,
}: {
  entry: Entry;
  className: string;
  label: string;
  showAreaName: boolean;
}) {
  const { T } = useLang();
  const { program, index, area } = entry;
  const isPhoto = className.includes('photo');
  const image = className.includes('stage')
    ? '/prototype/assets/stage.jpg'
    : className.includes('coach')
      ? '/prototype/assets/coach.jpg'
      : null;

  const n = sessionCount(program);
  const done = program.status === 'current' ? 1 : 0;

  const inner = (
    <>
      {image && <img src={image} alt="" />}
      {!isPhoto && (
        <span className="numeral" aria-hidden="true">
          {two(index + 1)}
        </span>
      )}
      <span className="no">{two(index + 1)}</span>
      <span className="status">{label}</span>
      <div className="copy">
        <div className="code">{showAreaName ? T(area.name) : T(program.title)}</div>
        <h3>{T(program.subtitle)}</h3>
        <div className="bars" aria-hidden="true">
          {Array.from({ length: n }, (_, k) => (
            <i key={k} className={k < done ? 'on' : undefined} />
          ))}
        </div>
        <div className="meta">
          <span>{T(program.weeks)}</span>
          <span>{T(program.sessions)}</span>
          <span>{T(program.level)}</span>
        </div>
      </div>
    </>
  );

  /* Improvisation 01 is the only module built out, so it is the only card that
     navigates — the rest would all land on it, which reads as a broken link.
     The arrow-less card is the signal that it goes nowhere yet. */
  return program.status === 'current' ? (
    <Link className={`card ${className}`} href="/prototype/plan.html">
      {inner}
    </Link>
  ) : (
    <div className={`card ${className}`}>{inner}</div>
  );
}
