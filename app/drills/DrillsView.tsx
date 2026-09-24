'use client';

/* My drills: build a drill from the videos you train, then place it in your
   week. The prototype's drills.html made real.

   Two departures from the prototype, both deliberate. Placing a drill on a day
   is a row of day buttons on the drill, not a drag onto the day: HTML5 drag
   does not fire on touch, and a phone in a practice room is the likely
   device. And adding a video to a drill is a tap on its card, for the same
   reason; the order is fixed with the arrows in the list. */

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useCopy, useLang } from '@/lib/lang';
import type { Copy } from '@/lib/lang';
import { stepOf } from '@/lib/content';
import { mmss } from '@/lib/db';
import { signInHref } from '@/lib/safe-next';
import { playlistLengthMs } from '@/lib/playlist';
import type { Drill, LibraryVideo } from '@/lib/drills';
import { addSlot, createDrill, deleteDrill, removeSlot, updateDrill, type Result } from './actions';

type Key =
  | 'kicker' | 'h1' | 'sub' | 'st1b' | 'st1' | 'st2b' | 'st2' | 'st3b' | 'st3'
  | 'newBtn' | 'yours' | 'weekT' | 'playDay' | 'play' | 'edit' | 'delete' | 'placeOn'
  | 'emptyDrills' | 'emptyWeek' | 'dropHere' | 'signInT' | 'signInGo'
  | 'mNew' | 'mEdit' | 'mSub' | 'fAll' | 'fTrain' | 'fDrill' | 'library'
  | 'noLibrary' | 'noLibraryGo' | 'mMade' | 'emptyChain' | 'namePh' | 'saveBtn' | 'saving'
  | 'aClose' | 'aRemove' | 'aUp' | 'aDown' | 'missing' | 'confirmDelete'
  | 'footer' | 'signout';

const C: Copy<Key> = {
  en: {
    kicker: 'Build your own practice', h1: 'My drills',
    sub: 'A drill is a short run of videos you already know, played back to back — your own practice rather than a session someone built for you.',
    st1b: 'Create a drill', st1: 'Pick Train and Drill videos and put them in the order you want.',
    st2b: 'Name and save it', st2: 'It joins your drills, with its total running time.',
    st3b: 'Place it on a day', st3: 'Place it twice to run it twice. Then play the day straight through.',
    newBtn: '+ Create a drill', yours: 'Your drills', weekT: 'Your week', playDay: 'Play the day',
    play: 'Play', edit: 'Edit', delete: 'Delete', placeOn: 'Place on',
    emptyDrills: 'No drills yet. Create one to get started.', emptyWeek: 'Nothing placed this week yet.',
    dropHere: 'Nothing here yet — place a drill on this day from the list.',
    signInT: 'Drills are your own practice, so they need an account.', signInGo: 'Sign in ↗',
    mNew: 'Create a drill', mEdit: 'Edit drill',
    mSub: 'Tap a video to add it, in the order you want to run them. The same video can go in more than once.',
    fAll: 'All', fTrain: 'Train', fDrill: 'Drill', library: 'Videos you can drill',
    noLibrary: 'Nothing to drill yet. Train and Drill videos appear here as sessions are published.',
    noLibraryGo: 'See the masterplan →',
    mMade: 'Your drill', emptyChain: 'Tap a video on the left to start.', namePh: 'Name this drill',
    saveBtn: 'Save', saving: 'Saving…', aClose: 'Close', aRemove: 'Remove', aUp: 'Move earlier', aDown: 'Move later',
    missing: 'No longer available', confirmDelete: 'Delete this drill? It comes off your week too.',
    footer: 'Solo salsa training · Built around practice', signout: 'Sign out',
  },
  ko: {
    kicker: '나만의 연습 만들기', h1: '나의 드릴',
    sub: '드릴은 이미 아는 영상을 이어서 실행하는 짧은 흐름입니다. 남이 짜준 세션이 아니라 나만의 연습입니다.',
    st1b: '드릴 만들기', st1: '훈련·드릴 영상을 원하는 순서로 고릅니다.',
    st2b: '이름 짓고 저장', st2: '총 실행 시간과 함께 나의 드릴에 추가됩니다.',
    st3b: '요일에 놓기', st3: '두 번 놓으면 두 번 실행합니다. 그다음 그 날을 통째로 재생하세요.',
    newBtn: '+ 드릴 만들기', yours: '나의 드릴', weekT: '주간 계획', playDay: '이 날 재생',
    play: '재생', edit: '수정', delete: '삭제', placeOn: '요일에 놓기',
    emptyDrills: '아직 드릴이 없습니다. 하나 만들어 보세요.', emptyWeek: '이번 주에 놓인 드릴이 없습니다.',
    dropHere: '아직 비어 있습니다. 목록에서 드릴을 이 요일에 놓으세요.',
    signInT: '드릴은 나만의 연습이라 계정이 필요합니다.', signInGo: '로그인 ↗',
    mNew: '드릴 만들기', mEdit: '드릴 수정',
    mSub: '실행할 순서대로 영상을 눌러 추가하세요. 같은 영상을 여러 번 넣어도 됩니다.',
    fAll: '전체', fTrain: '훈련', fDrill: '드릴', library: '드릴에 넣을 수 있는 영상',
    noLibrary: '아직 드릴할 영상이 없습니다. 세션이 공개되면 훈련·드릴 영상이 여기에 나타납니다.',
    noLibraryGo: '마스터플랜 보기 →',
    mMade: '내 드릴', emptyChain: '왼쪽에서 영상을 눌러 시작하세요.', namePh: '드릴 이름',
    saveBtn: '저장', saving: '저장 중…', aClose: '닫기', aRemove: '빼기', aUp: '앞으로', aDown: '뒤로',
    missing: '더 이상 볼 수 없음', confirmDelete: '이 드릴을 삭제할까요? 주간 계획에서도 빠집니다.',
    footer: '연습을 중심으로 설계한 솔로 살사 트레이닝', signout: '로그아웃',
  },
};

