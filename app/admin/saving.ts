'use client';

/* Whether anything in the back office is still being saved, for the "Draft ·
   All changes saved" bar. Every edit saves itself as it is made; what was
   missing was being able to see that. Writes wrap their promise in track();
   useSaving() reads how many are in flight and when the last one landed. */

import { useSyncExternalStore } from 'react';

interface Snapshot {
  pending: number;
  /** When the last save finished, ms since epoch; null before any. */
  last: number | null;
  /** The last save failed. Cleared by the next one that succeeds. */
  failed: boolean;
}

let snap: Snapshot = { pending: 0, last: null, failed: false };
const subs = new Set<() => void>();
const set = (next: Partial<Snapshot>) => {
  snap = { ...snap, ...next };
  subs.forEach(f => f());
};

/** Counts a save while it is on its way. Results with ok:false count as failed. */
export function track<T>(work: Promise<T>): Promise<T> {
  set({ pending: snap.pending + 1 });
  return work.then(
    r => {
      const ok = !(r && typeof r === 'object' && 'ok' in r && (r as { ok: boolean }).ok === false);
      set({ pending: snap.pending - 1, last: Date.now(), failed: !ok });
      return r;
    },
    e => {
      set({ pending: snap.pending - 1, failed: true });
      throw e;
    },
  );
}

/** Resolves once nothing is being saved. */
export function settled(): Promise<void> {
  if (snap.pending === 0) return Promise.resolve();
  return new Promise(resolve => {
    const check = () => {
      if (snap.pending === 0) {
        subs.delete(check);
        resolve();
      }
    };
    subs.add(check);
  });
}

const SERVER: Snapshot = { pending: 0, last: null, failed: false };
export function useSaving(): Snapshot {
  return useSyncExternalStore(
    f => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => snap,
    () => SERVER,
  );
}
