package hu.halo.player

import java.net.InetAddress
import java.net.ServerSocket
import java.net.SocketTimeoutException
import kotlin.concurrent.thread

/**
 * Apró helyi fogadó a Spotify bejelentkezés visszatéréséhez: http://127.0.0.1:43821/callback
 * Csak a bejelentkezés idejére fut (legfeljebb 10 percig), és csak a készüléken belülről érhető el.
 */
object AuthServer {
    const val PORT = 43821
    const val REDIRECT = "http://127.0.0.1:$PORT/callback"
    @Volatile private var sock: ServerSocket? = null

    fun start(onCallback: (String) -> Unit) {
        stop()
        val s = try {
            ServerSocket(PORT, 4, InetAddress.getByName("127.0.0.1")).apply { soTimeout = 1000; reuseAddress = true }
        } catch (e: Exception) { return }
        sock = s
        thread(name = "halo-auth", isDaemon = true) {
            val until = System.currentTimeMillis() + 10 * 60_000
            try {
                while (sock === s && System.currentTimeMillis() < until) {
                    val c = try { s.accept() } catch (_: SocketTimeoutException) { continue }
                    c.use { conn ->
                        conn.soTimeout = 5000
                        val line = conn.getInputStream().bufferedReader().readLine() ?: ""
                        val path = line.split(" ").getOrNull(1) ?: ""
                        val ok = path.startsWith("/callback")
                        val html = if (ok) PAGE else "<html><body></body></html>"
                        val body = html.toByteArray(Charsets.UTF_8)
                        val head = "HTTP/1.1 ${if (ok) "200 OK" else "404 Not Found"}\r\nContent-Type: text/html; charset=utf-8\r\n" +
                            "Content-Length: ${body.size}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n"
                        conn.getOutputStream().apply { write(head.toByteArray()); write(body); flush() }
                        if (ok) { onCallback("http://127.0.0.1:$PORT$path"); stop() }
                    }
                }
            } catch (_: Exception) { } finally { if (sock === s) stop() }
        }
    }

    fun stop() {
        try { sock?.close() } catch (_: Exception) { }
        sock = null
    }

    private const val PAGE = """<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Halo</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0910;color:#f7f4f8;font-family:system-ui,sans-serif;text-align:center}
.c{padding:2rem}h1{font-size:1.6rem;margin:.5rem 0}p{color:#aaa}a{display:inline-block;margin-top:1.2rem;padding:1rem 1.6rem;border-radius:99px;background:#ff4fa3;color:#111;font-weight:800;text-decoration:none;font-size:1.1rem}</style></head>
<body><div class="c"><div style="font-size:3rem">✓</div><h1>Spotify összekapcsolva</h1><p>Visszatérhetsz a Halo-ba.</p>
<a href="intent://callback?done=1#Intent;scheme=haloplayer;package=hu.halo.player;end">Vissza a Halo-ba</a></div>
<script>setTimeout(function(){location.href='intent://callback?done=1#Intent;scheme=haloplayer;package=hu.halo.player;end'},600)</script></body></html>"""
}
