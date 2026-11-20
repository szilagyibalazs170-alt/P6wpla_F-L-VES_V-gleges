package hu.halo.player

import android.media.audiofx.Visualizer
import kotlin.math.hypot
import kotlin.math.max

/**
 * Valódi ütemkövetés: a teljes hangkimenet (session 0) spektrumából a basszus erősségét számolja.
 * Semmit nem rögzít és nem ment, csak egy 0..1 közötti szintet ad tovább a fényperemnek.
 */
object Beat {
    private var viz: Visualizer? = null
    private var peak = 0.05f
    private var last = 0L
    var onLevel: ((Float) -> Unit)? = null

    fun start(): Boolean {
        if (viz != null) return true
        return try {
            val v = Visualizer(0)
            v.captureSize = Visualizer.getCaptureSizeRange()[0].coerceAtLeast(128)
            v.setDataCaptureListener(object : Visualizer.OnDataCaptureListener {
                override fun onWaveFormDataCapture(v: Visualizer?, w: ByteArray?, r: Int) {}
                override fun onFftDataCapture(v: Visualizer?, fft: ByteArray?, rate: Int) {
                    if (fft == null || fft.size < 20) return
                    var e = 0f
                    for (k in 1..8) e += hypot(fft[2 * k].toFloat(), fft[2 * k + 1].toFloat())
                    peak = max(peak * 0.995f, e)
                    val lvl = (e / peak).coerceIn(0f, 1f)
                    val now = System.currentTimeMillis()
                    if (now - last >= 33) { last = now; onLevel?.invoke(lvl) }
                }
            }, Visualizer.getMaxCaptureRate(), false, true)
            v.enabled = true
            viz = v
            true
        } catch (e: Exception) { stop(); false }
    }

    fun stop() {
        try { viz?.enabled = false; viz?.release() } catch (_: Exception) { }
        viz = null
    }
}
