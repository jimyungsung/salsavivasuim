'use client';

/* One menu: a week. Its routines, one per weekday, come first because that is
   the work — each shows its exercises as a strip, so the shape of the week is
   visible without opening the days one by one. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import Crumbs from '../../Crumbs';
import LocalizedField from '../../LocalizedField';
import PublishSwitch, { publishMeaning } from '../../PublishSwitch';
import LengthStrip from '../../LengthStrip';
import { routineLength, stripOf } from '../../Tree';
import {
  createRoutine,
  deleteMenu,
  deleteRoutine,
  movePosition,
  setMenuFields,
  setStatus,
  type Result,
} from '../../actions';
import { LEVEL_KEYS, mmss, untranslated } from '@/lib/db';
import type { EditorMenu } from './page';

const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MenuEditor({ menu, stages }: { menu: EditorMenu; stages: { id: string; name: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState(menu.slug);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const result = await fn();
      if (result.ok) {
        setError(null);
        after?.();
      } else {
        setError(result.error);
      }
    });

  const items = menu.routines.flatMap(r => r.routine_items);
  const ready = items.filter(i => i.video?.status === 'ready').length;
  const minutes = Math.round(menu.routines.reduce((n, r) => n + routineLength(r), 0) / 60000);

  return (
    <>
      <Crumbs
        items={[
          ...(menu.stage ? [{ label: menu.stage.name_t.en, href: `/admin/stages/${menu.stage.id}` }] : []),
          { label: menu.title_t.en || 'Untitled menu' },
        ]}
      />

      <div className="head">
        <div>
          <h1>{menu.title_t.en || 'Untitled menu'}</h1>
          <p>
            {menu.subtitle_t.en || 'No subtitle yet'} · {menu.routines.length} routine
            {menu.routines.length === 1 ? '' : 's'} · {minutes} min in the week · {ready}/{items.length} with footage
          </p>
        </div>
        <div className="acts">
          <Link className="btn" href="/week" target="_blank">
            See it in the planner ↗
          </Link>
        </div>
      </div>

      {error && <p className="banner">{error}</p>}

      <div className="editor">
        <div>
          <section className="panel">
            <div className="ph">
              <h2>The week</h2>
              <span className="aside-note">Each bar is a routine&rsquo;s exercises, sized by length.</span>
            </div>

            {menu.routines.length === 0 ? (
              <p className="empty">No routines yet.</p>
            ) : (
              menu.routines.map((r, i) => {
                const n = r.routine_items.length;
                const filmed = r.routine_items.filter(x => x.video?.status === 'ready').length;
                return (
                  <div className="srow" key={r.id}>
                    <span className="sn">{r.weekday == null ? '—' : DAY[r.weekday]}</span>
                    <span>
                      <Link className="name" href={`/admin/routines/${r.id}`}>
                        {r.title_t.en || 'Untitled routine'}
                      </Link>{' '}
                      {untranslated(r.title_t) && <span className="chip ko">needs KO</span>}
                      <br />
                      <span className="vids">
                        {n === 0 ? 'No exercises' : `${n} exercise${n === 1 ? '' : 's'} · ${mmss(routineLength(r))} · ${filmed} with footage`}
                      </span>
                    </span>
                    <LengthStrip items={stripOf(r)} hrefFor={() => `/admin/routines/${r.id}`} />
                    <span className="end">
                      <span className={`chip ${r.status}`} title={publishMeaning(r.status)}>{r.status}</span>
                      <button className="btn icon" type="button" disabled={pending || i === 0} onClick={() => run(() => movePosition('routines', r.id, 'up'))} aria-label="Move earlier" title="Move earlier">↑</button>
                      <button className="btn icon" type="button" disabled={pending || i === menu.routines.length - 1} onClick={() => run(() => movePosition('routines', r.id, 'down'))} aria-label="Move later" title="Move later">↓</button>
                      <button
                        className="btn icon danger"
                        type="button"
                        disabled={pending}
                        aria-label="Delete routine"
                        title="Delete routine"
                        onClick={() => {
                          if (confirm(`Delete the routine "${r.title_t.en || 'Untitled'}"? Its exercises stay in the library.`)) {
                            run(() => deleteRoutine(r.id));
                          }
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                );
              })
            )}
            <div className="addbar">
              <button className="btn ghost" type="button" disabled={pending} onClick={() => run(() => createRoutine(menu.id))}>
                + Add a routine
              </button>
              <span>It lands on the first free weekday; change that on the routine.</span>
            </div>
          </section>

          <section className="panel">
            <h2>Danger</h2>
            <p className="hint" style={{ fontSize: 14, margin: '0 0 12px' }}>
              Deleting this menu takes its {menu.routines.length} routine
              {menu.routines.length === 1 ? '' : 's'} with it. The exercises they use stay in
              the library. Members on this menu keep their week; they just cannot reset to it.
            </p>
            <button
              className="btn danger"
              type="button"
              disabled={pending}
              onClick={() => {
                const label = menu.title_t.en || 'this menu';
                if (confirm(`Delete "${label}" and its ${menu.routines.length} routines? This cannot be undone.`)) {
                  run(() => deleteMenu(menu.id), () => router.push('/admin'));
                }
              }}
            >
              Delete this menu
            </button>
          </section>
        </div>

        <div>
          <section className="panel">
            <h2>Publish</h2>
            <PublishSwitch value={menu.status} disabled={pending} onChange={next => run(() => setStatus('menus', menu.id, next))} />
            <p className="hint" style={{ margin: '12px 0 0' }}>
              {publishMeaning(menu.status)}.{' '}
              {menu.published_at ? `First opened ${new Date(menu.published_at).toLocaleDateString()}.` : 'Never opened yet.'}
            </p>
          </section>

          <section className="panel">
            <h2>Copy</h2>
            <LocalizedField stacked table="menus" id={menu.id} column="title_t" label="Title" value={menu.title_t} onError={setError} />
            <LocalizedField stacked table="menus" id={menu.id} column="subtitle_t" label="Subtitle" value={menu.subtitle_t} onError={setError} />
            <LocalizedField stacked table="menus" id={menu.id} column="promise_t" label="What the week does" value={menu.promise_t} multiline onError={setError} />
          </section>

          <section className="panel">
            <h2>Shape</h2>
            <div className="fields">
              <div className="fieldset">
                <span className="lf-label">Level</span>
                <select className="field" value={menu.level} disabled={pending} onChange={e => run(() => setMenuFields(menu.id, { level: e.target.value }))}>
                  {LEVEL_KEYS.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="fieldset">
                <span className="lf-label">Stage</span>
                <select className="field" value={menu.stage_id ?? ''} disabled={pending} onChange={e => run(() => setMenuFields(menu.id, { stage_id: e.target.value || null }))}>
                  <option value="">No stage</option>
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="hint" style={{ margin: '8px 0 16px' }}>
              The level describes the material, not the dancer. A menu with no stage is one
              a member can pick on its own; the quick drills are one of those.
            </p>

            <div className="fieldset" style={{ maxWidth: 'none' }}>
              <span className="lf-label">Slug</span>
              <input className="num" style={{ width: '100%' }} value={slug} disabled={pending}
                onChange={e => setSlug(e.target.value)}
                onBlur={() => slug !== menu.slug && run(() => setMenuFields(menu.id, { slug }))} />
              <span className="hint">
                A stable name for this menu. <code>quick-drills</code> is the one Today reads for
                &ldquo;Got 5 minutes?&rdquo;.
              </span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
