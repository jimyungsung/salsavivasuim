/* Shared helpers for the SUIM member app pages. */

export const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* The signed-in navigation. Every app screen renders this same markup from
   here, so the bar cannot drift between screens. `current` is one of the item
   keys, or omitted on screens that sit below a section (they show a back link
   instead). */
export const NAV = {
  en: { masterplan:'Masterplan', training:'My training', library:'Library', progress:'Progress',
        member:'Jimyung', initials:'JS', language:'Language' },
  ko: { masterplan:'마스터플랜', training:'나의 트레이닝', library:'라이브러리', progress:'진행 상황',
        member:'지명', initials:'JS', language:'언어' }
};

const NAV_ITEMS = [['masterplan', 'masterplan.html'], ['training', 'plan.html'], ['library', '#'], ['progress', '#']];

export function renderNav(lang, current){
  const host = document.getElementById('appnav');
  if (!host) return;
  const n = NAV[lang] || NAV.en;
  host.innerHTML = `<div class="wrap">
    <a class="logo" href="masterplan.html">SUIM<span class="dot">.</span></a>
    <nav class="navlinks" aria-label="Main">
      ${NAV_ITEMS.map(([k, href]) =>
        `<a href="${href}"${k === current ? ' aria-current="page"' : ''}>${esc(n[k])}</a>`).join('')}
    </nav>
    <div class="tools">
      <div class="lang"><span class="sr">${esc(n.language)}</span>
        <button type="button" data-lang="en" aria-pressed="${lang === 'en'}">EN</button>
        <button type="button" data-lang="ko" aria-pressed="${lang === 'ko'}">KO</button>
      </div>
      <div class="me"><span class="av" aria-hidden="true">${esc(n.initials)}</span><span>${esc(n.member)}</span></div>
    </div>
  </div>`;
}

/* Wires the EN/KO switch. `render(dict, lang)` runs after every change so a page
   can rebuild whatever it generates from data. */
export function initLang(C, render, navCurrent){
  const apply = l => {
    const c = C[l];
    document.documentElement.lang = l;
    document.body.classList.toggle('ko', l === 'ko');
    renderNav(l, navCurrent);
    document.querySelectorAll('[data-t]').forEach(e => { if (c[e.dataset.t] !== undefined) e.textContent = c[e.dataset.t]; });
    document.querySelectorAll('[data-tph]').forEach(e => { if (c[e.dataset.tph] !== undefined) e.placeholder = c[e.dataset.tph]; });
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    if (render) render(c, l);
    try { localStorage.setItem('suim-lang', l); } catch (e) {}
  };
  /* Delegated, so re-rendering the nav never unbinds the switch. */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-lang]');
    if (b) apply(b.dataset.lang);
  });
  let l = new URLSearchParams(location.search).get('lang');
  if (!l) { try { l = localStorage.getItem('suim-lang'); } catch (e) {} }
  apply(C[l] ? l : 'en');
}

/* Keeps ?lang= on links so the language survives navigation between pages. */
export function carryLang(){
  const l = document.documentElement.lang;
  if (l !== 'ko') return;
  document.querySelectorAll('a[href]').forEach(a => {
    const h = a.getAttribute('href');
    if (!h || h.startsWith('#') || h.includes('lang=') || /^[a-z]+:/i.test(h)) return;
    a.setAttribute('href', h + (h.includes('?') ? '&' : '?') + 'lang=ko');
  });
}

/* Toggle buttons that only change their own pressed state, plus an optional side effect. */
export function toggle(id, fn){
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', () => {
    const on = el.getAttribute('aria-pressed') === 'true';
    el.setAttribute('aria-pressed', String(!on));
    if (fn) fn(!on);
  });
}

/* Radio-style button group (playback speed). */
export function group(selector){
  const els = [...document.querySelectorAll(selector)];
  els.forEach(b => b.addEventListener('click', () => {
    els.forEach(x => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
  }));
}
