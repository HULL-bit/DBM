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

    const { data } = await api.get('/communication/push/cle-publique/')
    if (!data.cle_publique) return
    const cleActuelle = urlBase64ToUint8Array(data.cle_publique)

    let subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      const cleAbonnement = new Uint8Array(subscription.options?.applicationServerKey || [])
      const memeCle = cleAbonnement.length === cleActuelle.length
        && cleAbonnement.every((octet, i) => octet === cleActuelle[i])
      if (!memeCle) {
        // La clé VAPID a été changée côté serveur (rotation de clé) : cet abonnement, créé
        // avec l'ancienne clé, est rejeté silencieusement par le service de push du navigateur
        // (401/403) — il faut se désabonner puis se réabonner avec la nouvelle clé.
        await subscription.unsubscribe()
        subscription = null
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: cleActuelle,
      })
    }
    await envoyerAbonnement(subscription)
  } catch (err) {
    console.warn('Notifications push non disponibles :', err)
  }
}
