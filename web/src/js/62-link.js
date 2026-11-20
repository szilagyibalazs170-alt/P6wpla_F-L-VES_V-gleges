/* ===== Halo Link: kivetítés telefonról/tabletről a projektoron futó Halo-ra (natív felbontásban) ===== */
S.tv = NATIVE && !!N('isTV');
if (S.tv) { app.classList.add('tv'); document.documentElement.classList.add('tv'); }

const link = (() => {
  let L = store.get('link', null);           // { host, port, key, name }
  let on = !!(L && store.get('linkOn', false));
  const found = new Map();
  let fails = 0, busy = false, sentArt = '', sentQ = '', sentSet = '', connecting = '';

  const SKEYS = ['theme', 'glowMode', 'preset', 'glowInt', 'thick', 'sparks', 'pulse', 'clock', 'h24', 'dim', 'blur', 'lyr', 'lyrStyle', 'lyrFont', 'lyrSize', 'lyrHl', 'lyrPos', 'lyrShade', 'videoBg', 'ytKey', 'vidOffset', 'minimal', 'country'];
  function snap() { const o = {}; SKEYS.forEach(k => o[k] = set[k]); const bg = set.bgByTheme[set.theme] || 'auto'; o.bg = bg.startsWith('m:') ? 'album' : bg; return o; }

  /* ---- küldő ---- */
  async function tick() {
    if (!on || !L || busy || S.tv) return; busy = true;
    const body = { from: N('deviceName') || 'Telefon',
      state: { title: S.title, artist: S.artist, album: S.album, duration: S.dur, position: Math.round(curPos()), playing: S.playing, speed: S.speed, pkg: S.pkg, app: srcInfo()[0], artKey: S.key } };
    const ss = JSON.stringify(snap()); if (ss !== sentSet) { body.settings = JSON.parse(ss); N('linkSettings', ss); }
    const ak = S.key + '|' + (S.art || '').length; if (S.art && ak !== sentArt) body.art = S.art;
    const qs = S.queue.map(q => q.title).join('|') + '#' + S.history.length; if (qs !== sentQ) { body.queue = S.queue.slice(0, 10).map(q => ({ id: q.id, title: q.title, artist: q.artist, art: (q.art || '').length > 60000 ? '' : q.art })); body.history = S.history.slice(-8).map(h => ({ key: h.key, title: h.title, artist: h.artist, art: (h.art || '').length > 60000 ? '' : h.art })); }
    try {
      const r = await nfetch(`http://${L.host}:${L.port}/state`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Halo-Key': L.key }, body: JSON.stringify(body) });
      if (r.status === 403) { stop(); toastMsg('A projektor nem fogadja a kapcsolatot — csatlakozz újra'); }
      else if (r.ok) {
        if (fails >= 3) Halo.onDeviceEvent({ type: 'connected', kind: 'display', name: L.name });
        fails = 0; if (body.settings) sentSet = ss; if (body.art) sentArt = ak; if (body.queue) sentQ = qs;
        for (const c of (r.json()?.cmds || [])) if (c && c.a) control(c.a, c.v);
      } else throw new Error(r.status);
    } catch {
      if (++fails === 3) { Halo.onDeviceEvent({ type: 'disconnected', kind: 'display', name: L.name }); sentArt = sentQ = sentSet = ''; N('linkDiscover'); }
    }
    busy = false; paintChip();
  }
  setInterval(tick, 700);

  async function connect(name) {
    const d = found.get(name); if (!d || connecting) return;
    connecting = name; render(); toastMsg('Erősítsd meg a projektoron a távirányító OK gombjával');
    try {
      const r = await nfetch(`http://${d.host}:${d.port}/hello`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: N('deviceName') || 'Telefon' }) });
      if (!r.ok) throw new Error(r.status === 403 ? 'A projektoron elutasították' : 'A projektor nem válaszolt');
      const j = r.json(); L = { host: d.host, port: d.port, key: j.key, name: d.name }; on = true; fails = 0; sentArt = sentQ = sentSet = '';
      store.set('link', L); store.set('linkOn', true); native(true);
      Halo.onDeviceEvent({ type: 'connected', kind: 'display', name: d.name }); tick();
    } catch (e) { toastMsg(e.message || 'Nem sikerült csatlakozni'); }
    connecting = ''; render(); paintChip();
  }
  function native(start) { if (start && L) { N('linkStart', L.host, L.port, L.key, L.name.replace(/^Halo · /, ''), N('deviceName') || 'Telefon'); N('linkSettings', JSON.stringify(snap())); } else N('linkStop'); }
  function stop() { on = false; store.set('linkOn', false); native(false); if (L) Halo.onDeviceEvent({ type: 'disconnected', kind: 'display', name: L.name }); render(); paintChip(); }
  function resume() { if (!L) return; on = true; fails = 0; sentArt = sentQ = sentSet = ''; store.set('linkOn', true); native(true); Halo.onDeviceEvent({ type: 'connected', kind: 'display', name: L.name }); render(); paintChip(); }
  function render() { if (devices.isOpen) devices.refresh(); }
  function paintChip() {
    const b = $('#srcBadge .lnk'); if (!b) return;
    const ok = on && L && fails < 3; b.classList.toggle('on', !!ok); b.innerHTML = ok ? `<i>⇢</i>${DIC.mirror}<span>${esc(L.name.replace(/^Halo · /, ''))}</span>` : '';
  }
  window.Halo.onLinkFound = d => {
    if (typeof d === 'string') d = JSON.parse(d);
    found.set(d.name, d);
    if (L && d.name === L.name && (d.host !== L.host || d.port !== L.port)) { L.host = d.host; L.port = d.port; store.set('link', L); fails = 0; if (on) native(true); }
    render();
  };
  window.Halo.onLinkLost = n => { found.delete(n); render(); };
  if (NATIVE && on && !S.tv) setTimeout(() => { N('linkDiscover'); native(true); }, 1500);

  /* panel-szakasz az Eszközök panelhez */
  function section() {
    if (!NATIVE || S.tv) return '';
    let h = `<h3>${DIC.mirror} Kivetítés projektorra / TV-re</h3>`;
    const names = new Set([...found.keys(), ...(L ? [L.name] : [])]);
    if (!names.size) h += `<div class="hint"><span class="mini-spin"></span> Halo kijelzők keresése a Wi-Fi-n… Indítsd el a Halo-t a projektoron (ugyanazon a Wi-Fi-n).</div>`;
    for (const n of names) {
      const isL = L && n === L.name, live = isL && on && fails < 3, here = found.has(n);
      const right = connecting === n ? '<span class="mini-spin"></span>' : live ? '<span class="go">Leállítás</span>' : '<span class="go">Kivetítés</span>';
      h += `<div class="drow ${live ? 'on' : ''}" data-link="${esc(n)}"><span class="di">${DIC.tv}</span><div class="meta"><div class="t">${esc(n.replace(/^Halo · /, ''))}</div><div class="a">${live ? '<b class="ok">Kivetítve</b>' : here ? 'Halo kijelző · elérhető' : 'Nem elérhető most'}</div></div>${right}</div>`;
    }
    return h;
  }
  function click(n) { if (L && n === L.name && on && fails < 3) return stop(); if (L && n === L.name && !found.has(n)) return resume(); if (L && n === L.name && L.key) return resume(); connect(n); }
  return { section, click, get on() { return on; }, paintChip };
})();

