import api from './api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function envoyerAbonnement(subscription) {
  const json = subscription.toJSON()
  await api.post('/communication/push/abonnement/', {
    endpoint: json.endpoint,
    keys: json.keys,
  })
}

/**
 * Active les notifications push navigateur pour l'utilisateur connecté : elles arrivent
 * directement sur l'appareil (machine ou téléphone), même application/onglet fermé.
 * Échoue toujours silencieusement (navigateur non compatible, permission refusée, etc.) —
 * ce n'est jamais bloquant pour le reste de l'application.
 */
export async function initPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const registration = await navigator.serviceWorker.register('/sw.js')

    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    if (permission !== 'granted') return

    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      await envoyerAbonnement(existing)
      return
    }

    const { data } = await api.get('/communication/push/cle-publique/')
    if (!data.cle_publique) return

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.cle_publique),
    })
    await envoyerAbonnement(subscription)
  } catch (err) {
    console.warn('Notifications push non disponibles :', err)
  }
}
