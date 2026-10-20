'use client';

/* The back office's navigation: the whole catalogue, always on screen.

   The media library first — it is where footage arrives — then stages
   → menus → routines, with the branch you are standing in opened and
   highlighted. A search box filters every menu and routine by title. */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { createMenu, createStage } from './actions';
import type { PublishStatus } from '@/lib/db';
import { DAY_SHORT } from '@/lib/i18n';

export interface NavRoutine {
  id: string;
  weekday: number | null;
  title: string;
  status: PublishStatus;
}
export interface NavMenu {
  id: string;
  title: string;
  status: PublishStatus;
  routines: NavRoutine[];
}
export interface NavStage {
  /** '' for the menus that belong to no stage. */
  id: string;
  name: string;
  menus: NavMenu[];
}

/* The back office is English; the names live once, in lib/i18n. */
const DAY = DAY_SHORT.map(d => d.en);

export default function Sidebar({ tree, exerciseCount }: { tree: NavStage[]; exerciseCount: number }) {
  const pathname = usePathname();
  const [, kind, id] = pathname.split('/').slice(1);

  /* Where are we? */
  const here = useMemo(() => {
    for (const stage of tree) {
      if (kind === 'stages' && stage.id === id) return { stage: stage.id };
      for (const menu of stage.menus) {
        if (kind === 'menus' && menu.id === id) return { stage: stage.id, menu: menu.id };
        for (const routine of menu.routines) {
          if (kind === 'routines' && routine.id === id) {
            return { stage: stage.id, menu: menu.id, routine: routine.id };
          }
        }
      }
    }
    return {};
  }, [tree, kind, id]);

  const [openStages, setOpenStages] = useState<Set<string>>(() => new Set(here.stage != null ? [here.stage] : []));
  const [openMenus, setOpenMenus] = useState<Set<string>>(() => new Set(here.menu ? [here.menu] : []));
  const [query, setQuery] = useState('');
  /* Adding from the sidebar: a stage, or a week inside a stage. One small
     input at a time, in place; Enter makes it, Escape closes it. */
  const [adding, setAdding] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const openAdd = (key: string) => {
    setAdding(key);
    setName('');
    setError(null);
  };
  const submit = () => {
    const title = name.trim();
    if (!title || !adding) return;
    const where = adding;
    start(async () => {
      if (where === 'stage') {
        const r = await createStage(title);
        if (!r.ok) return setError(r.error);
        setOpenStages(s => new Set(s).add(r.id));
        setAdding(null);
        router.push(`/admin/stages/${r.id}`);
      } else {
        /* A new week comes with its days, Monday to Saturday, like "+ New
           week" on the overview; it opens straight into the week builder. */
        const r = await createMenu(where === 'none' ? null : where, title, [0, 1, 2, 3, 4, 5]);
        if (!r.ok) return setError(r.error);
        setAdding(null);
        router.push(`/admin/menus/${r.id}`);
      }
    });
  };
  const addInput = (placeholder: string) => (
    <div className="n-add">
      <input
        autoFocus
        value={name}
        placeholder={placeholder}
        disabled={pending}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') setAdding(null);
        }}
        aria-label={placeholder}
      />
      <button type="button" className="go" disabled={pending || !name.trim()} onClick={submit}>Add</button>
      <button type="button" className="x" onClick={() => setAdding(null)} aria-label="Cancel">✕</button>
      {error && <span className="err">{error}</span>}
    </div>
  );

  /* Following a link in the page opens the branch it leads to. */
  useEffect(() => {
    if (here.stage != null) setOpenStages(s => (s.has(here.stage!) ? s : new Set(s).add(here.stage!)));
    if (here.menu) setOpenMenus(s => (s.has(here.menu!) ? s : new Set(s).add(here.menu!)));
  }, [here.stage, here.menu]);

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (!next.delete(key)) next.add(key);
    return next;
  };

  const q = query.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(q);

  return (
    <aside className="side">
      <div className="find">
        <input
          type="search"
          placeholder="Find a menu or routine"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Find a menu or routine"
        />
      </div>

      <nav className="bonav" aria-label="Catalogue">
        <Link className={`home${kind ? '' : ' on'}`} href="/admin">
          Overview
        </Link>
        <Link className={`home${kind === 'exercises' ? ' on' : ''}`} href="/admin/exercises">
          Media library
          <span className="ct">{exerciseCount}</span>
        </Link>

        {tree.map(stage => {
          const menus = q
            ? stage.menus
                .map(m => ({ ...m, routines: matches(m.title) ? m.routines : m.routines.filter(r => matches(r.title)) }))
                .filter(m => matches(m.title) || m.routines.length > 0)
            : stage.menus;
          if (q && menus.length === 0) return null;
          if (!q && stage.id === '' && menus.length === 0) return null;
          const stageOpen = q ? true : openStages.has(stage.id);

          return (
            <div className="n-area" key={stage.id || 'none'}>
              <div className={`n-arow${here.stage === stage.id ? ' in' : ''}`}>
                <button type="button" className="n-toggle" aria-expanded={stageOpen} onClick={() => setOpenStages(s => toggle(s, stage.id))}>
                  <span className="caret" aria-hidden="true">{stageOpen ? '▾' : '▸'}</span>
                  {stage.name}
                  <span className="ct">{stage.menus.length}</span>
                </button>
                {stage.id && (
                  <Link className={`n-edit${kind === 'stages' && id === stage.id ? ' on' : ''}`} href={`/admin/stages/${stage.id}`} title="Edit stage">
                    Edit
                  </Link>
                )}
              </div>

              {stageOpen &&
                menus.map(menu => {
                  const menuOpen = q ? menu.routines.length > 0 : openMenus.has(menu.id);
                  return (
                    <div className="n-program" key={menu.id}>
                      <div className={`n-prow${here.menu === menu.id ? ' in' : ''}${kind === 'menus' && id === menu.id ? ' on' : ''}`}>
                        <button type="button" className="n-caret" aria-label={menuOpen ? 'Hide routines' : 'Show routines'} aria-expanded={menuOpen} onClick={() => setOpenMenus(s => toggle(s, menu.id))}>
                          {menuOpen ? '▾' : '▸'}
                        </button>
                        <Link href={`/admin/menus/${menu.id}`}>
                          <i className={`dot ${menu.status}`} title={menu.status} />
                          {menu.title}
                        </Link>
                      </div>

                      {menuOpen && (
                        <div className="n-sessions">
                          {menu.routines.length === 0 && <span className="n-empty">No routines</span>}
                          {menu.routines.map(routine => (
                            <Link
                              key={routine.id}
                              className={`n-srow${here.routine === routine.id ? ' on' : ''}`}
                              href={`/admin/routines/${routine.id}`}
                            >
                              <span className="sn">{routine.weekday == null ? '—' : DAY[routine.weekday]}</span>
                              <span className="st">{routine.title}</span>
                              <i className={`dot ${routine.status}`} title={routine.status} />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

              {stageOpen && !q && stage.id && (
                adding === stage.id ? (
                  addInput('Week title, e.g. Turns & spotting')
                ) : (
                  <button type="button" className="n-addbtn" onClick={() => openAdd(stage.id)}>
                    + New week
                  </button>
                )
              )}
            </div>
          );
        })}

        {!q && (
          <div className="n-addstage">
            {adding === 'stage' ? (
              addInput('Stage name, e.g. Foundations 2')
            ) : (
              <button type="button" className="n-addbtn" onClick={() => openAdd('stage')}>
                + New stage
              </button>
            )}
          </div>
        )}
      </nav>

      <div className="n-key" aria-hidden="true">
        <span><i className="dot open" /> open</span>
        <span><i className="dot soon" /> soon</span>
        <span><i className="dot draft" /> draft</span>
      </div>
    </aside>
  );
}
