'use client';

/* The practice player.

   Drawn the way the prototype's session.html drew it — controls laid over the
   picture, a scrub bar carrying the loop zone and the phrase marks, a strip of
   the session's parts underneath — but every mark on it is real:

   - The phrase marks, the counts overlay and "loop eight counts" come from the
     beat grid (bpm, first beat, beats per phrase) filled in the back office. A
     video without a grid shows none of them rather than inventing some.
   - The loop is checked every presented frame, off requestVideoFrameCallback
     (requestAnimationFrame where there is none) — never off timeupdate, which
     fires four times a second and makes a loop breathe. BUILD-PLAN §5.
   - Speed is remembered per step, not globally: a dancer wants DRILL slow and
     WATCH at 1×, every time.

   HLS needs hls.js everywhere except Safari; the short MP4 rendition never
   does. Which a video gets is BUILD-PLAN §3: under ~150s and drillable plays
   from MP4, which seeks instantly; everything else is HLS. */

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useCopy, useLang } from '@/lib/lang';
import type { Copy } from '@/lib/lang';
import { LEVEL_LABELS, stepOf } from '@/lib/content';
import { mmss } from '@/lib/db';
import { signInHref } from '@/lib/safe-next';
import type { SessionDetail, SessionVideoSummary } from '@/lib/catalogue';
import { getPlayback, type PlaybackResult } from '../actions';

type Key =
  | 'sessionOf' | 'total' | 'prevS' | 'nextS' | 'lastSession' | 'finish'
  | 'listT' | 'notReady' | 'loading' | 'signInT' | 'signInGo' | 'focus' | 'keys'
  | 'aPlay' | 'aPause' | 'aSpeed' | 'aMirror' | 'aFull' | 'aExitFull' | 'aCounts'
  | 'aLoop8' | 'aLoopAB' | 'aRepeat' | 'aSeek'
  | 'footer' | 'signout';

const C: Copy<Key> = {
  en: {
    sessionOf: 'Session', total: 'total', prevS: '← Previous', nextS: 'Next session →',
    lastSession: 'Last session', finish: 'Finish the module →',
    listT: 'Videos in this session', notReady: 'Being filmed', loading: 'Loading…',
    signInT: 'Sign in to watch this session.', signInGo: 'Sign in ↗',
    focus: 'What to focus on',
    keys: 'Space play · ← → 5 s · , . one frame · L loop · M mirror · 1–4 speed · F full screen',
    aPlay: 'Play', aPause: 'Pause', aSpeed: 'Playback speed', aMirror: 'Mirror the picture',
    aFull: 'Full screen', aExitFull: 'Exit full screen', aCounts: 'Counts',
    aLoop8: 'Loop eight counts', aLoopAB: 'Loop the marked section', aRepeat: 'Repeat this video',
    aSeek: 'Position in the video',
    footer: 'Solo salsa training · Built around practice', signout: 'Sign out',
  },
  ko: {
    sessionOf: '세션', total: '분량', prevS: '← 이전', nextS: '다음 세션 →',
    lastSession: '마지막 세션', finish: '모듈 마치기 →',
    listT: '이 세션의 영상', notReady: '촬영 중', loading: '불러오는 중…',
    signInT: '로그인하면 이 세션을 볼 수 있습니다.', signInGo: '로그인 ↗',
    focus: '이것에 집중하세요',
    keys: 'Space 재생 · ← → 5초 · , . 한 프레임 · L 반복 · M 반전 · 1–4 속도 · F 전체 화면',
    aPlay: '재생', aPause: '일시정지', aSpeed: '재생 속도', aMirror: '좌우 반전',
    aFull: '전체 화면', aExitFull: '전체 화면 종료', aCounts: '카운트',
    aLoop8: '8카운트 반복', aLoopAB: '표시된 구간 반복', aRepeat: '이 영상 반복',
    aSeek: '영상 위치',
    footer: '연습을 중심으로 설계한 솔로 살사 트레이닝', signout: '로그아웃',
  },
};

const two = (n: number) => String(n).padStart(2, '0');
const SPEEDS = [0.5, 0.75, 1, 1.25];
const FRAME = 1 / 30;
const SPEED_STORE = 'suim-speed';

