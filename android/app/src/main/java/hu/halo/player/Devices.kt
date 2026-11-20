package hu.halo.player

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothClass
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.mediarouter.media.MediaRouteSelector
import androidx.mediarouter.media.MediaRouter
import com.google.android.gms.cast.CastMediaControlIntent
import com.google.android.gms.cast.MediaInfo
import com.google.android.gms.cast.MediaLoadRequestData
import com.google.android.gms.cast.MediaMetadata
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.cast.framework.CastSession
import com.google.android.gms.cast.framework.SessionManagerListener
import com.google.android.gms.common.images.WebImage
import org.json.JSONArray
import org.json.JSONObject

/**
 * Eszközök: Bluetooth-hangszórók (keresés, párosítás, csatlakozás-jelzés), aktuális hangkimenet,
 * Chromecast / Google Cast eszközök (felderítés, munkamenet, média küldése), rendszer-kimenetváltó.
 */
@SuppressLint("MissingPermission")
object Devices {
    var emit: ((String) -> Unit)? = null
    private val main = Handler(Looper.getMainLooper())
    private lateinit var ctx: Context
    private var audio: AudioManager? = null
    private var bt: BluetoothAdapter? = null
    private var router: MediaRouter? = null
    private var cast: CastContext? = null
    private var discovering = false
    private val found = LinkedHashMap<String, BluetoothDevice>()
    private var lastOutput = ""

    private val selector by lazy {
        MediaRouteSelector.Builder()
            .addControlCategory(CastMediaControlIntent.categoryForCast(CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID))
            .build()
    }

    private val routerCb = object : MediaRouter.Callback() {
        override fun onRouteAdded(r: MediaRouter, route: MediaRouter.RouteInfo) = push()
        override fun onRouteRemoved(r: MediaRouter, route: MediaRouter.RouteInfo) = push()
        override fun onRouteChanged(r: MediaRouter, route: MediaRouter.RouteInfo) = push()
        override fun onRouteSelected(r: MediaRouter, route: MediaRouter.RouteInfo, reason: Int) = push()
    }

    private val sessionCb = object : SessionManagerListener<CastSession> {
        override fun onSessionStarted(s: CastSession, id: String) { event("connected", "cast", s.castDevice?.friendlyName ?: "Chromecast"); push() }
        override fun onSessionResumed(s: CastSession, was: Boolean) { push() }
        override fun onSessionEnded(s: CastSession, err: Int) { event("disconnected", "cast", s.castDevice?.friendlyName ?: "Chromecast"); push() }
        override fun onSessionStartFailed(s: CastSession, err: Int) { event("failed", "cast", s.castDevice?.friendlyName ?: "Chromecast"); push() }
        override fun onSessionStarting(s: CastSession) {}
        override fun onSessionEnding(s: CastSession) {}
        override fun onSessionResuming(s: CastSession, id: String) {}
        override fun onSessionResumeFailed(s: CastSession, err: Int) {}
        override fun onSessionSuspended(s: CastSession, reason: Int) {}
    }

    private val audioCb = object : AudioDeviceCallback() {
        override fun onAudioDevicesAdded(added: Array<out AudioDeviceInfo>) {
            added.filter { isSpeakerLike(it) }.forEach { event("connected", kindOf(it), it.productName?.toString() ?: "Hangszóró") }
            push()
        }
        override fun onAudioDevicesRemoved(removed: Array<out AudioDeviceInfo>) {
            removed.filter { isSpeakerLike(it) }.forEach { event("disconnected", kindOf(it), it.productName?.toString() ?: "Hangszóró") }
            push()
        }
    }

