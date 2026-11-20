/* ===== eszközök: Chromecast / Google Cast, Spotify Connect, Bluetooth hangszórók, csatlakozás-jelzés ===== */
const DIC = {
  bluetooth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l10 10-5 5V2l5 5L7 17"/></svg>',
  cast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 20h.01"/></svg>',
  tv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="13" rx="2"/><path d="M8 21h8"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><circle cx="12" cy="14" r="3.5"/><path d="M12 6.5h.01"/></svg>',
  headphones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/></svg>',
  car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14v-5l-2-5H7l-2 5zM5 17v2M19 17v2M7.5 13.5h.01M16.5 13.5h.01"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
  computer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  wired: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/></svg>',
  mirror: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4M9 10.5l3-3 3 3M12 7.5V14"/></svg>',
  output: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/></svg>',
};
IC.cast = DIC.cast;
const KIND_LABEL = { bluetooth: 'Bluetooth', cast: 'Chromecast', wired: 'Vezetékes', usb: 'USB', hdmi: 'HDMI', speaker: 'Beépített' };

const devices = (() => {
  const el = $('#dev'), body = $('#devBody');
  let st = { output: { kind: 'speaker', name: NATIVE ? 'Telefon hangszóró' : 'Ez az eszköz' }, paired: [], nearby: [], casts: [], btOn: true, scanning: false, castOk: true, casting: false };
  let spDevs = null, spErr = '', pendingCast = null;
  const open = () => el.classList.contains('on');

  function devIcon(type) { return DIC[type] || DIC.speaker; }
  function spType(t) { return /tv|cast/i.test(t) ? 'tv' : /speaker|avr|stb/i.test(t) ? 'speaker' : /smartphone/i.test(t) ? 'phone' : /tablet/i.test(t) ? 'phone' : /computer/i.test(t) ? 'computer' : 'speaker'; }
  function row(icon, name, sub, right, attrs = '', on = false) {
    return `<div class="drow ${on ? 'on' : ''}" ${attrs}><span class="di">${icon}</span><div class="meta"><div class="t">${esc(name)}</div><div class="a">${sub}</div></div>${right || ''}</div>`;
  }
  function render() {
    if (!open()) return;
    const o = st.output;
    let h = `<div class="now panel"><span class="ring">${devIcon(o.kind === 'cast' ? 'tv' : o.kind === 'speaker' ? 'phone' : o.kind)}</span><div><div class="k">MOST ITT SZÓL</div><div class="t">${esc(o.name)}</div><div class="a">${esc(KIND_LABEL[o.kind] || '')}${S.title ? ' · ' + esc(S.title) : ''}</div></div></div>`;
    if (NATIVE) h += `<div class="dacts"><button class="btn" data-d="output">${DIC.output} Kimenet váltása</button><button class="btn" data-d="mirror">${DIC.mirror} Képernyő kivetítése</button><button class="btn" data-d="btset">${DIC.bluetooth} Bluetooth</button></div>`;
    // Chromecast
    if (NATIVE) {
      h += `<h3>${DIC.cast} Chromecast és Google Cast ${st.casting ? '<button class="lnk" data-d="caststop">Leválasztás</button>' : ''}</h3>`;
      h += st.casts.length ? st.casts.map(r => row(devIcon(r.type), r.name, r.selected ? '<b class="ok">Csatlakozva</b>' : esc(r.desc || 'Google Cast'), r.selected ? '<span class="dot"></span>' : '', `data-cast="${esc(r.id)}"`, r.selected)).join('')
        : `<div class="hint">${st.castOk ? '<span class="mini-spin"></span> Keresés a Wi-Fi hálózaton…' : 'A Google Cast nem érhető el ezen a készüléken.'}</div>`;
    }
    // Spotify Connect
    h += `<h3><i class="srcdot" style="--src:#1ed760"></i> Spotify Connect</h3>`;
    if (!spotify.connected) h += `<div class="hint">Kösd össze a Spotify-t (⚙ → Fiókok), és a zenét egy koppintással átküldheted bármelyik Spotify-eszközre — Chromecastra, okoshangszóróra, gépre.</div>`;
    else if (spDevs == null) h += `<div class="hint"><span class="mini-spin"></span> Eszközök lekérése…</div>`;
    else if (spErr) h += `<div class="hint">${esc(spErr)}</div>`;
    else h += spDevs.length ? spDevs.map(d => row(devIcon(spType(d.type)), d.name, d.active ? '<b class="ok">Itt szól</b>' : esc(d.type), d.active ? '<span class="dot"></span>' : '', `data-sp="${esc(d.id)}"`, d.active)).join('') : '<div class="hint">Nincs elérhető Spotify-eszköz. Nyisd meg a Spotify appot a telefonon.</div>';
    // Bluetooth
    if (NATIVE) {
      h += `<h3>${DIC.bluetooth} Bluetooth hangszórók <button class="lnk" data-d="rescan">${st.scanning ? 'Keresés…' : 'Újrakeresés'}</button></h3>`;
      if (!st.btOn) h += `<div class="hint">A Bluetooth ki van kapcsolva. <button class="lnk" data-d="btset">Bekapcsolás</button></div>`;
      else if (st.needPerm) h += `<div class="hint">A közeli eszközök kereséséhez engedély kell. <button class="lnk" data-d="rescan">Engedélyezés</button></div>`;
      else {
        h += st.paired.length ? st.paired.map(d => row(devIcon(d.type), d.name, d.connected ? '<b class="ok">Csatlakozva</b>' : 'Párosítva', d.connected ? '<span class="dot"></span>' : '<span class="go">Csatlakozás</span>', `data-bt="${esc(d.address)}" data-conn="${d.connected ? 1 : 0}"`, d.connected)).join('') : '<div class="hint">Nincs párosított hangszóró.</div>';
        h += `<h4>A közelben ${st.scanning ? '<span class="mini-spin"></span>' : ''}</h4>`;
        h += st.nearby.length ? st.nearby.map(d => row(devIcon(d.type), d.name, 'Új eszköz', '<span class="go">Párosítás</span>', `data-pair="${esc(d.address)}"`)).join('')
          : `<div class="hint">${st.scanning ? 'Keresés… Kapcsold a hangszórót párosítási módba.' : 'Nem található új eszköz. Kapcsold a hangszórót párosítási módba, majd keress újra.'}</div>`;
      }
    } else h += `<div class="hint" style="margin-top:1rem">A Chromecast és a Bluetooth-eszközök az Android appban érhetők el.</div>`;
    body.innerHTML = h;
  }
  async function loadSp() {
    if (!spotify.connected) return;
    spDevs = null; spErr = ''; render();
    try { spDevs = await spotify.devices(); } catch (e) { spDevs = []; spErr = 'A Spotify-eszközök nem érhetők el (' + e.message + ').'; }
    render();
  }
  function show() {
    el.classList.add('on'); $('#scrim').classList.add('on'); app.classList.remove('idle');
    if (NATIVE) N('devicesOpen');
    render(); loadSp();
  }
  function hide() { el.classList.remove('on'); if (!lib.isOpen && !$('#sheet').classList.contains('on')) $('#scrim').classList.remove('on'); N('devicesClose'); }

  async function castTo(r) {
    // 1) ha a Spotify ugyanezt az eszközt látja: oda küldjük a zenét (Spotify Connect)
    if (spotify.connected) {
      try {
        const ds = spDevs || await spotify.devices();
        const m = ds.find(d => norm(d.name) === norm(r.name) || norm(d.name).includes(norm(r.name)) || norm(r.name).includes(norm(d.name)));
        if (m) { await spotify.transfer(m.id); toastMsg('Átküldve: ' + r.name); return loadSp(); }
      } catch {}
    }
    // 2) ha a Halo maga játszik előzetest: Cast-munkamenet és küldés
    if (lp.active && lp.item?.preview) { pendingCast = true; N('castSelect', r.id); toastMsg('Csatlakozás: ' + r.name + '…'); return; }
    // 3) külső app (Spotify, YouTube Music…): a rendszer kimenetváltója vagy az app saját Cast gombja
    toastMsg(`A(z) ${r.name} eszközre a ${srcInfo()[0]} saját Cast gombjával, vagy a Kimenet váltásával küldheted a zenét`);
    N('outputSwitcher');
  }
  function castCurrent() {
    const it = lp.item; if (!it?.preview) return;
    N('castLoad', it.preview, it.title || '', String(it.artist || ''), it.art || '');
    $('#audio').pause();
  }

  el.addEventListener('click', async e => {
    const t = e.target;
    if (t.closest('#devClose')) return hide();
    const d = t.closest('[data-d]')?.dataset.d;
    if (d === 'output') return N('outputSwitcher');
    if (d === 'mirror') return N('mirror');
    if (d === 'btset') return N('btSettings');
    if (d === 'rescan') { N('devicesOpen'); return; }
    if (d === 'caststop') { N('castStop'); return; }
    const c = t.closest('[data-cast]'); if (c) { const r = st.casts.find(x => x.id === c.dataset.cast); if (r && !r.selected) castTo(r); return; }
    const sp = t.closest('[data-sp]'); if (sp) { try { await spotify.transfer(sp.dataset.sp); toastMsg('Átküldve ✓'); } catch (er) { toastMsg('Nem sikerült: ' + er.message); } return loadSp(); }
    const b = t.closest('[data-bt]'); if (b) { if (b.dataset.conn === '1') N('outputSwitcher'); else { toastMsg('Kapcsold be a hangszórót — a rendszer kimenetváltójában is választhatod'); N('outputSwitcher'); } return; }
    const p = t.closest('[data-pair]'); if (p) { N('btPair', p.dataset.pair); p.querySelector('.go').textContent = 'Párosítás…'; }
  });

  /* csatlakozás-jelzés (animált kártya felül) */
  let bT;
  function banner(ev) {
    const bn = $('#devBanner');
    const txt = { connected: 'Csatlakozva', disconnected: 'Leválasztva', paired: 'Párosítva', failed: 'Nem sikerült csatlakozni' }[ev.type] || ev.type;
    const icon = ev.kind === 'cast' ? DIC.tv : ev.kind === 'bluetooth' ? DIC.bluetooth : ev.kind === 'wired' ? DIC.headphones : DIC.speaker;
    bn.className = 'panel ' + ev.type; bn.innerHTML = `<span class="ring">${icon}</span><div><div class="k">${esc(KIND_LABEL[ev.kind] || 'Eszköz')} · ${esc(txt)}</div><div class="t">${esc(ev.name)}</div></div>`;
    void bn.offsetWidth; bn.classList.add('on'); S.flashAt = performance.now();
    clearTimeout(bT); bT = setTimeout(() => bn.classList.remove('on'), 3800);
    if (set.voiceReply && ev.type === 'connected' && typeof speak === 'function') speak(`Connected to ${ev.name}`);
  }

  window.Halo.onDevices = s => { st = Object.assign(st, typeof s === 'string' ? JSON.parse(s) : s); S.casting = !!st.casting; render(); paintOutput(); };
  window.Halo.onOutput = v => { const [kind, name] = String(v).split('|'); st.output = { kind, name }; paintOutput(); render(); };
  window.Halo.onDeviceEvent = ev => {
    if (typeof ev === 'string') ev = JSON.parse(ev);
    banner(ev);
    if (ev.kind === 'cast' && ev.type === 'connected' && pendingCast) { pendingCast = null; castCurrent(); }
  };
  function paintOutput() {
    const o = st.output, b = $('#srcBadge .out');
    const show = o && o.kind !== 'speaker';
    b.innerHTML = show ? `<i>→</i>${devIcon(o.kind === 'cast' ? 'tv' : o.kind)}<span>${esc(o.name)}</span>` : '';
    b.classList.toggle('on', !!show);
  }
  return { show, hide, get isOpen() { return open(); }, castTo, get state() { return st; }, castCurrent };
})();
