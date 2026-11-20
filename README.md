# Halo Player

Zenelejátszó-skin Androidra (Samsung Galaxy Tab S8 Ultra és Galaxy S23 Ultra méretre hangolva).
Amit a telefonon/tableten épp hallgatsz Spotify-ban, SoundCloud-ban, YouTube Music-ban vagy YouTube-on,
azt teljes képernyős, animált felületen mutatja és vezérli: izzó képernyőszél, nagy óra, az előadó
albumainak üveg-coverflow-ja, időzített (szavanként szinkronizált) dalszöveg, videóklip-háttér,
keresés és lejátszólisták.

## Felépítés

| Mappa | Mi van benne |
|---|---|
| `web/src/` | A felület: `index.html`, `style.css`, `js/*.js` (core, szolgáltatások, dalszöveg, lejátszás, UI). Böngészőben demó módban fut. |
| `web/dist/index.html` | Az összefűzött, önálló HTML (betűtípusokkal együtt). |
| `android/` | Natív Android app (Kotlin): WebView + médiamenet-híd, HTTP-híd, Spotify-bejelentkezés, ütemkövetés, 120 Hz. |
| `tools/build-web.mjs` | A `web/src` → `web/dist` és `android/app/src/main/assets` összefűzése. |

## Funkciók

- **Követés fiók nélkül:** az Android médiamenetét olvassa (értesítés-hozzáférés), így bármelyik zenei
  app lejátszását mutatja és vezérli.
- **Keresés:** dalok, albumok, előadók az iTunes nyilvános katalógusából; a választott dal a Spotify /
  YouTube Music / SoundCloud appban indul (Android „lejátszás keresésből” parancs), vagy a Halo-ban
  YouTube-videóként, vagy 30 mp-es előzetesként.
- **Lejátszólisták:** Spotify (saját Client ID, PKCE bejelentkezés) + saját Halo-listák a készüléken.
- **Témák:** Albumok, Ív, Gyöngy, Tárcsa, Reflektor, Vízió, Csempe, Dalszöveg.
- **Dalszöveg (LRCLIB):** 8 stílus — Kinetikus, Karaoke, Hullám, Neon, Írógép, Poszter, Felirat, Lista;
  betűtípus, méret, kiemelés színe, elhelyezés állítható.
- **Háttér:** a dal videóklipje (YouTube Data API kulccsal), albumborító, Aurora, vagy saját videó/kép.
- **Fényperem:** a borító színeiből, ütemre lüktet (opcionálisan valódi hangelemzéssel).
- **Eszközök:** Chromecast / Google Cast felderítés és küldés (Spotify Connect-en át, vagy a Halo előzeteseinél
  Cast SDK-val), Spotify Connect eszközváltás, Bluetooth-hangszórók keresése és párosítása, animált jelzés
  csatlakozáskor/leválasztáskor, rendszer-kimenetváltó és képernyő-kivetítés.
- **Hangvezérlés (angol):** „next song”, „previous”, „pause”, „play <dal> by <előadó>”, „search <név>”,
  „volume up / volume 40”, „shuffle”, „show lyrics”, „neon lyrics”, „next theme”, „what's playing”,
  „open devices”, „cast to <eszköz>” — angol hangos visszajelzéssel.

## Fiókok beállítása (az appban: ⚙ → Fiókok)

**Spotify:** developer.spotify.com/dashboard → Create app → Redirect URI: `http://127.0.0.1:43821/callback`
(szóköz nélkül), API: Web API → a Client ID-t másold a Halo-ba → Összekapcsolás.

**YouTube videóklipek:** console.cloud.google.com → új projekt → YouTube Data API v3 engedélyezése →
API key → másold a Halo-ba.

## Építés

```bash
node tools/build-web.mjs                 # felület összefűzése
cd android && ./gradlew assembleRelease  # APK: android/app/build/outputs/apk/release/app-release.apk
```

A GitHub Actions (`.github/workflows/android.yml`) minden push után megépíti az APK-t (Actions → a futás
→ Artifacts). Megjegyzés: a CI-ben épített APK más aláírással készül, mint a kézzel küldött verziók, ezért
egy már telepített Halo fölé nem települ — előtte a régit el kell távolítani.

## Telepítés

1. Töltsd le az APK-t a készülékre, és nyisd meg.
2. Ha a Play Protect blokkolja: Play Áruház → profil → Play Protect → ⚙ → „Alkalmazások szkennelése”
   ideiglenesen ki, telepítés, majd vissza be.
3. Halo → Engedélyezés (értesítés-hozzáférés). Ha szürke: Beállítások → Alkalmazások → Halo → ⋮ →
   Korlátozott beállítások engedélyezése.

## Licencek

Betűtípusok: Manrope, Big Shoulders Display, Fraunces (SIL Open Font License, a Fontsource csomagjaiból).
Dalszöveg: LRCLIB. Katalógus: iTunes Search API. Videók: YouTube IFrame / Data API.