    private val btReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
            when (i.action) {
                BluetoothDevice.ACTION_FOUND -> {
                    val d = devExtra(i) ?: return
                    if (d.bondState != BluetoothDevice.BOND_BONDED && (isAudio(d) || d.bluetoothClass == null) && !d.name.isNullOrBlank()) { found[d.address] = d; push() }
                }
                BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> { discovering = false; push() }
                BluetoothDevice.ACTION_BOND_STATE_CHANGED -> {
                    val d = devExtra(i) ?: return
                    if (d.bondState == BluetoothDevice.BOND_BONDED) { found.remove(d.address); event("paired", "bluetooth", d.name ?: "Eszköz") }
                    push()
                }
                BluetoothDevice.ACTION_ACL_CONNECTED, BluetoothDevice.ACTION_ACL_DISCONNECTED -> main.postDelayed({ push() }, 600)
            }
        }
    }

    @Suppress("DEPRECATION")
    private fun devExtra(i: Intent): BluetoothDevice? =
        if (Build.VERSION.SDK_INT >= 33) i.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
        else i.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)

    fun init(c: Context) {
        if (::ctx.isInitialized) return
        ctx = c.applicationContext
        audio = ctx.getSystemService(AudioManager::class.java)
        audio?.registerAudioDeviceCallback(audioCb, main)
        bt = ctx.getSystemService(BluetoothManager::class.java)?.adapter
        val f = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_FOUND); addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
            addAction(BluetoothDevice.ACTION_BOND_STATE_CHANGED); addAction(BluetoothDevice.ACTION_ACL_CONNECTED); addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED)
        }
        if (Build.VERSION.SDK_INT >= 33) ctx.registerReceiver(btReceiver, f, Context.RECEIVER_EXPORTED) else ctx.registerReceiver(btReceiver, f)
        try {
            router = MediaRouter.getInstance(ctx)
            cast = CastContext.getSharedInstance(ctx)
            cast?.sessionManager?.addSessionManagerListener(sessionCb, CastSession::class.java)
        } catch (e: Exception) { cast = null }
        lastOutput = outputName()
    }

    /** A panel megnyitásakor: Cast-felderítés + Bluetooth-keresés (12 mp). */
    fun startScan(withBt: Boolean) {
        router?.addCallback(selector, routerCb, MediaRouter.CALLBACK_FLAG_PERFORM_ACTIVE_SCAN)
        if (withBt) try {
            if (bt?.isEnabled == true) { bt?.cancelDiscovery(); found.clear(); discovering = bt?.startDiscovery() == true; main.postDelayed({ bt?.cancelDiscovery() }, 12000) }
        } catch (_: SecurityException) { discovering = false }
        push()
    }

    fun stopScan() {
        router?.removeCallback(routerCb)
        try { bt?.cancelDiscovery() } catch (_: SecurityException) { }
        discovering = false
    }

    fun pair(address: String) = try { bt?.getRemoteDevice(address)?.createBond(); true } catch (_: Exception) { false }

    fun castSelect(id: String) {
        val r = router ?: return
        r.routes.firstOrNull { it.id == id }?.select()
    }

    fun castStop() { cast?.sessionManager?.endCurrentSession(true) }

    fun castLoad(url: String, title: String, artist: String, art: String): Boolean {
        val s = cast?.sessionManager?.currentCastSession ?: return false
        val client = s.remoteMediaClient ?: return false
        val md = MediaMetadata(MediaMetadata.MEDIA_TYPE_MUSIC_TRACK).apply {
            putString(MediaMetadata.KEY_TITLE, title); putString(MediaMetadata.KEY_ARTIST, artist)
            if (art.startsWith("http")) addImage(WebImage(Uri.parse(art)))
        }
        val type = when { url.contains(".m4a") || url.contains(".aac") -> "audio/mp4"; url.contains(".mp3") -> "audio/mpeg"; else -> "audio/mp4" }
        val info = MediaInfo.Builder(url).setStreamType(MediaInfo.STREAM_TYPE_BUFFERED).setContentType(type).setMetadata(md).build()
        client.load(MediaLoadRequestData.Builder().setMediaInfo(info).setAutoplay(true).build())
        return true
    }

    fun castControl(a: String, v: Long) {
        val c = cast?.sessionManager?.currentCastSession?.remoteMediaClient ?: return
        when (a) { "play" -> c.play(); "pause" -> c.pause(); "seek" -> c.seek(com.google.android.gms.cast.MediaSeekOptions.Builder().setPosition(v).build()) }
    }

    val casting: Boolean get() = cast?.sessionManager?.currentCastSession?.isConnected == true

    /** Rendszer kimenetváltó (Android 11+), Samsungon is. */
    fun openOutputSwitcher(activity: android.app.Activity, pkg: String) {
        val target = pkg.ifBlank { activity.packageName }
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                activity.sendBroadcast(Intent("com.android.systemui.action.LAUNCH_MEDIA_OUTPUT_DIALOG").setPackage("com.android.systemui").putExtra("package_name", target))
                return
            }
            activity.startActivity(Intent("com.android.settings.panel.action.MEDIA_OUTPUT").putExtra("com.android.settings.panel.extra.PACKAGE_NAME", target))
        } catch (_: Exception) { openBtSettings(activity) }
    }

    fun openBtSettings(activity: android.app.Activity) { try { activity.startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS)) } catch (_: Exception) { } }

    /** Képernyő kivetítése TV-re (Smart View / Cast képernyő). */
    fun openMirroring(activity: android.app.Activity) {
        val tries = listOf(
            Intent().setClassName("com.samsung.android.smartmirroring", "com.samsung.android.smartmirroring.CastingDialog"),
            Intent("android.settings.CAST_SETTINGS"),
            Intent(Settings.ACTION_WIRELESS_SETTINGS),
        )
        for (i in tries) try { activity.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); return } catch (_: Exception) { }
    }

    private fun isAudio(d: BluetoothDevice): Boolean = d.bluetoothClass?.majorDeviceClass == BluetoothClass.Device.Major.AUDIO_VIDEO

    private fun isSpeakerLike(d: AudioDeviceInfo) = d.isSink && d.type in setOf(
        AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLE_SPEAKER, AudioDeviceInfo.TYPE_BLE_HEADSET,
        AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_USB_DEVICE, AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_HDMI)

    private fun kindOf(d: AudioDeviceInfo) = when (d.type) {
        AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLE_SPEAKER, AudioDeviceInfo.TYPE_BLE_HEADSET -> "bluetooth"
        AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET -> "wired"
        AudioDeviceInfo.TYPE_HDMI -> "hdmi"
        else -> "usb"
    }

    /** Hova szól most a zene. */
    private fun outputName(): String {
        cast?.sessionManager?.currentCastSession?.takeIf { it.isConnected }?.castDevice?.friendlyName?.let { return "cast|$it" }
        val outs = audio?.getDevices(AudioManager.GET_DEVICES_OUTPUTS) ?: return "speaker|Telefon hangszóró"
        val pref = listOf(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLE_SPEAKER, AudioDeviceInfo.TYPE_BLE_HEADSET,
            AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_HDMI)
        for (t in pref) outs.firstOrNull { it.type == t }?.let { return kindOf(it) + "|" + (it.productName?.toString() ?: "Eszköz") }
        return "speaker|" + if (ctx.resources.configuration.smallestScreenWidthDp >= 600) "Tablet hangszóró" else "Telefon hangszóró"
    }

    fun state(): JSONObject {
        val o = JSONObject()
        val out = outputName().split("|", limit = 2)
        o.put("output", JSONObject().put("kind", out[0]).put("name", out.getOrElse(1) { "" }))
        o.put("btOn", bt?.isEnabled == true).put("scanning", discovering).put("castOk", cast != null).put("casting", casting)
        val paired = JSONArray()
        try {
            val connected = audio?.getDevices(AudioManager.GET_DEVICES_OUTPUTS)?.mapNotNull { it.address.takeIf { a -> a.isNotBlank() } }?.toSet() ?: emptySet()
            bt?.bondedDevices?.filter { isAudio(it) }?.forEach { d ->
                paired.put(JSONObject().put("name", d.name ?: d.address).put("address", d.address).put("connected", d.address in connected).put("type", minorOf(d)))
            }
        } catch (_: SecurityException) { o.put("needPerm", true) }
        o.put("paired", paired)
        val near = JSONArray()
        try { found.values.forEach { d -> near.put(JSONObject().put("name", d.name ?: d.address).put("address", d.address).put("type", minorOf(d))) } } catch (_: SecurityException) { }
        o.put("nearby", near)
        val casts = JSONArray()
        router?.routes?.filter { !it.isDefault && !it.isBluetooth && it.matchesSelector(selector) }?.forEach { r ->
            casts.put(JSONObject().put("id", r.id).put("name", r.name).put("desc", r.description ?: "").put("selected", r.isSelected).put("type", if (r.deviceType == MediaRouter.RouteInfo.DEVICE_TYPE_TV) "tv" else "speaker"))
        }
        o.put("casts", casts)
        return o
    }

    private fun minorOf(d: BluetoothDevice): String = when (d.bluetoothClass?.deviceClass) {
        BluetoothClass.Device.AUDIO_VIDEO_HEADPHONES, BluetoothClass.Device.AUDIO_VIDEO_WEARABLE_HEADSET -> "headphones"
        BluetoothClass.Device.AUDIO_VIDEO_CAR_AUDIO -> "car"
        BluetoothClass.Device.AUDIO_VIDEO_VIDEO_DISPLAY_AND_LOUDSPEAKER, BluetoothClass.Device.AUDIO_VIDEO_VIDEO_MONITOR -> "tv"
        else -> "speaker"
    }

    fun push() {
        if (!::ctx.isInitialized) return
        val s = state()
        emit?.invoke("window.Halo&&Halo.onDevices($s)")
        val now = outputName()
        if (now != lastOutput) { lastOutput = now; emit?.invoke("window.Halo&&Halo.onOutput(${JSONObject.quote(now)})") }
    }

    private fun event(type: String, kind: String, name: String) {
        val o = JSONObject().put("type", type).put("kind", kind).put("name", name)
        main.post { emit?.invoke("window.Halo&&Halo.onDeviceEvent($o)") }
    }
}
