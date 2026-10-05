'use client';

/* The landing page: public/mockups/daily-landing.html made real. One column
   of promises, the practice player with Suim in it, a week laid out, what you
   practise, who it is for, the price. Every string is in both languages. */

import Link from 'next/link';
import { useCopy, useLang } from '@/lib/lang';
import type { Copy } from '@/lib/lang';

type Key =
  | 'navHow' | 'navWhat' | 'navPrice' | 'signIn' | 'start' | 'today'
  | 'eyebrow' | 'h1a' | 'h1b' | 'lede' | 'ledeB' | 'cta' | 'seeWeek' | 'fine'
  | 'pToday' | 'pTrain' | 'pTitle' | 'pWith' | 'teacher' | 'teacherP' | 'todayCard' | 'todayT'
  | 's1' | 's1p' | 's2' | 's2p' | 's3' | 's3p'
  | 'howK' | 'howT' | 'howP' | 'h1t' | 'h1p' | 'h2t' | 'h2p' | 'h3t' | 'h3p' | 'lvl1' | 'lvl2' | 'lvl3' | 'loopNote'
  | 'weekK' | 'weekT' | 'why1' | 'why1p' | 'why2' | 'why2p'
  | 'whatK' | 'whatT' | 'whatP' | 'whatNote'
  | 'whoK' | 'whoT' | 'w1' | 'w1p' | 'w2' | 'w2p' | 'w3' | 'w3p'
  | 'priceK' | 'priceT' | 'priceP' | 'plan' | 'amount' | 'per' | 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'priceFine'
  | 'finalT' | 'finalP' | 'footPrograms' | 'footHelp' | 'footPrivacy';

