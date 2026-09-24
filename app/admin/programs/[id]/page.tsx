import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminGate } from '@/lib/supabase/admin';
import type { LevelKey, LocalizedRow, MethodStep, PublishStatus, VideoStatus } from '@/lib/db';
import ProgramEditor from './ProgramEditor';

export interface EditorProgram {
  id: string;
  slug: string;
  position: number;
  title_t: LocalizedRow;
  subtitle_t: LocalizedRow;
  promise_t: LocalizedRow;
  level: LevelKey;
  weeks: number | null;
  status: PublishStatus;
  is_free: boolean;
  published_at: string | null;
  area: { id: string; name_t: LocalizedRow } | null;
  sessions: {
    id: string;
    position: number;
    title_t: LocalizedRow;
    status: PublishStatus;
    videos: { id: string; position: number; step: MethodStep; status: VideoStatus; duration_ms: number | null }[];
  }[];
}

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await adminGate();
  if (!gate.ok) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('programs')
    .select(
      `id, slug, position, title_t, subtitle_t, promise_t, level, weeks, status, is_free, published_at,
       area:areas ( id, name_t ),
       sessions ( id, position, title_t, status, videos ( id, position, step, status, duration_ms ) )`,
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return (
      <div className="gate">
        <h1>Could not read that program</h1>
        <p>{error.message}</p>
      </div>
    );
  }
  if (!data) notFound();

  const program = data as unknown as EditorProgram;
  program.sessions = [...(program.sessions ?? [])]
    .sort((a, b) => a.position - b.position)
    .map(s => ({ ...s, videos: [...(s.videos ?? [])].sort((a, b) => a.position - b.position) }));

  return <ProgramEditor program={program} />;
}
