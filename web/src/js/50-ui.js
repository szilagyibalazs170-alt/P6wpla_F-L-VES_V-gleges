/* ===== felület: témák, coverflow, könyvtár/keresés, beállítások, fényperem ===== */
const THEMES = [
  { id: 'albums',    name: 'Albumok',  tag: 'Üveg coverflow',     glow: ['#ff7a2f', '#ffb547'], accent: '#ff9a4d' },
  { id: 'arc',       name: 'Ív',       tag: 'Legyező borítók',    glow: ['#ff9a8b', '#ff6a88'], accent: '#ff8a80' },
  { id: 'pearl',     name: 'Gyöngy',   tag: 'Lebegő borítósor',   glow: ['#c6ff3d', '#7dff5a'], accent: '#c6ff3d' },
  { id: 'dial',      name: 'Tárcsa',   tag: 'Forgó bakelit',      glow: ['#ff9f80', '#ff6f61'], accent: '#ff8f70' },
  { id: 'spotlight', name: 'Reflektor', tag: 'Most szól kártya',  glow: ['#33c3ff', '#ffd400'], accent: '#ffd400' },
  { id: 'vision',    name: 'Vízió',    tag: 'Lebegő üvegpanelek', glow: ['#8fe3ff', '#3a9dff'], accent: '#56b6ff' },
  { id: 'tile',      name: 'Csempe',   tag: 'Óriás óra',          glow: ['#ff7b6b', '#ffb199'], accent: '#ff4d4d' },
  { id: 'karaoke',   name: 'Dalszöveg', tag: 'Kinetikus szöveg',  glow: ['#ff4fa3', '#a35cff'], accent: '#ff4fa3' },
];
const PRESETS = [['#ff4fa3', '#ff9a4d', 'Rózsa'], ['#33c3ff', '#ffd400', 'Éj-arany'], ['#c6ff3d', '#3dff9a', 'Lime'], ['#8fe3ff', '#3a9dff', 'Jég'],
  ['#ff7a2f', '#ffb547', 'Parázs'], ['#a35cff', '#ff4fa3', 'Neon'], ['#ff3355', '#ff3355', 'Vörös'], ['#ffffff', '#c9c9d6', 'Fehér']];
if (!THEMES.some(t => t.id === set.theme)) set.theme = 'albums';

/* ---------- sablonok ---------- */
const progHTML = (times = true) => `<div class="prog" data-b="prog"><div class="fill"></div><div class="kn"><div class="knob"></div></div></div>${times ? '<div class="times"><span data-b="cur">0:00</span><span data-b="dur">0:00</span></div>' : ''}`;
const queueHTML = `<div class="queue panel abs"><div class="qh"><div><h4>Folytatás <small>⌄</small></h4><div class="sub" data-b="qsub"></div></div><span class="qi" data-act="library">${IC.list}</span></div><div class="list" data-b="queue"></div></div>`;
const pillHTML = (extra = '') => `<div class="pill panel ${extra}">
  ${ib('shuffle', 'sm', 'Keverés')}${ib('prev', '', 'Előző')}${ib('toggle', 'pp', 'Lejátszás')}${ib('next', '', 'Következő')}${ib('repeat', 'sm', 'Ismétlés')}
  <div class="mini" data-act="open"><div class="cover"><img data-b="art" alt=""></div><div class="meta"><div class="t" data-b="title"></div><div class="a" data-b="sub"></div>${progHTML(false)}</div></div>
  ${ib('more', 'sm', 'Továbbiak')}${ib('lyrics', 'sm', 'Dalszöveg')}${ib('cast', 'sm', 'Eszközök')}${ib('list', 'sm', 'Könyvtár')}${ib('vol', 'sm', 'Hangerő')}</div>`;
const searchHTML = `<button class="search panel" data-act="library">${IC.search}<span>Keresés: dalok, albumok, előadók…</span></button>`;
const minisHTML = `<div class="minis">${ib('mic', '', 'Hangvezérlés')}${ib('library', '', 'Keresés').replace(IC.library, IC.search)}${ib('target', '', 'Téma')}${ib('collapse', '', 'Letisztult')}</div>`;
const ctrlHTML = `<div class="ctrl">${ib('lyrics', 'sm')}${ib('prev')}${ib('toggle', 'pp accent')}${ib('next')}${ib('list', 'sm')}</div>`;

const TPL = {
  albums: () => `${queueHTML}<div class="col"><div class="flow" data-b="flow" data-kind="cover"></div><div class="srow">${searchHTML}${minisHTML}</div>${pillHTML()}</div>`,
  arc: () => `${queueHTML}<div class="col"><div class="flow" data-b="flow" data-kind="arc"></div>
    <div class="arcbar" data-b="arcbar"><svg viewBox="0 0 1000 100" preserveAspectRatio="none"><path class="trk" d="M0,8 Q500,120 1000,8" vector-effect="non-scaling-stroke"/><path class="val" d="M0,8 Q500,120 1000,8" vector-effect="non-scaling-stroke"/></svg><i class="knob"></i></div>
    <div class="info"><div class="t" data-b="title"></div><div class="a" data-b="sub"></div></div>${pillHTML('slim')}</div>`,
  pearl: () => `${queueHTML}<div class="col"><div class="info top"><div class="t" data-b="title"></div><div class="a" data-b="artist"></div></div><div class="flow" data-b="flow" data-kind="strip"></div>
    <div class="bar">${progHTML()}</div>${pillHTML('slim')}</div>`,
  dial: () => `${queueHTML}<div class="col"><div class="dialwrap"><div class="disc" data-b="disc"><svg viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="48"/><circle class="val" cx="50" cy="50" r="48" stroke-dasharray="301.6" stroke-dashoffset="301.6"/></svg>
    <div class="cover round"><img data-b="art" alt=""></div><div class="lbl"><div class="t" data-b="title"></div><div class="a"><span data-b="cur">0:00</span> · <span data-b="dur">0:00</span></div></div></div>
    <div class="flow" data-b="flow" data-kind="dial"></div></div>${pillHTML('slim')}</div>`,
  spotlight: () => `<div class="col"><div class="spot"><div class="hero panel"><div class="l"><div class="k">MOST SZÓL</div><div class="t" data-b="title"></div>
      <div class="chips"><span data-b="artist"></span><span data-b="album"></span></div>
      <div class="hb"><button class="btnp" data-act="toggle"><span data-b="playicon">${IC.pause}</span><span data-b="playtxt">Szünet</span></button>${ib('lyrics', 'sm')}${ib('more', 'sm')}</div></div>
      <div class="r"><img data-b="art" alt=""></div></div>${queueHTML}
    <div class="albums"><h5>Albumok</h5><div class="rowc" data-b="albums"></div></div>
    <div class="np panel"><div class="top"><div class="cover"><img data-b="art" alt=""></div><div class="m"><div class="t" data-b="title"></div><div class="a" data-b="artist"></div></div></div>${progHTML()}${ctrlHTML}</div></div></div>`,
  vision: () => `<div class="col"><div class="vis">${queueHTML}<div class="center panel"><div class="head"><div class="bgart" data-b="artbg"></div><div class="k">● ELŐADÓ</div><div class="t" data-b="artist"></div>
      <div class="a">Most szól: „<span data-b="title"></span>”</div><div class="hb">${ib('toggle', 'pp accent')}${ib('lyrics', 'sm')}${ib('library', 'sm').replace(IC.library, IC.search)}</div></div>
      <div class="body"><h5>Albumok</h5><div class="list" data-b="albumlist"></div></div></div>
    <div class="np2 panel"><div class="k">MOST SZÓL</div><div class="cover"><img data-b="art" alt=""></div><div class="t" data-b="title"></div><div class="a" data-b="artist"></div>${progHTML()}</div></div>${pillHTML('slim')}</div>`,
  tile: () => `<div class="bigname"><span data-b="artist"></span><small data-b="title"></small></div>
    <div class="tilecard panel"><div class="art" data-b="artbg"><div class="hd"><span class="srcdot" data-b="srcdot"></span><div class="m"><div class="t" data-b="title"></div><div class="a" data-b="artist"></div></div></div>
    <div class="ft">${progHTML()}<div class="ctrl">${ib('prev')}${ib('toggle', 'pp')}${ib('next')}${ib('lyrics', 'sm')}</div></div></div></div>`,
  karaoke: () => `<div class="side"><div class="cover"><img data-b="art" alt=""></div><div class="m"><div class="t" data-b="title"></div><div class="a" data-b="sub"></div></div></div>${pillHTML('karp')}`,
};

