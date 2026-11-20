/* ===== lejátszás: külső app (médiamenet), Halo-n belüli lista (YouTube / előzetes / demó), videóklip-háttér ===== */

let hooks = { paint() {}, track() {}, colors() {}, bg() {} };

function setTrack(o) {
  const key = (o.title || '') + '|' + (o.artist || '');
  const changed = key !== S.key;
  if (changed && S.key && S.title) {
    const prev = { key: S.key, title: S.title, artist: S.artist, album: S.album, art: S.thumb || '' };
    S.history = S.history.filter(h => h.key !== prev.key && h.key !== key); S.history.push(prev);
    if (S.history.length > 30) S.history = S.history.slice(-30);
    store.set('hist', S.history);
  }
  Object.assign(S, { key, title: o.title || '', artist: o.artist || '', album: o.album || '', dur: o.duration || 0, pos: o.position || 0,
    at: performance.now(), playing: !!o.playing, speed: o.speed || 1, pkg: o.pkg || S.pkg, appName: o.app || '' });
  if ('canShuffle' in o) { S.canShuffle = o.canShuffle; S.canRepeat = o.canRepeat; }
  if (changed) { S.art = ''; S.thumb = ''; S.artKey = o.artKey || ''; lyrics.load(); hooks.track(); }
  app.classList.toggle('paused', !S.playing);
  hooks.paint(changed);
}
async function setArt(url) {
  const k = S.key;
  S.art = url || genCover(S.key);
  const local = await nimage(S.art); if (k !== S.key) return;
  S.thumb = await thumb(local);
  S.colors = await extractColors(local); if (k !== S.key) return;
  hooks.colors(); hooks.paint(false, true); hooks.bg();
}

/* ----- YouTube IFrame lejátszó: háttér-videóklip (némítva, szinkronban) vagy maga a lejátszó ----- */
const ytp = (() => {
  let apiP = null, P = null, mode = 'off', cands = [], ci = 0, wantKey = '', onEnd = null, lastSeek = 0;
  const host = $('#bgYT');
  function loadApi() {
    if (apiP) return apiP;
    apiP = new Promise(res => {
      window.onYouTubeIframeAPIReady = () => res(window.YT);
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => res(null); document.head.appendChild(s);
      setTimeout(() => res(window.YT && window.YT.Player ? window.YT : null), 12000);
    });
    return apiP;
  }
  async function ensure() {
    const YT = await loadApi(); if (!YT) return null; if (P) return P;
    return new Promise(res => {
      P = new YT.Player('ytFrame', {
        width: '100%', height: '100%',
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, cc_load_policy: 0, origin: location.origin },
        events: { onReady: () => res(P), onStateChange: onState, onError: onErr },
      });
    });
  }
  function onState(e) {
    const st = e.data;
    if (st === 1) host.classList.add('on');
    if (mode === 'player') {
      if (st === 1 || st === 2) { S.playing = st === 1; S.pos = P.getCurrentTime() * 1000; S.at = performance.now(); S.dur = P.getDuration() * 1000 || S.dur; app.classList.toggle('paused', !S.playing); hooks.paint(); }
      if (st === 0 && onEnd) onEnd();
    } else if (mode === 'wall' && st === 0) host.classList.remove('on');
  }
  function onErr() { ci++; if (cands[ci]) start(cands[ci].ytId); else { host.classList.remove('on'); if (mode === 'player' && onEnd) onEnd(); } }
  function start(id) {
    const at = mode === 'wall' ? Math.max(0, curPos() / 1000 + (+set.vidOffset || 0)) : 0;
    P.loadVideoById({ videoId: id, startSeconds: at });
    if (mode === 'wall') P.mute(); else { P.unMute(); P.setVolume(100); }
  }
  setInterval(() => {
    if (!P || !P.getCurrentTime) return;
    if (mode === 'player') { const t = P.getCurrentTime(); if (P.getPlayerState() === 1) { S.pos = t * 1000; S.at = performance.now(); } return; }
    if (mode !== 'wall') return;
    const st = P.getPlayerState();
    if (!S.playing) { if (st === 1) P.pauseVideo(); return; }
    const target = curPos() / 1000 + (+set.vidOffset || 0), d = P.getDuration();
    if (d && target > d - 0.5) return;
    if (Math.abs(P.getCurrentTime() - target) > 1.4 && performance.now() - lastSeek > 3000) { lastSeek = performance.now(); P.seekTo(target, true); }
    if (st === 2 || st === 5 || st === -1) P.playVideo();
  }, 1000);
  return {
    get mode() { return mode; },
    /** háttér-videóklip a jelenlegi dalhoz */
    async wallpaper(on) {
      if (!on || !youtube.ready) { if (mode === 'wall') { mode = 'off'; host.classList.remove('on'); P?.stopVideo?.(); } return; }
      const k = S.key; if (k === wantKey && mode === 'wall') return; wantKey = k;
      host.classList.remove('on');
      let list = [];
      try { list = await youtube.search(`${S.artist.split(',')[0]} ${S.title.replace(/\s*[([].*?[)\]]/g, '')} official video`, 5); } catch { return; }
      if (k !== S.key || !list.length) return;
      if (!(await ensure())) return;
      mode = 'wall'; cands = list; ci = 0; start(list[0].ytId);
    },
    /** a Halo maga játssza le (hanggal) */
    async play(it, end) {
      if (!(await ensure())) { toastMsg('A YouTube lejátszó nem érhető el'); return false; }
      cands = it.ytId ? [it] : await youtube.search(`${it.artist} ${it.title}`, 4).catch(() => []);
      if (!cands.length) { toastMsg('Nincs YouTube találat'); return false; }
      mode = 'player'; ci = 0; onEnd = end; wantKey = ''; start(cands[0].ytId); return true;
    },
    ctl(a, v) { if (!P) return; if (a === 'play') P.playVideo(); if (a === 'pause') P.pauseVideo(); if (a === 'seek') P.seekTo(v / 1000, true); },
    stop() { if (mode === 'player') { P?.stopVideo?.(); mode = 'off'; host.classList.remove('on'); } },
  };
})();

