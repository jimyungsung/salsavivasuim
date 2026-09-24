'use client';

/* The upload control.

   The file goes browser → Cloudflare directly, never through Vercel, whose
   request bodies cap at 4.5 MB. It goes by tus, in chunks: that is the only way
   Cloudflare takes a file over 200 MB, and a dropped connection costs one chunk
   rather than the whole file. A failed chunk is retried on its own; a reload,
   or Pause, can be picked up by choosing the same file again — the upload URL
   is kept per video in localStorage until the file has landed.

   After the POST returns, Cloudflare is still encoding. The row sits in
   `processing` until the webhook says otherwise; the Check button is the manual
   path for when the webhook has not been registered yet. */

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import * as tus from 'tus-js-client';
import { clearVideoUpload, refreshVideoStatus, requestUploadUrl, type Result } from '../../actions';
import { mmss, type VideoStatus } from '@/lib/db';

/* Cloudflare wants chunks of at least 5 MB, in multiples of 256 KiB. 50 MB is
   a few seconds each on a decent line, and little to resend after a drop. */
const CHUNK = 50 * 1024 * 1024;

const MB = (bytes: number) => (bytes / 1024 / 1024).toFixed(0);

/* What an unfinished upload needs to carry on: the URL Cloudflare gave it, and
   enough about the file to know it is the same one. */
interface Resumable {
  url: string;
  uid: string;
  file: string;
}
const storeKey = (videoId: string) => `suim-upload:${videoId}`;
const fileSig = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

function readResumable(videoId: string): Resumable | null {
  try {
    return JSON.parse(localStorage.getItem(storeKey(videoId)) ?? 'null');
  } catch {
    return null;
  }
}
function writeResumable(videoId: string, value: Resumable | null) {
  try {
    if (value) localStorage.setItem(storeKey(videoId), JSON.stringify(value));
    else localStorage.removeItem(storeKey(videoId));
  } catch {
    /* resuming after a reload is a convenience */
  }
}

type Outcome = 'done' | 'paused' | 'gone' | { error: string };