/* ---------- renderelés ---------- */
const stage = $('#stage');
let B = {};
function mountTheme(id, anim = true) {
  const th = THEMES.find(t => t.id === id) || THEMES[0];
  set.theme = th.id; save();
  const doMount = () => {
    app.dataset.theme = th.id;
    stage.innerHTML = `<div class="t-${th.id}">${TPL[th.id]()}</div>`;
    B = {}; $$('[data-b]', stage).forEach(e => (B[e.dataset.b] ||= []).push(e));
    flow.reset(); applyColors(); applyBg(); paint(true, true); lyrics.refresh(); renderSheet();
    stage.classList.remove('out');
  };
  if (anim && stage.innerHTML) { stage.classList.add('out'); setTimeout(doMount, 360); toastTheme(th); } else doMount();
}
const each = (k, fn) => (B[k] || []).forEach(fn);
let lastArt = null;
function paint(lists = false, artChanged = false) {
  const [sName, sCol] = srcInfo();
  each('title', e => e.textContent = S.title || 'Nincs lejátszás');
  each('artist', e => e.textContent = S.artist || 'Indíts el egy dalt');
  each('album', e => e.textContent = S.album || sName);
  each('sub', e => e.textContent = [S.artist, S.album].filter(Boolean).join(' — ') || sName);
  each('srcdot', e => e.style.setProperty('--src', sCol));
  each('playbtn', e => e.innerHTML = S.playing ? IC.pause : IC.play);
  each('playicon', e => e.innerHTML = S.playing ? IC.pause : IC.play);
  each('playtxt', e => e.textContent = S.playing ? 'Szünet' : 'Lejátszás');
  each('dur', e => e.textContent = fmt(S.dur));
  if (artChanged || lastArt !== S.art) { lastArt = S.art; each('art', e => { if (S.art) e.src = S.art; }); each('artbg', e => e.style.backgroundImage = S.art ? `url("${S.art}")` : ''); }
  $('#srcBadge .name').textContent = sName; $('#srcBadge .srcdot').style.setProperty('--src', sCol);
  $$('[data-act=lyrics]').forEach(e => e.classList.toggle('on', set.lyr));
  $$('[data-act=shuffle],[data-act=repeat]').forEach(e => e.classList.toggle('dis', S.mode === 'native' && !S.canShuffle && !S.canRepeat));
  app.classList.toggle('minimal', !!set.minimal);
  $('#onboard').classList.toggle('on', NATIVE && !S.access && !S.tv);
  if (artChanged) markCurAlbum();
  if (lists || artChanged) { renderQueue(); flow.render(); renderAlbumRows(); }
}
const curItem = () => ({ key: S.key, title: S.title, artist: S.artist, art: S.thumb || S.art, cur: true });
const rowHTML = (it, cur) => `<div class="row ${cur ? 'cur' : ''}" ${it.id != null ? `data-q="${esc(it.id)}"` : ''}><div class="cover"><img src="${esc(it.art || coverOf(it))}" alt="" loading="lazy"></div>
  <div class="meta"><div class="t">${esc(it.title)}</div><div class="a">${esc(it.artist)}</div></div>${cur ? '<div class="eq"><i></i><i></i><i></i></div>' : ''}</div>`;
function renderQueue() {
  const up = S.queue.length > 0;
  each('qsub', e => e.textContent = up ? `Következik · ${srcInfo()[0]}` : 'Nemrég szólt');
  const items = up ? S.queue.slice(0, 12) : S.history.slice(-12).reverse();
  each('queue', e => e.innerHTML = (S.title ? rowHTML(curItem(), true) : '') + items.map(it => rowHTML(it)).join(''));
}
function renderAlbumRows() {
  const al = S.albums.length ? S.albums : [];
  each('albums', e => e.innerHTML = al.slice(-8).reverse().map(a => `<div class="al ${a.cur ? 'c' : ''}" data-album="${S.albums.indexOf(a)}"><div class="cover"><img src="${esc(a.thumbArt || a.art)}" alt="" loading="lazy"></div><div class="t">${esc(a.title)}</div><div class="a">${esc(a.year)} · ${esc(a.type || 'Album')}</div></div>`).join('') || '<div class="empty">Az előadó albumai itt jelennek meg.</div>');
  each('albumlist', e => e.innerHTML = al.slice(-6).reverse().map(a => `<div class="row" data-album="${S.albums.indexOf(a)}"><div class="cover"><img src="${esc(a.thumbArt || a.art)}" alt="" loading="lazy"></div><div class="meta"><div class="t">${esc(a.title)}</div><div class="a">${esc(a.year)} · ${esc(a.type || 'Album')}</div></div></div>`).join('') || '<div class="empty">Az előadó albumai itt jelennek meg.</div>');
}

/* ---------- albumok betöltése az előadóhoz ---------- */
async function loadAlbums() {
  const a = S.artist; const k = norm(a);
  if (!k || k === S.albumsFor) { markCurAlbum(); return; }
  S.albumsFor = k;
  let list = [];
  if (S.mode === 'demo') list = demoAlbums(a);
  else try { list = await itunes.artistAlbums(a); } catch { list = []; }
  if (S.albumsFor !== k) return;
  S.albums = list; markCurAlbum(); flow.reset(); paint(true);
}
function markCurAlbum() {
  const na = norm(S.album);
  S.albums.forEach(x => x.cur = false);
  let c = na ? S.albums.find(x => norm(x.title) === na) || S.albums.find(x => norm(x.title).startsWith(na) || na.startsWith(norm(x.title))) : null;
  if (!c && S.title) {
    c = { kind: 'album', title: S.album || S.title, artist: S.artist, art: S.art, thumbArt: S.thumb, year: '', type: S.album ? 'Album' : 'Kislemez', virtual: true };
    S.albums = S.albums.filter(x => !x.virtual); S.albums.push(c);
  }
  if (c) { c.cur = true; if ((c.virtual || c.self) && S.art) { c.art = S.art; c.thumbArt = S.thumb || S.art; } }
}
function demoAlbums(artist) {
  const names = ['Első lemez', 'Éjszakai út', 'Arany kor', S.album || 'Neon szív', 'Hosszú nyár', 'Utolsó kör', 'Visszhang'];
  return names.map((n, k) => ({ kind: 'album', title: n, artist, art: n === S.album ? S.art : genCover(n + '|' + artist), thumbArt: n === S.album ? S.thumb : genCover(n + '|' + artist), year: String(2016 + k), type: 'Album', demo: true, self: n === S.album }));
}

/* ---------- coverflow (húzható) ---------- */
const flow = (() => {
  let off = 0, drag = null, idleT, els = new Map(), box = null;
  function items(kind) {
    if (kind === 'dial') return { list: [...S.history.slice(-3), curItem(), ...S.queue.slice(0, 3)], ci: Math.min(3, S.history.length) };
    if (S.albums.length) { const ci = Math.max(0, S.albums.findIndex(a => a.cur)); return { list: S.albums, ci }; }
    const before = S.history.slice(-4); return { list: [...before, curItem(), ...S.queue.slice(0, 4)], ci: before.length };
  }
  function render() {
    box = (B.flow || [])[0]; if (!box) return;
    const kind = box.dataset.kind, { list, ci } = items(kind);
    const W = box.clientWidth || innerWidth * 0.6, H = box.clientHeight || innerHeight * 0.4, vh = innerHeight / 100;
    const port = innerHeight > innerWidth;
    let cw = kind === 'cover' ? Math.min(H * 0.6, W / 4.6) : kind === 'arc' ? Math.min(H * 0.62, W / 6) : kind === 'strip' ? Math.min(H * 0.56, W / 9) : 6.6 * vh;
    if (port && kind !== 'dial') cw = Math.min(innerWidth * (kind === 'strip' ? 0.22 : 0.42), H * 0.62);
    box.style.setProperty('--cw', cw + 'px');
    const center = ci + off, seen = new Set();
    list.forEach((it, n) => {
      const k = n - center, a = Math.abs(k);
      const id = (it.title || '') + '|' + (it.year || '') + '|' + (it.id ?? '');
      if (a > 6.5) return;
      seen.add(id);
      let el = els.get(id);
      if (!el) {
        el = document.createElement('div'); el.className = 'it'; const src = esc(it.art || coverOf(it));
        const sub = it.kind === 'album' ? `${esc(it.year)}${it.year ? ' · ' : ''}${esc(it.type || 'Album')}` : esc(it.artist || '');
        el.innerHTML = `<div class="card"><div class="cover"><img src="${src}" alt="" draggable="false"></div>${kind === 'dial' ? '' : `<div class="cap"><div class="t">${esc(it.title)}</div><div class="a">${sub}</div></div>`}</div>`
          + (kind === 'cover' ? `<div class="refl"><img src="${src}" alt="" draggable="false"></div>` : '') + (kind === 'dial' ? `<div class="lab">${esc(it.title)}</div>` : '');
        el.style.opacity = '0'; el.style.transform = `translate(-50%,-50%) translateX(${Math.sign(k) * W * 0.5}px) scale(.6)`;
        box.appendChild(el); els.set(id, el); void el.offsetWidth;
      }
      el._n = n; el._it = it;
      if ((it.virtual || it.self) && it.art) { const im = el.querySelector('.cover img'); if (im && im.getAttribute('src') !== it.art) { im.src = it.art; const r = el.querySelector('.refl img'); if (r) r.src = it.art; } }
      el.style.width = cw + 'px'; el.classList.toggle('c', Math.round(k) === 0);
      const sg = Math.sign(k), sk = clamp(k, -1, 1);
      let tf, op = 1;
      if (kind === 'cover') { tf = `translate3d(${k * cw * 0.5 + sk * cw * 0.6}px,0,${-a * cw * 0.42 - Math.abs(sk) * cw * 0.2}px) rotateY(${-sk * 42}deg) scale(${1.18 - Math.min(a, 1) * 0.18})`; op = a > 4.5 ? 0 : 1 - Math.max(0, a - 1) * 0.16; }
      else if (kind === 'arc') { tf = `translate3d(${k * cw * 0.86}px,${k * k * cw * 0.06}px,${-a * cw * 0.28}px) rotateZ(${k * 3.2}deg) rotateY(${-k * 15}deg) scale(${1.16 - Math.min(a, 1) * 0.24})`; op = a > 4 ? 0 : 1 - a * 0.1; }
      else if (kind === 'strip') { tf = `translateX(${k * cw * 1.1 + sk * cw * 0.34}px) translateY(${Math.sin(n * 1.7 + performance.now() / 4000) * 4}px) scale(${1.45 - Math.min(a, 1) * 0.45})`; op = a > 5 ? 0 : 1 - a * 0.07; }
      else { const R = 30 * vh, ang = k * 17 * Math.PI / 180; tf = `translate(${Math.cos(ang) * R}px,${Math.sin(ang) * R}px) scale(${1.3 - Math.min(a, 1) * 0.3})`; op = a > 3.5 ? 0 : 1 - a * 0.15; }
      el.style.transform = `translate(-50%,-50%) ${tf}`; el.style.opacity = op; el.style.zIndex = 100 - Math.round(a * 10);
      el.style.filter = a > 0.5 ? `brightness(${1 - Math.min(a, 4) * 0.1})` : 'none';
    });
    for (const [id, el] of els) if (!seen.has(id)) { el.style.opacity = '0'; els.delete(id); setTimeout(() => el.remove(), 700); }
  }
  function idle() { clearTimeout(idleT); idleT = setTimeout(() => { off = 0; render(); }, 9000); }
  function down(e) {
    box = e.target.closest('.flow'); if (!box) return;
    drag = { x: e.clientX, o: off, moved: false, cw: parseFloat(box.style.getPropertyValue('--cw')) || 200 }; box.classList.add('drag');
  }
  function move(e) {
    if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) drag.moved = true;
    const { list, ci } = items(box.dataset.kind);
    off = clamp(drag.o - dx / (drag.cw * (box.dataset.kind === 'strip' ? 1.2 : 0.75)), -ci, list.length - 1 - ci); render();
  }
  function up(e) {
    if (!drag) return; box.classList.remove('drag'); const d = drag; drag = null;
    off = Math.round(off); render(); idle();
    if (d.moved) return;
    const el = e.target.closest('.it'); if (!el || !el._it) return;
    const { ci } = items(box.dataset.kind);
    if (Math.round(el._n - ci - off) === 0 || box.dataset.kind === 'dial') openItem(el._it);
    else { off = el._n - ci; render(); idle(); }
  }
  addEventListener('pointerdown', e => e.target.closest('.flow') && down(e));
  addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  return { render, reset() { off = 0; els.forEach(el => el.remove()); els.clear(); }, get dragging() { return !!drag; } };
})();
function openItem(it) {
  if (it.kind === 'album') return lib.open({ view: 'album', album: it });
  if (it.cur) return control('toggle');
  if (it.id != null) return control('skipTo', it.id);
}