/* ----- Halo-n belüli listás lejátszó: 'yt' | 'audio' (30 mp előzetes / saját fájl) | 'sim' (demó) ----- */
const lp = (() => {
  let list = [], i = 0, be = 'sim', actx, analyser, buf;
  const audio = $('#audio');
  function upd(it, playing) {
    const pkg = be === 'yt' ? 'halo' : be === 'audio' ? (it.file ? 'demo' : 'preview') : 'demo';
    setTrack({ title: it.title, artist: it.artist, album: it.album || '', duration: be === 'audio' && !it.file ? 30000 : (it.dur || 0), position: 0, playing, pkg });
    setArt(it.art || '');
    S.queue = list.slice(i + 1, i + 13).map((q, k) => ({ id: 'L' + (i + 1 + k), title: q.title, artist: q.artist, art: q.thumbArt || q.art || '' }));
    hooks.paint(true);
  }
  async function load(k, play = true) {
    if (!list.length) return;
    i = (k + list.length) % list.length; const it = list[i];
    S.mode = be === 'sim' ? 'demo' : 'list';
    if (be === 'audio') { audio.src = it.file || it.preview; if (play) audio.play().catch(() => {}); }
    upd(it, play);
    if (be === 'yt') { const ok = await ytp.play(it, () => load(i + 1)); if (!ok) return; }
  }
  audio.addEventListener('loadedmetadata', () => { if (be === 'audio') { S.dur = audio.duration * 1000; hooks.paint(); } });
  audio.addEventListener('timeupdate', () => { if (be === 'audio') { S.pos = audio.currentTime * 1000; S.at = performance.now(); } });
  audio.addEventListener('ended', () => { if (be === 'audio' && (S.mode === 'list' || S.mode === 'demo')) load(i + 1); });
  setInterval(() => { if (S.mode === 'demo' && be === 'sim' && S.playing && curPos() >= S.dur - 50) load(i + 1); }, 500);
  return {
    get active() { return S.mode === 'list' || S.mode === 'demo'; },
    get item() { return list[i]; },
    get backend() { return be; },
    start(l, k, backend) {
      if (NATIVE && S.playing && S.mode === 'native') N('pauseExternal');
      if (be === 'yt' && backend !== 'yt') ytp.stop();
      if (be === 'audio' && backend !== 'audio') audio.pause();
      list = l.slice(); be = backend; load(k);
      if (backend === 'audio') initAnalyser();
    },
    stop() { if (be === 'yt') ytp.stop(); if (be === 'audio') audio.pause(); if (S.mode !== 'native') S.mode = NATIVE ? 'native' : S.mode; },
    control(a, v) {
      if (a === 'toggle') a = S.playing ? 'pause' : 'play';
      if (a === 'next') return load(i + 1);
      if (a === 'prev') return curPos() > 4000 ? this.control('seek', 0) : load(i - 1);
      if (a === 'skipTo') return load(+String(v).slice(1));
      if (a === 'shuffle') { const cur = list[i]; const rest = list.filter((_, k) => k !== i).sort(() => Math.random() - 0.5); list = [cur, ...rest]; i = 0; upd(cur, S.playing); return; }
      if (a === 'play' || a === 'pause') {
        S.pos = curPos(); S.at = performance.now(); S.playing = a === 'play';
        if (be === 'audio') a === 'play' ? audio.play() : audio.pause();
        if (be === 'yt') ytp.ctl(a);
      }
      if (a === 'seek') { S.pos = +v; S.at = performance.now(); if (be === 'audio') audio.currentTime = v / 1000; if (be === 'yt') ytp.ctl('seek', +v); }
      app.classList.toggle('paused', !S.playing); hooks.paint();
    },
    level() { if (!analyser || be !== 'audio' || !S.playing) return -1; analyser.getByteFrequencyData(buf); let s = 0; for (let k = 1; k < 10; k++) s += buf[k]; return s / (9 * 255); },
    loadFiles(files) {
      this.start([...files].map(f => { const base = f.name.replace(/\.[^.]+$/, ''); const m = base.split(/\s+[-–]\s+/); return { title: m.length > 1 ? m.slice(1).join(' - ') : base, artist: m.length > 1 ? m[0] : 'Ismeretlen előadó', file: URL.createObjectURL(f) }; }), 0, 'audio');
    },
  };
  function initAnalyser() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (!analyser) { audio.crossOrigin = 'anonymous'; const src = actx.createMediaElementSource(audio); analyser = actx.createAnalyser(); analyser.fftSize = 256; buf = new Uint8Array(analyser.frequencyBinCount); src.connect(analyser); analyser.connect(actx.destination); }
      actx.resume();
    } catch {}
  }
})();

