package hu.halo.player

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.SearchManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.provider.Settings
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private lateinit var web: WebView
    private var fileCb: ValueCallback<Array<Uri>>? = null
    private var pageReady = false
    private var pendingAuth: String? = null
    private var resumed = false
    private val main = Handler(Looper.getMainLooper())
    private val net = Executors.newFixedThreadPool(4)

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        volumeControlStream = AudioManager.STREAM_MUSIC

        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            overScrollMode = View.OVER_SCROLL_NEVER
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.offscreenPreRaster = true
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, req: WebResourceRequest): WebResourceResponse? =
                    loader.shouldInterceptRequest(req.url)

                override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                    if (!req.isForMainFrame || req.url.host == "appassets.androidplatform.net") return false
                    openUri(req.url.toString())
                    return true
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(view: WebView, cb: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                    fileCb?.onReceiveValue(null)
                    fileCb = cb
                    val types = params.acceptTypes.flatMap { it.split(",") }.map { it.trim() }.filter { it.isNotEmpty() }
                    val i = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                        if (types.isNotEmpty()) putExtra(Intent.EXTRA_MIME_TYPES, types.toTypedArray())
                        if (params.mode == FileChooserParams.MODE_OPEN_MULTIPLE) putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    }
                    return try { startActivityForResult(i, REQ_FILE); true } catch (_: ActivityNotFoundException) { fileCb = null; false }
                }
            }
            addJavascriptInterface(Bridge(), "HaloNative")
        }
        setContentView(web)
        MediaHub.emit = { code -> if (pageReady) web.evaluateJavascript(code, null) }
        Beat.onLevel = { lvl -> main.post { if (pageReady) web.evaluateJavascript("window.Halo&&Halo.onLevel($lvl)", null) } }
        applyRefresh(true)
        handleIntent(intent)
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html")
        hideBars()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    /** Spotify bejelentkezés visszatérése (haloplayer://callback?code=… vagy a helyi fogadóból). */
    private fun handleIntent(i: Intent?) {
        val data = i?.data ?: return
        if (data.scheme != "haloplayer" || data.getQueryParameter("code") == null) return
        deliverAuth(data.toString())
    }

    private fun deliverAuth(url: String) {
        pendingAuth = url
        flushAuth()
    }

    private fun flushAuth() {
        val url = pendingAuth ?: return
        if (!pageReady || !resumed) return
        pendingAuth = null
        web.evaluateJavascript("window.Halo&&Halo.onAuth(${JSONObject.quote(url)})", null)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQ_FILE) return
        val cb = fileCb ?: return
        fileCb = null
        if (resultCode != RESULT_OK || data == null) { cb.onReceiveValue(null); return }
        val clip = data.clipData
        val uris = if (clip != null) Array(clip.itemCount) { clip.getItemAt(it).uri } else data.data?.let { arrayOf(it) }
        cb.onReceiveValue(uris)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, results)
        if (requestCode == REQ_AUDIO) {
            val ok = results.firstOrNull() == PackageManager.PERMISSION_GRANTED && Beat.start()
            web.evaluateJavascript("window.Halo&&Halo.onBeat($ok)", null)
        }
    }

    override fun onResume() {
        super.onResume()
        hideBars()
        web.onResume()
        resumed = true
        if (pageReady) MediaHub.attach(this)
        flushAuth()
    }

    override fun onPause() {
        resumed = false
        web.onPause()
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideBars()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        web.evaluateJavascript("(window.Halo&&Halo.back)?Halo.back():0") { r ->
            if (r != "1" && r != "true") moveTaskToBack(true)
        }
    }

    override fun onDestroy() {
        MediaHub.emit = null
        AuthServer.stop()
        Beat.onLevel = null
        Beat.stop()
        web.destroy()
        super.onDestroy()
    }

    private fun hideBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let {
                it.hide(WindowInsets.Type.systemBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION)
        }
    }

    /** A kijelző legmagasabb frissítési módja (pl. 120 Hz), vagy energiatakarékosan 60 Hz. */
    private fun applyRefresh(high: Boolean) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
        val d = display ?: return
        val curMode = d.mode
        val same = d.supportedModes.filter { it.physicalWidth == curMode.physicalWidth && it.physicalHeight == curMode.physicalHeight }
        val target = if (high) same.maxByOrNull { it.refreshRate } else same.filter { it.refreshRate <= 61f }.maxByOrNull { it.refreshRate }
        target ?: return
        window.attributes = window.attributes.also {
            it.preferredDisplayModeId = target.modeId
            it.preferredRefreshRate = target.refreshRate
        }
    }

    private fun openUri(uri: String) {
        try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) { }
    }

    private fun openNotificationAccess() {
        val detail = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
            Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
                .putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                    ComponentName(this, MediaListenerService::class.java).flattenToString())
        else null
        try { startActivity(detail ?: Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }
        catch (_: Exception) { startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }
    }

    private fun audio() = getSystemService(Context.AUDIO_SERVICE) as AudioManager

    /** JS → natív híd (window.HaloNative). */
    inner class Bridge {
        @JavascriptInterface fun ready() = runOnUiThread {
            pageReady = true
            MediaHub.attach(this@MainActivity)
            flushAuth()
        }
        /** Spotify bejelentkezés előtt: elindítja a helyi fogadót (http://127.0.0.1:43821/callback). */
        @JavascriptInterface fun authListen() { AuthServer.start { url -> main.post { deliverAuth(url) } } }
        @JavascriptInterface fun redirectUri(): String = AuthServer.REDIRECT
        @JavascriptInterface fun setHighRefresh(on: Boolean) = runOnUiThread { applyRefresh(on) }
        @JavascriptInterface fun control(action: String, value: String) = runOnUiThread { MediaHub.control(action, value) }
        @JavascriptInterface fun openNotificationAccess() = runOnUiThread { this@MainActivity.openNotificationAccess() }
        @JavascriptInterface fun openSource() = runOnUiThread { MediaHub.openSource(this@MainActivity) }
        @JavascriptInterface fun openUri(uri: String) = runOnUiThread { this@MainActivity.openUri(uri) }
        @JavascriptInterface fun pauseExternal() = runOnUiThread { MediaHub.pauseExternal() }
        @JavascriptInterface fun setKeepAwake(on: Boolean) = runOnUiThread {
            if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }

        @JavascriptInterface fun getVolume(): Float {
            val a = audio()
            return a.getStreamVolume(AudioManager.STREAM_MUSIC).toFloat() / a.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        }
        @JavascriptInterface fun setVolume(f: Float) {
            val a = audio(); val max = a.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            a.setStreamVolume(AudioManager.STREAM_MUSIC, (f.coerceIn(0f, 1f) * max).toInt(), 0)
        }

        /** Valódi ütemkövetés be/ki (hang-engedélyt kér, de semmit nem rögzít). */
        @JavascriptInterface fun setBeat(on: Boolean) = runOnUiThread {
            if (!on) { Beat.stop(); return@runOnUiThread }
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                val ok = Beat.start()
                web.evaluateJavascript("window.Halo&&Halo.onBeat($ok)", null)
            } else requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_AUDIO)
        }

        /**
         * Bármilyen dal elindítása a kiválasztott zenei appban (Spotify, YouTube Music, …)
         * a hivatalos „lejátszás keresésből” paranccsal. Nem kell hozzá fiók vagy kulcs.
         */
        @JavascriptInterface fun playFromSearch(pkg: String, title: String, artist: String, album: String) = runOnUiThread {
            val q = listOf(title, artist).filter { it.isNotBlank() }.joinToString(" ")
            val ex = Bundle().apply {
                putString(MediaStore.EXTRA_MEDIA_FOCUS, MediaStore.Audio.Media.ENTRY_CONTENT_TYPE)
                putString(MediaStore.EXTRA_MEDIA_TITLE, title)
                putString(MediaStore.EXTRA_MEDIA_ARTIST, artist)
                if (album.isNotBlank()) putString(MediaStore.EXTRA_MEDIA_ALBUM, album)
                putString(SearchManager.QUERY, q)
            }
            if (MediaHub.playFromSearch(pkg, q, ex)) return@runOnUiThread
            val i = Intent(MediaStore.INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH).setPackage(pkg)
                .putExtras(ex).putExtra(SearchManager.QUERY, q).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try { startActivity(i) } catch (_: ActivityNotFoundException) {
                web.evaluateJavascript("window.Halo&&Halo.toastMsg('Az app nincs telepítve')", null)
            }
        }

        /** Kép letöltése data URL-ként (színkinyeréshez); eredmény: Halo.onHttp(id, 200, dataUrl). */
        @JavascriptInterface fun image(id: String, url: String) {
            net.execute {
                val data = MediaHub.imageDataUrl(url)
                val js = "window.Halo&&Halo.onHttp(${JSONObject.quote(id)},${if (data != null) 200 else 0},${JSONObject.quote(data ?: "")})"
                main.post { web.evaluateJavascript(js, null) }
            }
        }

        /** Hálózati kérés CORS-korlátok nélkül; az eredmény: Halo.onHttp(id, status, body). */
        @JavascriptInterface fun http(id: String, method: String, url: String, headers: String, body: String) {
            net.execute {
                var status = 0
                var text = ""
                try {
                    val con = URL(url).openConnection() as HttpURLConnection
                    con.requestMethod = method
                    con.connectTimeout = 10000; con.readTimeout = 15000
                    con.setRequestProperty("User-Agent", "HaloPlayer/1.1 (Android)")
                    if (headers.isNotBlank()) JSONObject(headers).let { h -> h.keys().forEach { con.setRequestProperty(it, h.getString(it)) } }
                    if (body.isNotEmpty() && method != "GET") {
                        con.doOutput = true
                        con.outputStream.use { it.write(body.toByteArray()) }
                    }
                    status = con.responseCode
                    val stream = if (status >= 400) con.errorStream else con.inputStream
                    text = stream?.use { s -> ByteArrayOutputStream().also { s.copyTo(it) }.toString("UTF-8") } ?: ""
                } catch (e: Exception) { text = e.message ?: "error" }
                val js = "window.Halo&&Halo.onHttp(${JSONObject.quote(id)},$status,${JSONObject.quote(text)})"
                main.post { web.evaluateJavascript(js, null) }
            }
        }
    }

    companion object {
        private const val REQ_FILE = 42
        private const val REQ_AUDIO = 43
    }
}