/* ---------- haladás ---------- */
let lastSec = -1, lastF1 = -1, lastF2 = -1;
function tick() {
  const pos = curPos(), f = S.dur ? clamp(pos / S.dur, 0, 1) : 0;
  if (Math.abs(f - lastF1) > 0.00002) {
    lastF1 = f;
    each('prog', e => { e.firstElementChild.style.transform = `scaleX(${f})`; e.children[1].style.transform = `translate3d(${(f - 1) * 100}%,0,0)`; });
  }
  const sec = Math.floor(pos / 1000); if (sec !== lastSec) { lastSec = sec; each('cur', e => e.textContent = fmt(pos)); }
  lyrics.tick(pos);
  if (Math.abs(f - lastF2) < 0.0008) return; lastF2 = f;
  each('disc', e => e.querySelector('.val').style.strokeDashoffset = 301.6 * (1 - f));
  each('arcbar', e => { const p = e.querySelector('.val'), L = e._len || (e._len = p.getTotalLength()); p.style.strokeDasharray = `${L * f} ${L}`; const pt = p.getPointAtLength(L * f), kn = e.querySelector('.knob'); kn.style.left = pt.x / 10 + '%'; kn.style.top = pt.y + '%'; });
}

/* ---------- színek ---------- */
function applyColors() {
  const th = THEMES.find(t => t.id === set.theme) || THEMES[0];
  let a, b, acc;
  if (set.glowMode === 'auto' && S.colors) { [a, b] = S.colors; acc = a; }
  else if (set.glowMode === 'preset') { [a, b] = PRESETS[set.preset] || PRESETS[0]; acc = a; }
  else { [a, b] = th.glow; acc = th.accent; }
  const r = document.documentElement.style;
  r.setProperty('--glowA', a); r.setProperty('--glowB', b); r.setProperty('--accent', acc); r.setProperty('--accent2', b);
  glow.colors = [a, b];
}

/* ---------- fényperem ---------- */
const glow = (() => {
  const cv = $('#glow'), ctx = cv.getContext('2d');
  let w = 0, h = 0, sc = 0.5, parts = [], lastSpawn = 0, ph = 0, lt = 0;
  const api = { colors: ['#ff4fa3', '#ff9a4d'] };
  function resize() { sc = (innerWidth * innerHeight > 1.2e6 ? 0.42 : 0.55) * (S.tv ? Math.min(2, devicePixelRatio || 1) : 1); w = cv.width = Math.round(innerWidth * sc); h = cv.height = Math.round(innerHeight * sc); }
  addEventListener('resize', resize); resize();
  const n = (u, t) => 0.5 + 0.5 * (0.5 * Math.sin(u * 5.1 + t * 1.2) + 0.3 * Math.sin(u * 11.7 - t * 1.9) + 0.2 * Math.sin(u * 23.3 + t * 3.1));
  function edge(len, depth, t, seed, map) {
    const steps = 64, m = Math.min(w, h);
    ctx.beginPath(); let p = map(0, 0); ctx.moveTo(p[0], p[1]);
    for (let i = 0; i <= steps; i++) { const x = (i / steps) * len, d = depth * (0.42 + 0.8 * n(x / m * 3 + seed, t)); p = map(x, d); ctx.lineTo(p[0], p[1]); }
    p = map(len, 0); ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill();
  }
  api.frame = (t, energy) => {
    const dt = Math.min(0.05, t - (lt || t)); lt = t; ph += dt * (0.6 + energy * 0.9);
    ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, w, h);
    const I = set.glowInt; if (I <= 0.01) { if (api._v !== 0) { cv.style.opacity = 0; api._v = 0; } return; } if (api._v !== 1) { cv.style.opacity = 1; api._v = 1; }
    const base = Math.min(w, h) * 0.07 * I * (+set.thick || 1) * energy;
    const grad = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); return g; };
    const dT = base * 0.7, dB = base * 1.2, dS = base * 0.6;
    ctx.fillStyle = grad(0, 0, 0, dT * 1.2); edge(w, dT, ph, 0, (x, d) => [x, d]);
    ctx.fillStyle = grad(0, h, 0, h - dB * 1.2); edge(w, dB, ph * 1.15, 7, (x, d) => [x, h - d]);
    ctx.fillStyle = grad(0, 0, dS * 1.2, 0); edge(h, dS, ph * 0.9, 3, (y, d) => [d, y]);
    ctx.fillStyle = grad(w, 0, w - dS * 1.2, 0); edge(h, dS, ph * 1.05, 11, (y, d) => [w - d, y]);
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = Math.max(1.5, 3 * sc * I); ctx.strokeRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-in';
    const cg = ctx.createLinearGradient(0, 0, 0, h); cg.addColorStop(0, api.colors[0]); cg.addColorStop(1, api.colors[1]); ctx.fillStyle = cg; ctx.fillRect(0, 0, w, h);
    if (set.sparks) {
      ctx.globalCompositeOperation = 'lighter';
      const now = t * 1000, rate = 14 + 46 * energy;
      if (now - lastSpawn > 1000) lastSpawn = now - 1000;
      while (lastSpawn < now) {
        lastSpawn += 1000 / rate; if (parts.length > 170) continue;
        const e = Math.random() * 4 | 0, r = Math.random(), dep = Math.random() * base * 0.9;
        const [x, y] = e === 0 ? [r * w, dep] : e === 1 ? [r * w, h - dep] : e === 2 ? [dep, r * h] : [w - dep, r * h];
        const ix = e === 2 ? 1 : e === 3 ? -1 : 0, iy = e === 0 ? 1 : e === 1 ? -1 : 0;
        parts.push({ x, y, vx: ix * (4 + Math.random() * 10) + (Math.random() - 0.5) * 6, vy: iy * (4 + Math.random() * 10) - 3 - Math.random() * 6, life: 0, max: 1 + Math.random() * 2.2, s: 0.5 + Math.random() * 1.6, c: Math.random() < 0.5 });
      }
      parts = parts.filter(p => (p.life += dt) < p.max);
      for (const p of parts) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        const k = p.life / p.max; ctx.globalAlpha = clamp(Math.sin(k * Math.PI) * (0.6 + 0.4 * Math.sin(p.life * 18 + p.x)), 0, 1);
        ctx.fillStyle = p.c ? api.colors[0] : '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * Math.min(w, h) / 380, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  };
  return api;
})();

