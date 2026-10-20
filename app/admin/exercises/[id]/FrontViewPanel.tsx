'use client';

/* The exercise's front view: the same movement filmed from the front, which
   members can switch to in the player ("Front"/"Back" on the control row).
   The front clip is its own row with its own footage; this panel links it,
   uploads to it, or unlinks it. Its publish follows the exercise, so there is
   nothing to open separately. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import UploadField from './UploadField';
import { createFrontView, linkFrontView } from '../../actions';
import { track } from '../../saving';
import type { EditorVideo, FrontCandidate } from './page';

export default function FrontViewPanel({
  video,
  frontPoster,
  parent,
  candidates,
  streamConfigured,
  onError,
}: {
  video: EditorVideo;
  frontPoster: string | null;
  /** Set when this clip is itself a front view. */
  parent: { id: string; title: string } | null;
  candidates: FrontCandidate[];
  streamConfigured: boolean;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [choice, setChoice] = useState('');
  const front = video.front?.[0] ?? null;

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await track(fn());
      onError(r.ok ? null : r.error ?? 'That did not work.');
      if (r.ok) router.refresh();
    });

  if (parent) {
    return (
      <section className="panel">
        <h2>Front view</h2>
        <p className="hint" style={{ margin: 0 }}>
          This clip is the front view of <Link href={`/admin/exercises/${parent.id}`}>{parent.title}</Link>. Members see it
          through that exercise&rsquo;s Front/Back button; it is published when that exercise is.
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="ph">
        <h2>Front view</h2>
        <span className="aside-note">Optional · members switch to it with Front/Back in the player</span>
      </div>

      {front ? (
        <>
          <p className="frontrow">
            <Link href={`/admin/exercises/${front.id}`}>{front.title_t.en || 'Front view'}</Link>
            <span className={`chip ${front.status === 'ready' ? 'open' : ''}`}>{front.status}</span>
            <button
              type="button"
              className="btn tiny"
              disabled={pending}
              onClick={() => {
                if (confirm('Unlink this front view? The clip stays in the media library.')) act(() => linkFrontView(video.id, null));
              }}
            >
              Unlink
            </button>
          </p>
          <UploadField
            videoId={front.id}
            status={front.status}
            durationMs={front.duration_ms}
            posterUrl={frontPoster}
            providerUid={front.provider_uid}
            configured={streamConfigured}
            onError={onError}
          />
          {front.duration_ms && video.duration_ms && Math.abs(front.duration_ms - video.duration_ms) > 3000 && (
            <p className="hint" style={{ marginTop: 10 }}>
              The two clips differ in length by {Math.round(Math.abs(front.duration_ms - video.duration_ms) / 1000)} s.
              Switching keeps the same moment, so they line up best when filmed together.
            </p>
          )}
        </>
      ) : (
        <div className="frontadd">
          <button className="btn primary" type="button" disabled={pending} onClick={() => act(() => createFrontView(video.id))}>
            Upload a front view
          </button>
          {candidates.length > 0 && (
            <span className="pickone">
              or use a clip already in the library:
              <select className="status" value={choice} disabled={pending} onChange={e => setChoice(e.target.value)}>
                <option value="">Choose…</option>
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.status !== 'ready' ? ` (${c.status})` : ''}
                  </option>
                ))}
              </select>
              <button className="btn tiny" type="button" disabled={pending || !choice} onClick={() => act(() => linkFrontView(video.id, choice))}>
                Link
              </button>
            </span>
          )}
        </div>
      )}
    </section>
  );
}
