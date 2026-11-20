/* ===== szolgáltatások: iTunes katalógus, Spotify, YouTube, saját listák ===== */

/* ----- iTunes / Apple Music nyilvános katalógus (kulcs nélkül) ----- */
const itunes = {
  art: (u, s = 600) => u ? u.replace(/\/\d+x\d+(bb)?(-\d+)?\.(jpg|png|webp)$/, `/${s}x${s}bb.jpg`) : '',
  async q(params) {
    const u = 'https://itunes.apple.com/search?' + new URLSearchParams({ media: 'music', country: set.country || 'US', ...params });
    const key = 'it:' + u; const c = memo.get(key); if (c) return c;
    const r = await getJSON(u); memo.set(key, r.results || []); return r.results || [];
  },
  song: r => ({ kind: 'song', title: r.trackName, artist: r.artistName, album: r.collectionName, art: itunes.art(r.artworkUrl100), thumbArt: itunes.art(r.artworkUrl100, 200), dur: r.trackTimeMillis || 0, preview: r.previewUrl || '', year: (r.releaseDate || '').slice(0, 4), itId: r.trackId, colId: r.collectionId, explicit: r.trackExplicitness === 'explicit', no: r.trackNumber }),
  albumOf: r => ({ kind: 'album', title: r.collectionName, artist: r.artistName, art: itunes.art(r.artworkUrl100), thumbArt: itunes.art(r.artworkUrl100, 300), year: (r.releaseDate || '').slice(0, 4), colId: r.collectionId, count: r.trackCount, type: /single/i.test(r.collectionName) || r.trackCount <= 3 ? 'Kislemez' : r.trackCount <= 7 ? 'EP' : 'Album' }),
  async search(q) {
    const [songs, albums, artists] = await Promise.all([
      this.q({ term: q, entity: 'song', limit: 25 }).catch(() => []),
      this.q({ term: q, entity: 'album', limit: 18 }).catch(() => []),
      this.q({ term: q, entity: 'musicArtist', limit: 6 }).catch(() => []),
    ]);
    return { songs: songs.map(this.song), albums: albums.map(this.albumOf), artists: artists.map(a => ({ kind: 'artist', name: a.artistName, id: a.artistId, genre: a.primaryGenreName })) };
  },
  async artistAlbums(artist) {
    const main = norm(String(artist).split(/\s*(?:,|&| x | feat\.? | ft\.? | and )\s*/i)[0]);
    const res = await this.q({ term: artist, entity: 'album', limit: 60 });
    const seen = new Set(), out = [];
    for (const r of res) {
      if (!norm(r.artistName).includes(main) && !main.includes(norm(r.artistName))) continue;
      const k = norm(r.collectionName).replace(/ (deluxe|expanded|edition|version|remaster(ed)?|clean|explicit).*$/, '');
      if (seen.has(k)) continue; seen.add(k); out.push(this.albumOf(r));
    }
    return out.sort((a, b) => (b.count > 6) - (a.count > 6) || a.year.localeCompare(b.year)).slice(0, 14).sort((a, b) => a.year.localeCompare(b.year));
  },
  async albumTracks(colId) {
    const u = 'https://itunes.apple.com/lookup?' + new URLSearchParams({ id: colId, entity: 'song', country: set.country || 'US' });
    const r = await getJSON(u); return (r.results || []).filter(x => x.wrapperType === 'track').map(this.song);
  },
  async artistSongs(name) { return (await this.q({ term: name, entity: 'song', attribute: 'artistTerm', limit: 30 })).map(this.song); },
};
const memo = new Map();