const C: Copy<Key> = {
  en: {
    navHow: 'How it works', navWhat: 'What you practise', navPrice: 'Pricing', signIn: 'Sign in', start: 'Start free', today: 'Go to today',
    eyebrow: 'Solo salsa, one routine a day', h1a: 'Fifteen minutes a day.', h1b: 'Salsa that sticks.',
    lede: 'A short routine every day, taught by Suim on video and built from her real classes.',
    ledeB: 'Timing, footwork, turns, styling, in an order that adds up. No partner, no studio, no two-hour workout.',
    cta: 'Start your first routine', seeWeek: 'See a week', fine: 'Free while we’re starting out. No card.',
    pToday: 'Today · 2 of 4', pTrain: 'Footwork', pTitle: 'Shines for socials', pWith: 'With Suim · looping 8 counts',
    teacher: 'Suim', teacherP: 'Your teacher, every day', todayCard: 'Today · 14 min', todayT: 'Footwork & timing',
    s1: '10–15 min', s1p: 'a day, phone propped on a shelf', s2: '5 days', s2p: 'a week, plus a free Saturday and a rest day', s3: '8 weeks', s3p: 'to finish the first stage, Foundations',
    howK: 'How it works', howT: 'Open the app. Press start. That’s the whole habit.',
    howP: 'You never choose what to practise. The routine is chosen for you, and it changes every day, so you keep going without having to think about it.',
    h1t: 'Tell us where you are', h1p: 'Never danced, took classes and stopped, or dance socially and want to get better. That picks your first week.',
    h2t: 'Get a routine each day', h2p: 'Three or four short exercises: warm up, drill, dance. Each day has a theme, and each week builds on the last.',
    h3t: 'A player made for practice', h3p: 'Slow the teacher down without changing the pitch. Loop eight counts. Mirror the picture so their left is your left.',
    lvl1: 'Never danced', lvl2: 'Some classes', lvl3: 'Social dancer', loopNote: 'Looping counts 1–8 at three-quarter speed',
    weekK: 'A week, laid out', weekT: 'Small every day beats big once a week.',
    why1: 'Why so short?', why1p: 'A dance step lives in your legs, not your notes. Ten minutes of the same basic, five days running, does more than one long class you half remember by Thursday.',
    why2: 'Why a theme a day?', why2p: 'So it never feels like homework. Turns on Wednesday, shines on Friday, a whole song on Saturday with no instructions at all.',
    whatK: 'What you practise', whatT: 'Eleven things a dancer works on. Every exercise is one of them.',
    whatP: 'Each exercise is tagged with what it works and how hard it is, so you always know what you are doing and why, and the planner can find you more of it.',
    whatNote: 'Ready for more? Pick a different menu any week, or build your own from the library.',
    whoK: 'Who it’s for', whoT: 'Beginners, mostly. Restarters, often.',
    w1: 'Never danced', w1p: 'You start with the count and the basic, and nothing else, for a week. It feels slow. It’s the fastest way.',
    w2: 'Took classes, then stopped', w2p: 'Life happened. You remember the shapes but not the timing. Two weeks brings it back, in your own living room.',
    w3: 'Dance socially, want to improve', w3p: 'You follow fine on the floor but your feet are guessing. Daily drills fix the feet, so the rest can relax.',
    priceK: 'Pricing', priceT: 'One plan. Less than a single class.', priceP: 'Everything is free while the first stage is filmed. When the paid plan starts it will be one price, and nothing is charged unless you choose it.',
    plan: 'Daily', amount: '₩9,900', per: 'a month, once the paid plan starts',
    f1: 'A new routine every day', f2: 'The practice player: speed, loop, mirror, counts', f3: 'Quick 5-minute drills for busy days', f4: 'A week planned for you, yours to change', f5: 'In English and Korean',
    priceFine: 'Free for now. No card needed.',
    finalT: 'Fourteen minutes. Tonight.', finalP: 'The first routine is the count and the basic step. You’ll have it by the end of the song.',
    footPrograms: 'Solo salsa training', footHelp: 'Help', footPrivacy: 'Privacy',
  },
  ko: {
    navHow: '이용 방법', navWhat: '무엇을 연습하나', navPrice: '가격', signIn: '로그인', start: '무료로 시작', today: '오늘로 가기',
    eyebrow: '솔로 살사, 하루 한 루틴', h1a: '하루 15분.', h1b: '몸에 남는 살사.',
    lede: '매일 짧은 루틴 하나. Suim이 영상으로 직접 가르치고, 실제 수업에서 가져왔습니다.',
    ledeB: '타이밍, 풋워크, 턴, 스타일링을 쌓이는 순서로. 파트너도, 스튜디오도, 두 시간짜리 운동도 필요 없습니다.',
    cta: '첫 루틴 시작하기', seeWeek: '한 주 살펴보기', fine: '시작하는 동안은 무료. 카드 등록 없음.',
    pToday: '오늘 · 2/4', pTrain: '풋워크', pTitle: '소셜을 위한 샤인', pWith: 'Suim과 함께 · 8카운트 반복',
    teacher: 'Suim', teacherP: '매일 만나는 선생님', todayCard: '오늘 · 14분', todayT: '풋워크 & 타이밍',
    s1: '10~15분', s1p: '하루, 휴대폰은 선반 위에', s2: '5일', s2p: '한 주에, 자유로운 토요일과 휴식일까지', s3: '8주', s3p: '첫 단계 파운데이션을 마치는 데',
    howK: '이용 방법', howT: '앱을 열고, 시작을 누르세요. 습관은 그게 전부입니다.',
    howP: '무엇을 연습할지 고를 필요가 없습니다. 루틴은 정해져 있고 매일 바뀌니, 생각하지 않아도 계속하게 됩니다.',
    h1t: '지금 어디쯤인지 알려주세요', h1p: '춤춘 적이 없거나, 수업을 듣다 멈췄거나, 소셜에서 추지만 더 잘 추고 싶거나. 그것으로 첫 주가 정해집니다.',
    h2t: '매일 루틴 하나', h2p: '짧은 운동 서너 개: 워밍업, 드릴, 그리고 춤. 매일 주제가 있고, 매주 지난주 위에 쌓입니다.',
    h3t: '연습을 위해 만든 플레이어', h3p: '음정은 그대로 두고 선생님을 느리게. 8카운트 반복. 화면을 반전해 선생님의 왼쪽이 나의 왼쪽이 되게.',
    lvl1: '춤춘 적 없음', lvl2: '수업 조금', lvl3: '소셜 댄서', loopNote: '1~8카운트를 0.75배속으로 반복 중',
    weekK: '한 주를 펼치면', weekT: '매일 조금이 일주일에 한 번 크게보다 낫습니다.',
    why1: '왜 이렇게 짧은가요?', why1p: '스텝은 노트가 아니라 다리에 남습니다. 같은 기본 스텝 10분을 닷새 연속으로 하는 것이, 목요일이면 반쯤 잊는 긴 수업 하나보다 낫습니다.',
    why2: '왜 매일 다른 주제인가요?', why2p: '숙제처럼 느껴지지 않도록. 수요일엔 턴, 금요일엔 샤인, 토요일엔 아무 지시 없이 한 곡 통째로.',
    whatK: '무엇을 연습하나', whatT: '댄서가 갈고닦는 열한 가지. 모든 운동은 그중 하나입니다.',
    whatP: '운동마다 무엇을 다루는지와 난이도가 붙어 있어, 지금 무엇을 왜 하는지 늘 알 수 있고, 플래너가 비슷한 운동을 더 찾아줍니다.',
    whatNote: '더 원하시면 어느 주든 다른 메뉴를 고르거나, 라이브러리에서 직접 한 주를 만드세요.',
    whoK: '누구를 위한', whoT: '대부분 입문자. 자주, 다시 시작하는 분.',
    w1: '춤춘 적 없음', w1p: '한 주 동안 카운트와 기본 스텝만 합니다. 느리게 느껴지지만, 가장 빠른 길입니다.',
    w2: '수업을 듣다 멈춤', w2p: '살다 보니 그렇게 됐죠. 모양은 기억나는데 타이밍이 없습니다. 2주면 거실에서 돌아옵니다.',
    w3: '소셜에서 추지만 더 잘 추고 싶음', w3p: '플로어에서 팔로우는 되는데 발은 추측 중입니다. 매일의 드릴이 발을 고치면, 나머지가 편해집니다.',
    priceK: '가격', priceT: '플랜 하나. 수업 한 번보다 쌉니다.', priceP: '첫 단계를 촬영하는 동안 모든 것이 무료입니다. 유료 플랜이 시작되면 가격은 하나이고, 직접 선택하지 않으면 아무것도 청구되지 않습니다.',
    plan: '데일리', amount: '₩9,900', per: '유료 플랜 시작 후, 월',
    f1: '매일 새 루틴', f2: '연습 플레이어: 속도, 반복, 반전, 카운트', f3: '바쁜 날을 위한 5분 드릴', f4: '나를 위해 짜인 한 주, 바꾸는 건 자유', f5: '영어와 한국어',
    priceFine: '지금은 무료. 카드가 필요 없습니다.',
    finalT: '14분. 오늘 밤.', finalP: '첫 루틴은 카운트와 기본 스텝입니다. 노래가 끝날 즈음엔 몸에 들어와 있을 거예요.',
    footPrograms: '솔로 살사 트레이닝', footHelp: '도움말', footPrivacy: '개인정보',
  },
};