/* ---------- hátterek ---------- */
const media = (() => {
  let db; const urls = new Map();
  const open = () => db || (db = new Promise((res, rej) => { const r = indexedDB.open('halo', 1); r.onupgradeneeded = () => r.result.createObjectStore('media', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('media', mode); const r = fn(t.objectStore('media')); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); };
  return {
    async add(file) { const id = Date.now().toString(36); await tx('readwrite', s => s.put({ id, name: file.name, type: file.type.startsWith('video') ? 'video' : 'image', blob: file })); return id; },
    async list() { try { return (await tx('readonly', s => s.getAll())) || []; } catch { return []; } },
    async del(id) { try { await tx('readwrite', s => s.delete(id)); } catch {} if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); } },
    url(item) { if (!urls.has(item.id)) urls.set(item.id, URL.createObjectURL(item.blob)); return urls.get(item.id); },
  };
})();
let mediaCache = [];
async function refreshMedia() { mediaCache = await media.list(); }
function applyBg() {
  const id = set.bgByTheme[set.theme] || 'auto';
  const art = $('#bgArt'), img = $('#bgImg'), vid = $('#bgVideo'), aur = $('#bgAurora'), yt = $('#bgYT');
  [art, img, vid, aur].forEach(e => e.classList.remove('on'));
  document.documentElement.style.setProperty('--dim', set.dim);
  yt.classList.toggle('hide', id.startsWith('m:') || id === 'aurora' || (id === 'album' && ytp.mode !== 'player'));
  if (ytp.mode !== 'player') ytp.wallpaper(id === 'auto' && set.videoBg && S.mode !== 'demo' && S.title !== '');
  if (id.startsWith('m:')) {
    const it = mediaCache.find(m => m.id === id.slice(2));
    if (it) {
      const u = media.url(it);
      if (it.type === 'video') { if (vid.dataset.u !== u) { vid.src = u; vid.dataset.u = u; } vid.play().catch(() => {}); vid.classList.add('on'); }
      else { img.src = u; img.classList.add('on'); vid.pause(); }
      return;
    }
  }
  vid.pause();
  if ((id === 'album' || id === 'auto') && S.art) { art.style.backgroundImage = `url("${S.art}")`; art.classList.add('on'); }
  else aur.classList.add('on');
}

/* ---------- óra ---------- */
function clock() {
  const d = new Date(); let hh = d.getHours(); if (!set.h24) hh = hh % 12 || 12;
  $('#clock .time').textContent = (set.h24 ? String(hh).padStart(2, '0') : hh) + ':' + String(d.getMinutes()).padStart(2, '0');
  $('#clock .date').textContent = d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', weekday: 'long' });
  app.classList.toggle('noclock', !set.clock);
}
setInterval(clock, 1000);

/* ---------- toast, tétlenség, gesztusok ---------- */
let toastT;
function toastHTML(h) { const t = $('#toast'); t.innerHTML = h; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
const toastTheme = th => toastHTML(`<b>${esc(th.name)}</b> · <em>${esc(th.tag)}</em>`);
toastMsg = m => toastHTML(`<b>${esc(m)}</b>`);
let idleT;
function wake() { app.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => { if (!$('.overlay.on')) app.classList.add('idle'); }, 5000); }
['pointerdown', 'pointermove', 'keydown'].forEach(ev => addEventListener(ev, wake, { passive: true })); wake();
function cycleTheme(d) { const i = THEMES.findIndex(t => t.id === set.theme); mountTheme(THEMES[(i + d + THEMES.length) % THEMES.length].id); }
let sw = null;
app.addEventListener('pointerdown', e => { if (e.target.closest('.prog,.overlay,button,input,.flow,.queue,.pop,textarea,select')) return; sw = { x: e.clientX, y: e.clientY, t: performance.now() }; });
app.addEventListener('pointerup', e => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y, dt = performance.now() - sw.t; sw = null; if (Math.abs(dx) > 90 && Math.abs(dy) < 80 && dt < 700) cycleTheme(dx < 0 ? 1 : -1); });
let seekEl = null;
const seekTo = (e, commit) => { const r = seekEl.getBoundingClientRect(); const f = clamp((e.clientX - r.left) / r.width, 0, 1); S.pos = f * S.dur; S.at = performance.now(); if (commit) control('seek', Math.round(f * S.dur)); };
app.addEventListener('pointerdown', e => { const p = e.target.closest('.prog'); if (!p || !S.dur) return; seekEl = p; p.setPointerCapture(e.pointerId); seekTo(e); });
app.addEventListener('pointermove', e => { if (seekEl) seekTo(e); });
app.addEventListener('pointerup', e => { if (seekEl) { seekTo(e, true); seekEl = null; } });

/* ---------- felugró menük ---------- */
function pop(anchor, html) {
  closePops(); const p = document.createElement('div'); p.className = 'pop panel'; p.innerHTML = html; app.appendChild(p);
  const r = anchor.getBoundingClientRect(), pw = p.offsetWidth, ph = p.offsetHeight;
  p.style.left = clamp(r.left + r.width / 2 - pw / 2, 8, innerWidth - pw - 8) + 'px'; p.style.top = Math.max(8, r.top - ph - 10) + 'px';
  requestAnimationFrame(() => p.classList.add('on')); return p;
}
function closePops() { $$('.pop').forEach(p => p.remove()); }
function volPop(anchor) {
  const v = NATIVE ? (N('getVolume') ?? 0.5) : ($('#audio').volume ?? 1);
  const p = pop(anchor, `<div class="vol">${IC.vol}${slider('vol', 0, 1, 0.01, v, '%')}</div>`);
  slHandlers.vol = f => { if (NATIVE) N('setVolume', f); $('#audio').volume = f; };
  slInit(p);
}
function morePop(anchor) {
  const p = pop(anchor, `<button class="mi" data-m="add">${IC.plus} Hozzáadás saját listához</button>
    ${NATIVE && S.mode === 'native' ? `<button class="mi" data-m="open">${IC.open} Megnyitás: ${esc(srcInfo()[0])}</button>` : ''}
    <button class="mi" data-m="album">${IC.library} Az előadó albumai</button>
    <button class="mi" data-m="style">${IC.lyrics} Dalszöveg stílusa…</button>`);
  p.addEventListener('click', e => {
    const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return; closePops();
    if (m === 'add') lib.open({ view: 'addto', item: { title: S.title, artist: S.artist, album: S.album, art: S.thumb } });
    if (m === 'open') N('openSource');
    if (m === 'album') lib.open({ view: 'artist', name: S.artist });
    if (m === 'style') lyrPop(anchor);
  });
}

/* ---------- gombok ---------- */
app.addEventListener('click', e => {
  if (!e.target.closest('.pop') && !e.target.closest('[data-act=vol],[data-act=more]')) closePops();
  const al = e.target.closest('[data-album]'); if (al && !e.target.closest('#lib')) { const a = S.albums[+al.dataset.album]; if (a) lib.open({ view: 'album', album: a }); return; }
  const q = e.target.closest('[data-q]'); if (q && !e.target.closest('button') && !e.target.closest('#lib')) { control('skipTo', q.dataset.q); return; }
  const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
  if (['toggle', 'prev', 'next', 'shuffle', 'repeat'].includes(a)) { control(a); if (a === 'shuffle' || a === 'repeat') b.classList.toggle('on'); }
  else if (a === 'lyrics') { set.lyr = !set.lyr; save(); lyrics.refresh(); paint(); }
  else if (a === 'theme' || a === 'next-theme' || a === 'target') cycleTheme(1);
  else if (a === 'settings') openSheet(true);
  else if (a === 'library' || a === 'list') lib.open({ view: a === 'list' ? 'home' : 'search' });
  else if (a === 'collapse') { set.minimal = !set.minimal; save(); paint(); }
  else if (a === 'cast') devices.show();
  else if (a === 'mic') voice.start();
  else if (a === 'vol') volPop(b);
  else if (a === 'more') morePop(b);
  else if (a === 'open') { if (NATIVE && S.mode === 'native') N('openSource'); }
  else if (a === 'fullscreen') { const d = document; (d.fullscreenElement ? d.exitFullscreen() : d.documentElement.requestFullscreen?.())?.catch?.(() => {}); }
  else if (a === 'grant') N('openNotificationAccess');
});
$('#scrim').addEventListener('click', () => { openSheet(false); lib.close(); devices.hide(); });
addEventListener('keydown', e => {
  if (e.target.closest('input,textarea')) return;
  if (e.key === ' ') control('toggle'); else if (e.key === 'ArrowRight') cycleTheme(1); else if (e.key === 'ArrowLeft') cycleTheme(-1);
  else if (e.key === 'Escape') uiBack();
});
uiBack = () => { if ($('#linkAsk.on')) { $('#linkAsk [data-la="0"]').click(); return true; } if ($('.pop')) { closePops(); return true; } if ($('#voice.on')) { voice.stop(); return true; } if (devices.isOpen) { devices.hide(); return true; } if (lib.isOpen) { lib.back(); return true; } if ($('#sheet').classList.contains('on')) { openSheet(false); return true; } return false; };

