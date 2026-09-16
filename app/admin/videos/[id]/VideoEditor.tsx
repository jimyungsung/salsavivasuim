'use client';

/* One video: its copy, how it was filmed, and its beat grid.

   The beat grid is the part that matters. Three numbers — bpm, first_beat_ms
   and beats_per_phrase — are the whole source of the counts overlay, the
   snap-to-eights loop, the count-in and the ticks on the scrub bar. Nothing
   about counts is ever hand-drawn, so filling these in correctly here is what
   makes the player a dance player rather than a video player.

   Tap tempo and the click-track preview need real footage to be worth anything,
   so they arrive with the upload flow. What is here now is the data itself,
   with the derived numbers shown so a wrong BPM is visible immediately. */

import Link from 'next/link';
import { useState, useTransition } from 'react';
import LocalizedField from '../../LocalizedField';
import { setVideoFields, type Result } from '../../actions';
import { METHOD_STEPS, mmss, type CameraAngle, type MethodStep } from '@/lib/db';
import type { EditorVideo } from './page';

const ANGLES: CameraAngle[] = ['front', 'back', 'detail'];

const toNum = (s: string): number | null => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export default function VideoEditor({ video }: { video: EditorVideo }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [bpm, setBpm] = useState(video.bpm?.toString() ?? '');
  const [firstBeat, setFirstBeat] = useState(video.first_beat_ms?.toString() ?? '');
  const [perPhrase, setPerPhrase] = useState(video.beats_per_phrase.toString());
  const [loopStart, setLoopStart] = useState(video.default_loop_start_ms?.toString() ?? '');
  const [loopEnd, setLoopEnd] = useState(video.default_loop_end_ms?.toString() ?? '');

  const save = (fields: Parameters<typeof setVideoFields>[1]) =>
    start(async () => {
      const result: Result = await setVideoFields(video.id, fields);
      setError(result.ok ? null : result.error);
    });

  /* What the three numbers actually buy you, shown as you type. If a phrase
     length looks wrong against the music, the BPM is wrong. */
  const bpmNum = toNum(bpm);
  const beats = toNum(perPhrase) ?? 8;
  const beatMs = bpmNum && bpmNum > 0 ? 60000 / bpmNum : null;
  const phraseMs = beatMs ? beatMs * beats : null;

  return (
    <>
      <div className="crumb-row">
        <Link href={`/admin/sessions/${video.session_id}`}>
          ← {video.session?.title_t.en || 'Session'}
        </Link>
      </div>

      <div className="head">
        <div>
          {/* No number here: a video's place is only meaningful inside its
              session's list, and `position` may have gaps. */}
          <h1>{video.title_t.en || 'Untitled video'}</h1>
          <p>
            {video.session?.program?.title_t.en}
            {video.session ? ` · session ${String(video.session.position).padStart(2, '0')} · ${video.session.title_t.en}` : ''}
          </p>
        </div>
        <div className="tally">
          <span>
            <b>{video.step}</b>step
          </span>
          <span>
            <b>{video.is_drillable ? 'yes' : 'no'}</b>drillable
          </span>
          <span>
            <b>{mmss(video.duration_ms)}</b>length
          </span>
          <span>
            <b>{video.status}</b>footage
          </span>
        </div>
      </div>

      {error && (
        <p className="chip warn" style={{ display: 'block', marginBottom: 14, padding: '10px 12px' }}>
          {error}
        </p>
      )}

      <section className="panel">
        <h2>Copy</h2>
        <LocalizedField table="videos" id={video.id} column="title_t" label="Title" value={video.title_t} onError={setError} />
        <LocalizedField table="videos" id={video.id} column="description_t" label="Description" value={video.description_t} multiline onError={setError} />
      </section>

      <section className="panel">
        <h2>What it is</h2>
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Labelled label="Method step">
            <select className="step" style={{ width: 'auto' }} value={video.step} disabled={pending} onChange={e => save({ step: e.target.value as MethodStep })}>
              {METHOD_STEPS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Hint>
              {video.is_drillable
                ? 'Train and drill are the steps you repeat, so this can go in a member drill.'
                : 'Not drillable — this step explains or improvises rather than repeating.'}
            </Hint>
          </Labelled>

          <Labelled label="Camera angle">
            <select className="step" style={{ width: 'auto' }} value={video.angle} disabled={pending} onChange={e => save({ angle: e.target.value })}>
              {ANGLES.map(a => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Labelled>

          <Labelled label="Opens mirrored">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={video.mirror_default} disabled={pending} onChange={e => save({ mirror_default: e.target.checked })} />
              <span>Mirror by default</span>
            </label>
            <Hint>On for footage filmed facing the dancer; off for follow view.</Hint>
          </Labelled>
        </div>
      </section>

      <section className="panel">
        <h2>Beat grid</h2>

        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Labelled label="BPM">
            <input className="num" value={bpm} disabled={pending} inputMode="decimal" onChange={e => setBpm(e.target.value)} onBlur={() => save({ bpm: toNum(bpm) })} placeholder="—" />
          </Labelled>
          <Labelled label="First beat (ms)">
            <input className="num" value={firstBeat} disabled={pending} inputMode="numeric" onChange={e => setFirstBeat(e.target.value)} onBlur={() => save({ first_beat_ms: toNum(firstBeat) })} placeholder="—" />
          </Labelled>
          <Labelled label="Beats per phrase">
            <input className="num" value={perPhrase} disabled={pending} inputMode="numeric" onChange={e => setPerPhrase(e.target.value)} onBlur={() => save({ beats_per_phrase: toNum(perPhrase) ?? 8 })} />
            <Hint>Salsa counts in eights. Change it only for material that does not.</Hint>
          </Labelled>
        </div>

        <div className="derived">
          {beatMs ? (
            <>
              <span>
                one beat <b>{beatMs.toFixed(1)} ms</b>
              </span>
              <span>
                one phrase of {beats} <b>{(phraseMs! / 1000).toFixed(2)} s</b>
              </span>
              <span>
                &ldquo;loop 8 counts&rdquo; <b>{((beatMs * 8) / 1000).toFixed(2)} s</b>
              </span>
            </>
          ) : (
            <span>Set a BPM and the phrase lengths appear here.</span>
          )}
        </div>

        <h2 style={{ marginTop: 20 }}>Default loop</h2>
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Labelled label="Start (ms)">
            <input className="num" value={loopStart} disabled={pending} inputMode="numeric" onChange={e => setLoopStart(e.target.value)} onBlur={() => save({ default_loop_start_ms: toNum(loopStart) })} placeholder="—" />
          </Labelled>
          <Labelled label="End (ms)">
            <input className="num" value={loopEnd} disabled={pending} inputMode="numeric" onChange={e => setLoopEnd(e.target.value)} onBlur={() => save({ default_loop_end_ms: toNum(loopEnd) })} placeholder="—" />
          </Labelled>
          <Labelled label="That is">
            <span style={{ fontSize: 13 }}>
              {toNum(loopStart) != null && toNum(loopEnd) != null
                ? `${mmss(toNum(loopStart))} → ${mmss(toNum(loopEnd))}${
                    beatMs
                      ? ` · ${((toNum(loopEnd)! - toNum(loopStart)!) / beatMs).toFixed(1)} beats`
                      : ''
                  }`
                : 'no default loop'}
            </span>
            <Hint>What a member gets before they drag their own region.</Hint>
          </Labelled>
        </div>
      </section>

      <div className="note">
        <b>Tap tempo and the click-track preview come with the upload flow.</b>
        Checking a BPM means hearing a click against the music, and there is no footage to
        play it over yet. Until the video host is chosen, these fields are typed by hand and
        the derived numbers above are the only check on them.
      </div>
    </>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fieldset">
      <span className="lf-label">{label}</span>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="hint">{children}</span>;
}
