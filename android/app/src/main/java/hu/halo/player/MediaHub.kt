package hu.halo.player

import android.content.ComponentName
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * A rendszer médiamenetéből (Spotify, SoundCloud, YouTube Music, YouTube, …) olvassa ki
 * az épp szóló dalt, és JS-hívásokként küldi tovább a felületnek.
 * Ehhez a Halo-nak értesítés-hozzáférés kell (NotificationListenerService).
 */
object MediaHub {
    /** JS-kód végrehajtása a WebView-ban (főszálon hívódik). */
    var emit: ((String) -> Unit)? = null

    private val main = Handler(Looper.getMainLooper())
    private val io = Executors.newSingleThreadExecutor()
    private lateinit var app: Context
    private var msm: MediaSessionManager? = null
    private var comp: ComponentName? = null
    private var current: MediaController? = null
    private val watchers = mutableMapOf<MediaController, Watcher>()

    private var lastArtKey = ""
    private var lastArtHadBitmap = false
    private var lastQueueSig = ""
    @Volatile var lastArtData: String? = null
    @Volatile var lastArtDataKey = ""
    @Volatile var lastQueueJson: String? = null

    private val sessionsListener = MediaSessionManager.OnActiveSessionsChangedListener { list ->
        pick(list ?: emptyList())
    }

    private class Watcher(val c: MediaController) : MediaController.Callback() {
        override fun onPlaybackStateChanged(state: PlaybackState?) {
            if (state?.state == PlaybackState.STATE_PLAYING && !isCurrent(c)) select(c)
            else if (isCurrent(c)) push()
        }
        override fun onMetadataChanged(metadata: MediaMetadata?) { if (isCurrent(c)) push() }
        override fun onQueueChanged(queue: MutableList<android.media.session.MediaSession.QueueItem>?) { if (isCurrent(c)) pushQueue() }
        override fun onSessionDestroyed() { refreshSessions() }
    }

    private fun isCurrent(c: MediaController) = current?.sessionToken == c.sessionToken

    fun hasAccess(ctx: Context): Boolean {
        val flat = Settings.Secure.getString(ctx.contentResolver, "enabled_notification_listeners") ?: return false
        return flat.split(":").any { ComponentName.unflattenFromString(it)?.packageName == ctx.packageName }
    }

    /** A felület betöltése / visszatérés után hívódik: jogosultság + teljes állapot újraküldése. */
    fun attach(ctx: Context) {
        app = ctx.applicationContext
        comp = ComponentName(app, MediaListenerService::class.java)
        val ok = hasAccess(app)
        js("Halo.onAccess($ok)")
        if (!ok) return
        if (msm == null) {
            msm = app.getSystemService(MediaSessionManager::class.java)
            try {
                msm?.addOnActiveSessionsChangedListener(sessionsListener, comp, main)
            } catch (e: SecurityException) {
                msm = null
                return
            }
        }
        lastArtKey = ""; lastQueueSig = ""
        refreshSessions()
    }

    fun refreshSessions() {
        if (!::app.isInitialized) return
        val list = try { msm?.getActiveSessions(comp) } catch (e: SecurityException) { null } ?: emptyList()
        pick(list)
    }

