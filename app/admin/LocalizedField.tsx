'use client';

/* One translatable field, both languages side by side.

   Side by side rather than behind a language switch, because the job is
   translating: you want to see the English you are translating from while you
   type the Korean. It also makes the untranslated state obvious without a badge
   — the right-hand box is simply empty.

   Saves on blur, not on every keystroke. */

import { useState, useTransition } from 'react';
import { setLocalized, type Result } from './actions';
import type { LocalizedRow } from '@/lib/db';

export default function LocalizedField({
  table,
  id,
  column,
  label,
  value,
  multiline = false,
  stacked = false,
  onError,
}: {
  table: 'areas' | 'programs' | 'sessions' | 'videos';
  id: string;
  column: string;
  label: string;
  value: LocalizedRow;
  multiline?: boolean;
  /** EN above KO, for a narrow column; side by side otherwise. */
  stacked?: boolean;
  onError: (message: string | null) => void;
}) {
  const [en, setEn] = useState(value.en ?? '');
  const [ko, setKo] = useState(value.ko ?? '');
  const [saved, setSaved] = useState<'idle' | 'saved'>('idle');
  const [pending, start] = useTransition();

  /* Only write when something actually changed — blurring a field you merely
     tabbed through should not touch the database or flash "saved". */
  const commit = () => {
    if (en === (value.en ?? '') && ko === (value.ko ?? '')) return;
    start(async () => {
      const result: Result = await setLocalized(table, id, column, { en, ko });
      if (result.ok) {
        setSaved('saved');
        onError(null);
        setTimeout(() => setSaved('idle'), 1400);
      } else {
        onError(result.error);
      }
    });
  };

  const Field = multiline ? 'textarea' : 'input';

  return (
    <div className="lf">
      <div className="lf-label">
        {label}
        {pending && <em>saving…</em>}
        {!pending && saved === 'saved' && <em className="ok">saved</em>}
        {!pending && saved === 'idle' && !ko.trim() && <em className="todo">needs KO</em>}
      </div>
      <div className={`lf-pair${stacked ? ' stacked' : ''}`}>
        <label>
          <span>EN</span>
          <Field value={en} onChange={e => setEn(e.target.value)} onBlur={commit} rows={multiline ? 3 : undefined} />
        </label>
        <label>
          <span>KO</span>
          <Field value={ko} onChange={e => setKo(e.target.value)} onBlur={commit} rows={multiline ? 3 : undefined} placeholder="—" />
        </label>
      </div>
    </div>
  );
}
