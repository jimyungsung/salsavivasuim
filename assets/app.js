/* Shared helpers for the SUIM member app pages. */

export const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* Wires the EN/KO switch. `render(dict, lang)` runs after every change so a page
   can rebuild whatever it generates from data. */
export function initLang(C, render){
  const apply = l => {
    const c = C[l];
    document.documentElement.lang = l;
    document.body.classList.toggle('ko', l === 'ko');
    document.querySelectorAll('[data-t]').forEach(e => { if (c[e.dataset.t] !== undefined) e.textContent = c[e.dataset.t]; });
    document.querySelectorAll('[data-tph]').forEach(e => { if (c[e.dataset.tph] !== undefined) e.placeholder = c[e.dataset.tph]; });
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    if (render) render(c, l);
    try { localStorage.setItem('suim-lang', l); } catch (e) {}
  };
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => apply(b.dataset.lang)));
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
