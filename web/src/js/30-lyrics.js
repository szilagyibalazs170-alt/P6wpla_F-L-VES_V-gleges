/* ===== dalszöveg: LRCLIB (soronkénti + szavankénti időzítés), kinetikus és lista megjelenítés ===== */
const LSTYLES = [
  { id: 'kinetic', name: 'Kinetikus', desc: 'Szavanként úszik be, egymás alá tördelve', font: 'soft' },
  { id: 'karaoke', name: 'Karaoke', desc: 'Görgő sorok, szóról szóra kitöltve', font: 'modern', list: true, pos: 'left' },
  { id: 'wave', name: 'Hullám', desc: 'Alulról felhullámzó szavak', font: 'modern' },
  { id: 'neon', name: 'Neon', desc: 'Felvillanó neonfelirat', font: 'narrow' },
  { id: 'type', name: 'Írógép', desc: 'Betűnként gépelve', font: 'serif' },
  { id: 'poster', name: 'Poszter', desc: 'Óriás szavak plakátszerűen', font: 'narrow' },
  { id: 'subtitle', name: 'Felirat', desc: 'Letisztult felirat alul', font: 'modern', pos: 'bottom' },
  { id: 'list', name: 'Lista', desc: 'Klasszikus görgő szöveg', font: 'modern', list: true },
];
const lyrics = (() => {
  const box = $('#lyrics'), wrap = $('.wrap', box), kin = $('#klyr');
  let data = null, key = '';

  const clean = t => t.replace(/\s*[([](feat\.?|ft\.?|with|prod\.?)[^)\]]*[)\]]/gi, '').replace(/\s*[([](official|lyric|audio|video|visualizer|hd|4k|explicit|clean)[^)\]]*[)\]]/gi, '')
    .replace(/\s+-\s+(remaster|live|radio edit|single version|sped up|slowed).*$/i, '').trim();
  function split() {
    let t = S.title, a = S.artist;
    if (/youtube|halo/i.test(srcInfo()[0]) && / [-–] /.test(t)) { const p = t.split(/ [-–] /); a = p[0]; t = p.slice(1).join(' - '); }
    a = a.replace(/\s*(VEVO|- Topic)$/i, '').split(/\s*(?:,|&| x | feat\.? | ft\.? )\s*/i)[0];
    return [clean(t), a.trim()];
  }
  /* LRC: [mm:ss.xx] szöveg */
  function parseLrc(lrc) {
    const out = [];
    for (const line of lrc.split(/\r?\n/)) {
      const tags = [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)]; const text = line.replace(/\[[^\]]*\]/g, '').trim();
      for (const m of tags) out.push({ t: (+m[1] * 60 + +m[2]) * 1000, text });
    }
    return out.sort((a, b) => a.t - b.t);
  }
  /* LRCLIB „lyricsfile” (YAML): sorok szavankénti start_ms-sel */
  function parseWordFile(y) {
    const unq = v => { v = v.trim(); if (v.startsWith("'")) return v.slice(1, -1).replace(/''/g, "'"); if (v.startsWith('"')) { try { return JSON.parse(v); } catch { return v.slice(1, -1); } } return v; };
    const lines = []; let L = null, W = null;
    for (const raw of y.split(/\r?\n/)) {
      let m;
      if ((m = raw.match(/^- text: ?(.*)$/))) { L = { text: unq(m[1]), t: 0, end: 0, words: [] }; lines.push(L); W = null; }
      else if (L && (m = raw.match(/^ {2}start_ms: (\d+)/))) L.t = +m[1];
      else if (L && (m = raw.match(/^ {2}end_ms: (\d+)/))) L.end = +m[1];
      else if (L && (m = raw.match(/^ {2}- text: ?(.*)$/))) { W = { text: unq(m[1]).trim(), t: 0 }; L.words.push(W); }
      else if (W && (m = raw.match(/^ {4}start_ms: (\d+)/))) W.t = +m[1];
    }
    return lines.filter(l => l.text);
  }
  /* ha nincs szavankénti időzítés: a sor idejét szétosztjuk a szavak között */
  function interpolate(lines) {
    lines.forEach((l, i) => {
      if (l.words && l.words.length) return;
      const ws = l.text.split(/\s+/).filter(Boolean); const next = lines[i + 1]?.t ?? l.t + 4000;
      const span = Math.min(next - l.t, 450 * ws.length + 500) * 0.88; const tot = ws.reduce((a, w) => a + w.length + 2, 0);
      let acc = 0; l.words = ws.map(w => { const t = l.t + span * acc / tot; acc += w.length + 2; return { text: w, t }; });
    });
    return lines;
  }
  function build(res) {
    let lines = null;
    if (res.lyricsfile && res.hasWordSync) {
      const wl = parseWordFile(res.lyricsfile);
      const durs = wl.map(l => l.end - l.t).filter(d => d > 0).sort((a, b) => a - b);
      if (wl.length > 3 && durs.length && durs[durs.length >> 1] > 900) lines = wl;
    }
    if (!lines && res.syncedLyrics) lines = parseLrc(res.syncedLyrics);
    if (lines) return { synced: true, lines: interpolate(lines) };
    if (res.plainLyrics) return { synced: false, lines: res.plainLyrics.split(/\r?\n/).filter(Boolean).map(text => ({ t: 0, text, words: [] })) };
    return null;
  }
  function demoLines() {
    const L = ['Ez egy demó', 'dalszöveg', 'Az appban a valódi szöveg', 'szóról szóra érkezik', 'pontosan a zenére', 'Spotify, YouTube Music', 'SoundCloud, bármi szól', 'A sorok forrása', 'az LRCLIB', 'Húzd oldalra', 'és válts témát'];
    return { synced: true, lines: interpolate(L.map((text, k) => ({ t: k * 3800 + 1500, text }))) };
  }
  async function load() {
    const k = S.key; key = k; data = null; reset();
    if (!S.title) return render('');
    render('');
    const cached = store.get('lyr2:' + k, null);
    if (cached) { data = cached; return render(); }
    const [t, a] = split(); let res = null;
    try {
      const q = new URLSearchParams({ track_name: t, artist_name: a }); if (S.album) q.set('album_name', clean(S.album)); if (S.dur) q.set('duration', Math.round(S.dur / 1000));
      res = await getJSON('https://lrclib.net/api/get?' + q).catch(() => null);
      if (!res || (!res.syncedLyrics && !res.plainLyrics)) {
        const list = await getJSON('https://lrclib.net/api/search?' + new URLSearchParams({ track_name: t, artist_name: a }));
        res = list.find(x => x.hasWordSync) || list.find(x => x.syncedLyrics) || list.find(x => x.plainLyrics) || null;
      }
    } catch { res = null; }
    if (key !== k) return;
    data = res ? build(res) : (S.mode === 'demo' ? demoLines() : null);
    if (data) { try { store.set('lyr2:' + k, data); } catch {} }
    render(data ? '' : 'Ehhez a dalhoz nincs dalszöveg');
  }
  /* ---------- megjelenítés ---------- */
  const style = () => LSTYLES.find(s => s.id === set.lyrStyle) ? set.lyrStyle : 'kinetic';
  const isList = () => !!LSTYLES.find(s => s.id === style()).list;
  let lineEl = null, lineKey = '', listEls = [], listIdx = -2, lastStyle = '';

  function prep(d) {
    d.lines.forEach((L, i) => {
      const next = d.lines[i + 1]?.t ?? L.t + 5000;
      L.words.forEach((w, k) => {
        const nt = L.words[k + 1]?.t ?? Math.min(L.end || next, w.t + 1400, next);
        w.d = clamp(nt - w.t, 120, 2500);
        const chars = [...w.text]; w.cs = chars.map((c, j) => w.t + w.d * 0.85 * j / Math.max(1, chars.length));
      });
    });
    return d;
  }
  function reset() { listIdx = -2; lineKey = ''; kin.innerHTML = ''; lineEl = null; }
  function render(msg) {
    reset(); applyLook();
    if (!data) { wrap.innerHTML = msg ? `<div class="msg">${esc(msg)}</div>` : ''; wrap.style.transform = 'none'; listEls = []; return; }
    prep(data);
    const st = style();
    wrap.innerHTML = data.lines.map((l, i) => `<div class="ln" data-i="${i}">${st === 'karaoke' && data.synced && l.words.length
      ? l.words.map(w => `<span class="kw" style="--wd:${w.d}ms"><span class="b">${esc(w.text)}</span><span class="o" aria-hidden="true">${esc(w.text)}</span></span>`).join(' ')
      : esc(l.text || '♪')}</div>`).join('');
    listEls = $$('.ln', wrap);
  }
  function applyLook() {
    const st = style(), S0 = LSTYLES.find(s => s.id === st);
    const font = set.lyrFont === 'auto' ? S0.font : set.lyrFont;
    const pos = set.lyrPos === 'auto' ? (S0.pos || 'center') : set.lyrPos;
    for (const el of [kin, box]) {
      el.className = `ls-${st} lf-${font} lp-${pos} lh-${set.lyrHl}${set.lyrShade ? ' shade' : ''}`;
      el.style.setProperty('--ls', set.lyrSize);
    }
    lastStyle = st;
  }
  const cur = pos => { let i = -1; for (let k = 0; k < data.lines.length; k++) { if (data.lines[k].t <= pos + 150) i = k; else break; } return i; };

  /* ---- görgő lista / karaoke ---- */
  function tickList(pos) {
    if (!listEls.length) return;
    const i = data.synced ? cur(pos) : Math.floor(clamp(pos / (S.dur || 1), 0, 0.999) * data.lines.length);
    if (i !== listIdx) {
      listIdx = i;
      listEls.forEach((e, k) => { e.classList.toggle('cur', k === i); e.classList.toggle('near', Math.abs(k - i) === 1); e.classList.toggle('past', k < i); });
      const el = listEls[Math.max(0, i)]; wrap.style.transform = `translate3d(0,${-(el.offsetTop + el.offsetHeight / 2)}px,0)`;
    }
    if (style() === 'karaoke' && i >= 0 && data.synced) {
      const L = data.lines[i], ws = listEls[i].children;
      L.words.forEach((w, k) => { if (ws[k] && pos >= w.t - 40 && !ws[k].classList.contains('on')) ws[k].classList.add('on'); });
    }
  }

  /* ---- soronként megjelenő stílusok ---- */
  function buildLine(i) {
    const st = style(), L = data.lines[i], r = rnd(hash(L.text + i));
    const words = L.words.length ? L.words : [{ text: L.text, t: L.t, d: 800, cs: [L.t] }];
    const port = innerHeight > innerWidth;
    const longest = words.reduce((b, w, k) => w.text.replace(/\W/g, '').length > words[b].text.replace(/\W/g, '').length ? k : b, 0);
    const hl = st === 'subtitle' || st === 'type' ? -1 : (words[longest].text.length >= 4 && r() < 0.8 ? longest : -1);
    const span = (w, k) => {
      const it = st === 'kinetic' && k === 0 && r() < 0.45 ? ' it' : '';
      const inner = st === 'type' ? [...w.text].map(c => `<span class="ch">${esc(c)}</span>`).join('')
        : st === 'subtitle' ? `<span class="b">${esc(w.text)}</span><span class="o" aria-hidden="true">${esc(w.text)}</span>` : esc(w.text);
      return `<span class="kw${it}${k === hl ? ' hl' : ''}" style="--i:${k};--r:${(r() * 8 - 4).toFixed(1)}deg;--dx:${(r() * 70 - 35).toFixed(0)}px;--dy:${(r() * 50 - 40).toFixed(0)}px;--wd:${w.d}ms">${inner}</span>`;
    };
    let html;
    if (st === 'kinetic' || st === 'poster') {
      const maxC = st === 'poster' ? (port ? 7 : 8) : (port ? 9 : 11);
      const rows = []; let row = [], len = 0;
      words.forEach((w, k) => { const l = w.text.length; if (row.length && (len + l > maxC || (st === 'poster' && row.length >= 2))) { rows.push(row); row = []; len = 0; } row.push(k); len += l + 1; });
      if (row.length) rows.push(row);
      html = rows.map((rw, ri) => `<div class="kr${st === 'poster' ? ' a' + (ri % 3) : ''}"${st === 'poster' ? ` style="--fs:${rw.length === 1 && words[rw[0]].text.length <= 6 ? 1.35 : 1}"` : ''}>${rw.map(k => span(words[k], k)).join(' ')}</div>`).join('');
    } else html = `<div class="kr">${words.map(span).join(' ')}</div>`;
    if (st === 'subtitle') { const nx = data.lines[i + 1]; if (nx?.text) html += `<div class="nx">${esc(nx.text)}</div>`; }
    const el = document.createElement('div'); el.className = 'kl'; el.innerHTML = html;
    if (st === 'kinetic' || st === 'poster') { const n = (html.match(/class="kr/g) || []).length, lim = st === 'poster' ? 4.6 : 4; el.style.setProperty('--fit', n > lim ? (lim / n).toFixed(3) : 1); }
    kin.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    const spans = $$('.kw', el);
    return { el, spans, words, chars: st === 'type' ? spans.map(s => [...s.children]) : null, last: null };
  }
  function dropLine() {
    if (!lineEl) return;
    const old = lineEl.el; old.classList.remove('in'); old.classList.add('out');
    setTimeout(() => old.parentNode && old.parentNode.removeChild(old), 900); lineEl = null;
  }
  function tickLine(pos) {
    const i = cur(pos), L = data.lines[i], nextT = data.lines[i + 1]?.t ?? Infinity;
    const lastW = L?.words?.length ? L.words[L.words.length - 1].t : L?.t;
    const gap = i < 0 ? nextT - pos > 2500 : (!L.text || (pos > (L.end || lastW + 2500) + 1500 && nextT - pos > 3000));
    const kk = i + (gap ? 'g' : '');
    if (kk !== lineKey) {
      lineKey = kk; dropLine();
      if (i >= 0 && !gap) lineEl = buildLine(i);
      else { const d = document.createElement('div'); d.className = 'kl dots'; d.innerHTML = '<i></i><i></i><i></i>'; kin.appendChild(d); requestAnimationFrame(() => d.classList.add('in')); lineEl = { el: d, spans: [], words: [] }; }
    }
    if (!lineEl || !lineEl.words.length) return;
    lineEl.words.forEach((w, k) => {
      const sp = lineEl.spans[k]; if (!sp) return;
      if (pos >= w.t - 60 && !sp.classList.contains('on')) sp.classList.add('on');
      if (lineEl.chars && sp.classList.contains('on')) lineEl.chars[k].forEach((c, j) => {
        if (pos >= w.cs[j] - 40 && !c.classList.contains('on')) { c.classList.add('on'); if (lineEl.last) lineEl.last.classList.remove('cur'); c.classList.add('cur'); lineEl.last = c; }
      });
    });
  }
  const visible = () => set.lyr || set.theme === 'karaoke';
  return {
    load,
    tick(pos) {
      if (style() !== lastStyle) render();
      const list = isList() || (data && !data.synced);
      app.classList.toggle('lyr-kin', visible() && !list);
      app.classList.toggle('lyr-list', visible() && list);
      if (!data || !visible()) return;
      list ? tickList(pos) : tickLine(pos);
    },
    refresh() { if (data) render(); else applyLook(); },
    get has() { return !!data; },
  };
})();