export default function UploadField({
  videoId,
  status,
  durationMs,
  posterUrl,
  providerUid,
  configured,
  onError,
}: {
  videoId: string;
  status: VideoStatus;
  durationMs: number | null;
  posterUrl: string | null;
  providerUid: string | null;
  configured: boolean;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);
  /* The file in hand after a pause or a failure, so Resume needs no picking. */
  const [held, setHeld] = useState<File | null>(null);
  const active = useRef<tus.Upload | null>(null);
  const pausing = useRef<(() => void) | null>(null);
  const [pending, start] = useTransition();

  /* Leaving mid-upload loses nothing that cannot be resumed, but it does stop
     the upload — worth a question. */
  useEffect(() => {
    if (!progress) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [progress]);

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const result = await fn();
      onError(result.ok ? null : result.error);
      router.refresh();
    });

  function upload(file: File, url: string): Promise<Outcome> {
    return new Promise(resolve => {
      const job = new tus.Upload(file, {
        uploadUrl: url,
        chunkSize: CHUNK,
        /* A failed chunk waits and tries again, up to about half a minute. */
        retryDelays: [0, 1000, 3000, 5000, 10000, 15000],
        storeFingerprintForResuming: false,
        onProgress: (sent, total) => setProgress({ sent, total }),
        onSuccess: () => resolve('done'),
        onError: err => {
          const status = (err as tus.DetailedError).originalResponse?.getStatus();
          /* The stored URL has expired or been used up: start afresh. */
          if (status === 404 || status === 410 || status === 403) resolve('gone');
          else resolve({ error: `The upload stopped: ${err.message.split('\n')[0]}` });
        },
      });
      active.current = job;
      pausing.current = () => resolve('paused');
      job.start();
    });
  }

  async function send(file: File) {
    onError(null);
    setHeld(null);

    /* The same file for the same video, still the footage this row points at:
       carry on from wherever Cloudflare got to. */
    const saved = readResumable(videoId);
    const resuming = saved && saved.file === fileSig(file) && saved.uid === providerUid;

    const fresh = async (): Promise<string | null> => {
      const ticket = await requestUploadUrl(videoId, window.location.origin, file.size);
      if (!ticket.ok) {
        onError(ticket.error);
        return null;
      }
      writeResumable(videoId, { url: ticket.uploadURL, uid: ticket.uid, file: fileSig(file) });
      return ticket.uploadURL;
    };

    let url = resuming ? saved.url : await fresh();
    if (!url) return;

    setProgress({ sent: 0, total: file.size });
    let outcome = await upload(file, url);
    if (outcome === 'gone' && resuming) {
      url = await fresh();
      outcome = url ? await upload(file, url) : 'paused';
    }

    active.current = null;
    pausing.current = null;
    setProgress(null);
    /* Cleared either way, so choosing the same file again still fires. */
    if (input.current) input.current.value = '';
    if (outcome === 'done') {
      writeResumable(videoId, null);
    } else if (outcome === 'gone') {
      onError('Cloudflare no longer has that upload. Choose the file again to start over.');
      writeResumable(videoId, null);
    } else {
      setHeld(file);
      if (outcome !== 'paused') onError(`${outcome.error} Resume carries on from where it stopped.`);
    }
    router.refresh();
  }

  function pause() {
    void active.current?.abort();
    pausing.current?.();
  }

  if (!configured) {
    return (
      <div className="note">
        <b>Cloudflare Stream is not configured.</b>
        Set <code>CLOUDFLARE_ACCOUNT_ID</code> and <code>CLOUDFLARE_STREAM_API_TOKEN</code>, then
        this becomes an upload box. Everything else about this video can be filled in now.
      </div>
    );
  }

  const busy = pending || progress !== null;
  const percent = progress ? Math.floor((progress.sent / progress.total) * 100) : 0;

  return (
    <div className="upload">
      {posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="poster" src={posterUrl} alt="" />
      )}

      <div className="upmeta">
        <span className={`chip ${status === 'ready' ? 'open' : status === 'failed' ? 'warn' : ''}`}>
          {status}
        </span>
        {status === 'ready' && <span className="hint">{mmss(durationMs)} · encoded and playable</span>}
        {status === 'processing' && (
          <span className="hint">Cloudflare is encoding. The webhook flips this to ready.</span>
        )}
        {status === 'uploading' && <span className="hint">No footage yet.</span>}
        {status === 'failed' && <span className="hint">Cloudflare could not encode that file.</span>}
      </div>

      {progress !== null && (
        <div className="bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${percent}%` }} />
          <span>
            {percent}% · {MB(progress.sent)} of {MB(progress.total)} MB
          </span>
        </div>
      )}
      {held && !progress && (
        <p className="hint">
          {held.name} is not finished. Resume carries on from where it stopped — after a reload,
          choose the same file again.
        </p>
      )}

      <div className="addbar" style={{ paddingTop: 10 }}>
        <input
          ref={input}
          type="file"
          accept="video/*"
          disabled={busy}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) void send(file);
          }}
        />
        {progress !== null && (
          <button className="btn tiny" type="button" onClick={pause}>
            Pause
          </button>
        )}
        {held && !progress && (
          <button className="btn tiny" type="button" disabled={pending} onClick={() => void send(held)}>
            Resume
          </button>
        )}
        {providerUid && (
          <>
            <button className="btn tiny" type="button" disabled={busy} onClick={() => run(() => refreshVideoStatus(videoId))}>
              Check status
            </button>
            <button
              className="btn tiny"
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm('Remove this footage? The video row, its step and its beat grid stay.')) {
                  run(() => clearVideoUpload(videoId));
                }
              }}
            >
              Remove footage
            </button>
          </>
        )}
      </div>
    </div>
  );
}