/* ---------- könyvtár: keresés, lejátszólisták, albumok, előadók ---------- */
const lib = (() => {
  const el = $('#lib'), body = $('#libBody'), input = $('#libQ');
  let stack = [], tab = 'search', lastQ = '', results = null;
  const songRow = (s, i, ctx) => `<div class="srow2" data-i="${i}" data-ctx="${ctx}"><div class="cover"><img src="${esc(s.thumbArt || s.art || coverOf(s))}" alt="" loading="lazy"></div>
    <div class="meta"><div class="t">${esc(s.title)}${s.explicit ? ' <span class="ex">E</span>' : ''}</div><div class="a">${esc(s.artist)}${s.album ? ' · ' + esc(s.album) : ''}</div></div>
    <span class="d">${s.dur ? fmt(s.dur) : ''}</span><button class="ib sm" data-add="${i}" data-ctx="${ctx}" aria-label="Hozzáadás listához">${IC.plus}</button></div>`;
  const albumCard = (a, i, ctx) => `<button class="acard" data-ai="${i}" data-ctx="${ctx}"><div class="cover"><img src="${esc(a.thumbArt || a.art || coverOf(a))}" alt="" loading="lazy"></div><div class="t">${esc(a.title || a.name)}</div><div class="a">${esc(a.kind === 'playlist' ? (a.owner || '') + (a.count !== '' ? ` · ${a.count} dal` : '') : [a.artist, a.year].filter(Boolean).join(' · '))}</div></button>`;
  const ctxs = {};
  const keep = (name, arr) => (ctxs[name] = arr, name);
  function setTab(t) { tab = t; $$('#libTabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); }
  async function view(v) {
    body.scrollTop = 0; $('#libBack').classList.toggle('show', stack.length > 1);
    if (v.view === 'search' || v.view === 'home') { setTab(v.view === 'home' ? 'lists' : 'search'); if (v.view === 'home') return renderLists(); return renderSearch(); }
    if (v.view === 'mine') { setTab('mine'); return renderMine(); }
    if (v.view === 'recent') { setTab('recent'); return renderRecent(); }
    if (v.view === 'album') return renderAlbum(v.album);
    if (v.view === 'artist') return renderArtist(v.name);
    if (v.view === 'playlist') return renderPlaylist(v.pl);
    if (v.view === 'myl') return renderMyList(v.id);
    if (v.view === 'addto') return renderAddTo(v.item);
  }
  const loading = () => { body.innerHTML = '<div class="spin"></div>'; };
  function renderSearch() {
    if (!lastQ) {
      const hist = S.history.slice(-8).reverse();
      body.innerHTML = `<div class="hint big">Keress bármilyen dalra, albumra vagy előadóra. A választott dal ${playViaName()} indul.</div>
        ${hist.length ? `<h3>Nemrég szólt</h3><div class="songs">${hist.map((s, i) => songRow(s, i, keep('h', hist))).join('')}</div>` : ''}`;
      return;
    }
    if (!results) return loading();
    const r = results;
    body.innerHTML = (r.err ? `<div class="hint">${esc(r.err)}</div>` : '')
      + (r.artists?.length ? `<h3>Előadók</h3><div class="chipsrow">${r.artists.map((a, i) => `<button class="achip" data-artist="${esc(a.name)}"><span>${esc(a.name[0])}</span>${esc(a.name)}</button>`).join('')}</div>` : '')
      + (r.sp?.length ? `<h3><i class="srcdot" style="--src:#1ed760"></i> Spotify</h3><div class="songs">${r.sp.map((s, i) => songRow(s, i, keep('sp', r.sp))).join('')}</div>` : '')
      + (r.songs?.length ? `<h3>Dalok</h3><div class="songs">${r.songs.slice(0, 14).map((s, i) => songRow(s, i, keep('it', r.songs))).join('')}</div>` : '')
      + (r.albums?.length ? `<h3>Albumok</h3><div class="agrid">${r.albums.map((a, i) => albumCard(a, i, keep('al', r.albums))).join('')}</div>` : '')
      + (r.spl?.length ? `<h3>Lejátszólisták</h3><div class="agrid">${r.spl.map((a, i) => albumCard(a, i, keep('spl', r.spl))).join('')}</div>` : '')
      + (r.yt?.length ? `<h3><i class="srcdot" style="--src:#ff0033"></i> YouTube videók</h3><div class="songs">${r.yt.map((s, i) => songRow(s, i, keep('yt', r.yt))).join('')}</div>` : '')
      + (!r.songs?.length && !r.albums?.length && !r.sp?.length && !r.err ? '<div class="hint">Nincs találat.</div>' : '');
  }
  const doSearch = debounce(async q => {
    lastQ = q.trim(); results = null; if (tab !== 'search') { setTab('search'); stack = [{ view: 'search' }]; }
    if (!lastQ) return renderSearch(); renderSearch();
    const my = lastQ;
    const [it, sp, yt] = await Promise.all([
      itunes.search(my).catch(e => ({ err: 'A katalógus most nem érhető el (' + e.message + ')' })),
      spotify.connected ? spotify.search(my).catch(() => null) : null,
      youtube.ready ? youtube.search(my, 6).catch(() => null) : null,
    ]);
    if (my !== lastQ) return;
    results = { ...it, sp: sp?.songs, spl: sp?.playlists, yt };
    if (tab === 'search' && stack.length <= 1) renderSearch();
  }, 380);
  async function renderLists() {
    let html = '';
    if (spotify.connected) {
      body.innerHTML = '<div class="spin"></div>';
      try {
        const pls = await spotify.playlists(); const liked = { kind: 'playlist', name: 'Kedvelt dalok', liked: true, art: '', count: '', owner: 'Spotify' };
        const all = [liked, ...pls];
        html += `<h3><i class="srcdot" style="--src:#1ed760"></i> Spotify lejátszólistáid</h3><div class="agrid">${all.map((p, i) => albumCard(p, i, keep('pls', all))).join('')}</div>`;
      } catch (e) { html += `<div class="hint">A Spotify listák betöltése nem sikerült (${esc(e.message)}). Próbáld újra összekapcsolni a Beállításokban.</div>`; }
    } else html += `<div class="connect panel"><div><b>Spotify lejátszólisták</b><p>Kösd össze a Spotify-fiókodat, és itt látod az összes lejátszólistádat és a kedvelt dalaidat.</p></div><button class="btn pri" data-goto="accounts">Összekapcsolás</button></div>`;
    const mine = myLists.all();
    html += `<h3>Saját Halo listák</h3><div class="agrid">${mine.map(p => `<button class="acard" data-myl="${p.id}"><div class="cover stack">${p.tracks.slice(0, 4).map(t => `<img src="${esc(t.thumbArt || t.art || coverOf(t))}" alt="">`).join('') || `<span>${IC.list}</span>`}</div><div class="t">${esc(p.name)}</div><div class="a">${p.tracks.length} dal</div></button>`).join('')}<button class="acard new" data-newlist>${IC.plus}<div class="t">Új lista</div></button></div>`;
    if (tab === 'lists') body.innerHTML = html;
  }
  function renderMine() { renderLists(); }
  function renderRecent() { const hist = S.history.slice().reverse(); body.innerHTML = `<h3>Előzmények</h3><div class="songs">${hist.map((s, i) => songRow(s, i, keep('h', hist))).join('') || '<div class="hint">Még nincs előzmény.</div>'}</div>`; }
  async function renderAlbum(a) {
    body.innerHTML = `<div class="dhead"><div class="cover big"><img src="${esc(a.art || coverOf(a))}" alt=""></div><div><div class="k">${esc(a.type || 'Album')}${a.year ? ' · ' + esc(a.year) : ''}</div><h2>${esc(a.title)}</h2><button class="lnk" data-artist="${esc(a.artist)}">${esc(a.artist)}</button>
      <div class="acts"><button class="btn pri" data-playall>${IC.play} Lejátszás</button><button class="btn" data-shuf>${IC.shuffle} Keverés</button></div></div></div><div class="songs" id="atr"><div class="spin"></div></div>`;
    let tr = [];
    try { tr = a.colId ? await itunes.albumTracks(a.colId) : a.demo ? ['Bevezető', 'Fények', 'Éjfél', 'Visszhang', 'Hazaút'].map((t, k) => ({ title: t, artist: a.artist, album: a.title, art: a.art, dur: 150000 + k * 9000 })) : (await itunes.search(`${a.artist} ${a.title}`)).songs.filter(s => norm(s.album) === norm(a.title)); } catch { tr = []; }
    keep('alb', tr); const box = $('#atr', body); if (!box) return;
    box.innerHTML = tr.map((s, i) => songRow(s, i, 'alb')).join('') || '<div class="hint">A dallista nem érhető el.</div>';
  }
  async function renderArtist(name) {
    body.innerHTML = `<div class="dhead"><div class="avatar">${esc((name || '?')[0])}</div><div><div class="k">Előadó</div><h2>${esc(name)}</h2><div class="acts"><button class="btn pri" data-artplay>${IC.play} Népszerű dalok</button></div></div></div><h3>Albumok</h3><div class="agrid" id="aal"><div class="spin"></div></div><h3>Dalok</h3><div class="songs" id="aso"></div>`;
    const [al, so] = await Promise.all([itunes.artistAlbums(name).catch(() => []), itunes.artistSongs(name).catch(() => [])]);
    keep('aal', al.slice().reverse()); keep('aso', so);
    const a1 = $('#aal', body), a2 = $('#aso', body); if (!a1) return;
    a1.innerHTML = ctxs.aal.map((a, i) => albumCard(a, i, 'aal')).join('') || '<div class="hint">Nincs album.</div>';
    a2.innerHTML = so.slice(0, 15).map((s, i) => songRow(s, i, 'aso')).join('');
    if (ctxs.aal[0]?.art) $('.avatar', body).style.backgroundImage = `url("${ctxs.aal[0].art}")`;
  }
  async function renderPlaylist(p) {
    body.innerHTML = `<div class="dhead"><div class="cover big">${p.art ? `<img src="${esc(p.art)}" alt="">` : `<span class="liked">${IC.heart}</span>`}</div><div><div class="k">Lejátszólista</div><h2>${esc(p.name)}</h2><div class="a">${esc(p.owner || '')}</div>
      <div class="acts"><button class="btn pri" data-plplay>${IC.play} Lejátszás</button></div></div></div><div class="songs" id="ptr"><div class="spin"></div></div>`;
    let tr = []; try { tr = p.liked ? await spotify.liked() : await spotify.playlistTracks(p.id); } catch (e) { tr = []; }
    keep('pl', tr); ctxs.plMeta = p; const box = $('#ptr', body); if (!box) return;
    box.innerHTML = tr.map((s, i) => songRow(s, i, 'pl')).join('') || '<div class="hint">Üres lista, vagy nem érhető el.</div>';
  }
  function renderMyList(id) {
    const p = myLists.all().find(x => x.id === id); if (!p) return back();
    keep('myl', p.tracks); ctxs.mylId = id;
    body.innerHTML = `<div class="dhead"><div class="cover big stack">${p.tracks.slice(0, 4).map(t => `<img src="${esc(t.thumbArt || t.art || coverOf(t))}" alt="">`).join('') || `<span>${IC.list}</span>`}</div><div><div class="k">Saját lista</div><h2>${esc(p.name)}</h2><div class="a">${p.tracks.length} dal</div>
      <div class="acts"><button class="btn pri" data-mylplay>${IC.play} Lejátszás</button><button class="btn" data-myldel>Lista törlése</button></div></div></div>
      <div class="songs">${p.tracks.map((s, i) => songRow(s, i, 'myl').replace(`data-add="${i}"`, `data-rm="${i}"`).replace(IC.plus, IC.close)).join('') || '<div class="hint">Keress dalokat, és a ＋ gombbal add hozzá őket.</div>'}</div>`;
  }
  function renderAddTo(item) {
    const mine = myLists.all();
    body.innerHTML = `<h3>Hozzáadás listához: ${esc(item.title)}</h3><div class="agrid">${mine.map(p => `<button class="acard" data-addto="${p.id}"><div class="cover stack">${p.tracks.slice(0, 4).map(t => `<img src="${esc(t.thumbArt || t.art || coverOf(t))}" alt="">`).join('') || `<span>${IC.list}</span>`}</div><div class="t">${esc(p.name)}</div><div class="a">${p.tracks.length} dal</div></button>`).join('')}<button class="acard new" data-newlist="add">${IC.plus}<div class="t">Új lista</div></button></div>`;
    ctxs.addItem = item;
  }
  function push(v) { stack.push(v); view(v); }
  function back() { if (stack.length > 1) { stack.pop(); view(stack[stack.length - 1]); } else close(); }
  function open(v) {
    el.classList.add('on'); $('#scrim').classList.add('on'); app.classList.remove('idle');
    if (v.view === 'search' || v.view === 'home') stack = [v]; else if (!stack.length) stack = [{ view: 'search' }, v]; else stack.push(v);
    if (stack[0].view !== 'search' && stack[0].view !== 'home') stack.unshift({ view: 'search' });
    view(stack[stack.length - 1]);
    if (v.view === 'search') setTimeout(() => input.focus(), 350);
  }
  function close() { el.classList.remove('on'); $('#scrim').classList.remove('on'); input.blur(); stack = []; }
  input.addEventListener('input', () => doSearch(input.value));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { input.blur(); doSearch(input.value); } });
  $('#libTabs').addEventListener('click', e => { const t = e.target.closest('[data-tab]')?.dataset.tab; if (!t) return; stack = [{ view: { search: 'search', lists: 'home', recent: 'recent' }[t] }]; view(stack[0]); });
  $('#libBack').addEventListener('click', back); $('#libClose').addEventListener('click', close);
  body.addEventListener('click', async e => {
    const t = e.target;
    const add = t.closest('[data-add]'); if (add) { const it = ctxs[add.dataset.ctx]?.[+add.dataset.add]; if (it) push({ view: 'addto', item: it }); return; }
    const rm = t.closest('[data-rm]'); if (rm) { myLists.remove(ctxs.mylId, +rm.dataset.rm); return renderMyList(ctxs.mylId); }
    const row = t.closest('.srow2'); if (row) { const list = ctxs[row.dataset.ctx] || []; const it = list[+row.dataset.i]; if (!it) return;
      if (row.dataset.ctx === 'pl' && ctxs.plMeta && !ctxs.plMeta.liked) playContext(ctxs.plMeta, it, list); else playItem(it, list);
      row.classList.add('flash'); setTimeout(() => close(), 450); return; }
    const ac = t.closest('[data-ai]'); if (ac) { const it = ctxs[ac.dataset.ctx]?.[+ac.dataset.ai]; if (!it) return; return push(it.kind === 'playlist' ? { view: 'playlist', pl: it } : { view: 'album', album: it }); }
    const ar = t.closest('[data-artist]'); if (ar) return push({ view: 'artist', name: ar.dataset.artist });
    const ml = t.closest('[data-myl]'); if (ml) return push({ view: 'myl', id: ml.dataset.myl });
    const nl = t.closest('[data-newlist]'); if (nl) { const name = await askName(); if (!name) return; const p = myLists.create(name); if (nl.dataset.newlist === 'add' && ctxs.addItem) { myLists.add(p.id, ctxs.addItem); toastMsg('Hozzáadva: ' + p.name); return back(); } return renderLists(); }
    const at = t.closest('[data-addto]'); if (at) { myLists.add(at.dataset.addto, ctxs.addItem); toastMsg('Hozzáadva ✓'); return back(); }
    if (t.closest('[data-playall]')) { const l = ctxs.alb || []; if (l.length) { playItem(l[0], l); close(); } return; }
    if (t.closest('[data-shuf]')) { const l = (ctxs.alb || []).slice().sort(() => Math.random() - 0.5); if (l.length) { playItem(l[0], l); close(); } return; }
    if (t.closest('[data-artplay]')) { const l = ctxs.aso || []; if (l.length) { playItem(l[0], l); close(); } return; }
    if (t.closest('[data-plplay]')) { const l = ctxs.pl || []; if (ctxs.plMeta && !ctxs.plMeta.liked) playContext(ctxs.plMeta, null, l); else if (l.length) playItem(l[0], l); close(); return; }
    if (t.closest('[data-mylplay]')) { const l = ctxs.myl || []; if (l.length) { playItem(l[0], l); close(); } return; }
    if (t.closest('[data-myldel]')) { myLists.del(ctxs.mylId); return back(); }
    const g = t.closest('[data-goto]'); if (g) { close(); openSheet(true, g.dataset.goto); }
  });
  function askName() {
    return new Promise(res => {
      const p = document.createElement('div'); p.className = 'ask panel';
      p.innerHTML = `<b>Új lista neve</b><input id="askIn" maxlength="40" placeholder="pl. Esti autózás"><div class="acts"><button class="btn" data-x>Mégse</button><button class="btn pri" data-ok>Létrehozás</button></div>`;
      el.appendChild(p); const i = $('#askIn', p); setTimeout(() => i.focus(), 50);
      const done = v => { p.remove(); res(v); };
      p.addEventListener('click', e => { if (e.target.closest('[data-x]')) done(''); if (e.target.closest('[data-ok]')) done(i.value.trim() || 'Új lista'); });
      i.addEventListener('keydown', e => { if (e.key === 'Enter') done(i.value.trim() || 'Új lista'); });
    });
  }
  return { open, close, back, get isOpen() { return el.classList.contains('on'); } };
})();
const spRedirect = () => NATIVE ? (N('redirectUri') || 'http://127.0.0.1:43821/callback') : location.origin + location.pathname;
const playViaName = () => ({ spotify: 'a Spotify-ban', ytmusic: 'a YouTube Music-ban', soundcloud: 'a SoundCloud-ban', halo: 'itt, a Halo-ban (videóklippel)', preview: '30 mp-es előzetesként' }[set.playVia] || 'a Spotify-ban');

