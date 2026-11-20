/* ===== angol hangvezérlés: felismerés, parancsértelmezés, hangos visszajelzés ===== */
function speak(text) {
  if (!set.voiceReply) return;
  if (NATIVE) return N('speak', text);
  try { const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {}
}

const voice = (() => {
  const ov = $('#voice'), tx = $('#voiceText'), hint = $('#voiceHint');
  let active = false, webRec = null, hideT;
  const HINTS = ['“next song”', '“play Drip Too Hard by Lil Baby”', '“volume up”', '“pause”', '“show lyrics”', '“neon lyrics”', '“what’s playing”', '“search Drake”', '“next theme”', '“cast to Living Room TV”'];
  const THEME_EN = { albums: 'albums', album: 'albums', arc: 'arc', pearl: 'pearl', dial: 'dial', vinyl: 'dial', spotlight: 'spotlight', vision: 'vision', glass: 'vision', tile: 'tile', clock: 'tile', lyrics: 'karaoke', karaoke: 'karaoke' };
  const STYLE_EN = { kinetic: 'kinetic', karaoke: 'karaoke', wave: 'wave', neon: 'neon', typewriter: 'type', type: 'type', poster: 'poster', subtitle: 'subtitle', subtitles: 'subtitle', caption: 'subtitle', captions: 'subtitle', list: 'list', classic: 'list' };
  const WORDNUM = { zero: 0, ten: 10, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, half: 50, max: 100, maximum: 100, full: 100 };

  function clean(t) {
    return String(t).toLowerCase().replace(/[.,!?’]/g, s => s === '’' ? "'" : '').replace(/^(hey |ok |okay )?halo,? /, '')
      .replace(/^(please |can you |could you |would you |i want to |i wanna |let's |lets )+/, '').replace(/ please$/, '').replace(/\s+/g, ' ').trim();
  }
  function setVol(f) { f = clamp(f, 0, 1); if (NATIVE) N('setVolume', f); $('#audio').volume = f; return Math.round(f * 100); }
  const getVol = () => NATIVE ? (N('getVolume') ?? 0.5) : $('#audio').volume;

  /* parancs → művelet; true, ha felismerte */
  async function run(raw) {
    const t = clean(raw); let m;
    const say = (hu, en) => { if (hu) show(hu, true); else voice.stop(); if (en) speak(en); return true; };
    if (/^(next|skip|next (song|track|one)|play next|skip (this|it|song|track))$/.test(t)) { control('next'); return say('⏭ Következő dal', 'Next song'); }
    if (/^(previous|prev|back|go back|last song|previous (song|track)|play (the )?previous( one)?)$/.test(t)) { control('prev'); return say('⏮ Előző dal', 'Previous song'); }
    if (/^(pause|stop|hold on|pause (it|music|the music)|stop (it|music|the music))$/.test(t)) { control('pause'); return say('⏸ Szünet', 'Paused'); }
    if (/^(play|resume|continue|unpause|start|play (it|music|the music)|keep playing)$/.test(t)) { control('play'); return say('▶ Lejátszás', 'Playing'); }
    if (/^(restart|start over|play (it )?again|from the (start|beginning)|replay)( (the |this )?(song|track))?$/.test(t)) { control('seek', 0); return say('↺ Elölről', 'From the top'); }
    if ((m = t.match(/^(skip|go|jump|fast) (ahead|forward)( (\d+|ten|twenty|thirty) seconds?)?$/))) { const s = +(m[4] && (WORDNUM[m[4]] ?? m[4])) || 15; control('seek', Math.min(S.dur, curPos() + s * 1000)); return say(`⏩ +${s} mp`, `Skipped ${s} seconds`); }
    if ((m = t.match(/^(rewind|go back|back)( (\d+|ten|twenty|thirty) seconds?)$/))) { const s = +(WORDNUM[m[3]] ?? m[3]) || 15; control('seek', Math.max(0, curPos() - s * 1000)); return say(`⏪ −${s} mp`, `Back ${s} seconds`); }
    if (/^(volume up|louder|turn it up|turn up( the volume)?|increase( the)? volume|crank it( up)?)$/.test(t)) { const v = setVol(getVol() + 0.12); return say(`🔊 Hangerő ${v}%`, `Volume ${v} percent`); }
    if (/^(volume down|quieter|softer|turn it down|turn down( the volume)?|decrease( the)? volume|lower( the)? volume)$/.test(t)) { const v = setVol(getVol() - 0.12); return say(`🔉 Hangerő ${v}%`, `Volume ${v} percent`); }
    if ((m = t.match(/^(set )?(the )?volume (to |at )?(\d+|[a-z]+)( percent| %)?$/))) { const n = isNaN(+m[4]) ? WORDNUM[m[4]] : +m[4]; if (n != null) { const v = setVol(n / 100); return say(`🔊 Hangerő ${v}%`, `Volume ${v} percent`); } }
    if (/^(mute|silence)$/.test(t)) { voice._pre = getVol(); setVol(0); return say('🔇 Némítva', ''); }
    if (/^unmute$/.test(t)) { const v = setVol(voice._pre || 0.5); return say(`🔊 Hangerő ${v}%`, 'Unmuted'); }
    if (/^(shuffle|shuffle (on|off|it|songs|the queue)|turn (on|off) shuffle|mix it up)$/.test(t)) { control('shuffle'); return say('🔀 Keverés', 'Shuffle'); }
    if (/^(repeat|repeat (this|on|off|song|one|it)|loop|loop (this|it|song)|turn (on|off) repeat)$/.test(t)) { control('repeat'); return say('🔁 Ismétlés', 'Repeat'); }
    if (/^((show|turn on|open|display) (the )?lyrics|lyrics( on)?)$/.test(t)) { set.lyr = true; save(); lyrics.refresh(); paint(); return say('💬 Dalszöveg be', 'Lyrics on'); }
    if (/^((hide|turn off|close) (the )?lyrics|lyrics off|no lyrics)$/.test(t)) { set.lyr = false; save(); lyrics.refresh(); paint(); return say('Dalszöveg ki', 'Lyrics off'); }
    if ((m = t.match(/^(?:(?:change|switch|set) (?:the )?lyrics? (?:style )?to |lyrics? style |use )?(\w+) (?:lyrics?|style)$|^lyrics? style (\w+)$|^(?:change|switch|set) (?:the )?lyrics? (?:style )?to (\w+)$/))) {
      const k = STYLE_EN[m[1] || m[2] || m[3]]; if (k) { set.lyrStyle = k; set.lyr = true; save(); lyrics.refresh(); paint(); const st = LSTYLES.find(s => s.id === k); return say('💬 ' + st.name + ' dalszöveg', `${m[1] || m[2] || m[3]} lyrics`); }
    }
    if (/^((next|change|switch|another|different) theme|change (the )?(look|style|skin))$/.test(t)) { cycleTheme(1); return say('🎨 ' + THEMES.find(x => x.id === set.theme).name, 'Theme changed'); }
    if ((m = t.match(/^(?:(?:switch|change|go) to |use |set )?(?:the )?(\w+) theme$|^theme (\w+)$/))) { const id = THEME_EN[m[1] || m[2]]; if (id) { mountTheme(id); return say('🎨 ' + THEMES.find(x => x.id === id).name, `${m[1] || m[2]} theme`); } }
    if (/^(what('s| is) (playing|this( song)?|the song|on)|what song is (this|playing)|who('s| is) (this|singing|playing)|name (of )?this song)$/.test(t)) {
      if (!S.title) return say('Most nem szól semmi', 'Nothing is playing right now');
      show(`🎵 ${S.title} — ${S.artist}`, true); speak(`This is ${S.title} by ${S.artist.split(/,|&/)[0].trim()}`); return true;
    }
    if (/^((open|show) (the )?(devices|speakers?|bluetooth|outputs?|cast( devices)?)|cast( this)?|connect( a)? speaker)$/.test(t)) { devices.show(); return say('📡 Eszközök', 'Here are your devices'); }
    if ((m = t.match(/^(?:cast|send|play|connect)(?: (?:this|it|music|the music))? (?:to|on) (?:the )?(.+)$/)) && !/spotify|youtube|soundcloud/.test(m[1])) {
      const name = norm(m[1]); const r = devices.state.casts.find(c => norm(c.name).includes(name) || name.includes(norm(c.name)));
      if (r) { devices.castTo(r); return say('📡 ' + r.name, `Casting to ${r.name}`); }
      if (spotify.connected) { try { const ds = await spotify.devices(); const d = ds.find(x => norm(x.name).includes(name) || name.includes(norm(x.name))); if (d) { await spotify.transfer(d.id); return say('📡 ' + d.name, `Playing on ${d.name}`); } } catch {} }
      devices.show(); return say(`Nem találom: ${m[1]}`, `I couldn't find ${m[1]}`);
    }
    if (/^((open|show) (my )?(library|playlists|search)|my playlists)$/.test(t)) { lib.open({ view: /playlist/.test(t) ? 'home' : 'search' }); return say('📚 Könyvtár', 'Opening your library'); }
    if (/^(close|cancel|never ?mind|go home|hide( it)?)$/.test(t)) { uiBack(); return say('', ''); }
    if ((m = t.match(/^(?:search|search for|find|look up|look for|show me) (.+)$/))) {
      lib.open({ view: 'search' }); const q = $('#libQ'); q.value = m[1]; q.dispatchEvent(new Event('input')); return say('🔍 ' + m[1], `Searching ${m[1]}`);
    }
    if ((m = t.match(/^(?:play|put on|listen to|i want to hear|queue up) (?:the song |song |some |a song )?(.+?)(?: (?:on|in) (spotify|youtube music|youtube|soundcloud))?$/))) {
      let q = m[1].replace(/ by /, ' '); const via = m[2];
      show('🔍 ' + m[1] + '…', false);
      try {
        const r = await itunes.search(q); const it = r.songs[0];
        if (!it) return say(`Nincs találat: ${m[1]}`, `I couldn't find ${m[1]}`);
        if (via) { const prev = set.playVia; set.playVia = { spotify: 'spotify', 'youtube music': 'ytmusic', youtube: 'halo', soundcloud: 'soundcloud' }[via]; await playItem(it, r.songs); set.playVia = prev; }
        else await playItem(it, r.songs);
        return say(`▶ ${it.title} — ${it.artist}`, `Playing ${it.title} by ${it.artist.split(/,|&/)[0].trim()}`);
      } catch { return say('A keresés most nem sikerült', 'Search failed, please try again'); }
    }
    return false;
  }

  function show(text, done) {
    tx.textContent = text; ov.classList.toggle('done', !!done);
    clearTimeout(hideT); if (done) hideT = setTimeout(stop, 2200);
  }
  function start() {
    if (active) return stop();
    active = true; ov.classList.add('on'); ov.classList.remove('done', 'err'); tx.textContent = 'Listening…';
    hint.textContent = 'Try: ' + HINTS.sort(() => Math.random() - 0.5).slice(0, 3).join(' · ');
    ov.style.setProperty('--lv', 0);
    if (NATIVE) return N('voiceStart');
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) { fail('Ez a böngésző nem támogatja a hangfelismerést'); return; }
    try {
      webRec = new R(); webRec.lang = 'en-US'; webRec.interimResults = true; webRec.maxAlternatives = 3;
      webRec.onresult = e => { const r = e.results[e.results.length - 1]; if (r.isFinal) handle([...r].map(a => a.transcript)); else tx.textContent = r[0].transcript; };
      webRec.onerror = ev => fail(ev.error === 'not-allowed' ? 'Nincs mikrofon-engedély' : 'Nem értettem — próbáld újra');
      webRec.onend = () => { if (active && !ov.classList.contains('done')) stop(); };
      webRec.start();
    } catch { fail('A mikrofon nem érhető el'); }
  }
  function stop() { active = false; ov.classList.remove('on'); if (NATIVE) N('voiceStop'); try { webRec?.abort(); } catch {} webRec = null; }
  function fail(msg) { ov.classList.add('err'); show(msg, true); }
  async function handle(alts) {
    tx.textContent = '“' + alts[0] + '”';
    for (const a of alts) { if (await run(a)) return; }
    fail(`Nem értettem: “${alts[0]}”`); speak("Sorry, I didn't catch that");
  }
  ov.addEventListener('click', stop);
  window.Halo.onVoice = o => {
    if (typeof o === 'string') o = JSON.parse(o);
    if ('rms' in o) ov.style.setProperty('--lv', o.rms);
    if (o.partial) tx.textContent = o.partial;
    if (o.state === 'thinking') ov.classList.add('think');
    if (o.final) { ov.classList.remove('think'); handle(o.final); }
    if (o.error) { ov.classList.remove('think'); fail(o.error === 'perm' ? 'Nincs mikrofon-engedély' : o.error === 'unavailable' ? 'A hangfelismerés nem érhető el (Google app szükséges)' : o.error === '7' ? 'Nem értettem — próbáld újra' : o.error === '6' ? 'Nem hallottam semmit' : 'Hiba a felismerésben (' + o.error + ')'); }
  };
  return { start, stop, run };
})();
