package hu.halo.player

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/** Angol hangvezérlés: beszédfelismerés (élő átirattal) és angol hangos visszajelzés. */
object Voice {
    var emit: ((String) -> Unit)? = null
    private var sr: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var lastRms = 0L

    private fun send(o: JSONObject) = emit?.invoke("window.Halo&&Halo.onVoice($o)")

    fun start(ctx: Context) {
        if (!SpeechRecognizer.isRecognitionAvailable(ctx)) { send(JSONObject().put("error", "unavailable")); return }
        stop()
        val r = SpeechRecognizer.createSpeechRecognizer(ctx)
        sr = r
        r.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(p: Bundle?) { send(JSONObject().put("state", "listening")) }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(db: Float) {
                val now = System.currentTimeMillis(); if (now - lastRms < 50) return; lastRms = now
                send(JSONObject().put("rms", ((db + 2f) / 12f).coerceIn(0f, 1f).toDouble()))
            }
            override fun onBufferReceived(b: ByteArray?) {}
            override fun onEndOfSpeech() { send(JSONObject().put("state", "thinking")) }
            override fun onError(code: Int) { send(JSONObject().put("error", code.toString())); stop() }
            override fun onResults(b: Bundle?) {
                val list = b?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) ?: arrayListOf()
                send(JSONObject().put("final", JSONArray(list))); stop()
            }
            override fun onPartialResults(b: Bundle?) {
                val t = b?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: return
                send(JSONObject().put("partial", t))
            }
            override fun onEvent(t: Int, p: Bundle?) {}
        })
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "en-US")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
        }
        r.startListening(i)
    }

    fun stop() {
        try { sr?.cancel(); sr?.destroy() } catch (_: Exception) { }
        sr = null
    }

    fun speak(ctx: Context, text: String) {
        val t = tts
        if (t == null) {
            tts = TextToSpeech(ctx.applicationContext) { st ->
                ttsReady = st == TextToSpeech.SUCCESS
                if (ttsReady) { tts?.language = Locale.US; tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "halo") }
            }
            return
        }
        if (ttsReady) t.speak(text, TextToSpeech.QUEUE_FLUSH, null, "halo")
    }

    fun shutdown() { stop(); tts?.shutdown(); tts = null; ttsReady = false }
}
