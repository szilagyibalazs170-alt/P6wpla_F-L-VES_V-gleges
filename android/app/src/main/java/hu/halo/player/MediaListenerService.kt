package hu.halo.player

import android.service.notification.NotificationListenerService

/**
 * Üres értesítés-figyelő: csak azért kell, hogy a rendszer engedélyezze a Halo-nak
 * a médiamenetek (Spotify, SoundCloud, YouTube…) olvasását és vezérlését.
 */
class MediaListenerService : NotificationListenerService() {
    override fun onListenerConnected() {
        super.onListenerConnected()
        MediaHub.refreshSessions()
    }
}
