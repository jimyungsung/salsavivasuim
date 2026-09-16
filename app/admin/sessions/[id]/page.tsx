import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminGate } from '@/lib/supabase/admin';
import type { LocalizedRow, PublishStatus, VideoRow } from '@/lib/db';
import SessionEditor from './SessionEditor';

export interface EditorSession {
  id: string;
  position: number;
  title_t: LocalizedRow;
  outcome_t: LocalizedRow;
  focus_t: LocalizedRow;
  status: PublishStatus;
  program: { id: string; title_t: LocalizedRow; subtitle_t: LocalizedRow } | null;
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await adminGate();
  if (!gate.ok) return null;

  const supabase = await createClient();

  const [{ data: session, error }, { data: videos }] = await Promise.all([
    supabase
      .from('sessions')
      .select(
        `id, position, title_t, outcome_t, focus_t, status,
         program:programs ( id, title_t, subtitle_t )`,
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('videos')
      .select(
        `id, session_id, step, position, title_t, description_t, angle, duration_ms,
         provider, provider_uid, hls_playback_id, mp4_url, poster_url, status,
         bpm, first_beat_ms, beats_per_phrase,
         default_loop_start_ms, default_loop_end_ms, mirror_default, is_drillable`,
      )
      .eq('session_id', id)
      .order('position'),
  ]);

  if (error) {
    return (
      <div className="gate">
        <h1>Could not read that session</h1>
        <p>{error.message}</p>
      </div>
    );
  }
  if (!session) notFound();

  return (
    <SessionEditor
      session={session as unknown as EditorSession}
      videos={(videos ?? []) as unknown as VideoRow[]}
    />
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await adminGate();
  if (!gate.ok) return { title: 'Back office' };

  const supabase = await createClient();
  const { data } = await supabase.from('sessions').select('title_t').eq('id', id).maybeSingle();
  const title = (data?.title_t as LocalizedRow | undefined)?.en;
  return { title: title ? `${title} · Back office` : 'Back office' };
}
