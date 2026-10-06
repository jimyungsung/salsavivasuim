'use client';

/* Setting the beat grid by ear, on the exercise's own footage.

   Typing a BPM and a first beat in milliseconds is how the grid was set
   before, and nothing checked it: a wrong number only showed as counts that
   drift in the member's player. Here the admin plays the clip and
     - taps along to get the tempo,
     - marks the first "1" where it falls, while it plays or paused on it,
     - turns on a click on every beat (an accent on each phrase's 1) and
       hears straight away whether the grid sits on the music,
     - sets the default loop to the eight counts being watched.
   Every result lands in the same fields the editor already has, so the
   numbers below stay the place to nudge by hand. */

import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';
import { getPlayback } from '@/app/(app)/actions';

export interface GridFields {
  bpm?: number | null;
  first_beat_ms?: number | null;
  default_loop_start_ms?: number | null;
  default_loop_end_ms?: number | null;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
/* Under ~150 s plays from the MP4, as in the member's player (BUILD-PLAN §3). */
const SHORT_MS = 150_000;

export default function BeatTapper({
  videoId,
  durationMs,
  bpm,
  firstBeatMs,
  beatsPerPhrase,
  onSet,
}: {
  videoId: string;
  durationMs: number | null;
  bpm: number | null;
  firstBeatMs: number | null;
  beatsPerPhrase: number;
  onSet: (fields: GridFields) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [rate, setRate] = useState(1);
  const [taps, setTaps] = useState<number[]>([]);
  const [click, setClick] = useState(false);

  /* The footage: a signed URL, as members get it (admins pass can_access). */
  useEffect(() => {
    let hls: Hls | null = null;
    let cancelled = false;
    (async () => {
      const p = await getPlayback(videoId);
      const el = videoRef.current;
      if (cancelled || !el) return;
      if (!p.ok) return setError(p.error);
      const mp4 = durationMs != null && durationMs < SHORT_MS;
      if (mp4) {
        el.src = p.mp4;
        el.onerror = () => {
          /* No MP4 rendition yet: fall back to HLS. */
          el.onerror = null;
          attachHls(el, p.hls);
        };
      } else attachHls(el, p.hls);
    })();
    function attachHls(el: HTMLVideoElement, src: string) {
      if (el.canPlayType('application/vnd.apple.mpegurl')) el.src = src;
      else if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(el);
      } else setError('This browser cannot play the stream.');
    }
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [videoId, durationMs]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
  }, [rate]);

  /* The clock, and the click: every animation frame, which beat are we on?
     A new one sounds a tick; the phrase's 1 sounds higher. */
  const audio = useRef<AudioContext | null>(null);
  const lastBeat = useRef<number | null>(null);
  useEffect(() => {
    let raf = 0;
    const beatMs = bpm ? 60000 / bpm : null;
    const tick = () => {
      const el = videoRef.current;
      if (el) {
        setNow(el.currentTime);
        if (click && beatMs && firstBeatMs != null && !el.paused) {
          const n = Math.floor((el.currentTime * 1000 - firstBeatMs) / beatMs);
          if (n >= 0 && n !== lastBeat.current) {
            lastBeat.current = n;
            beep(n % beatsPerPhrase === 0);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [click, bpm, firstBeatMs, beatsPerPhrase]);

  function beep(accent: boolean) {
    const ctx = (audio.current ??= new AudioContext());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1760 : 1100;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  }

  const toggle = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  /* Tap tempo. Taps come in at the speed the video plays, so the clip's own
     tempo is the tapped one divided by the playback rate. A pause of over two
     seconds starts a new count; the last eight intervals are averaged. */
  const tap = () => {
    const t = performance.now();
    setTaps(prev => {
      const recent = prev.length && t - prev[prev.length - 1] > 2000 ? [] : prev;
      return [...recent, t].slice(-9);
    });
  };
  const intervals = taps.slice(1).map((t, i) => t - taps[i]);
  const tapped =
    intervals.length >= 3 ? Math.round((60000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length)) * rate * 10) / 10 : null;

  const beatMs = bpm ? 60000 / bpm : null;
  /* The eight counts the playhead is in: from the phrase's 1 at or before it. */
  const phraseHere = () => {
    if (!beatMs || firstBeatMs == null) return null;
    const phraseMs = beatMs * beatsPerPhrase;
    const at = now * 1000;
    const start = firstBeatMs + Math.max(0, Math.floor((at - firstBeatMs) / phraseMs)) * phraseMs;
    const end = Math.min(start + phraseMs, durationMs ?? Infinity);
    return { start: Math.round(start), end: Math.round(end) };
  };
  const count = beatMs && firstBeatMs != null && now * 1000 >= firstBeatMs
    ? (Math.floor((now * 1000 - firstBeatMs) / beatMs) % beatsPerPhrase) + 1
    : null;

  return (
    <div className="tapper">
      <div className="tvideo">
        <video ref={videoRef} playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onClick={toggle} />
        {count && <span className="tcount">{count}</span>}
      </div>
      {error && <p className="hint" style={{ color: '#a2482a' }}>{error}</p>}

      <div className="trow">
        <button className="btn primary" type="button" onClick={toggle}>{playing ? 'Pause' : 'Play'}</button>
        <span className="tclock">{fmt(now)}</span>
        <span className="tseg" role="group" aria-label="Speed">
          {[0.5, 0.75, 1].map(r => (
            <button key={r} type="button" aria-pressed={rate === r} onClick={() => setRate(r)}>{r}×</button>
          ))}
        </span>
        <button className="btn" type="button" onClick={() => videoRef.current && (videoRef.current.currentTime = Math.max(0, now - 2))}>⟲ 2 s</button>
      </div>

      <div className="tsteps">
        <div className="tstep">
          <b>1 · Tempo</b>
          <span className="hint">Play it and tap along on every beat.</span>
          <div className="trow">
            <button className="btn tapbtn" type="button" onPointerDown={tap}>Tap</button>
            <span className="tread">
              {tapped ? <>≈ <b>{tapped}</b> bpm from {taps.length} taps</> : taps.length ? `${taps.length} tap${taps.length === 1 ? '' : 's'}…` : bpm ? `Now ${bpm} bpm` : 'No tempo yet'}
            </span>
            {tapped && (
              <button className="btn" type="button" onClick={() => { onSet({ bpm: tapped }); setTaps([]); }}>Use {tapped}</button>
            )}
          </div>
        </div>

        <div className="tstep">
          <b>2 · The first 1</b>
          <span className="hint">Pause on the first count of one, or press it as it goes by.</span>
          <div className="trow">
            <button className="btn" type="button" onClick={() => onSet({ first_beat_ms: Math.round(now * 1000) })}>First beat here ({fmt(now)})</button>
            {firstBeatMs != null && <span className="tread">Now at {fmt(firstBeatMs / 1000)}</span>}
          </div>
        </div>

        <div className="tstep">
          <b>3 · Check it by ear</b>
          <span className="hint">A click on every beat, higher on each 1. If it drifts, the tempo is off; if it is early or late all along, move the first 1.</span>
          <div className="trow">
            <button className="btn" type="button" aria-pressed={click} disabled={!bpm || firstBeatMs == null}
              onClick={() => { lastBeat.current = null; setClick(c => !c); }}>
              {click ? 'Click on · turn off' : 'Click on the beat'}
            </button>
          </div>
        </div>

        <div className="tstep">
          <b>4 · Default loop</b>
          <span className="hint">What a member gets when they press loop: the eight counts you are watching.</span>
          <div className="trow">
            <button className="btn" type="button" disabled={!phraseHere()}
              onClick={() => { const p = phraseHere(); if (p) onSet({ default_loop_start_ms: p.start, default_loop_end_ms: p.end }); }}>
              Loop these {beatsPerPhrase} counts
            </button>
            <button className="btn ghost" type="button" onClick={() => onSet({ default_loop_start_ms: null, default_loop_end_ms: null })}>No default loop</button>
          </div>
        </div>
      </div>
    </div>
  );
}