/* ---- fogadó (projektor / TV) ---- */
const RKEYS = ['theme', 'glowMode', 'preset', 'glowInt', 'thick', 'sparks', 'pulse', 'clock', 'h24', 'dim', 'blur', 'lyr', 'lyrStyle', 'lyrFont', 'lyrSize', 'lyrHl', 'lyrPos', 'lyrShade', 'videoBg', 'ytKey', 'vidOffset', 'minimal', 'country'];
function applyRemoteSettings(s) {
  let theme = null, lyr = false;
  for (const k of RKEYS) if (k in s && JSON.stringify(set[k]) !== JSON.stringify(s[k])) { if (k === 'theme') theme = s[k]; else { set[k] = s[k]; if (k.startsWith('lyr')) lyr = true; } }
  if (s.bg) set.bgByTheme[s.theme || set.theme] = s.bg;
  save();
  if (theme && THEMES.some(t => t.id === theme)) mountTheme(theme); else { applyColors(); applyBg(); }
  if (lyr) lyrics.refresh();
  applySettings();
}
window.Halo.onRemote = o => {
  if (typeof o === 'string') o = JSON.parse(o);
  S.remoteAt = performance.now(); S.remoteFrom = o.from || 'Telefon';
  if (o.settings) applyRemoteSettings(o.settings);
  if (o.queue) S.queue = o.queue;
  if (o.history) S.history = o.history;
  if (o.state) { S.mode = 'remote'; const k0 = S.key; setTrack(o.state); if (S.key !== k0 && !o.art) setArt(''); }
  if (o.art) setArt(o.art);
  if (o.queue || o.history) paint(true);
  $('#linkWait').classList.remove('on');
};
window.Halo.onLinkHello = (id, name) => {
  const d = $('#linkAsk');
  d.innerHTML = `<span class="ring">${DIC.phone}</span><div><div class="k">KIVETÍTÉS</div><div class="t">${esc(name)} csatlakozna</div><div class="acts"><button class="btn pri" data-la="1">Engedélyezés</button><button class="btn" data-la="0">Elutasítás</button></div></div>`;
  d.dataset.id = id; d.classList.add('on'); app.classList.remove('idle');
  setTimeout(() => $('[data-la="1"]', d).focus(), 60);
};
$('#linkAsk').addEventListener('click', e => { const b = e.target.closest('[data-la]'); if (!b) return; const d = $('#linkAsk'); N('linkAnswer', d.dataset.id, b.dataset.la === '1'); d.classList.remove('on'); });
window.Halo.onKey = k => {
  if (k === 'menu') return openSheet(!$('#sheet').classList.contains('on'));
  control(k); toastHTML(`<b>${{ toggle: S.playing ? '⏸ Szünet' : '▶ Lejátszás', play: '▶ Lejátszás', pause: '⏸ Szünet', next: '⏭ Következő', prev: '⏮ Előző' }[k] || k}</b>`);
};

