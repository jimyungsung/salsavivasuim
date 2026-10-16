'use client';

/* The player's practice log (BUILD-PLAN §5, "What the player reports").

   Four events: `play` when playback starts, `heartbeat` for every stretch of
   real playback (about fifteen seconds, plus whatever is left when it stops),
   `loop` per lap, `complete` at 90% watched. Minutes practised is wall-clock:
   a heartbeat carries the time that actually passed, not the footage that
   played, so four minutes at 0.5x count as eight.

   Events queue here and go to /api/practice in batches: on each beat, when
   playback stops, and — by sendBeacon, which survives the page going away —
   when the page is hidden or closed. A failed send keeps its events for the
   next one. Only for a signed-in member; a visitor logs nothing. */

import { useCallback, useEffect, useRef } from 'react';

type Kind = 'play' | 'heartbeat' | 'loop' | 'complete';
interface PracticeEvent {
  videoId: string;
  kind: Kind;
  wallMs: number;
  speed: number;
  at: string;
}

const BEAT_MS = 15_000;
const ENDPOINT = '/api/practice';

export function usePracticeLog({
  enabled,
  videoId,
  playing,
  speed,
}: {
  enabled: boolean;
  videoId: string | null;
  playing: boolean;
  speed: number;
}) {
  const queue = useRef<PracticeEvent[]>([]);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const push = useCallback((videoId: string, kind: Kind, wallMs = 0) => {
    queue.current.push({ videoId, kind, wallMs: Math.round(wallMs), speed: speedRef.current, at: new Date().toISOString() });
    /* A member who never stops the video for hours should not pile up events. */
    if (queue.current.length > 200) queue.current.splice(0, queue.current.length - 200);
  }, []);

  const flush = useCallback((leaving = false) => {
    if (!queue.current.length) return;
    const events = queue.current.splice(0);
    const body = JSON.stringify({ events });
    if (leaving && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
    }
    fetch(ENDPOINT, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true })
      .then(r => {
        /* 401/403 will not get better by retrying; anything else might. */
        if (!r.ok && r.status >= 500) queue.current.unshift(...events);
      })
      .catch(() => queue.current.unshift(...events));
  }, []);

  /* While this video plays: a play event, then a beat every fifteen seconds.
     When it stops — pause, end, another video, leaving the page — the last
     stretch is counted and the queue sent. */
  useEffect(() => {
    if (!enabled || !playing || !videoId) return;
    push(videoId, 'play');
    let last = performance.now();
    const beat = () => {
      const now = performance.now();
      const wall = Math.min(now - last, 30_000);
      last = now;
      if (wall >= 1000) push(videoId, 'heartbeat', wall);
    };
    const timer = setInterval(() => {
      beat();
      flush();
    }, BEAT_MS);
    const away = () => {
      if (document.visibilityState === 'hidden') {
        beat();
        flush(true);
      }
    };
    const leaving = () => {
      beat();
      flush(true);
    };
    document.addEventListener('visibilitychange', away);
    window.addEventListener('pagehide', leaving);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', away);
      window.removeEventListener('pagehide', leaving);
      beat();
      flush();
    };
  }, [enabled, playing, videoId, push, flush]);

  return {
    /** A lap: the loop wrapped, or a repeated exercise started again. */
    loop: useCallback(() => {
      if (enabled && videoId) push(videoId, 'loop');
    }, [enabled, videoId, push]),
    /** 90% watched, once per time through an exercise. */
    complete: useCallback(() => {
      if (enabled && videoId) push(videoId, 'complete');
    }, [enabled, videoId, push]),
  };
}