/* ----- Spotify Web API (saját Client ID, PKCE bejelentkezés) ----- */
const spotify = (() => {
  const REDIR = () => NATIVE ? (N('redirectUri') || 'http://127.0.0.1:43821/callback') : location.origin + location.pathname;
  const SCOPES = 'playlist-read-private playlist-read-collaborative user-library-read user-read-playback-state user-modify-playback-state user-read-private user-read-recently-played';
  let tok = store.get('sp.tok', null);
  const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  async function connect() {
    if (!set.spClient) throw new Error('Előbb add meg a Spotify Client ID-t');
    const ver = b64url(crypto.getRandomValues(new Uint8Array(48)));
    const chal = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ver)));
    store.set('sp.ver', ver);
    const u = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({ client_id: set.spClient, response_type: 'code', redirect_uri: REDIR(), code_challenge_method: 'S256', code_challenge: chal, scope: SCOPES });
    if (NATIVE) { N('authListen'); N('openUri', u); } else location.href = u;
  }
  async function tokenReq(params) {
    const r = await nfetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: set.spClient, ...params }).toString() });
    const j = r.json(); if (!r.ok) throw new Error(j?.error_description || 'Spotify hiba ' + r.status);
    tok = { access: j.access_token, refresh: j.refresh_token || tok?.refresh, exp: Date.now() + (j.expires_in - 60) * 1000 };
    store.set('sp.tok', tok); return tok;
  }
  async function onAuth(url) {
    const p = new URL(url.replace(/^haloplayer:\/\/callback/, 'https://x/cb')).searchParams;
    if (p.get('error')) throw new Error('Spotify: ' + p.get('error'));
    const code = p.get('code'); if (!code) return;
    await tokenReq({ grant_type: 'authorization_code', code, redirect_uri: REDIR(), code_verifier: store.get('sp.ver', '') });
    me = null; await profile();
  }
  async function access() {
    if (!tok) throw new Error('nincs Spotify kapcsolat');
    if (Date.now() > tok.exp) await tokenReq({ grant_type: 'refresh_token', refresh_token: tok.refresh });
    return tok.access;
  }
  async function api(path, o = {}) {
    const go = async () => nfetch(path.startsWith('http') ? path : 'https://api.spotify.com/v1' + path, { method: o.method || 'GET', headers: { Authorization: 'Bearer ' + await access(), ...(o.body ? { 'Content-Type': 'application/json' } : {}) }, body: o.body ? JSON.stringify(o.body) : '' });
    let r = await go();
    if (r.status === 401 && tok?.refresh) { tok.exp = 0; r = await go(); }
    if (!r.ok && r.status !== 204) throw Object.assign(new Error('Spotify ' + r.status), { status: r.status });
    return r.text ? r.json() : null;
  }
  let me = null;
  async function profile() { if (!me) me = await api('/me'); return me; }
  const art = imgs => (imgs && imgs[0]?.url) || '';
  const track = t => t && t.type !== 'episode' && ({ kind: 'song', title: t.name, artist: (t.artists || []).map(a => a.name).join(', '), album: t.album?.name || '', art: art(t.album?.images), thumbArt: (t.album?.images || []).slice(-2)[0]?.url || art(t.album?.images), dur: t.duration_ms, spUri: t.uri, explicit: t.explicit });
  return {
    connect, onAuth, profile,
    get connected() { return !!tok; },
    logout() { tok = null; me = null; store.del('sp.tok'); },
    async playlists() {
      const out = []; let url = '/me/playlists?limit=50';
      while (url && out.length < 200) { const j = await api(url); out.push(...j.items.filter(Boolean)); url = j.next; }
      return out.map(p => ({ kind: 'playlist', name: p.name, art: art(p.images), count: p.tracks?.total ?? p.items?.total ?? '', id: p.id, uri: p.uri, owner: p.owner?.display_name }));
    },
    async playlistTracks(id) {
      let j;
      try { j = await api(`/playlists/${id}/items?limit=100`); } catch { j = await api(`/playlists/${id}/tracks?limit=100`); }
      return (j.items || []).map(i => track(i.item || i.track)).filter(Boolean);
    },
    /** Spotify Connect eszközök (telefon, Chromecast, hangszórók, PC) és lejátszás átküldése. */
    async devices() { const j = await api('/me/player/devices'); return (j?.devices || []).map(d => ({ id: d.id, name: d.name, type: d.type, active: d.is_active, vol: d.volume_percent })); },
    async transfer(id) { await api('/me/player', { method: 'PUT', body: { device_ids: [id], play: true } }); },
    async liked() { const j = await api('/me/tracks?limit=50'); return j.items.map(i => track(i.track)).filter(Boolean); },
    async search(q) {
      const j = await api('/search?' + new URLSearchParams({ q, type: 'track,playlist', limit: 12 }));
      return { songs: (j.tracks?.items || []).map(track).filter(Boolean), playlists: (j.playlists?.items || []).filter(Boolean).map(p => ({ kind: 'playlist', name: p.name, art: art(p.images), id: p.id, uri: p.uri, owner: p.owner?.display_name, count: p.tracks?.total ?? '' })) };
    },
    async findUri(it) {
      if (it.spUri) return it.spUri;
      const j = await api('/search?' + new URLSearchParams({ q: `track:${it.title} artist:${String(it.artist).split(',')[0]}`, type: 'track', limit: 1 }));
      return j.tracks?.items?.[0]?.uri || '';
    },
    /** Lejátszás a telefon Spotify appjában. Prémium nélkül a Spotify appot nyitja meg az adott dallal. */
    async play(body, fallbackUri) {
      try {
        try { await api('/me/player/play', { method: 'PUT', body }); return true; }
        catch (e) {
          if (e.status !== 404) throw e;
          const d = await api('/me/player/devices');
          const dev = (d.devices || []).find(x => /smartphone|tablet/i.test(x.type)) || d.devices?.[0];
          if (!dev) throw e;
          await api('/me/player/play?device_id=' + dev.id, { method: 'PUT', body }); return true;
        }
      } catch { if (fallbackUri) N('openUri', fallbackUri); return false; }
    },
  };
})();