/* ---- távirányító (D-pad) a projektoron ---- */
const FOCUSABLE = 'button:not([disabled]), input, .sl, .srow2, .drow, .acard, .row[data-q], .lcard, .tcard, .bgi, .sw, [data-la]';
function spatial(dir) {
  const scope = $('#linkAsk.on') || $('.overlay.on') || app;
  const items = $$(FOCUSABLE, scope).filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(e).visibility !== 'hidden'; });
  if (!items.length) return;
  const cur = document.activeElement && items.includes(document.activeElement) ? document.activeElement : null;
  if (!cur) { const first = items.find(e => e.matches('[data-act=toggle], [data-la="1"]')) || items[0]; first.tabIndex = first.tabIndex < 0 ? 0 : first.tabIndex; first.focus({ preventScroll: false }); return; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bs = Infinity;
  for (const e of items) {
    if (e === cur) continue; const b = e.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2, dx = bx - ax, dy = by - ay;
    const main = dir === 'ArrowRight' ? dx : dir === 'ArrowLeft' ? -dx : dir === 'ArrowDown' ? dy : -dy;
    if (main <= 4) continue; const side = dir === 'ArrowRight' || dir === 'ArrowLeft' ? Math.abs(dy) : Math.abs(dx);
    const sc = main + side * 2.2; if (sc < bs) { bs = sc; best = e; }
  }
  if (best) { if (!best.matches('button, input')) best.tabIndex = -1; best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
}
if (S.tv) addEventListener('keydown', e => {
  const k = e.key, ae = document.activeElement;
  if (ae && ae.matches('input[type=search], input.tin, #askIn') && (k === 'ArrowLeft' || k === 'ArrowRight')) return;
  const layer = $('#linkAsk.on') || $('.overlay.on');
  if (ae && ae.classList.contains('sl') && (k === 'ArrowLeft' || k === 'ArrowRight')) {
    const st = +ae.dataset.step, v = clamp(+ae.dataset.v + (k === 'ArrowRight' ? st : -st) * (ae.dataset.unit === '%' ? 5 : 2), +ae.dataset.min, +ae.dataset.max);
    const r = ae.querySelector('.tr').getBoundingClientRect(); slSet(ae, r.left + (v - ae.dataset.min) / (ae.dataset.max - ae.dataset.min) * r.width + 0.5);
    e.preventDefault(); e.stopImmediatePropagation(); return;
  }
  if (k.startsWith('Arrow')) {
    if (layer || !app.classList.contains('idle') && ae && ae !== document.body) spatial(k);
    else if (k === 'ArrowLeft') Halo.onKey('prev'); else if (k === 'ArrowRight') Halo.onKey('next');
    else { cycleTheme(k === 'ArrowUp' ? -1 : 1); }
    e.preventDefault(); e.stopImmediatePropagation(); wake(); return;
  }
  if (k === 'Enter' || k === ' ') {
    if (ae && ae !== document.body && (layer || !app.classList.contains('idle'))) { ae.click(); }
    else { app.classList.remove('idle'); spatial('ArrowDown'); }
    e.preventDefault(); e.stopImmediatePropagation(); wake();
  }
}, true);

/* várakozó képernyő a projektoron */
function linkWaitCheck() {
  const w = $('#linkWait'); if (!S.tv) return;
  const show = S.mode !== 'remote' && !S.title;
  if (show && !w.innerHTML) w.innerHTML = `<div class="k">HALO KIJELZŐ</div><h2>Várakozás a telefonra…</h2>
    <ol><li>Legyen a telefon és a projektor <b>ugyanazon a Wi-Fi-n</b>.</li><li>A telefonon: Halo → <b>📡 Eszközök</b> → <b>Kivetítés projektorra</b> → <b>${esc(N('deviceName') || 'ez a projektor')}</b>.</li><li>Itt nyomd meg az <b>OK</b> gombot az engedélyezéshez.</li></ol>
    <div class="keys"><span><b>OK</b> lejátszás/szünet</span><span><b>◀ ▶</b> előző/következő</span><span><b>▲ ▼</b> téma</span><span><b>☰</b> beállítások</span></div>`;
  w.classList.toggle('on', show);
}
setInterval(linkWaitCheck, 1000); setTimeout(linkWaitCheck, 300);
