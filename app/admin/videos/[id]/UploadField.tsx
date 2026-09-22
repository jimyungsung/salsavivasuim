'use client';

/* The upload control.

   The file goes browser → Cloudflare directly, never through Vercel, whose
   request bodies cap at 4.5 MB. XMLHttpRequest rather than fetch, because it is
   still the only way to get upload progress — and a three-minute drill video on
   a slow connection with no progress bar reads as a hung page.

   After the POST returns, Cloudflare is still encoding. The row sits in
   `processing` until the webhook says otherwise; the Check button is the manual
   path for when the webhook has not been registered yet. */

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { clearVideoUpload, refreshVideoStatus, requestUploadUrl, type Result } from '../../actions';
import { mmss, type VideoStatus } from '@/lib/db';

/* Cloudflare's simple direct upload tops out here; past it the tus protocol is
   required. Better to say so before a ten-minute upload fails at the end. */
const MAX_BYTES = 200 * 1024 * 1024;

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
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const result = await fn();
      onError(result.ok ? null : result.error);
      router.refresh();
    });

  async function send(file: File) {
    onError(null);

    if (file.size > MAX_BYTES) {
      onError(
        `That file is ${(file.size / 1024 / 1024).toFixed(0)} MB. The direct upload path ` +
          `stops at 200 MB — compress it, or we add the tus protocol for large files.`,
      );
      return;
    }

    const ticket = await requestUploadUrl(videoId, window.location.origin);
    if (!ticket.ok) {
      onError(ticket.error);
      return;
    }

    setProgress(0);
    const form = new FormData();
    form.append('file', file);

    await new Promise<void>(resolve => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', ticket.uploadURL);
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(100);
        } else {
          onError(`Cloudflare rejected the upload (HTTP ${xhr.status}).`);
        }
        resolve();
      };
      xhr.onerror = () => {
        onError('The upload failed before it reached Cloudflare.');
        resolve();
      };
      xhr.send(form);
    });

    setProgress(null);
    if (input.current) input.current.value = '';
    router.refresh();
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
        <div className="bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${progress}%` }} />
          <span>{progress}%</span>
        </div>
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
