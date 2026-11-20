package hu.halo.player

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/**
 * Előtérszolgáltatás a kivetítés idejére: életben tartja a Halo-t a háttérben (Samsungon is),
 * hogy a projektor akkor is kapja a dalt, ha közben a Spotify vagy más app van előtérben.
 */
class HaloLinkService : Service() {
    override fun onBind(i: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            Link.clearTarget()
            stopSelf(); return START_NOT_STICKY
        }
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CH, "Kivetítés", NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_IMMUTABLE)
        val stop = PendingIntent.getService(this, 1, Intent(this, HaloLinkService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE)
        val name = intent?.getStringExtra("name") ?: "projektor"
        val n = Notification.Builder(this, CH)
            .setSmallIcon(R.drawable.ic_fg)
            .setContentTitle("Kivetítés aktív")
            .setContentText("A Halo a(z) $name kijelzőre küld")
            .setContentIntent(open)
            .addAction(Notification.Action.Builder(null, "Leállítás", stop).build())
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK) else startForeground(ID, n)
        return START_STICKY
    }

    override fun onDestroy() { Link.stopBackground(); super.onDestroy() }

    companion object {
        private const val CH = "halo_link"
        private const val ID = 7
        const val ACTION_STOP = "hu.halo.player.LINK_STOP"
        fun start(c: Context, name: String) {
            try { c.startForegroundService(Intent(c, HaloLinkService::class.java).putExtra("name", name)) } catch (_: Exception) { }
        }
        fun stop(c: Context) { c.stopService(Intent(c, HaloLinkService::class.java)) }
    }
}