/* ----- vezérlés: a forrás szerint ----- */
function control(a, v) {
  if (lp.active) return lp.control(a, v);
  if (a === 'toggle') a = S.playing ? 'pause' : 'play';
  if (a === 'play' || a === 'pause') { S.pos = curPos(); S.at = performance.now(); S.playing = a === 'play'; app.classList.toggle('paused', !S.playing); hooks.paint(); }
  if (a === 'seek') { S.pos = +v; S.at = performance.now(); }
  N('control', a, String(v ?? ''));
}

/* ----- bármilyen dal lejátszása (keresésből, albumból, listából) ----- */
const PKG = { spotify: 'com.spotify.music', ytmusic: 'com.google.android.apps.youtube.music', soundcloud: 'com.soundcloud.android' };
async function playItem(it, list) {
  list = list && list.length ? list : [it];
  const i = Math.max(0, list.indexOf(it));
  const via = set.playVia;
  if (!NATIVE || via === 'halo' || via === 'preview') {
    if (via !== 'preview' && youtube.ready && location.protocol === 'https:') return lp.start(list, i, 'yt');
    if (list.some(x => x.preview)) return lp.start(list.filter(x => x.preview), Math.max(0, list.filter(x => x.preview).indexOf(it)), 'audio');
    if (!NATIVE) return lp.start(list, i, 'sim');
    return toastMsg('A Halo-lejátszóhoz YouTube API kulcs kell (Beállítások → Fiókok)');
  }
  lp.stop();
  if (via === 'spotify' && spotify.connected) {
    try {
      const uri = await spotify.findUri(it);
      if (uri) {
        const uris = list.map(x => x.spUri).filter(Boolean);
        const body = it.spUri && uris.length > 1 ? { uris: uris.slice(0, 100), offset: { uri } } : { uris: [uri] };
        if (await spotify.play(body, uri)) toastMsg('Lejátszás a Spotify-on');
        return;
      }
    } catch {}
  }
  N('playFromSearch', PKG[via] || PKG.spotify, it.title || '', String(it.artist || ''), it.album || '');
  toastMsg('Indítás: ' + SRC[PKG[via] || PKG.spotify][0]);
}
async function playContext(pl, it, tracks) {
  if (NATIVE && set.playVia === 'spotify' && spotify.connected && pl.uri) {
    lp.stop();
    const body = { context_uri: pl.uri, ...(it?.spUri ? { offset: { uri: it.spUri } } : {}) };
    if (await spotify.play(body, it?.spUri || pl.uri)) toastMsg('Lejátszás a Spotify-on');
    return;
  }
  playItem(it || tracks[0], tracks);
}

/* ----- natív híd: események az Android oldalról ----- */
let toastMsg = () => {};
window.Halo = {
  onState(o) {
    if (typeof o === 'string') o = JSON.parse(o);
    if (lp.active && NATIVE) { if (!o.playing) return; lp.stop(); }
    S.mode = 'native'; setTrack(o);
  },
  onArt(key, url) { if (S.mode === 'native' && (!key || key === S.artKey)) setArt(url); },
  onNoArt(key) { if (S.mode === 'native' && (!key || key === S.artKey)) setArt(''); },
  onQueue(list) { if (S.mode !== 'native') return; if (typeof list === 'string') list = JSON.parse(list); S.queue = list || []; hooks.paint(true); },
  onAccess(ok) { S.access = !!ok; app.classList.toggle('noaccess', !ok); hooks.paint(); },
  onIdle() { if (S.mode === 'native') setTrack({ title: '', artist: '', playing: false }); },
  onHttp(id, status, body) { const p = pend.get(id); if (!p) return; pend.delete(id); p.res({ status, text: body, ok: status >= 200 && status < 300, json: () => JSON.parse(body || 'null') }); },
  onAuth(url) { spotify.onAuth(url).then(() => { toastMsg('Spotify összekapcsolva ✓'); hooks.paint(true); }).catch(e => toastMsg(e.message)); },
  onLevel(v) { S.level = v; S.levelAt = performance.now(); },
  onBeat(ok) { S.beatOk = !!ok; if (!ok) { set.beat = false; save(); toastMsg('Az ütemkövetés nem érhető el ezen a készüléken'); } },
  back() { return uiBack(); },
  toastMsg(m) { toastMsg(m); },
};
let uiBack = () => false;