    private fun pick(all: List<MediaController>) {
        val list = all.filter { it.packageName != app.packageName }
        // Figyelők frissítése minden aktív menetre (hogy észrevegyük, ha másik app kezd játszani)
        val tokens = list.map { it.sessionToken }.toSet()
        watchers.keys.filter { it.sessionToken !in tokens }.forEach { c ->
            watchers.remove(c)?.let { c.unregisterCallback(it) }
        }
        list.forEach { c ->
            if (watchers.keys.none { it.sessionToken == c.sessionToken }) {
                val w = Watcher(c); c.registerCallback(w, main); watchers[c] = w
            }
        }
        val best = list.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING }
            ?: list.firstOrNull { c -> current?.let { it.sessionToken == c.sessionToken } == true }
            ?: list.firstOrNull()
        if (best == null) { current = null; js("Halo.onIdle()"); return }
        select(best)
    }

    private fun select(c: MediaController) {
        if (current?.sessionToken != c.sessionToken) {
            current = c; lastArtKey = ""; lastQueueSig = ""
        }
        push(); pushQueue()
    }

    /** Friss állapot (pozícióval) a kivetítéshez. */
    fun snapshot(): JSONObject? {
        val c = current ?: return null
        val md = c.metadata; val st = c.playbackState
        val playing = st?.state == PlaybackState.STATE_PLAYING || st?.state == PlaybackState.STATE_BUFFERING
        var pos = st?.position ?: 0L
        if (playing && st != null && st.lastPositionUpdateTime > 0) pos += ((SystemClock.elapsedRealtime() - st.lastPositionUpdateTime) * st.playbackSpeed).toLong()
        val title = md?.getString(MediaMetadata.METADATA_KEY_TITLE) ?: md?.getString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE) ?: ""
        val artist = md?.getString(MediaMetadata.METADATA_KEY_ARTIST) ?: md?.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST) ?: ""
        return JSONObject().put("title", title).put("artist", artist).put("album", md?.getString(MediaMetadata.METADATA_KEY_ALBUM) ?: "")
            .put("duration", md?.getLong(MediaMetadata.METADATA_KEY_DURATION) ?: 0L).put("position", pos).put("playing", playing)
            .put("speed", 1.0).put("pkg", c.packageName).put("app", appLabel(c.packageName)).put("artKey", "$title|$artist")
    }

    private fun push() {
        val c = current ?: return
        val md = c.metadata
        val st = c.playbackState
        val title = md?.getString(MediaMetadata.METADATA_KEY_TITLE)
            ?: md?.getString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE) ?: ""
        val artist = md?.getString(MediaMetadata.METADATA_KEY_ARTIST)
            ?: md?.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST)
            ?: md?.getString(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE) ?: ""
        val album = md?.getString(MediaMetadata.METADATA_KEY_ALBUM) ?: ""
        val duration = md?.getLong(MediaMetadata.METADATA_KEY_DURATION) ?: 0L
        val playing = st?.state == PlaybackState.STATE_PLAYING || st?.state == PlaybackState.STATE_BUFFERING
        var pos = st?.position ?: 0L
        if (playing && st != null && st.lastPositionUpdateTime > 0) {
            pos += ((SystemClock.elapsedRealtime() - st.lastPositionUpdateTime) * st.playbackSpeed).toLong()
        }
        if (duration > 0) pos = pos.coerceIn(0, duration)
        val pkg = c.packageName
        val actions = st?.customActions?.joinToString(",") { (it.action + " " + it.name).lowercase() } ?: ""
        val artKey = "$pkg|$title|$artist|$album"
        val o = JSONObject()
            .put("title", title).put("artist", artist).put("album", album)
            .put("duration", duration).put("position", pos).put("playing", playing)
            .put("speed", (st?.playbackSpeed ?: 1f).toDouble().takeIf { it > 0 } ?: 1.0)
            .put("pkg", pkg).put("app", appLabel(pkg)).put("artKey", artKey)
            .put("canShuffle", actions.contains("shuffle")).put("canRepeat", actions.contains("repeat"))
        js("Halo.onState($o)")

        val bmp = md?.getBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART)
            ?: md?.getBitmap(MediaMetadata.METADATA_KEY_ART)
            ?: md?.getBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON)
        if (artKey != lastArtKey || (!lastArtHadBitmap && bmp != null)) {
            lastArtKey = artKey; lastArtHadBitmap = bmp != null
            val uri = md?.getString(MediaMetadata.METADATA_KEY_ALBUM_ART_URI)
                ?: md?.getString(MediaMetadata.METADATA_KEY_ART_URI)
                ?: md?.getString(MediaMetadata.METADATA_KEY_DISPLAY_ICON_URI)
            io.execute {
                val data = (bmp ?: uri?.let { loadUri(it) })?.let { toDataUrl(it, 640, 88) }
                main.post {
                    if (lastArtKey != artKey) return@post
                    if (data != null) { lastArtData = data; lastArtDataKey = artKey; js("Halo.onArt(${JSONObject.quote(artKey)},${JSONObject.quote(data)})") }
                    else js("Halo.onNoArt(${JSONObject.quote(artKey)})")
                }
            }
        }
    }

    private fun pushQueue() {
        val c = current ?: return
        val q = c.queue ?: emptyList()
        val active = c.playbackState?.activeQueueItemId ?: -1L
        val idx = q.indexOfFirst { it.queueId == active }
        val upcoming = (if (idx >= 0) q.drop(idx + 1) else q).take(10)
        val sig = upcoming.joinToString("|") { "${it.queueId}:${it.description.title}" }
        if (sig == lastQueueSig) return
        lastQueueSig = sig
        io.execute {
            val arr = JSONArray()
            upcoming.forEach { item ->
                val d = item.description
                val icon = d.iconBitmap ?: d.iconUri?.let { loadUri(it.toString()) }
                arr.put(JSONObject()
                    .put("id", item.queueId.toString())
                    .put("title", d.title?.toString() ?: "")
                    .put("artist", d.subtitle?.toString() ?: "")
                    .put("art", icon?.let { toDataUrl(it, 200, 80) } ?: ""))
            }
            lastQueueJson = arr.toString()
            main.post { if (lastQueueSig == sig) js("Halo.onQueue($arr)") }
        }
    }

    fun control(action: String, value: String) {
        val t = current?.transportControls ?: return
        when (action) {
            "toggle" -> if (current?.playbackState?.state == PlaybackState.STATE_PLAYING) t.pause() else t.play()
            "play" -> t.play()
            "pause" -> t.pause()
            "next" -> t.skipToNext()
            "prev" -> t.skipToPrevious()
            "seek" -> value.toLongOrNull()?.let { t.seekTo(it) }
            "skipTo" -> value.toLongOrNull()?.let { t.skipToQueueItem(it) }
            "shuffle", "repeat" -> current?.playbackState?.customActions
                ?.firstOrNull { (it.action + " " + it.name).lowercase().contains(action) }
                ?.let { t.sendCustomAction(it, null) }
        }
    }

    /** Ha a megadott app médiamenete él, azon keresztül indítja a dalt (nem kell appot váltani). */
    fun playFromSearch(pkg: String, query: String, extras: android.os.Bundle): Boolean {
        val list = try { msm?.getActiveSessions(comp) } catch (e: SecurityException) { null } ?: return false
        val c = list.firstOrNull { it.packageName == pkg } ?: return false
        c.transportControls.playFromSearch(query, extras)
        select(c)
        return true
    }

    fun pauseExternal() { current?.transportControls?.pause() }

    private fun simple(s: String) = s.lowercase().replace(Regex("\\s*[(\\[].*?[)\\]]"), "").replace(Regex("[^\\p{L}\\p{N}]+"), "")

    /** Az adott app épp a kért dalt játssza-e (laza egyezés a címre). */
    fun isPlaying(pkg: String, title: String): Boolean {
        val list = try { msm?.getActiveSessions(comp) } catch (e: SecurityException) { null } ?: return false
        val want = simple(title).take(14); if (want.isEmpty()) return false
        return list.any { c ->
            c.packageName == pkg && c.playbackState?.state == PlaybackState.STATE_PLAYING &&
                simple(c.metadata?.getString(MediaMetadata.METADATA_KEY_TITLE) ?: "").let { it.isNotEmpty() && (it.startsWith(want) || want.startsWith(it.take(14))) }
        }
    }

    fun currentPackage(): String = current?.packageName ?: ""

    fun openSource(ctx: Context) {
        val c = current ?: return
        try {
            c.sessionActivity?.send()
            return
        } catch (_: Exception) { }
        ctx.packageManager.getLaunchIntentForPackage(c.packageName)?.let { ctx.startActivity(it) }
    }

    fun imageDataUrl(url: String): String? = loadUri(url)?.let { toDataUrl(it, 640, 86) }

    private fun appLabel(pkg: String): String = try {
        val pm = app.packageManager
        pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
    } catch (_: Exception) { pkg }

    private fun loadUri(s: String): Bitmap? = try {
        val uri = Uri.parse(s)
        when (uri.scheme) {
            "http", "https" -> {
                val con = URL(s).openConnection() as HttpURLConnection
                con.connectTimeout = 6000; con.readTimeout = 8000
                con.inputStream.use { BitmapFactory.decodeStream(it) }
            }
            else -> app.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) }
        }
    } catch (_: Exception) { null }

    private fun toDataUrl(src: Bitmap, max: Int, quality: Int): String? = try {
        val scale = minOf(1f, max.toFloat() / maxOf(src.width, src.height))
        val b = if (scale < 1f) Bitmap.createScaledBitmap(src, (src.width * scale).toInt().coerceAtLeast(1), (src.height * scale).toInt().coerceAtLeast(1), true) else src
        val soft = if (b.config == Bitmap.Config.HARDWARE) b.copy(Bitmap.Config.ARGB_8888, false) else b
        val out = ByteArrayOutputStream()
        soft.compress(Bitmap.CompressFormat.JPEG, quality, out)
        "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    } catch (_: Exception) { null }

    private fun js(code: String) {
        emit?.invoke("window.Halo&&$code")
    }
}
