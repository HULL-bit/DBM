// Remontée automatique des erreurs du site vers le serveur (journal « Incidents
// techniques » + email d'alerte à l'administrateur). N'utilise pas l'instance axios
// `api` pour ne jamais boucler sur ses propres intercepteurs.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://dbm-8ym4.onrender.com/api'

// Bruit de navigateur sans impact pour l'utilisateur : inutile d'alerter.
const IGNOREES = [/ResizeObserver loop/i, /^Script error\.?$/i, /Request aborted/i, /canceled/i]

const dejaSignalees = new Map() // message -> horodatage, pour ne pas renvoyer la même erreur en boucle
const INTERVALLE_MS = 5 * 60 * 1000

function jeton() {
  try {
    return (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('access')) || localStorage.getItem('access')
  } catch {
    return null
  }
}

export function signalerErreur({ message, stack = '', niveau = 'erreur', contexte = {} } = {}) {
  try {
    const texte = String(message || 'Erreur inconnue').slice(0, 500)
    if (IGNOREES.some((re) => re.test(texte))) return
    const maintenant = Date.now()
    if (maintenant - (dejaSignalees.get(texte) || 0) < INTERVALLE_MS) return
    dejaSignalees.set(texte, maintenant)

    const headers = { 'Content-Type': 'application/json' }
    const token = jeton()
    if (token) headers.Authorization = `Bearer ${token}`
    fetch(`${BASE_URL}/monitoring/erreur-client/`, {
      method: 'POST',
      headers,
      keepalive: true,
      body: JSON.stringify({
        source: 'web',
        niveau,
        message: texte,
        stack: String(stack || '').slice(0, 8000),
        page: window.location.hash || window.location.pathname,
        version: import.meta.env.VITE_APP_VERSION || '',
        contexte: { navigateur: navigator.userAgent, ...contexte },
      }),
    }).catch(() => {})
  } catch {
    // La surveillance ne doit jamais casser l'application.
  }
}

export function installerSurveillanceGlobale() {
  window.addEventListener('error', (e) => {
    signalerErreur({ message: e.message || e.error?.message, stack: e.error?.stack, contexte: { fichier: `${e.filename}:${e.lineno}:${e.colno}` } })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    // Les erreurs HTTP axios (4xx/5xx) sont déjà gérées par les écrans et, pour les 5xx,
    // signalées par le serveur lui-même : seules les vraies exceptions JS remontent.
    if (r?.isAxiosError) return
    signalerErreur({ message: r?.message || String(r), stack: r?.stack })
  })
}