const PLAY = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" />
  </svg>
);
const CHECK = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WEEK: { d: string; t: { en: string; ko: string }; tags: { en: string; ko: string }; min: string }[] = [
  { d: 'Mon', t: { en: 'Timing & the count', ko: '타이밍과 카운트' }, tags: { en: 'Timing · Footwork', ko: '타이밍 · 풋워크' }, min: '12' },
  { d: 'Tue', t: { en: 'Footwork & timing', ko: '풋워크 & 타이밍' }, tags: { en: 'Footwork · Timing', ko: '풋워크 · 타이밍' }, min: '14' },
  { d: 'Wed', t: { en: 'Your first right turn', ko: '첫 오른쪽 턴' }, tags: { en: 'Turns', ko: '턴' }, min: '15' },
  { d: 'Thu', t: { en: 'Body movement', ko: '바디 무브먼트' }, tags: { en: 'Body · Hips', ko: '바디 · 골반' }, min: '12' },
  { d: 'Fri', t: { en: 'Shines: the suzie Q', ko: '샤인: 수지큐' }, tags: { en: 'Shines · Styling', ko: '샤인 · 스타일링' }, min: '15' },
  { d: 'Sat', t: { en: 'Freestyle Saturday', ko: '프리스타일 토요일' }, tags: { en: 'Musicality', ko: '뮤지컬리티' }, min: '10' },
  { d: 'Sun', t: { en: 'Rest', ko: '휴식' }, tags: { en: 'Optional: watch the week back', ko: '선택: 한 주 돌아보기' }, min: '—' },
];

const TAGS = [
  { en: 'Warm-up', ko: '워밍업' }, { en: 'Timing', ko: '타이밍' }, { en: 'Footwork', ko: '풋워크' }, { en: 'Body movement', ko: '바디 무브먼트' },
  { en: 'Hips', ko: '골반' }, { en: 'Shoulders', ko: '어깨' }, { en: 'Arms', ko: '팔' }, { en: 'Turns', ko: '턴' },
  { en: 'Shines', ko: '샤인' }, { en: 'Styling', ko: '스타일링' }, { en: 'Musicality', ko: '뮤지컬리티' },
];

