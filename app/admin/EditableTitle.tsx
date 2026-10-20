'use client';

/* A title you can change where you read it: the text, and a pencil beside it.
   The pencil opens English and Korean side by side (every title is both);
   Enter saves, Escape puts it back. Used for a menu's, a routine's and a
   stage's heading, and for a day's theme in the week builder. */

import { useEffect, useRef, useState, useTransition } from 'react';
import { setLocalized, type CatalogueTable } from './actions';

export default function EditableTitle({
  table,
  id,
  column = 'title_t',
  value,
  placeholder,
  as: Tag = 'h1',
  onError,
}: {
  table: CatalogueTable;
  id: string;
  column?: string;
  value: { en: string; ko?: string | null };
  placeholder: string;
  as?: 'h1' | 'span';
  onError: (message: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [en, setEn] = useState(value.en);
  const [ko, setKo] = useState(value.ko ?? '');
  /* What to show while the save is on its way: the new title at once. */
  const [shown, setShown] = useState(value.en);
  const [pending, start] = useTransition();
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setShown(value.en);
      setEn(value.en);
      setKo(value.ko ?? '');
    }
  }, [value.en, value.ko, editing]);
  useEffect(() => {
    if (editing) first.current?.select();
  }, [editing]);

  const cancel = () => {
    setEn(value.en);
    setKo(value.ko ?? '');
    setEditing(false);
  };
  const save = () => {
    if (!en.trim()) return onError('A title needs English.');
    setEditing(false);
    if (en.trim() === value.en && ko.trim() === (value.ko ?? '')) return;
    setShown(en.trim());
    start(async () => {
      const r = await setLocalized(table, id, column, { en, ko });
      onError(r.ok ? null : r.error);
      if (!r.ok) setShown(value.en);
    });
  };
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') cancel();
  };

  if (editing) {
    return (
      <div className={`etitle editing ${Tag === 'h1' ? 'big' : 'small'}`} onClick={e => e.stopPropagation()}>
        <label>
          <span>EN</span>
          <input ref={first} value={en} onChange={e => setEn(e.target.value)} onKeyDown={keys} maxLength={120} aria-label="English title" />
        </label>
        <label>
          <span>KO</span>
          <input value={ko} onChange={e => setKo(e.target.value)} onKeyDown={keys} maxLength={120} placeholder="한국어 제목" aria-label="Korean title" />
        </label>
        <span className="eacts">
          <button className="btn primary tiny" type="button" onClick={save}>Save</button>
          <button className="btn tiny" type="button" onClick={cancel}>Cancel</button>
        </span>
      </div>
    );
  }

  return (
    <span className={`etitle ${Tag === 'h1' ? 'big' : 'small'}${pending ? ' saving' : ''}`}>
      <Tag>{shown || placeholder}</Tag>
      <button
        type="button"
        className="epen"
        onClick={e => {
          e.stopPropagation();
          setEditing(true);
        }}
        aria-label="Edit title"
        title="Edit title"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </button>
      {/* On a heading, say when Korean is missing; on a small title in a list, it would only be noise. */}
      {Tag === 'h1' && !value.ko?.trim() && <span className="chip ko">needs KO</span>}
    </span>
  );
}