/* ---------- beállítások ---------- */
const sheet = $('#sheet');
function openSheet(on, section) {
  sheet.classList.toggle('on', on); $('#scrim').classList.toggle('on', on || lib.isOpen);
  if (on) refreshMedia().then(() => { renderSheet(); if (section) setTimeout(() => $('#sec-' + section)?.scrollIntoView({ behavior: 'smooth' }), 80); });
  wake();
}
const tog = (k, label, hint = '') => `<div class="opt"><span>${label}${hint ? `<small>${hint}</small>` : ''}</span><button class="sw2 ${set[k] ? 'on' : ''}" data-tog="${k}" aria-label="${label}"></button></div>`;
const rng = (k, label, min, max, step, unit = '') => `<div class="opt"><span>${label}</span>${slider(k, min, max, step, set[k], unit)}</div>`;
const slider = (k, min, max, step, v, unit = '') => `<div class="sl" data-sl="${k}" data-min="${min}" data-max="${max}" data-step="${step}" data-unit="${unit}" data-v="${v}" role="slider" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${v}"><div class="tr"><div class="fl"></div><div class="th"></div></div><span class="val"></span></div>`;
function slPaint(el, v) {
  const min = +el.dataset.min, max = +el.dataset.max, f = clamp((v - min) / (max - min), 0, 1);
  el.querySelector('.fl').style.width = f * 100 + '%'; el.querySelector('.th').style.left = f * 100 + '%';
  const u = el.dataset.unit; el.querySelector('.val').textContent = u === '%' ? Math.round(f * 100) + '%' : u === 'x' ? (+v).toFixed(2) + '×' : u === 's' ? (v > 0 ? '+' : '') + v + ' mp' : '';
  el.dataset.v = v; el.setAttribute('aria-valuenow', v);
}
const slHandlers = {};
let slAct = null;
function slSet(el, x) {
  const r = el.querySelector('.tr').getBoundingClientRect(), min = +el.dataset.min, max = +el.dataset.max, st = +el.dataset.step;
  let v = min + clamp((x - r.left) / r.width, 0, 1) * (max - min); v = Math.round(v / st) * st; v = +v.toFixed(4);
  if (v === +el.dataset.v) return; slPaint(el, v);
  const k = el.dataset.sl;
  if (slHandlers[k]) slHandlers[k](v); else { set[k] = v; saveSoon(); applySettings(k); }
}
const saveSoon = debounce(save, 300);
document.addEventListener('pointerdown', e => { const el = e.target.closest('.sl'); if (!el) return; e.preventDefault(); slAct = el; el.classList.add('act'); try { el.setPointerCapture(e.pointerId); } catch {} slSet(el, e.clientX); });
document.addEventListener('pointermove', e => { if (slAct) slSet(slAct, e.clientX); });
['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => { if (slAct) { slAct.classList.toggle('act', false); slAct = null; save(); } }));
const slInit = root => $$('.sl', root).forEach(el => slPaint(el, +el.dataset.v));
const seg = (k, label, opts) => `<div class="opt vstack"><span>${label}</span><div class="seg">${opts.map(([v, l]) => `<button class="${set[k] === v ? 'on' : ''}" data-seg="${k}" data-v="${v}">${l}</button>`).join('')}</div></div>`;
function renderSheet() {
  if (!sheet.classList.contains('on')) return;
  const th = THEMES.find(t => t.id === set.theme), bgId = set.bgByTheme[set.theme] || 'auto';
  const vids = mediaCache.map(m => `<button class="bgi ${bgId === 'm:' + m.id ? 'on' : ''}" data-bg="m:${m.id}">${m.type === 'video' ? `<video src="${media.url(m)}" muted playsinline preload="metadata"></video>` : `<img src="${media.url(m)}" alt="">`}<span class="lbl">${m.type === 'video' ? '▶ ' : ''}${esc(m.name.slice(0, 16))}</span><span class="x" data-del="${m.id}">✕</span></button>`).join('');
  const spOk = spotify.connected;
  sheet.innerHTML = `<div class="sh"><h2>Halo</h2><button class="ib" data-close aria-label="Bezárás">${IC.close}</button></div>
  <div class="hint">Húzd jobbra/balra a képernyőt a témaváltáshoz. A borítósort is húzhatod.</div>
  <h3>Témák</h3><div class="tgrid">${THEMES.map(t => `<button class="tcard ${t.id === set.theme ? 'on' : ''}" data-theme-id="${t.id}" style="--a:${t.glow[0]};--b:${t.glow[1]}"><b>${t.name}</b><span>${t.tag}</span></button>`).join('')}</div>
  <h3>Háttér · ${esc(th.name)}</h3><div class="bggrid">
    <button class="bgi ${bgId === 'auto' ? 'on' : ''}" data-bg="auto" style="background:linear-gradient(135deg,#ff0033,#120f18 70%)"><span class="lbl">▶ Videóklip</span></button>
    <button class="bgi ${bgId === 'album' ? 'on' : ''}" data-bg="album" style="${S.art ? `background-image:url('${S.art}')` : ''}"><span class="lbl">Albumborító</span></button>
    <button class="bgi ${bgId === 'aurora' ? 'on' : ''}" data-bg="aurora" style="background:linear-gradient(135deg,var(--glowA),#120f18 60%,var(--glowB))"><span class="lbl">Aurora</span></button>
    ${vids}<button class="bgi add" data-add>＋ Saját videó / kép</button></div>
  <div class="hint" style="margin-top:.5rem">Videóklip: a dal hivatalos klipje fut a háttérben, a zenével szinkronban (YouTube API kulcs kell hozzá, lásd lent). Ha nincs klip, az albumborító látszik.</div>
  ${youtube.ready ? rng('vidOffset', 'Klip eltolás', -10, 10, 0.5, 's') : ''}
  <h3>Fényperem</h3><div class="swrow">
    <button class="sw ${set.glowMode === 'auto' ? 'on' : ''}" data-glow="auto" style="--a:${(S.colors || th.glow)[0]};--b:${(S.colors || th.glow)[1]}">AUTO</button>
    <button class="sw ${set.glowMode === 'theme' ? 'on' : ''}" data-glow="theme" style="--a:${th.glow[0]};--b:${th.glow[1]}">TÉMA</button>
    ${PRESETS.map((p, i) => `<button class="sw ${set.glowMode === 'preset' && set.preset === i ? 'on' : ''}" data-preset="${i}" title="${p[2]}" style="--a:${p[0]};--b:${p[1]}"></button>`).join('')}</div>
  <div class="hint" style="margin-top:.4rem">AUTO: minden dal a saját borítója színeit kapja.</div>
  ${rng('glowInt', 'Fényerő', 0, 1.6, 0.05, '%')}${rng('thick', 'Vastagság', 0.4, 2.2, 0.05, 'x')}${tog('sparks', 'Szikrák')}${tog('pulse', 'Lüktetés a zenére')}
  ${NATIVE ? tog('beat', 'Valódi ütemkövetés', 'A telefon hangkimenetét elemzi (hang-engedélyt kér, de semmit nem rögzít és nem küld el)') : ''}
  <h3 id="sec-lyrics">Dalszöveg</h3>${tog('lyr', 'Dalszöveg mutatása')}
  <div class="lgrid">${LSTYLES.map(st => `<button class="lcard ${set.lyrStyle === st.id ? 'on' : ''}" data-lstyle="${st.id}"><div class="pv pv-${st.id}">${LPV[st.id]}</div><b>${st.name}</b><span>${st.desc}</span></button>`).join('')}</div>
  ${seg('lyrFont', 'Betűtípus', [['auto', 'Stílus szerint'], ['soft', 'Puha talpas'], ['serif', 'Elegáns'], ['modern', 'Modern'], ['narrow', 'Keskeny']])}
  ${rng('lyrSize', 'Méret', 0.6, 1.6, 0.05, 'x')}
  ${seg('lyrHl', 'Kiemelés színe', [['gold', 'Arany'], ['accent', 'Borító színe'], ['white', 'Fehér']])}
  ${seg('lyrPos', 'Elhelyezés', [['auto', 'Stílus szerint'], ['center', 'Középen'], ['bottom', 'Lent'], ['left', 'Balra']])}
  ${tog('lyrShade', 'Sötétítés a szöveg mögött', 'Világos videóklipnél jobban olvasható')}
  <h3>Kijelző</h3>${tog('clock', 'Óra')}${tog('h24', '24 órás formátum')}${rng('dim', 'Háttér sötétítése', 0, 0.85, 0.05, '%')}${tog('blur', 'Üveg elmosás')}${tog('eco', 'Energiatakarékos mód', 'Kikapcsolva a kijelző teljes frissítésén fut (120 Hz)')}
  ${NATIVE ? tog('keepAwake', 'Képernyő mindig bekapcsolva') : ''}
  <h3 id="sec-voice">Hangvezérlés (angol)</h3>
  <div class="hint">Koppints a 🎙 gombra, és mondd angolul, pl.: <b>“next song”</b>, <b>“previous”</b>, <b>“pause”</b>, <b>“play Drip Too Hard by Lil Baby”</b>, <b>“search Drake”</b>, <b>“volume up”</b>, <b>“volume 40”</b>, <b>“shuffle”</b>, <b>“show lyrics”</b>, <b>“neon lyrics”</b>, <b>“next theme”</b>, <b>“what’s playing”</b>, <b>“open devices”</b>, <b>“cast to Living Room TV”</b>.</div>
  ${tog('voiceReply', 'Hangos visszajelzés (angol)', 'A Halo röviden válaszol, pl. „Playing … by …”')}
  <h3 id="sec-play">Lejátszás</h3>${seg('playVia', 'A keresett dalok itt szólnak', [['spotify', 'Spotify'], ['ytmusic', 'YouTube Music'], ['soundcloud', 'SoundCloud'], ['halo', 'Halo (YouTube)'], ['preview', '30 mp előzetes']])}
  <div class="hint">Spotify / YouTube Music / SoundCloud: a Halo a telefonon lévő appban indítja el a dalt, és onnan követi. Halo (YouTube): itt játssza le a videóklippel együtt (YouTube API kulcs kell).</div>
  ${seg('country', 'Katalógus ország', [['US', 'USA'], ['HU', 'Magyarország'], ['GB', 'UK'], ['DE', 'Németország']])}
  <h3 id="sec-accounts">Fiókok</h3>
  <div class="acc panel"><div class="ah"><i class="srcdot" style="--src:#1ed760"></i><b>Spotify</b><span class="st ${spOk ? 'ok' : ''}">${spOk ? 'Összekapcsolva' : 'Nincs összekapcsolva'}</span></div>
    ${spOk ? `<div class="hint">A lejátszólistáid a Könyvtár → Lejátszólisták fülön vannak.</div><div class="acts"><button class="btn" data-splogout>Leválasztás</button></div>` : `
    <ol class="steps"><li>Nyisd meg: <b>developer.spotify.com/dashboard</b>, jelentkezz be, majd <b>Create app</b>.</li>
      <li>App name: <b>Halo</b>. Redirect URI: <code>${esc(spRedirect())}</code> <button class="lnk" data-copy="${esc(spRedirect())}">másolás</button> (pontosan így, szóköz nélkül). API: <b>Web API</b>. Mentés.</li>
      <li>Az app <b>Settings</b> oldaláról másold ide a <b>Client ID</b>-t:</li></ol>
    <input class="tin" id="spClient" placeholder="Spotify Client ID" value="${esc(set.spClient)}" autocomplete="off" spellcheck="false">
    <div class="acts"><button class="btn pri" data-spconnect>Összekapcsolás</button></div>`}</div>
  <div class="acc panel"><div class="ah"><i class="srcdot" style="--src:#ff0033"></i><b>YouTube videóklipek</b><span class="st ${youtube.ready ? 'ok' : ''}">${youtube.ready ? 'Kulcs megadva' : 'Nincs kulcs'}</span></div>
    <ol class="steps"><li><b>console.cloud.google.com</b> → új projekt.</li><li>APIs &amp; Services → Library → <b>YouTube Data API v3</b> → Enable.</li><li>Credentials → Create credentials → <b>API key</b>, és másold ide:</li></ol>
    <input class="tin" id="ytKey" placeholder="YouTube API kulcs" value="${esc(set.ytKey)}" autocomplete="off" spellcheck="false">
    <div class="acts"><button class="btn pri" data-ytsave>Mentés</button></div><div class="hint">Ingyenes; napi kb. 100 klipkeresésre elég (a találatokat a Halo megjegyzi).</div></div>
  ${NATIVE && !S.tv ? `<h3>Kivetítés</h3><div class="hint">A Halo felületét a projektoron/TV-n futó Halo-ra küldheted: 📡 Eszközök → Kivetítés projektorra.</div>${tog('display', 'Kijelző mód ezen az eszközön', 'Ez az eszköz is fogadhat kivetítést (pl. a tablet a falon)')}` : ''}
  <h3>Forrás</h3>${NATIVE ? `<div class="status ${S.access ? 'ok' : ''}"><i></i>${S.access ? 'Értesítés-hozzáférés engedélyezve' : 'Nincs értesítés-hozzáférés'}</div>
    <div class="acts"><button class="btn ${S.access ? '' : 'pri'}" data-act="grant">Hozzáférés beállítása</button></div>`
    : `<div class="hint">Böngészős demó. Kipróbálhatod saját zenefájlokkal is (a fényperem ilyenkor a basszusra lüktet):</div><div class="acts"><button class="btn pri" data-audio>Saját zene betöltése</button></div>`}
  <h3>Névjegy</h3><div class="hint">Halo Player 1.5 · Katalógus: iTunes Search · Dalszöveg: LRCLIB · Klipek: YouTube</div>`;
  slInit(sheet);
}
sheet.addEventListener('click', async e => {
  const t = e.target;
  if (t.closest('[data-close]')) return openSheet(false);
  const del = t.closest('[data-del]');
  if (del) { e.stopPropagation(); await media.del(del.dataset.del); for (const k in set.bgByTheme) if (set.bgByTheme[k] === 'm:' + del.dataset.del) delete set.bgByTheme[k]; save(); await refreshMedia(); applyBg(); return renderSheet(); }
  const thb = t.closest('[data-theme-id]'); if (thb) return mountTheme(thb.dataset.themeId);
  const bg = t.closest('[data-bg]'); if (bg) { set.bgByTheme[set.theme] = bg.dataset.bg; save(); applyBg(); return renderSheet(); }
  if (t.closest('[data-add]')) return $('#filePick').click();
  if (t.closest('[data-audio]')) return $('#audioPick').click();
  const gm = t.closest('[data-glow]'); if (gm) { set.glowMode = gm.dataset.glow; save(); applyColors(); return renderSheet(); }
  const pr = t.closest('[data-preset]'); if (pr) { set.glowMode = 'preset'; set.preset = +pr.dataset.preset; save(); applyColors(); return renderSheet(); }
  const sg = t.closest('[data-seg]'); if (sg) { set[sg.dataset.seg] = sg.dataset.v; save(); if (sg.dataset.seg === 'country') memo.clear(); applySettings(); return renderSheet(); }
  const tg = t.closest('[data-tog]'); if (tg) { const k = tg.dataset.tog; set[k] = !set[k]; save(); tg.classList.toggle('on', set[k]); applySettings(k); return; }
  const cp = t.closest('[data-copy]'); if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copy); toastMsg('Kimásolva'); } catch { toastMsg(cp.dataset.copy); } return; }
  if (t.closest('[data-spconnect]')) { set.spClient = $('#spClient').value.trim(); save(); try { await spotify.connect(); } catch (er) { toastMsg(er.message); } return; }
  if (t.closest('[data-splogout]')) { spotify.logout(); return renderSheet(); }
  if (t.closest('[data-ytsave]')) { set.ytKey = $('#ytKey').value.trim(); save(); toastMsg(set.ytKey ? 'YouTube kulcs elmentve' : 'Kulcs törölve'); applyBg(); return renderSheet(); }
});
sheet.addEventListener('click', e => { const lc = e.target.closest('[data-lstyle]'); if (!lc) return; set.lyrStyle = lc.dataset.lstyle; if (!set.lyr && set.theme !== 'karaoke') set.lyr = true; save(); lyrics.refresh(); paint(); renderSheet(); });
$('#filePick').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const id = await media.add(f); await refreshMedia(); set.bgByTheme[set.theme] = 'm:' + id; save(); applyBg(); renderSheet(); } catch { toastMsg('Nem sikerült menteni a fájlt'); } });
$('#audioPick').addEventListener('change', e => { if (e.target.files.length) lp.loadFiles(e.target.files); e.target.value = ''; openSheet(false); });