export default function LandingView({ signedIn }: { signedIn: boolean }) {
  const { lang, setLang, T } = useLang();
  const c = useCopy(C);
  const go = signedIn ? '/today' : '/register';

  return (
    <div className="ld">
      <header className="lnav">
        <div className="wrap">
          <Link className="lg" href="/">
            Everyday Salsa<span className="dot">.</span>
          </Link>
          <nav className="links" aria-label="Main">
            <a href="#how">{c.navHow}</a>
            <a href="#what">{c.navWhat}</a>
            <a href="#price">{c.navPrice}</a>
          </nav>
          <div className="tools">
            <div className="lang">
              <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
              <button type="button" aria-pressed={lang === 'ko'} onClick={() => setLang('ko')}>KO</button>
            </div>
            {!signedIn && <Link className="in" href="/signin">{c.signIn}</Link>}
            <Link className="btn primary sm" href={go}>{signedIn ? c.today : c.start}</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="wrap hero">
          <div>
            <p className="eyebrow">{c.eyebrow}</p>
            <h1>
              {c.h1a} <em>{c.h1b}</em>
            </h1>
            <p className="lede">
              {c.lede} <b>{c.ledeB}</b>
            </p>
            <div className="ctas">
              <Link className="btn primary" href={go}>{PLAY}{signedIn ? c.today : c.cta}</Link>
              <a className="btn ghost" href="#week">{c.seeWeek}</a>
            </div>
            <p className="fine">{c.fine}</p>
          </div>

          <div className="show">
            <div className="phone" aria-label="The practice player, with Suim teaching">
              <div className="vp">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="blur" src="/images/suim-shine.jpg" alt="" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="pic" src="/images/suim-shine.jpg" alt="Suim demonstrating a shine in the practice player" />
                <div className="topbar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
                  <span>{c.pToday}</span>
                  <span className="sp" />
                  <span className="step">{c.pTrain}</span>
                </div>
                <div className="ctrls">
                  <div className="counts" aria-hidden="true">
                    <span>5</span><span className="on">6</span><span>7</span><span className="gap">8</span>
                  </div>
                  <div>
                    <h3>{c.pTitle}</h3>
                    <p>{c.pWith}</p>
                  </div>
                  <div className="track" aria-hidden="true"><span className="loopz" /><span className="played" /></div>
                  <div className="row">
                    <span className="ic play">{PLAY}</span>
                    <span className="time">1:32 / 4:00</span>
                    <span className="sp" />
                    <span className="spd">0.75×</span>
                    <span className="ic on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4" /><path d="M3 12V10a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 12v2a4 4 0 0 1-4 4H3" /></svg></span>
                    <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" strokeDasharray="3 3" /><path d="M8.5 8.5L4 12l4.5 3.5" /><path d="M15.5 8.5L20 12l-4.5 3.5" /></svg></span>
                  </div>
                </div>
              </div>
            </div>
            <div className="teacher">
              <span className="av">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/suim-shine.jpg" alt="" />
              </span>
              <div><b>{c.teacher}</b><span>{c.teacherP}</span></div>
            </div>
            <div className="today" aria-hidden="true">
              <span className="k">{c.todayCard}</span>
              <b>{c.todayT}</b>
              <div className="pips"><i className="d" /><i className="n" /><i /><i /></div>
            </div>
          </div>
        </section>

        <section className="stats" aria-label="In numbers">
          <div className="wrap">
            <div className="stat"><b>{c.s1}</b><span>{c.s1p}</span></div>
            <div className="stat"><b>{c.s2}</b><span>{c.s2p}</span></div>
            <div className="stat"><b>{c.s3}</b><span>{c.s3p}</span></div>
          </div>
        </section>

        <section className="wrap sec" id="how" aria-labelledby="how-h">
          <div className="sechead">
            <p className="eyebrow">{c.howK}</p>
            <h2 id="how-h">{c.howT}</h2>
            <p>{c.howP}</p>
          </div>
          <div className="how">
            <div className="step">
              <span className="n">1</span>
              <h3>{c.h1t}</h3>
              <p>{c.h1p}</p>
              <div className="demo lvl">
                <span className="on">{c.lvl1}</span><span>{c.lvl2}</span><span>{c.lvl3}</span>
              </div>
            </div>
            <div className="step">
              <span className="n">2</span>
              <h3>{c.h2t}</h3>
              <p>{c.h2p}</p>
              <div className="demo">
                {WEEK.slice(1, 2).map(w => (
                  <div className="row" key={w.d}><b>{T(w.t)}</b><span>{w.min} min</span></div>
                ))}
                <div className="row"><b>{lang === 'ko' ? '앞뒤 기본 스텝' : 'Forward and back basic'}</b><span>4 min</span></div>
                <div className="row"><b>{lang === 'ko' ? '박자에 맞춘 사이드 기본' : 'Side basic on the clock'}</b><span>5 min</span></div>
                <div className="row"><b>{lang === 'ko' ? '한 곡 춤추기' : 'Dance one song'}</b><span>3 min</span></div>
              </div>
            </div>
            <div className="step">
              <span className="n">3</span>
              <h3>{c.h3t}</h3>
              <p>{c.h3p}</p>
              <div className="demo">
                <div className="ctls" aria-hidden="true">
                  <i className="on">0.75×</i>
                  <i className="on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4" /><path d="M3 12V10a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 12v2a4 4 0 0 1-4 4H3" /></svg></i>
                  <i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" strokeDasharray="3 3" /><path d="M8.5 8.5L4 12l4.5 3.5" /><path d="M15.5 8.5L20 12l-4.5 3.5" /></svg></i>
                  <span className="sp" />
                </div>
                <div className="row"><span>{c.loopNote}</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap sec" id="week" aria-labelledby="week-h">
          <div className="weekgrid">
            <div>
              <div className="sechead">
                <p className="eyebrow">{c.weekK}</p>
                <h2 id="week-h">{c.weekT}</h2>
              </div>
              <div className="list">
                {WEEK.map(w => (
                  <div className={`row2${w.min === '—' ? ' rest' : ''}`} key={w.d}>
                    <span className="d">{w.d}</span>
                    <div><h3>{T(w.t)}</h3><p className="tags">{T(w.tags)}</p></div>
                    <span className="min">{w.min === '—' ? '—' : `${w.min} min`}</span>
                  </div>
                ))}
              </div>
            </div>
            <aside className="aside">
              <div><h3>{c.why1}</h3><p>{c.why1p}</p></div>
              <div><h3>{c.why2}</h3><p>{c.why2p}</p></div>
            </aside>
          </div>
        </section>

        <section className="wrap sec" id="what" aria-labelledby="what-h">
          <div className="method">
            <p className="eyebrow">{c.whatK}</p>
            <h2 id="what-h">{c.whatT}</h2>
            <p className="lede">{c.whatP}</p>
            <div className="tags">
              {TAGS.map(t => (
                <span key={t.en}>{T(t)}</span>
              ))}
            </div>
            <p className="note">{c.whatNote}</p>
          </div>
        </section>

        <section className="wrap sec" aria-labelledby="who-h">
          <div className="sechead">
            <p className="eyebrow">{c.whoK}</p>
            <h2 id="who-h">{c.whoT}</h2>
          </div>
          <div className="who">
            <div><h3>{c.w1}</h3><p>{c.w1p}</p></div>
            <div><h3>{c.w2}</h3><p>{c.w2p}</p></div>
            <div><h3>{c.w3}</h3><p>{c.w3p}</p></div>
          </div>
        </section>

        <section className="wrap sec" id="price" aria-labelledby="price-h">
          <div className="price">
            <div className="sechead" style={{ marginBottom: 0 }}>
              <p className="eyebrow">{c.priceK}</p>
              <h2 id="price-h">{c.priceT}</h2>
              <p>{c.priceP}</p>
            </div>
            <div className="pcard">
              <span className="tag">{c.plan}</span>
              <div className="amt"><b>{c.amount}</b><span>{c.per}</span></div>
              <ul>
                {[c.f1, c.f2, c.f3, c.f4, c.f5].map(f => (
                  <li key={f}>{CHECK}{f}</li>
                ))}
              </ul>
              <Link className="btn primary" href={go}>{signedIn ? c.today : c.start}</Link>
              <p className="fine">{c.priceFine}</p>
            </div>
          </div>
        </section>

        <section className="wrap final">
          <h2>{c.finalT}</h2>
          <p>{c.finalP}</p>
          <Link className="btn primary" href={go}>{PLAY}{signedIn ? c.today : c.cta}</Link>
        </section>

        <footer className="wrap lfoot">
          <span>
            Everyday Salsa<span className="dot">.</span> {c.footPrograms}
          </span>
          {/* Help and Privacy come back as links when their pages exist; as
              plain text they looked like links that did nothing. */}
          <div className="fl">
            {!signedIn && <Link href="/signin">{c.signIn}</Link>}
          </div>
        </footer>
      </main>
    </div>
  );
}
