'use client';

/* "Draft · All changes saved": the week's state, said plainly. Every edit in
   the builder saves itself as it is made; this is where you can see that it
   has, or that something is still on its way. "Save as draft" waits for
   anything in flight and confirms — there is nothing else to press before
   leaving. A week stays a draft until "Publish week". */

import { useEffect, useState } from 'react';
import { settled, useSaving } from '../../saving';
import type { PublishStatus } from '@/lib/db';

const ago = (ms: number) => {
  const s = Math.round((Date.now() - ms) / 1000);
  return s < 10 ? 'just now' : s < 60 ? `${s} s ago` : `${Math.round(s / 60)} min ago`;
};

export default function SaveState({ status }: { status: PublishStatus }) {
  const { pending, last, failed } = useSaving();
  const [confirmed, setConfirmed] = useState(false);
  /* Keep "just now" honest as time passes. */
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (pending) setConfirmed(false);
  }, [pending]);

  const label = status === 'open' ? 'Live' : status === 'soon' ? 'Coming soon' : 'Draft';
  const state = pending
    ? 'Saving…'
    : failed
      ? 'Last change did not save — see the message above'
      : confirmed
        ? 'Saved as draft'
        : last
          ? `All changes saved · ${ago(last)}`
          : 'All changes saved';

  return (
    <div className={`savestate${pending ? ' busy' : ''}${failed ? ' bad' : ''}`} role="status" aria-live="polite">
      <span className={`chip ${status}`}>{label}</span>
      <span className="ss">{state}</span>
      {status !== 'open' && (
        <button
          className="btn tiny"
          type="button"
          disabled={pending > 0}
          onClick={async () => {
            await settled();
            setConfirmed(true);
          }}
        >
          {confirmed ? 'Saved ✓' : 'Save as draft'}
        </button>
      )}
    </div>
  );
}
