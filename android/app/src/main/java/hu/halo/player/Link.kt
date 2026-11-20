package hu.halo.player

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import android.os.Handler
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedInputStream
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

/**
 * Halo Link: a telefon/tablet Halo-ja elküldi a felületét a projektoron/TV-n futó Halo-nak a helyi Wi-Fi-n.
 * - Kijelző (projektor): kis HTTP-fogadó a 43822-es porton + mDNS hirdetés (_halo._tcp).
 * - Küldő (telefon): mDNS-felderítés; az adatokat a JS a meglévő http-hídon küldi.
 */
object Link {
    const val PORT = 43822
    private const val TYPE = "_halo._tcp."
    var emit: ((String) -> Unit)? = null
    private val main = Handler(Looper.getMainLooper())
    private lateinit var ctx: Context
    private var server: ServerSocket? = null
    private var nsd: NsdManager? = null
    private var regListener: NsdManager.RegistrationListener? = null
    private var discListener: NsdManager.DiscoveryListener? = null
    private val outbox = ConcurrentLinkedQueue<String>()
    private val pending = ConcurrentHashMap<String, Pair<CountDownLatch, BooleanArray>>()
    private val resolveQueue = ArrayDeque<NsdServiceInfo>()
    private var resolving = false

    private fun js(code: String) = main.post { emit?.invoke(code) }
    private fun keys(): MutableSet<String> = ctx.getSharedPreferences("link", 0).getStringSet("keys", emptySet())!!.toMutableSet()
    private fun addKey(k: String) { val s = keys(); s.add(k); ctx.getSharedPreferences("link", 0).edit().putStringSet("keys", s).apply() }