function applySettings(k) {
  app.classList.toggle('perf', !set.blur);
  document.documentElement.style.setProperty('--dim', set.dim);
  clock(); paint();
  if (k === 'beat') N('setBeat', !!set.beat);
  if (NATIVE && (!k || k === 'keepAwake')) N('setKeepAwake', !!set.keepAwake);
  if (k === 'voiceReply' && set.voiceReply) speak('Voice replies on');
  if (NATIVE && !S.tv && (!k || k === 'display')) N('linkDisplay', !!set.display);
  if (k === 'vidOffset' || k === 'dim') applyBg();
  if (k && k.startsWith('lyr')) lyrics.refresh();
  if (!k || k === 'eco') N('setHighRefresh', !set.eco);
}
const LPV = { kinetic: '<i>That</i> ain\'t', karaoke: 'Szóról szóra', wave: 'Hu<em>llám</em>', neon: 'Neon', type: 'Írógép', poster: 'NAGY', subtitle: 'A <i>felirat</i>', list: '<b>Most</b> · Előző' };
function lyrPop(anchor) {
  const p = pop(anchor, LSTYLES.map(st => `<button class="mi" data-ls="${st.id}"><span class="pv pv-${st.id}" style="font-size:.95rem;min-width:5.5rem">${LPV[st.id]}</span>${st.name}${set.lyrStyle === st.id ? ' ✓' : ''}</button>`).join(''));
  p.addEventListener('click', e => { const b = e.target.closest('[data-ls]'); if (!b) return; set.lyrStyle = b.dataset.ls; if (!set.lyr && set.theme !== 'karaoke') set.lyr = true; save(); lyrics.refresh(); paint(); closePops(); });
}

