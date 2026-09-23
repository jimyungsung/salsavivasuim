'use client';

/* The practice player, first pass.

   This proves the signing path end to end — a real signed URL, played, with
   speed and mirror actually changing what you see — and nothing more. The
   precision work in BUILD-PLAN §5 (a frame-accurate A→B loop off
   requestVideoFrameCallback, the count grid, per-step speed memory, wake lock)
   is deliberately not here yet; native controls stand in for the scrub bar and
   loop zone the prototype draws.

   HLS needs hls.js everywhere except Safari, which plays it natively — the
   short MP4 rendition never does, so it always gets a plain src. Which one a
   video gets is the rule from BUILD-PLAN §3: under ~150s and drillable plays
   from MP4 because a progressive file seeks instantly; everything else is HLS,
   because it adapts to the network. */

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useCopy, useLang } from '@/lib/lang';
import type { Copy } from '@/lib/lang';
import { stepOf } from '@/lib/content';
import { mmss } from '@/lib/db';
import type { SessionDetail, SessionVideoSummary } from '@/lib/catalogue';
import { getPlayback, type PlaybackResult } from '../actions';

type Key =
  | 'sessionOf' | 'total' | 'prevS' | 'nextS' | 'lastSession'
  | 'listT' | 'notReady' | 'loading'
  | 'aPlay' | 'aPause' | 'aSpeed' | 'aMirror'
  | 'footer' | 'signout';

const C: Copy<Key> = {
  en: {
    sessionOf: 'Session', total: 'total', prevS: '← Previous', nextS: 'Next session →',
    lastSession: 'Last session',
    listT: 'Videos in this session', notReady: 'Being filmed', loading: 'Loading…',
    aPlay: 'Play', aPause: 'Pause', aSpeed: 'Playback speed', aMirror: 'Mirror the picture',
    footer: 'Solo salsa training · Built around practice', signout: 'Sign out',
  },
  ko: {
    sessionOf: '세션', total: '분량', prevS: '← 이전', nextS: '다음 세션 →',
    lastSession: '마지막 세션',
    listT: '이 세션의 영상', notReady: '촬영 중', loading: '불러오는 중…',
    aPlay: '재생', aPause: '일시정지', aSpeed: '재생 속도', aMirror: '좌우 반전',
    footer: '연습을 중심으로 설계한 솔로 살사 트레이닝', signout: '로그아웃',
  },
};

const two = (n: number) => String(n).padStart(2, '0');
const SPEEDS = [0.5, 0.75, 1, 1.25];

/** BUILD-PLAN §3: a video under ~150s and marked drillable plays from the
    progressive MP4, because it seeks instantly and a tight loop needs that.
    Everything else is HLS, which adapts to the network. */
const usesMp4 = (v: SessionVideoSummary) =>
  v.isDrillable && v.durationMs != null && v.durationMs < 150_000;

export default function SessionPlayer({
  session,
  initialVideoId,
  initialPlayback,
}: {
  session: SessionDetail;
  initialVideoId: string | null;
  initialPlayback: PlaybackResult | null;
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
  const [speedIx, setSpeedIx] = useState(1);
  const [mirrored, setMirrored] = useState(false);
  const [playing, setPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const current = session.videos.find(v => v.id === currentId) ?? null;

  /* Mirror defaults per video — TRAIN opens mirrored, DRILL doesn't — but once
     a member overrides it here, that sticks for the rest of this visit. */
  const overriddenMirror = useRef(false);
  useEffect(() => {
    if (current && !overriddenMirror.current) setMirrored(current.mirrorDefault);
  }, [current]);

  /* A fresh signed URL whenever the selected video has none — the one handed
     down from the server only covers the video the page opened on. */
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

  /* Attach the source. HLS goes through hls.js unless the browser plays it
     natively (Safari); the MP4 rendition never needs either. */
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

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      el.removeAttribute('src');
    };
  }, [playback, viaHls]);

  /* defaultPlaybackRate too, because loading a new source resets playbackRate
     to it — without that, every video switch would silently drop back to 1×. */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.defaultPlaybackRate = SPEEDS[speedIx];
    el.playbackRate = SPEEDS[speedIx];
    el.preservesPitch = true;
    (el as HTMLVideoElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
  }, [speedIx]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play();
    else el.pause();
  }, []);

  if (!current) {
    return (
      <div className="sp">
        <p className="sp-empty">{c.notReady}</p>
      </div>
    );
  }

  const hasPrev = Boolean(session.prevSessionId);
  const hasNext = Boolean(session.nextSessionId);

  return (
    <div className="sp">
      <div className="subnav">
        <div className="wrap subin">
          <Link className="crumb" href={`/programs/${session.program.id}`}>
            <span aria-hidden="true">←</span>
            <span>{T(session.program.title)}</span>
          </Link>
          <div className="where">
            <span className="lv">{c.sessionOf} {two(session.position)}</span>
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

      <main className="wrap lay">
        <div>
          <div className="player">
            <div className={`frame${mirrored ? ' mirrored' : ''}`}>
              {loading && <p className="sp-status">{c.loading}</p>}
              {playback && !playback.ok && <p className="sp-status">{playback.error}</p>}
              <video
                ref={videoRef}
                className="sp-video"
                poster={playback?.ok ? playback.poster : undefined}
                controls
                playsInline
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onError={() => {
                  if (!viaHls) setMp4Failed(current.id);
                }}
              />
            </div>

            <div className="prow">
              <button
                className="ic play"
                type="button"
                onClick={togglePlay}
                aria-label={playing ? c.aPause : c.aPlay}
              >
                {playing ? '❚❚' : '▶'}
              </button>
              <span className="sp-title">{T(current.title)}</span>
              <span className="sp-flex" />
              <button
                className="speed"
                type="button"
                data-on={speedIx !== 2}
                onClick={() => setSpeedIx((speedIx + 1) % SPEEDS.length)}
                aria-label={c.aSpeed}
              >
                {SPEEDS[speedIx]}×
              </button>
              <button
                className="ic"
                type="button"
                aria-pressed={mirrored}
                onClick={() => {
                  overriddenMirror.current = true;
                  setMirrored(m => !m);
                }}
                aria-label={c.aMirror}
              >
                ⇋
              </button>
            </div>
          </div>

          <div className="steps">
            {session.videos.map(v => {
              const step = stepOf(v.step);
              return (
                <button
                  key={v.id}
                  className="step"
                  type="button"
                  aria-current={v.id === current.id}
                  disabled={v.status !== 'ready'}
                  onClick={() => setCurrentId(v.id)}
                >
                  <span className="sn">{v.position}</span>
                  <span className="st">{T(step.name)}</span>
                  <span className="slen">{mmss(v.durationMs)}</span>
                </button>
              );
            })}
          </div>

          <div className="about">
            <h3>{T(session.focus)}</h3>
            <p>{T(current.description)}</p>
          </div>
        </div>

        <aside className="side">
          <div className="shead">
            <b>{c.listT}</b>
          </div>
          <div>
            {session.videos.map(v => {
              const step = stepOf(v.step);
              const ready = v.status === 'ready';
              return (
                <button
                  key={v.id}
                  className="vid"
                  type="button"
                  aria-current={v.id === current.id}
                  disabled={!ready}
                  onClick={() => setCurrentId(v.id)}
                >
                  <span className="vthumb">
                    <span className="d">{ready ? mmss(v.durationMs) : c.notReady}</span>
                  </span>
                  <span className="vmeta">
                    <span className="t">{T(step.name)}</span>
                    <span className="n">{T(v.title)}</span>
                  </span>
                </button>
              );
            })}
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
