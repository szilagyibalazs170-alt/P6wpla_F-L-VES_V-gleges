/* ===== core: segédek, beállítások, állapot, hálózat, színek ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = ms => { if (!isFinite(ms) || ms < 0) ms = 0; const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rnd = seed => { let h = seed >>> 0 || 1; return () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) + 0x9e3779b9 >>> 0) / 4294967296); };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s*[([].*?[)\]]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const store = {
  get(k, d) { try { const v = localStorage.getItem('halo.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('halo.' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem('halo.' + k); } catch {} },
};
const app = $('#app');
const NATIVE = typeof window.HaloNative !== 'undefined';
const N = (m, ...a) => { try { return NATIVE ? HaloNative[m](...a) : undefined; } catch { return undefined; } };

const DEF = {
  theme: 'albums', glowMode: 'auto', preset: 0, glowInt: 0.9, thick: 1, sparks: true, pulse: true, beat: false,
  clock: true, h24: true, dim: 0.28, blur: true, lyr: false, lyrStyle: 'kinetic', lyrFont: 'auto', lyrSize: 1, lyrHl: 'gold', lyrPos: 'auto', lyrShade: false, eco: false, bgByTheme: {}, keepAwake: true,
  videoBg: true, ytKey: '', spClient: '', playVia: 'spotify', country: 'US', minimal: false, vidOffset: 0,
};
const set = Object.assign({}, DEF, store.get('set', {}));
const save = () => store.set('set', set);

/* ----- állapot ----- */
const S = {
  key: '', title: '', artist: '', album: '', dur: 0, pos: 0, at: performance.now(), playing: false, speed: 1,
  pkg: 'demo', appName: '', art: '', thumb: '', artKey: '', colors: null, queue: [], history: store.get('hist', []),
  access: true, mode: NATIVE ? 'native' : 'demo', albums: [], albumsFor: '', level: -1, beatOk: false, canShuffle: false, canRepeat: false,
};
const curPos = () => S.playing ? Math.min(S.dur || 1e12, S.pos + (performance.now() - S.at) * S.speed) : S.pos;

/* ----- hálózat: natívan CORS nélkül, böngészőben fetch ----- */
const pend = new Map(); let reqId = 0;
function nfetch(url, o = {}) {
  if (!NATIVE) return fetch(url, { method: o.method || 'GET', headers: o.headers, body: o.body })
    .then(async r => ({ status: r.status, text: await r.text() }))
    .then(r => ({ ...r, ok: r.status >= 200 && r.status < 300, json: () => JSON.parse(r.text || 'null') }));
  return new Promise((res, rej) => {
    const id = 'r' + (++reqId); pend.set(id, { res, rej });
    N('http', id, o.method || 'GET', url, JSON.stringify(o.headers || {}), o.body || '');
    setTimeout(() => { if (pend.has(id)) { pend.delete(id); rej(new Error('timeout')); } }, 25000);
  });
}
function nimage(url) {
  if (!NATIVE || !url || url.startsWith('data:')) return Promise.resolve(url);
  return new Promise(res => { const id = 'i' + (++reqId); pend.set(id, { res: r => res(r.status === 200 ? r.text : url), rej: () => res(url) }); N('image', id, url); });
}
const getJSON = async (url, o) => { const r = await nfetch(url, o); if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { status: r.status, body: r.text }); return r.json(); };

/* ----- források ----- */
const SRC = {
  'com.spotify.music': ['Spotify', '#1ed760'], 'com.soundcloud.android': ['SoundCloud', '#ff5500'],
  'com.google.android.apps.youtube.music': ['YouTube Music', '#ff0033'], 'com.google.android.youtube': ['YouTube', '#ff0033'],
  'app.revanced.android.youtube': ['YouTube', '#ff0033'], 'app.revanced.android.apps.youtube.music': ['YouTube Music', '#ff0033'],
  'deezer.android.app': ['Deezer', '#a238ff'], 'com.apple.android.music': ['Apple Music', '#fa2d48'], 'com.amazon.mp3': ['Amazon Music', '#25d1da'],
  demo: ['Demó', '#ff4fa3'], halo: ['Halo · YouTube', '#ff0033'], preview: ['Előzetes · 30 mp', '#fa2d48'],
};
const srcInfo = () => SRC[S.pkg] || [S.appName || 'Lejátszó', '#b9b4c7'];