/* ---------- fő ciklus ---------- */
let lastF = 0;
function loop(now) {
  requestAnimationFrame(loop);
  if (set.eco && now - lastF < 30) return; lastF = now;
  const t = now / 1000; let energy;
  const fl = S.flashAt ? Math.max(0, 1 - (now - S.flashAt) / 1600) : 0;
  if (!S.playing) energy = 0.5 + 0.06 * Math.sin(t * 1.3);
  else {
    let lv = lp.level();
    if (lv < 0 && set.beat && S.levelAt && now - S.levelAt < 500) lv = S.level;
    if (lv >= 0 && set.pulse) energy = 0.62 + lv * 0.95;
    else { const ph = (t * 94 / 60) % 1; energy = 0.88 + (set.pulse ? 0.22 * Math.exp(-ph * 5) : 0); }
  }
  glow.frame(t, energy + fl * 0.9);
  tick();
}

/* ---------- indulás ---------- */
hooks = { paint, track() { loadAlbums(); applyBg(); }, colors: applyColors, bg: applyBg };
let rsT; addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => flow.render(), 150); });
document.addEventListener('visibilitychange', () => { const v = $('#bgVideo'); if (document.hidden) v.pause(); else if (v.classList.contains('on')) v.play().catch(() => {}); });
if (NATIVE) $$('[data-act=fullscreen]').forEach(e => e.style.display = 'none');
clock(); applySettings();
if (set.beat) N('setBeat', true);
if (!NATIVE && /[?&]code=/.test(location.search)) { spotify.onAuth(location.href).then(() => { history.replaceState(null, '', location.pathname); toastMsg('Spotify összekapcsolva ✓'); }).catch(e => toastMsg(e.message)); }
refreshMedia().then(() => mountTheme(set.theme, false));
if (NATIVE) { S.pkg = ''; setTrack({ title: '', artist: '', playing: false }); N('ready'); }
else {
  const demo = [
    { title: 'Lavender Sunflower', artist: 'Tory Lanez', album: 'Alone at Prom', dur: 186000, hues: [28, 330] },
    { title: 'Drip Too Hard', artist: 'Lil Baby & Gunna', album: 'Drip Harder', dur: 146000, hues: [150, 40] },
    { title: 'rollercoastin', artist: 'Roddy Ricch', album: 'LIVE LIFE FAST', dur: 186000, hues: [45, 215] },
    { title: 'Look Back at It', artist: 'A Boogie Wit da Hoodie', album: 'Hoodie SZN', dur: 179000, hues: [205, 0] },
    { title: 'Dark Thoughts', artist: 'Lil Tecca', album: 'Plan A', dur: 157000, hues: [190, 350] },
  ].map(t => ({ ...t, art: genCover(t.title + '|' + t.artist, t.hues) }));
  if (!S.history.length) S.history = demo.slice(2).map(t => ({ key: t.title + '|' + t.artist, title: t.title, artist: t.artist, album: t.album, art: t.art }));
  lp.start(demo, 0, 'sim');
}
requestAnimationFrame(loop);
