'use server';

/* The player's way to ask for a signed URL when it switches video. The signing
   itself, and why it needs no second access check, is lib/playback.ts. */

import { playbackFor, type PlaybackResult } from '@/lib/playback';

export type { PlaybackResult };

export async function getPlayback(videoId: string): Promise<PlaybackResult> {
  return playbackFor(videoId);
}
