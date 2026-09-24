'use client';

/* The back office's navigation: the whole catalogue, always on screen.

   Areas → programs → sessions, with the branch you are standing in opened and
   highlighted — on a video's screen, that is its session. A search box filters
   every program and session by title, which beats scrolling through seven areas
   and thirty-odd programs to reach one session. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { PublishStatus } from '@/lib/db';

export interface NavSession {
  id: string;
  position: number;
  title: string;
  status: PublishStatus;
  videoIds: string[];
}
export interface NavProgram {
  id: string;
  title: string;
  status: PublishStatus;
  sessions: NavSession[];
}
export interface NavArea {
  id: string;
  name: string;
  programs: NavProgram[];
}

const two = (n: number) => String(n).padStart(2, '0');

export default function Sidebar({ tree }: { tree: NavArea[] }) {
  const pathname = usePathname();
  const [, kind, id] = pathname.split('/').slice(1);

  /* Where are we? A video is found through its session. */
  const here = useMemo(() => {
    for (const area of tree) {
      if (kind === 'areas' && area.id === id) return { area: area.id };
      for (const program of area.programs) {
        if (kind === 'programs' && program.id === id) return { area: area.id, program: program.id };
        for (const session of program.sessions) {
          if ((kind === 'sessions' && session.id === id) || (kind === 'videos' && session.videoIds.includes(id))) {
            return { area: area.id, program: program.id, session: session.id };
          }
        }
      }
    }
    return {};
  }, [tree, kind, id]);

  const [openAreas, setOpenAreas] = useState<Set<string>>(() => new Set(here.area ? [here.area] : []));
  const [openPrograms, setOpenPrograms] = useState<Set<string>>(() => new Set(here.program ? [here.program] : []));
  const [query, setQuery] = useState('');

  /* Following a link in the page opens the branch it leads to. */
  useEffect(() => {
    if (here.area) setOpenAreas(s => (s.has(here.area!) ? s : new Set(s).add(here.area!)));
    if (here.program) setOpenPrograms(s => (s.has(here.program!) ? s : new Set(s).add(here.program!)));
  }, [here.area, here.program]);

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
          placeholder="Find a program or session"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Find a program or session"
        />
      </div>

      <nav className="bonav" aria-label="Catalogue">
        <Link className={`home${kind ? '' : ' on'}`} href="/admin">
          Catalogue overview
        </Link>

        {tree.map(area => {
          const programs = q
            ? area.programs
                .map(p => ({ ...p, sessions: matches(p.title) ? p.sessions : p.sessions.filter(s => matches(s.title)) }))
                .filter(p => matches(p.title) || p.sessions.length > 0)
            : area.programs;
          if (q && programs.length === 0) return null;
          const areaOpen = q ? true : openAreas.has(area.id);

          return (
            <div className="n-area" key={area.id}>
              <div className={`n-arow${here.area === area.id ? ' in' : ''}`}>
                <button type="button" className="n-toggle" aria-expanded={areaOpen} onClick={() => setOpenAreas(s => toggle(s, area.id))}>
                  <span className="caret" aria-hidden="true">{areaOpen ? '▾' : '▸'}</span>
                  {area.name}
                  <span className="ct">{area.programs.length}</span>
                </button>
                <Link className={`n-edit${kind === 'areas' && id === area.id ? ' on' : ''}`} href={`/admin/areas/${area.id}`} title="Edit area">
                  Edit
                </Link>
              </div>

              {areaOpen &&
                programs.map(program => {
                  const programOpen = q ? program.sessions.length > 0 : openPrograms.has(program.id);
                  return (
                    <div className="n-program" key={program.id}>
                      <div className={`n-prow${here.program === program.id ? ' in' : ''}${kind === 'programs' && id === program.id ? ' on' : ''}`}>
                        <button type="button" className="n-caret" aria-label={programOpen ? 'Hide sessions' : 'Show sessions'} aria-expanded={programOpen} onClick={() => setOpenPrograms(s => toggle(s, program.id))}>
                          {programOpen ? '▾' : '▸'}
                        </button>
                        <Link href={`/admin/programs/${program.id}`}>
                          <i className={`dot ${program.status}`} title={program.status} />
                          {program.title}
                        </Link>
                      </div>

                      {programOpen && (
                        <div className="n-sessions">
                          {program.sessions.length === 0 && <span className="n-empty">No sessions</span>}
                          {program.sessions.map(session => (
                            <Link
                              key={session.id}
                              className={`n-srow${here.session === session.id ? ' on' : ''}`}
                              href={`/admin/sessions/${session.id}`}
                            >
                              <span className="sn">{two(session.position)}</span>
                              <span className="st">{session.title}</span>
                              <i className={`dot ${session.status}`} title={session.status} />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </nav>

      <div className="n-key" aria-hidden="true">
        <span><i className="dot open" /> open</span>
        <span><i className="dot soon" /> soon</span>
        <span><i className="dot draft" /> draft</span>
      </div>
    </aside>
  );
}