/* ----- YouTube Data API (hivatalos, saját ingyenes kulccsal) ----- */
const youtube = {
  get ready() { return !!set.ytKey; },
  async search(q, n = 6) {
    if (!set.ytKey) throw new Error('nincs YouTube API kulcs');
    const ck = 'yt:' + norm(q); const c = store.get(ck, null); if (c && c.n >= n) return c.items;
    const u = 'https://www.googleapis.com/youtube/v3/search?' + new URLSearchParams({ part: 'snippet', type: 'video', videoEmbeddable: 'true', videoCategoryId: '10', maxResults: n, q, key: set.ytKey });
    const j = await getJSON(u);
    const items = (j.items || []).map(i => ({ kind: 'video', ytId: i.id.videoId, title: decodeEnt(i.snippet.title), artist: decodeEnt(i.snippet.channelTitle).replace(/VEVO$|\s*-\s*Topic$/i, ''), art: i.snippet.thumbnails?.high?.url || '', thumbArt: i.snippet.thumbnails?.medium?.url || '' }));
    store.set(ck, { n, items }); return items;
  },
};
function decodeEnt(s) { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; }

/* ----- saját lejátszólisták (a készüléken) ----- */
const myLists = {
  all: () => store.get('pl', []),
  save(l) { store.set('pl', l); },
  create(name) { const l = this.all(); const p = { id: Date.now().toString(36), name: name || 'Új lista', tracks: [] }; l.unshift(p); this.save(l); return p; },
  add(id, it) { const l = this.all(); const p = l.find(x => x.id === id); if (!p) return; const t = { title: it.title, artist: it.artist, album: it.album || '', art: it.art || '', thumbArt: it.thumbArt || '', spUri: it.spUri || '', ytId: it.ytId || '', preview: it.preview || '', dur: it.dur || 0 }; if (!p.tracks.some(x => x.title === t.title && x.artist === t.artist)) p.tracks.push(t); this.save(l); },
  remove(id, idx) { const l = this.all(); const p = l.find(x => x.id === id); if (p) { p.tracks.splice(idx, 1); this.save(l); } },
  del(id) { this.save(this.all().filter(x => x.id !== id)); },
};