/* ----- borító generátor (ha nincs kép) ----- */
const coverCache = new Map();
function genCover(seed, hues) {
  if (coverCache.has(seed)) return coverCache.get(seed);
  const c = document.createElement('canvas'); c.width = c.height = 320; const g = c.getContext('2d'); const r = rnd(hash(seed));
  const [h1, h2] = hues || [r() * 360, r() * 360];
  const bg = g.createLinearGradient(0, 0, 320, 320); bg.addColorStop(0, `hsl(${h1},70%,24%)`); bg.addColorStop(1, `hsl(${h2},65%,10%)`);
  g.fillStyle = bg; g.fillRect(0, 0, 320, 320);
  for (let i = 0; i < 7; i++) {
    const x = r() * 320, y = r() * 320, rad = 40 + r() * 140, rg = g.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, `hsla(${i % 2 ? h1 : h2},90%,${55 + r() * 20}%,.75)`); rg.addColorStop(1, 'hsla(0,0%,0%,0)'); g.fillStyle = rg; g.fillRect(0, 0, 320, 320);
  }
  g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1.5; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(160, 160, 30 + i * 26, 0, 7); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.92)'; g.font = '800 30px Manrope, sans-serif'; g.fillText(seed.split('|')[0].slice(0, 15).toUpperCase(), 18, 298);
  const out = c.toDataURL('image/jpeg', 0.85); coverCache.set(seed, out); return out;
}
const coverOf = it => it.art || genCover((it.title || it.name || '?') + '|' + (it.artist || ''));

/* ----- színkinyerés ----- */
function hexOf(h, s, l) { const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return '#' + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join(''); }
function loadImg(url) { return new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = url; }); }
async function extractColors(url) {
  const im = await loadImg(url); if (!im) return null;
  try {
    const c = document.createElement('canvas'); c.width = c.height = 28; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 28, 28);
    const d = g.getImageData(0, 0, 28, 28).data, bins = Array.from({ length: 18 }, () => ({ w: 0, h: 0 }));
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, dd = mx - mn;
      if (dd < 0.08) continue;
      const s = dd / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((gg - b) / dd) % 6 : mx === gg ? (b - r) / dd + 2 : (r - gg) / dd + 4; h = (h * 60 + 360) % 360;
      const w = s * (1 - Math.abs(l - 0.5) * 1.6); if (w <= 0) continue; const bin = bins[Math.floor(h / 20) % 18]; bin.w += w; bin.h += h * w;
    }
    const top = bins.filter(b => b.w > 0).sort((a, b) => b.w - a.w); if (!top.length) return null;
    const h1 = top[0].h / top[0].w, sec = top.find(b => Math.min(Math.abs(b.h / b.w - h1), 360 - Math.abs(b.h / b.w - h1)) > 40);
    return [hexOf(h1, 0.9, 0.6), hexOf(sec ? sec.h / sec.w : (h1 + 35) % 360, 0.85, 0.62)];
  } catch { return null; }
}
async function thumb(url, size = 180) {
  const im = await loadImg(url); if (!im) return url;
  try { const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(im, 0, 0, size, size); return c.toDataURL('image/jpeg', 0.8); } catch { return url; }
}

/* ----- ikonok ----- */
const IC = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4.2" height="15" rx="1.2"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.2"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 6.6v10.8a.8.8 0 0 1-1.3.6L3.6 12.6a.8.8 0 0 1 0-1.2l6.6-5.4a.8.8 0 0 1 1.3.6zm9 0v10.8a.8.8 0 0 1-1.3.6l-6.6-5.4a.8.8 0 0 1 0-1.2l6.6-5.4a.8.8 0 0 1 1.3.6z"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 6.6v10.8a.8.8 0 0 0 1.3.6l6.6-5.4a.8.8 0 0 0 0-1.2l-6.6-5.4a.8.8 0 0 0-1.3.6zm-9 0v10.8a.8.8 0 0 0 1.3.6l6.6-5.4a.8.8 0 0 0 0-1.2L4.8 6a.8.8 0 0 0-1.3.6z"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h4v4M4 20l16-16M20 16v4h-4M15 15l5 5M4 4l5 5"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
  lyrics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 10h6M9 14h4"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  vol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',
  collapse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>',
  open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.4-9.2-8.6C1.2 8.3 3.1 4.5 6.7 4.5c2.1 0 3.4 1.2 4.1 2.4h.4c.7-1.2 2-2.4 4.1-2.4 3.6 0 5.5 3.8 3.9 6.9C19 15.6 12 20 12 20z"/></svg>',
  theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
  library: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4v16M9 4v16M14 4l6 16"/></svg>',
};
const ib = (act, cls = '', title = '') => `<button class="ib ${cls}" data-act="${act}" ${title ? `aria-label="${title}"` : ''} ${act === 'toggle' ? 'data-b="playbtn"' : ''}>${IC[act === 'toggle' ? 'play' : act] || ''}</button>`;