const DAYS = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ko: ['월', '화', '수', '목', '금', '토', '일'],
};
const DAYS_LONG = {
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  ko: ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
};

const two = (n: number) => String(n).padStart(2, '0');
const drillLength = (d: Drill) =>
  playlistLengthMs(d.items.filter(i => i.video).map(i => ({ video: i.video!, repeats: i.repeats, speed: null })));

const PLAY = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

type Editing = { mode: 'new' } | { mode: 'edit'; drill: Drill };

export default function DrillsView({
  drills,
  library,
  posters,
  signedIn,
}: {
  drills: Drill[];
  library: LibraryVideo[];
  posters: Record<string, string>;
  signedIn: boolean;
}) {
  const { lang, T } = useLang();
  const c = useCopy(C);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
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

  const byId = new Map(library.map(v => [v.id, v]));
  const runsOn = (day: number) =>
    drills
      .flatMap(d => d.slots.filter(s => s.weekday === day).map(slot => ({ slot, drill: d })))
      .sort((a, b) => a.slot.createdAt.localeCompare(b.slot.createdAt));
  const runsThisWeek = drills.reduce((n, d) => n + d.slots.length, 0);

  return (
    <div className="dr">
      <main className="wrap main">
        <section className="head">
          <div>
            <div className="kicker">{c.kicker}</div>
            <h1>{c.h1}</h1>
            <p>{c.sub}</p>
            <ol className="steps">
              <li><b>{c.st1b}</b><span>{c.st1}</span></li>
              <li><b>{c.st2b}</b><span>{c.st2}</span></li>
              <li><b>{c.st3b}</b><span>{c.st3}</span></li>
            </ol>
          </div>
          {signedIn ? (
            <button className="pill primary" type="button" onClick={() => setEditing({ mode: 'new' })}>
              {c.newBtn}
            </button>
          ) : (
            <Link className="pill primary" href={signInHref('/drills')}>
              {c.signInGo}
            </Link>
          )}
        </section>

        {error && <p className="banner">{error}</p>}

        {!signedIn ? (
          <p className="signin-note">{c.signInT}</p>
        ) : (
          <div className="cols">
            <section className="panel">
              <div className="phead">
                <h2>{c.yours}</h2>
                <span className="note">{drills.length}</span>
              </div>
              <div className="drills">
                {drills.length === 0 && <p className="none">{c.emptyDrills}</p>}
                {drills.map(drill => {
                  const first = drill.items.find(i => i.video)?.video;
                  const n = drill.items.length;
                  return (
                    <article className="tile" key={drill.id}>
                      <Link className="thumb" href={`/drills/${drill.id}/play`} aria-label={`${c.play}: ${drill.name}`}>
                        {first && posters[first.id] && <img src={posters[first.id]} alt="" loading="lazy" />}
                        <span className="g">{PLAY}</span>
                        <span className="dur">{mmss(drillLength(drill) || null)}</span>
                      </Link>
                      <span className="nm">{drill.name}</span>
                      <span className="mt">
                        {lang === 'ko' ? `영상 ${n}개` : `${n} video${n === 1 ? '' : 's'}`}
                        {drill.items.some(i => !i.video) && ` · ${c.missing}`}
                      </span>
                      <div className="tacts">
                        <Link className="tb primary" href={`/drills/${drill.id}/play`}>{c.play}</Link>
                        <button className="tb" type="button" onClick={() => setEditing({ mode: 'edit', drill })}>{c.edit}</button>
                        <button
                          className="tb"
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (confirm(c.confirmDelete)) run(() => deleteDrill(drill.id));
                          }}
                        >
                          {c.delete}
                        </button>
                      </div>
                      <div className="place">
                        <span>{c.placeOn}</span>
                        {DAYS[lang].map((d, di) => {
                          const count = drill.slots.filter(s => s.weekday === di).length;
                          return (
                            <button
                              key={di}
                              className={`dayb${count ? ' on' : ''}`}
                              type="button"
                              disabled={pending}
                              title={DAYS_LONG[lang][di]}
                              onClick={() => run(() => addSlot(drill.id, di))}
                            >
                              {d}
                              {count > 1 && <i>{count}</i>}
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="panel">
              <div className="phead">
                <h2>{c.weekT}</h2>
                <span className="note">
                  {runsThisWeek === 0 ? c.emptyWeek : lang === 'ko' ? `이번 주 ${runsThisWeek}회` : `${runsThisWeek} run${runsThisWeek === 1 ? '' : 's'} this week`}
                </span>
              </div>
              <div className="week">
                {DAYS_LONG[lang].map((day, di) => {
                  const runs = runsOn(di);
                  return (
                    <div className={`day${runs.length ? ' has' : ''}`} key={di}>
                      <span className="dl">
                        {DAYS[lang][di]}
                        {runs.length > 0 && (
                          <Link className="playday" href={`/drills/day/${di}`} title={day}>
                            <span>{PLAY}</span>
                            {c.playDay}
                          </Link>
                        )}
                      </span>
                      <div className={`zone${runs.length ? '' : ' empty'}`}>
                        {runs.length === 0
                          ? c.dropHere
                          : runs.map(({ slot, drill }, i) => (
                              <div className="slot" key={slot.id}>
                                <span className="ord" aria-hidden="true">{i + 1}</span>
                                <span className="sname">{drill.name}</span>
                                <span className="sdur">{mmss(drillLength(drill) || null)}</span>
                                <button
                                  className="kill"
                                  type="button"
                                  disabled={pending}
                                  aria-label={c.aRemove}
                                  title={c.aRemove}
                                  onClick={() => run(() => removeSlot(slot.id))}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>

      {editing && (
        <DrillDialog
          editing={editing}
          library={library}
          posters={posters}
          byId={byId}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(name, ids) =>
            run(
              () => (editing.mode === 'new' ? createDrill(name, ids) : updateDrill(editing.drill.id, name, ids)),
              () => setEditing(null),
            )
          }
        />
      )}

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

/* The create / edit dialog: the library on the left, the drill being built on
   the right. A native <dialog>, so Escape, focus and the backdrop are free. */
function DrillDialog({
  editing,
  library,
  posters,
  byId,
  pending,
  onClose,
  onSave,
}: {
  editing: Editing;
  library: LibraryVideo[];
  posters: Record<string, string>;
  byId: Map<string, LibraryVideo>;
  pending: boolean;
  onClose: () => void;
  onSave: (name: string, videoIds: string[]) => void;
}) {
  const { lang, T } = useLang();
  const c = useCopy(C);
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(editing.mode === 'edit' ? editing.drill.name : '');
  const [picked, setPicked] = useState<string[]>(
    editing.mode === 'edit' ? editing.drill.items.filter(i => i.video).map(i => i.video!.id) : [],
  );
  const [filter, setFilter] = useState<'all' | 'train' | 'drill'>('all');

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

  const shown = library.filter(v => filter === 'all' || v.step === filter);
  const count = (f: 'all' | 'train' | 'drill') => library.filter(v => f === 'all' || v.step === f).length;
  const total = playlistLengthMs(picked.map(id => ({ video: byId.get(id)!, repeats: 1, speed: null })).filter(e => e.video));

  /* Grouped by program, then session, in the order the library came in. */
  const groups: { key: string; label: string; videos: LibraryVideo[] }[] = [];
  for (const v of shown) {
    const key = `${v.program.slug}/${v.session.id}`;
    const label = `${T(v.program.title)} · ${lang === 'ko' ? '세션' : 'Session'} ${two(v.session.position)} · ${T(v.session.title)}`;
    const g = groups.find(x => x.key === key);
    if (g) g.videos.push(v);
    else groups.push({ key, label, videos: [v] });
  }

  const move = (i: number, dir: -1 | 1) =>
    setPicked(p => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const next = [...p];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <dialog
      className="modal"
      ref={ref}
      aria-labelledby="drill-dialog-title"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mhead">
        <div>
          <h2 id="drill-dialog-title">{editing.mode === 'new' ? c.mNew : c.mEdit}</h2>
          <p>{c.mSub}</p>
        </div>
        <button className="close" type="button" onClick={onClose} aria-label={c.aClose}>
          ×
        </button>
      </div>

      <div className="mbody">
        <div className="pick">
          {library.length === 0 ? (
            <div className="nolib">
              <p>{c.noLibrary}</p>
              <Link className="pill ghost onpaper sm" href="/masterplan">{c.noLibraryGo}</Link>
            </div>
          ) : (
            <>
              <div className="tags" role="group" aria-label={c.library}>
                {(['all', 'train', 'drill'] as const).map(f => (
                  <button key={f} className="tag" type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                    {f === 'all' ? c.fAll : f === 'train' ? c.fTrain : c.fDrill}
                    <i>{count(f)}</i>
                  </button>
                ))}
              </div>
              {groups.map(g => (
                <div key={g.key}>
                  <p className="sec">{g.label}</p>
                  <div className="grid">
                    {g.videos.map(v => (
                      <button key={v.id} className="vcard" type="button" onClick={() => setPicked(p => [...p, v.id])}>
                        <span className="vthumb">
                          {posters[v.id] && <img src={posters[v.id]} alt="" loading="lazy" />}
                          <span className="g">{PLAY}</span>
                          <span className="d">{mmss(v.durationMs)}</span>
                        </span>
                        <span className="t">{T(stepOf(v.step).name)}</span>
                        <span className="n">{T(v.title)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="made">
          <div className="mtop">
            <h3>{c.mMade}</h3>
            <span className="tot">{mmss(total || null)}</span>
          </div>
          <div className="list">
            {picked.length === 0 ? (
              <div className="blank">{c.emptyChain}</div>
            ) : (
              picked.map((id, i) => {
                const v = byId.get(id);
                return (
                  <div className="link" key={`${id}-${i}`}>
                    <span className="ix">{two(i + 1)}</span>
                    <span className="n">
                      <em>{v ? T(stepOf(v.step).name) : ''}</em>
                      <b>{v ? T(v.title) : c.missing}</b>
                    </span>
                    <span className="d">{v ? mmss(v.durationMs) : '—'}</span>
                    <span className="ops">
                      <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={c.aUp} title={c.aUp}>↑</button>
                      <button type="button" disabled={i === picked.length - 1} onClick={() => move(i, 1)} aria-label={c.aDown} title={c.aDown}>↓</button>
                      <button type="button" onClick={() => setPicked(p => p.filter((_, k) => k !== i))} aria-label={c.aRemove} title={c.aRemove}>×</button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <form
            className="mfoot"
            onSubmit={e => {
              e.preventDefault();
              if (name.trim() && picked.length) onSave(name, picked);
            }}
          >
            <input value={name} placeholder={c.namePh} maxLength={80} onChange={e => setName(e.target.value)} aria-label={c.namePh} />
            <button className="pill primary sm" type="submit" disabled={pending || !name.trim() || picked.length === 0}>
              {pending ? c.saving : c.saveBtn}
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
