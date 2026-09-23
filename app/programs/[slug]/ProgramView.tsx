'use client';

/* A module's sessions, tagged by level and chosen from freely — the levels are
   not a ladder, so filtering narrows the grid rather than gating it. */

import Link from 'next/link';
import { useState } from 'react';
import { useCopy, useLang } from '@/lib/lang';
import type { Copy } from '@/lib/lang';
import { LEVEL_LABELS, LEVEL_ORDER, type LevelKey } from '@/lib/content';
import { mmss } from '@/lib/db';
import type { ProgramDetail, SessionSummary } from '@/lib/catalogue';

type Key =
  | 'crumb' | 'moduleWord' | 'totalMinL' | 'chooseT' | 'chooseS' | 'everySession'
  | 'footer' | 'signout' | 'videosWord' | 'empty' | 'processing';

const C: Copy<Key> = {
  en: {
    crumb: 'Masterplan', moduleWord: 'Module', totalMinL: 'minutes of practice',
    chooseT: 'Choose a session', chooseS: 'Open one to see its videos',
    everySession: 'Every session', videosWord: 'videos',
    empty: 'No session carries that level. Try another one.',
    processing: 'Being filmed',
    footer: 'Solo salsa training · Built around practice', signout: 'Sign out',
  },
  ko: {
    crumb: '마스터플랜', moduleWord: '모듈', totalMinL: '분 · 총 연습 시간',
    chooseT: '세션 선택', chooseS: '열어서 영상을 확인하세요',
    everySession: '전체 세션', videosWord: '개 영상',
    empty: '해당 레벨의 세션이 없습니다. 다른 레벨을 골라보세요.',
    processing: '촬영 중',
    footer: '연습을 중심으로 설계한 솔로 살사 트레이닝', signout: '로그아웃',
  },
};

const two = (n: number) => String(n).padStart(2, '0');
const hasLevel = (s: SessionSummary, level: LevelKey | 'every') =>
  level === 'every' || s.levels.includes(level);

export default function ProgramView({ program }: { program: ProgramDetail }) {
  const { T } = useLang();
  const c = useCopy(C);
  const [level, setLevel] = useState<LevelKey | 'every'>('every');

  const totalMinutes = Math.round(
    program.sessions.reduce((n, s) => n + s.durationMs, 0) / 60000,
  );
  const shown = program.sessions.filter(s => hasLevel(s, level));

  return (
    <div className="pg">
      <main className="wrap main">
        <div className="topline">
          <Link className="crumb" href="/masterplan">
            <span aria-hidden="true">←</span>
            <span>{c.crumb}</span>
          </Link>
        </div>

        <section className="hero">
          <div>
            <div className="kicker">
              {c.moduleWord} · {T(program.area.name)}
            </div>
            <h1>{T(program.title)}</h1>
            <p>{T(program.promise)}</p>
          </div>
          <div className="hero-side">
            <strong>{totalMinutes}</strong>
            <span>{c.totalMinL}</span>
          </div>
        </section>

        <section className="plan">
          <div className="levelbar">
            <div>
              <h2>{c.chooseT}</h2>
              <p className="sub">{c.chooseS}</p>
            </div>
            <div className="levels">
              <button
                className="lv"
                type="button"
                aria-pressed={level === 'every'}
                onClick={() => setLevel('every')}
              >
                {c.everySession}
                <i>{program.sessions.length}</i>
              </button>
              {LEVEL_ORDER.map(key => (
                <button
                  key={key}
                  className="lv"
                  type="button"
                  aria-pressed={level === key}
                  onClick={() => setLevel(key)}
                >
                  {T(LEVEL_LABELS[key])}
                  <i>{program.sessions.filter(s => hasLevel(s, key)).length}</i>
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="empty">{c.empty}</p>
          ) : (
            <div className="sessions">
              {shown.map(session => (
                <SessionCard key={session.id} session={session} c={c} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer>
        <div className="wrap foot">
          <b>
            SUIM<span className="dot">.</span>
          </b>
          <span>{c.footer}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="signout">{c.signout}</button>
          </form>
        </div>
      </footer>
    </div>
  );
}

function SessionCard({ session, c }: { session: SessionSummary; c: Record<Key, string> }) {
  const { T } = useLang();
  /* videoCount is already what private.can_access() let this viewer see, admin
     bypass included — the same "drafts are a preview, not a leak" rule
     getCatalogue() relies on, not a second access check layered on top. */
  const playable = session.videoCount > 0;
  const foot = playable
    ? `${mmss(session.durationMs)} · ${session.videoCount} ${c.videosWord}`
    : c.processing;

  const inner = (
    <>
      <span className="ghost" aria-hidden="true">{two(session.position)}</span>
      <div className="copy">
        <div className="tags">
          {session.levels.map(k => (
            <span key={k} className={`tag ${k === 'all' ? 'all' : ''}`}>
              {T(LEVEL_LABELS[k])}
            </span>
          ))}
        </div>
        <h3>{T(session.title)}</h3>
        <p>{T(session.outcome)}</p>
        <span className="foot">
          <span>{foot}</span>
          {playable && <span>→</span>}
        </span>
      </div>
    </>
  );

  return playable ? (
    <Link className="ses" href={`/sessions/${session.id}`}>
      {inner}
    </Link>
  ) : (
    <div className="ses soon">{inner}</div>
  );
}