    /* ---------------- kijelző (projektor) ---------------- */
    fun startDisplay(c: Context, name: String) {
        ctx = c.applicationContext
        if (server != null) return
        val s = try { ServerSocket().apply { reuseAddress = true; bind(InetSocketAddress(PORT)) } } catch (e: Exception) { return }
        server = s
        thread(name = "halo-link", isDaemon = true) {
            while (server === s) {
                val sock = try { s.accept() } catch (_: Exception) { break }
                thread(isDaemon = true) { try { handle(sock) } catch (_: Exception) { } finally { try { sock.close() } catch (_: Exception) { } } }
            }
        }
        nsd = ctx.getSystemService(NsdManager::class.java)
        val info = NsdServiceInfo().apply { serviceName = "Halo · $name"; serviceType = TYPE; port = PORT }
        val l = object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(i: NsdServiceInfo) {}
            override fun onRegistrationFailed(i: NsdServiceInfo, e: Int) {}
            override fun onServiceUnregistered(i: NsdServiceInfo) {}
            override fun onUnregistrationFailed(i: NsdServiceInfo, e: Int) {}
        }
        regListener = l
        try { nsd?.registerService(info, NsdManager.PROTOCOL_DNS_SD, l) } catch (_: Exception) { }
    }

    fun stopDisplay() {
        try { server?.close() } catch (_: Exception) { }
        server = null
        regListener?.let { try { nsd?.unregisterService(it) } catch (_: Exception) { } }
        regListener = null
    }

    private fun handle(sock: Socket) {
        sock.soTimeout = 40000
        val inp = BufferedInputStream(sock.getInputStream())
        fun line(): String { val sb = StringBuilder(); while (true) { val b = inp.read(); if (b < 0 || b == '\n'.code) break; if (b != '\r'.code) sb.append(b.toChar()) }; return sb.toString() }
        val req = line().split(" ")
        if (req.size < 2) return
        val headers = HashMap<String, String>()
        while (true) { val h = line(); if (h.isEmpty()) break; val i = h.indexOf(':'); if (i > 0) headers[h.substring(0, i).trim().lowercase()] = h.substring(i + 1).trim() }
        val len = headers["content-length"]?.toIntOrNull() ?: 0
        val body = ByteArray(len); var r = 0
        while (r < len) { val n = inp.read(body, r, len - r); if (n < 0) break; r += n }
        val text = String(body, 0, r, Charsets.UTF_8)
        val path = req[1]
        val (code, resp) = when {
            path.startsWith("/ping") -> 200 to JSONObject().put("halo", 1).put("name", android.os.Build.MODEL).toString()
            path.startsWith("/hello") -> hello(text)
            path.startsWith("/state") -> {
                if (headers["x-halo-key"] !in keys()) 403 to "{}"
                else {
                    js("window.Halo&&Halo.onRemote(${text.ifBlank { "{}" }})")
                    val cmds = JSONArray(); while (true) { val c = outbox.poll() ?: break; cmds.put(JSONObject(c)) }
                    200 to JSONObject().put("cmds", cmds).toString()
                }
            }
            else -> 404 to "{}"
        }
        val out = resp.toByteArray(Charsets.UTF_8)
        sock.getOutputStream().apply {
            write(("HTTP/1.1 $code OK\r\nContent-Type: application/json\r\nContent-Length: ${out.size}\r\nConnection: close\r\n\r\n").toByteArray()); write(out); flush()
        }
    }

    /** Új telefon csatlakozna: a kijelzőn megerősítést kér (távirányító OK gomb). */
    private fun hello(text: String): Pair<Int, String> {
        val o = try { JSONObject(text) } catch (_: Exception) { JSONObject() }
        val id = UUID.randomUUID().toString().take(8)
        val latch = CountDownLatch(1); val ans = BooleanArray(1)
        pending[id] = latch to ans
        js("window.Halo&&Halo.onLinkHello(${JSONObject.quote(id)},${JSONObject.quote(o.optString("name", "Telefon"))})")
        latch.await(30, TimeUnit.SECONDS)
        pending.remove(id)
        if (!ans[0]) return 403 to "{}"
        val key = UUID.randomUUID().toString()
        addKey(key)
        return 200 to JSONObject().put("key", key).put("name", "Halo · " + android.os.Build.MODEL).toString()
    }

    fun answer(id: String, allow: Boolean) { pending[id]?.let { it.second[0] = allow; it.first.countDown() } }
    fun queue(cmd: String) { outbox.add(cmd); while (outbox.size > 20) outbox.poll() }

    /* ---------------- küldő (telefon): kijelzők felderítése ---------------- */
    fun discover(c: Context) {
        ctx = c.applicationContext
        if (discListener != null) return
        val n = ctx.getSystemService(NsdManager::class.java) ?: return
        nsd = n
        val l = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(t: String) {}
            override fun onDiscoveryStopped(t: String) {}
            override fun onStartDiscoveryFailed(t: String, e: Int) { discListener = null }
            override fun onStopDiscoveryFailed(t: String, e: Int) {}
            override fun onServiceFound(i: NsdServiceInfo) { if (i.serviceType.contains("_halo")) main.post { resolveQueue.add(i); nextResolve() } }
            override fun onServiceLost(i: NsdServiceInfo) { js("window.Halo&&Halo.onLinkLost(${JSONObject.quote(i.serviceName)})") }
        }
        discListener = l
        try { n.discoverServices(TYPE, NsdManager.PROTOCOL_DNS_SD, l) } catch (_: Exception) { discListener = null }
    }

    @Suppress("DEPRECATION")
    private fun nextResolve() {
        if (resolving) return
        val i = resolveQueue.removeFirstOrNull() ?: return
        resolving = true
        try {
            nsd?.resolveService(i, object : NsdManager.ResolveListener {
                override fun onResolveFailed(s: NsdServiceInfo, e: Int) { main.post { resolving = false; nextResolve() } }
                override fun onServiceResolved(s: NsdServiceInfo) {
                    val host = (if (Build.VERSION.SDK_INT >= 34) s.hostAddresses.firstOrNull { it is java.net.Inet4Address } ?: s.hostAddresses.firstOrNull() else s.host)?.hostAddress ?: ""
                    if (host.isNotBlank()) js("window.Halo&&Halo.onLinkFound(${JSONObject().put("name", s.serviceName).put("host", host).put("port", s.port)})")
                    main.post { resolving = false; nextResolve() }
                }
            })
        } catch (_: Exception) { resolving = false }
    }

    /* ---------------- küldő háttérben (ha a Halo nincs előtérben) ---------------- */
    @Volatile private var target: Array<Any>? = null
    @Volatile var settingsJson = "{}"
    @Volatile private var bgRunning = false
    @Volatile var fromName = "Telefon"
    private var sentSet = ""; private var sentArt = ""; private var sentQ = ""

    fun setTarget(host: String, port: Int, key: String) { target = arrayOf(host, port, key) }
    fun clearTarget() { target = null; bgRunning = false }
    val hasTarget get() = target != null

    fun startBackground() {
        if (bgRunning || target == null) return
        bgRunning = true; sentSet = ""; sentArt = ""; sentQ = ""
        thread(name = "halo-link-tx", isDaemon = true) {
            while (bgRunning) { try { sendOnce() } catch (_: Exception) { }; Thread.sleep(800) }
        }
    }
    fun stopBackground() { bgRunning = false }

    private fun sendOnce() {
        val t = target ?: return
        val st = MediaHub.snapshot() ?: return
        val body = JSONObject().put("from", fromName).put("state", st)
        val ss = settingsJson; if (ss != sentSet) body.put("settings", JSONObject(ss))
        val art = MediaHub.lastArtData; val ak = MediaHub.lastArtDataKey
        if (art != null && ak != sentArt && ak.contains(st.optString("title"))) body.put("art", art)
        val q = MediaHub.lastQueueJson; if (q != null && q.hashCode().toString() != sentQ) body.put("queue", JSONArray(q))
        val con = java.net.URL("http://${t[0]}:${t[1]}/state").openConnection() as java.net.HttpURLConnection
        con.connectTimeout = 3000; con.readTimeout = 5000; con.requestMethod = "POST"; con.doOutput = true
        con.setRequestProperty("Content-Type", "application/json"); con.setRequestProperty("X-Halo-Key", t[2] as String)
        con.outputStream.use { it.write(body.toString().toByteArray()) }
        if (con.responseCode != 200) return
        if (body.has("settings")) sentSet = ss
        if (body.has("art")) sentArt = ak
        if (body.has("queue")) sentQ = q.hashCode().toString()
        val resp = JSONObject(con.inputStream.bufferedReader().readText())
        val cmds = resp.optJSONArray("cmds") ?: return
        for (i in 0 until cmds.length()) { val c = cmds.getJSONObject(i); main.post { MediaHub.control(c.optString("a"), c.optString("v")) } }
    }

    fun stopDiscover() {
        discListener?.let { try { nsd?.stopServiceDiscovery(it) } catch (_: Exception) { } }
        discListener = null
    }
}