/** m:ss for a clock, where 0:00 is a real time — unlike mmss(), which reads
    a missing duration as "—". */
const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${two(s % 60)}`;
};

/** BUILD-PLAN §3: a video under ~150s and marked drillable plays from the
    progressive MP4, because it seeks instantly and a tight loop needs that. */
const usesMp4 = (v: SessionVideoSummary) =>
  v.isDrillable && v.durationMs != null && v.durationMs < 150_000;

/* ---- the beat grid ------------------------------------------------------- */

const beatMs = (v: SessionVideoSummary) => (v.bpm ? 60_000 / v.bpm : null);
const phraseMs = (v: SessionVideoSummary) => {
  const b = beatMs(v);
  return b ? b * v.beatsPerPhrase : null;
};

/** Phrase boundaries for the scrub bar, thinned so a long video is marked every
    few phrases rather than striped solid. Always on a phrase, never between. */
function phraseMarks(v: SessionVideoSummary, durationMs: number): number[] {
  const p = phraseMs(v);
  if (!p || !durationMs) return [];
  const first = v.firstBeatMs ?? 0;
  const stride = Math.max(1, Math.ceil((durationMs - first) / p / 16));
  const marks: number[] = [];
  for (let at = first + p * stride; at < durationMs; at += p * stride) marks.push(at);
  return marks;
}

interface Region {
  a: number;
  b: number;
}

/** The loop a press of L gives: the back office's default if there is one,
    otherwise the eight counts under the playhead. No grid, no region — the
    whole video repeats instead. */
function regionAt(v: SessionVideoSummary, atMs: number): Region | null {
  if (v.loopStartMs != null && v.loopEndMs != null && v.loopEndMs > v.loopStartMs) {
    return { a: v.loopStartMs, b: v.loopEndMs };
  }
  const p = phraseMs(v);
  if (!p) return null;
  const first = v.firstBeatMs ?? 0;
  const n = Math.max(0, Math.floor((atMs - first) / p));
  return { a: first + n * p, b: first + (n + 1) * p };
}

/** Salsa phrasing: 1 2 3 · 5 6 7 · — the 4 and the 8 are held, not stepped. */
const countLabels = (beats: number) =>
  Array.from({ length: beats }, (_, i) => (beats === 8 && (i === 3 || i === 7) ? '·' : String(i + 1)));

/* ---- the component ------------------------------------------------------- */

export default function SessionPlayer({
  session,
  initialVideoId,
  initialPlayback,
  posters,
  signedIn,
}: {
  session: SessionDetail;
  initialVideoId: string | null;
  initialPlayback: PlaybackResult | null;
  /** Signed thumbnails by video id, for the list beside the player. */
  posters: Record<string, string>;
  signedIn: boolean;
}) {
  const { T } = useLang();
  const c = useCopy(C);

  const [currentId, setCurrentId] = useState(initialVideoId);
  /* Keyed by video so a signed URL can never be attached to a different video
     than the one it was minted for — including going back to the first one. */
  const [signed, setSigned] = useState<{ videoId: string; result: PlaybackResult } | null>(
    initialVideoId && initialPlayback ? { videoId: initialVideoId, result: initialPlayback } : null,
  );
  /* An MP4 rendition only exists once downloads are enabled on the video, so a
     404 on it falls back to HLS rather than leaving a black frame. */
  const [mp4Failed, setMp4Failed] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [mirrored, setMirrored] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [loopOn, setLoopOn] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [countsOn, setCountsOn] = useState(true);
  const [beat, setBeat] = useState<number | null>(null);
  const [idle, setIdle] = useState(false);
  const [durationS, setDurationS] = useState(0);
  /* width / height as the browser actually decoded it, per video. Trusted over
     the stored value, which only exists to get the first paint right. */
  const [measured, setMeasured] = useState<Record<string, number>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const playedRef = useRef<HTMLSpanElement | null>(null);
  const timeRef = useRef<HTMLSpanElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const autoplayRef = useRef(false);
  const overriddenMirror = useRef(false);

  const current = session.videos.find(v => v.id === currentId) ?? null;
  const index = current ? session.videos.indexOf(current) : -1;
  const grid = Boolean(current?.bpm);

  /* ---- per video: mirror default, remembered speed, fresh state ---------- */

  useEffect(() => {
    if (!current) return;
    if (!overriddenMirror.current) setMirrored(current.mirrorDefault);
    let stored: Record<string, number> = {};
    try {
      stored = JSON.parse(localStorage.getItem(SPEED_STORE) ?? '{}');
    } catch {
      /* private mode: every step starts at its default */
    }
    setSpeed(stored[current.step] ?? (current.isDrillable ? 0.75 : 1));
    setStarted(false);
    setRegion(null);
    setLoopOn(false);
    setBeat(null);
    setDurationS((current.durationMs ?? 0) / 1000);
  }, [current]);

  const chooseSpeed = useCallback(
    (next: number) => {
      setSpeed(next);
      if (!current) return;
      try {
        const stored = JSON.parse(localStorage.getItem(SPEED_STORE) ?? '{}');
        localStorage.setItem(SPEED_STORE, JSON.stringify({ ...stored, [current.step]: next }));
      } catch {
        /* the choice still holds for this visit */
      }
    },
    [current],
  );

  /* ---- signed source ------------------------------------------------------ */

  const playback = signed && signed.videoId === currentId ? signed.result : null;
  const loading = Boolean(currentId) && !playback;
  useEffect(() => {
    if (!currentId || signed?.videoId === currentId) return;
    let cancelled = false;
    getPlayback(currentId).then(result => {
      if (!cancelled) setSigned({ videoId: currentId, result });
    });
    return () => {
      cancelled = true;
    };
  }, [currentId, signed]);

  const viaHls = Boolean(current) && (!usesMp4(current!) || mp4Failed === current!.id);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !playback?.ok) return;

    const src = viaHls ? playback.hls : playback.mp4;
    if (viaHls && !el.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()) {
      const instance = new Hls();
      instance.loadSource(src);
      instance.attachMedia(el);
      hlsRef.current = instance;
    } else {
      el.src = src;
    }
    /* The first tap on a session arms playback for the rest of it: the next
       video starts on its own, and so does one picked while playing. */
    if (autoplayRef.current) {
      autoplayRef.current = false;
      el.play().catch(() => {});
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      el.removeAttribute('src');
    };
  }, [playback, viaHls]);

  /* defaultPlaybackRate too, because loading a new source resets playbackRate
     to it. Pitch is kept, or the music drops a fifth at 0.5×. */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.defaultPlaybackRate = speed;
    el.playbackRate = speed;
    el.preservesPitch = true;
    (el as HTMLVideoElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
  }, [speed]);

  /* ---- painting and the loop, every frame -------------------------------- */

  const paint = useCallback(() => {
    const el = videoRef.current;
    if (!el || !current) return;
    const d = el.duration && Number.isFinite(el.duration) ? el.duration : (current.durationMs ?? 0) / 1000;
    const t = el.currentTime;
    const pct = d ? `${Math.min(100, (t / d) * 100)}%` : '0%';
    if (playedRef.current) playedRef.current.style.width = pct;
    if (fillRef.current) fillRef.current.style.width = pct;
    if (timeRef.current) timeRef.current.textContent = `${clock(t)} / ${clock(d)}`;
    const b = beatMs(current);
    if (b) {
      const n = Math.floor((t * 1000 - (current.firstBeatMs ?? 0)) / b);
      setBeat(n < 0 ? null : n % current.beatsPerPhrase);
    }
  }, [current]);

  const loopRef = useRef<Region | null>(null);
  loopRef.current = loopOn ? region : null;

  useEffect(() => {
    const el = videoRef.current as (HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
      cancelVideoFrameCallback?: (h: number) => void;
    }) | null;
    if (!el || !playing) return;
    const perFrame = typeof el.requestVideoFrameCallback === 'function';
    let handle = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const L = loopRef.current;
      /* Jump one frame early, so the seek lands before B rather than after. */
      if (L && el.currentTime >= L.b / 1000 - FRAME) el.currentTime = L.a / 1000;
      paint();
      handle = perFrame ? el.requestVideoFrameCallback!(tick) : requestAnimationFrame(tick);
    };
    handle = perFrame ? el.requestVideoFrameCallback!(tick) : requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (perFrame) el.cancelVideoFrameCallback?.(handle);
      else cancelAnimationFrame(handle);
    };
  }, [playing, paint]);

  /* ---- controls ----------------------------------------------------------- */

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, []);

  const toggleLoop = useCallback(() => {
    const el = videoRef.current;
    if (!el || !current) return;
    if (loopOn) {
      setLoopOn(false);
      el.loop = false;
      return;
    }
    const r = regionAt(current, el.currentTime * 1000);
    setRegion(r);
    setLoopOn(true);
    /* No grid and no default: the whole video repeats. */
    el.loop = !r;
    if (r && (el.currentTime * 1000 < r.a || el.currentTime * 1000 > r.b)) el.currentTime = r.a / 1000;
  }, [current, loopOn]);

  const toggleMirror = useCallback(() => {
    overriddenMirror.current = true;
    setMirrored(m => !m);
  }, []);

  const pick = useCallback((id: string) => {
    autoplayRef.current = Boolean(videoRef.current && !videoRef.current.paused);
    setCurrentId(id);
  }, []);

  const onEnded = useCallback(() => {
    if (loopOn) return;
    const next = session.videos.slice(index + 1).find(v => v.status === 'ready');
    if (next) {
      autoplayRef.current = true;
      setCurrentId(next.id);
    }
  }, [index, loopOn, session.videos]);

  /* Scrubbing: press anywhere on the bar, drag to keep seeking. */
  const seekTo = (clientX: number) => {
    const el = videoRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const box = track.getBoundingClientRect();
    const d = el.duration && Number.isFinite(el.duration) ? el.duration : durationS;
    el.currentTime = Math.min(1, Math.max(0, (clientX - box.left) / box.width)) * d;
    paint();
  };

  /* ---- full screen -------------------------------------------------------- */

  useEffect(() => {
    const onChange = () => {
      const on = fullscreenElement() === playerRef.current;
      setFullscreen(on);
      if (!on) (screen.orientation as LockableOrientation | undefined)?.unlock?.();
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const aspect = (current && (measured[current.id] ?? current.aspect)) || 16 / 9;
  const orientation: 'portrait' | 'landscape' = aspect < 1 ? 'portrait' : 'landscape';

  /* The whole player goes full screen, not just the <video>, so the mirror and
     the controls come with it. */
  const toggleFullscreen = useCallback(async () => {
    const player = playerRef.current as FullscreenCapable | null;
    const video = videoRef.current as FullscreenCapable | null;
    if (!player) return;
    if (fullscreenElement()) {
      await (document.exitFullscreen?.() ?? (document as FullscreenDocument).webkitExitFullscreen?.());
      return;
    }
    try {
      if (player.requestFullscreen) await player.requestFullscreen();
      else if (player.webkitRequestFullscreen) player.webkitRequestFullscreen();
      /* iPhone Safari has no element full screen — only the video's own, which
         drops the mirror and the speed control. Better than nothing. */
      else video?.webkitEnterFullscreen?.();
    } catch {
      return;
    }
    (screen.orientation as LockableOrientation | undefined)?.lock?.(orientation).catch(() => {});
  }, [orientation]);

  /* ---- keyboard ----------------------------------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const el = videoRef.current;
      if (!el) return;
      const k = e.key.toLowerCase();
      /* Space on a focused button is that button's own click. */
      if (k === ' ' && target?.closest('button, a')) return;
      if (k === ' ' || k === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (k === 'arrowleft' || k === 'arrowright') {
        e.preventDefault();
        el.currentTime = Math.max(0, el.currentTime + (k === 'arrowleft' ? -5 : 5));
        paint();
      } else if (k === ',' || k === '.') {
        el.pause();
        el.currentTime = Math.max(0, el.currentTime + (k === ',' ? -FRAME : FRAME));
        paint();
      } else if (k === 'l') toggleLoop();
      else if (k === 'm') toggleMirror();
      else if (k === 'f') toggleFullscreen();
      else if (k === 'c' && grid) setCountsOn(o => !o);
      else if (['1', '2', '3', '4'].includes(k)) chooseSpeed(SPEEDS[Number(k) - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, toggleLoop, toggleMirror, toggleFullscreen, chooseSpeed, paint, grid]);

  /* ---- a phone that sleeps mid-drill is the worst bug this product can ship */

  useEffect(() => {
    if (!playing || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = () =>
      navigator.wakeLock.request('screen').then(l => {
        if (cancelled) l.release();
        else lock = l;
      }).catch(() => {});
    acquire();
    /* The browser drops the lock when the tab is hidden; take it back. */
    const onVisible = () => document.visibilityState === 'visible' && acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, [playing]);

  /* ---- controls fade while dancing, come back on any movement ------------ */

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wake = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2500);
  }, []);
  useEffect(() => () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
  }, []);

  /* ---- signed out, or nothing filmed yet --------------------------------- */

  if (!current) {
    return (
      <div className="sp">
        <div className="sp-empty">
          <Link className="crumb" href={`/programs/${session.program.id}`}>
            <span aria-hidden="true">←</span>
            <span>{T(session.program.title)}</span>
          </Link>
          <h1>{T(session.title)}</h1>
          {signedIn ? (
            <p>{c.notReady}</p>
          ) : (
            <>
              <p>{c.signInT}</p>
              <Link className="pill primary sm" href={signInHref(`/sessions/${session.id}`)}>
                {c.signInGo}
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const hasPrev = Boolean(session.prevSessionId);
  const hasNext = Boolean(session.nextSessionId);
  const step = stepOf(current.step);
  const durationMs = durationS * 1000 || current.durationMs || 0;
  const marks = phraseMarks(current, durationMs);
  const shownRegion = loopOn && region && durationMs ? region : null;
  const loopLabel =
    current.loopStartMs != null && current.loopEndMs != null ? c.aLoopAB : grid ? c.aLoop8 : c.aRepeat;
  const levels = session.levels.map(k => T(LEVEL_LABELS[k])).join(' · ');

  /* Where each part sits in the session, summed from the videos' own lengths. */
  let at = 0;
  const spans = session.videos.map(v => {
    const from = at;
    at += (v.durationMs ?? 0) / 1000;
    return { from, to: at, known: v.durationMs != null };
  });

  const nextHref = hasNext ? `/sessions/${session.nextSessionId}` : `/programs/${session.program.id}`;

  return (
    <div className="sp">
      <div className="subnav">
        <div className="wrap subin">
          <Link className="crumb" href={`/programs/${session.program.id}`}>
            <span aria-hidden="true">←</span>
            <span>{T(session.program.title)}</span>
          </Link>
          <div className="where">
            <span className="lv">
              {c.sessionOf} {two(session.position)}
              {levels && ` · ${levels}`}
            </span>
            <h1>{T(session.title)}</h1>
            <span className="len">
              {mmss(session.videos.reduce((n, v) => n + (v.durationMs ?? 0), 0))} {c.total}
            </span>
          </div>
          <nav className="hop" aria-label="Sessions">
            <Link
              className={hasPrev ? '' : 'off'}
              href={hasPrev ? `/sessions/${session.prevSessionId}` : '#'}
              aria-disabled={!hasPrev}
            >
              {c.prevS}
            </Link>
            <Link
              className={hasNext ? '' : 'off'}
              href={hasNext ? `/sessions/${session.nextSessionId}` : '#'}
              aria-disabled={!hasNext}
            >
              {hasNext ? c.nextS : c.lastSession}
            </Link>
          </nav>
        </div>
      </div>

      <main className={`wrap lay ${orientation}`}>
        <div className="stage" style={{ '--ar': String(aspect) } as React.CSSProperties}>
          <div
            className={`player${playing ? ' playing' : ''}${idle && playing ? ' idle' : ''}`}
            ref={playerRef}
            onPointerMove={wake}
            onPointerDown={wake}
          >
            <div className={`frame${mirrored ? ' mirrored' : ''}`}>
              <video
                ref={videoRef}
                className="sp-video"
                poster={playback?.ok ? playback.poster : undefined}
                playsInline
                preload="metadata"
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
                onLoadedMetadata={e => {
                  const el = e.currentTarget;
                  if (el.videoWidth && el.videoHeight) {
                    const id = current.id;
                    const r = el.videoWidth / el.videoHeight;
                    setMeasured(m => (Math.abs((m[id] ?? 0) - r) < 0.01 ? m : { ...m, [id]: r }));
                  }
                  if (Number.isFinite(el.duration)) setDurationS(el.duration);
                  paint();
                }}
                onTimeUpdate={e => {
                  /* The frame callback is the loop's real check; this is the
                     net under it. A hidden tab presents no frames, so with the
                     music still playing the loop would otherwise run past B. */
                  const L = loopRef.current;
                  if (L && e.currentTarget.currentTime >= L.b / 1000) e.currentTarget.currentTime = L.a / 1000;
                  if (!playing) paint();
                }}
                onSeeked={paint}
                onPlay={() => {
                  setPlaying(true);
                  setStarted(true);
                  wake();
                }}
                onPause={() => setPlaying(false)}
                onEnded={onEnded}
                onError={() => {
                  if (!viaHls) setMp4Failed(current.id);
                }}
              />

              {loading && <p className="sp-status">{c.loading}</p>}
              {playback && !playback.ok && <p className="sp-status">{playback.error}</p>}

              {/* Before the first play: what this part is for, and one big button. */}
              {!started && playback?.ok && (
                <div className="stack">
                  <button className="big" type="button" onClick={togglePlay} aria-label={c.aPlay}>
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <small>{T(step.name)}</small>
                  <h2>{T(current.title)}</h2>
                  {T(current.description) && <p>{T(current.description)}</p>}
                </div>
              )}

              {grid && countsOn && started && (
                <div className="counts" aria-hidden="true">
                  {countLabels(current.beatsPerPhrase).map((label, i) => (
                    <b key={i} className={i === beat ? 'on' : undefined}>
                      {label}
                    </b>
                  ))}
                </div>
              )}

              <div className="pc">
                <div
                  className="ptrack"
                  ref={trackRef}
                  role="slider"
                  aria-label={c.aSeek}
                  aria-valuemin={0}
                  aria-valuemax={Math.round(durationMs / 1000)}
                  onPointerDown={e => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    seekTo(e.clientX);
                  }}
                  onPointerMove={e => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) seekTo(e.clientX);
                  }}
                >
                  {shownRegion && (
                    <span
                      className="loopz"
                      style={{
                        left: `${(shownRegion.a / durationMs) * 100}%`,
                        width: `${((shownRegion.b - shownRegion.a) / durationMs) * 100}%`,
                      }}
                    />
                  )}
                  {marks.map(m => (
                    <span key={m} className="tick" style={{ left: `${(m / durationMs) * 100}%` }} />
                  ))}
                  <span className="played" ref={playedRef} />
                </div>

                <div className="prow">
                  <button
                    className="ic play"
                    type="button"
                    onClick={togglePlay}
                    aria-label={playing ? c.aPause : c.aPlay}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d={playing ? 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z' : 'M8 5v14l11-7z'} />
                    </svg>
                  </button>
                  <span className="time" ref={timeRef}>
                    0:00 / {clock(durationMs / 1000)}
                  </span>
                  <span className="sp-flex" />
                  <button
                    className="speed"
                    type="button"
                    data-on={speed !== 1}
                    onClick={() => chooseSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
                    aria-label={c.aSpeed}
                  >
                    {speed}×
                  </button>
                  <button
                    className="ic"
                    type="button"
                    aria-pressed={loopOn}
                    onClick={toggleLoop}
                    aria-label={loopLabel}
                    title={loopLabel}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17 2l4 4-4 4" />
                      <path d="M3 12V10a4 4 0 0 1 4-4h14" />
                      <path d="M7 22l-4-4 4-4" />
                      <path d="M21 12v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  </button>
                  <button
                    className="ic"
                    type="button"
                    aria-pressed={mirrored}
                    onClick={toggleMirror}
                    aria-label={c.aMirror}
                    title={c.aMirror}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 3v18" strokeDasharray="3 3" />
                      <path d="M8.5 8.5L4 12l4.5 3.5" />
                      <path d="M15.5 8.5L20 12l-4.5 3.5" />
                    </svg>
                  </button>
                  {grid && (
                    <button
                      className="ic"
                      type="button"
                      aria-pressed={countsOn}
                      onClick={() => setCountsOn(o => !o)}
                      aria-label={c.aCounts}
                      title={c.aCounts}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <rect x="3" y="10" width="3" height="9" rx="1.5" />
                        <rect x="8.5" y="6" width="3" height="13" rx="1.5" />
                        <rect x="14" y="12" width="3" height="7" rx="1.5" />
                        <rect x="19.5" y="8" width="3" height="11" rx="1.5" />
                      </svg>
                    </button>
                  )}
                  <button
                    className="ic"
                    type="button"
                    aria-pressed={fullscreen}
                    onClick={toggleFullscreen}
                    aria-label={fullscreen ? c.aExitFull : c.aFull}
                    title={fullscreen ? c.aExitFull : c.aFull}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={fullscreen ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'} />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="notes">
            <div className="steps">
              {session.videos.map((v, i) => {
                const s = stepOf(v.step);
                const now = v.id === current.id;
                return (
                  <button
                    key={v.id}
                    className="step"
                    type="button"
                    aria-current={now}
                    disabled={v.status !== 'ready'}
                    onClick={() => pick(v.id)}
                  >
                    <span className="sn">{v.position}</span>
                    <span className="st">{T(s.name)}</span>
                    <span className="slen">{mmss(v.durationMs)}</span>
                    <span className="sat">
                      {spans[i].known ? `${clock(spans[i].from)}–${clock(spans[i].to)}` : '—'}
                    </span>
                    {now && <span className="sfill" ref={fillRef} />}
                  </button>
                );
              })}
            </div>

            <div className="about">
              <h3>{c.focus}</h3>
              <ul className="cues">
                {[T(session.focus), T(current.description), T(session.outcome)]
                  .filter((text, i, all) => text && all.indexOf(text) === i)
                  .map(text => (
                    <li key={text}>{text}</li>
                  ))}
              </ul>
              <p className="keys">{c.keys}</p>
            </div>
          </div>
        </div>

        <aside className="side">
          <div className="shead">
            <b>{c.listT}</b>
            <span>
              {index + 1} / {session.videos.length}
            </span>
          </div>
          <div>
            {session.videos.map(v => {
              const s = stepOf(v.step);
              const ready = v.status === 'ready';
              const now = v.id === current.id;
              return (
                <button
                  key={v.id}
                  className="vid"
                  type="button"
                  aria-current={now}
                  disabled={!ready}
                  onClick={() => pick(v.id)}
                >
                  <span className="vthumb">
                    {posters[v.id] && <img src={posters[v.id]} alt="" loading="lazy" />}
                    <span className="g" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d={now && playing ? 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z' : 'M8 5v14l11-7z'} />
                      </svg>
                    </span>
                    <span className="d">{ready ? mmss(v.durationMs) : c.notReady}</span>
                  </span>
                  <span className="vmeta">
                    <span className="t">{T(s.name)}</span>
                    <span className="n">{T(v.title)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="sfoot">
            <Link className="pill primary sm" href={nextHref}>
              {hasNext ? c.nextS : c.finish}
            </Link>
          </div>
        </aside>
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

/* Full screen is still partly prefixed: Safari before 16.4 on the element, and
   iPhone Safari only on the <video> itself. */
type FullscreenCapable = HTMLElement & {
  webkitRequestFullscreen?: () => void;
  webkitEnterFullscreen?: () => void;
};
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};
type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'portrait' | 'landscape') => Promise<void>;
};

const fullscreenElement = (): Element | null =>
  document.fullscreenElement ?? (document as FullscreenDocument).webkitFullscreenElement ?? null;
