import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminGate } from '@/lib/supabase/admin';
import type { LocalizedRow } from '@/lib/db';
import AreaEditor from './AreaEditor';

export interface EditorArea {
  id: string;
  slug: string;
  position: number;
  name_t: LocalizedRow;
  blurb_t: LocalizedRow;
  programs: { id: string; title_t: LocalizedRow }[];
}

export default async function AreaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await adminGate();
  if (!gate.ok) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('areas')
    .select('id, slug, position, name_t, blurb_t, programs ( id, title_t )')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return (
      <div className="gate">
        <h1>Could not read that area</h1>
        <p>{error.message}</p>
      </div>
    );
  }
  if (!data) notFound();

  return <AreaEditor area={data as unknown as EditorArea} />;
}
