import { useEffect, useState } from 'react'
import api from '../services/api'

/**
 * Récupère la photo d'un membre en blob local via l'API (/auth/users/:id/photo/) plutôt que
 * de l'afficher directement depuis /media/. Un blob local n'est jamais soumis aux règles
 * cross-origin du canvas : la photo reste exportable (html2canvas → carte de membre, badge
 * de mission) quel que soit l'hébergement du média (S3, disque local, CORS non configuré...).
 * Retourne `null` tant qu'elle n'est pas chargée, ou s'il n'y a pas de photo / erreur.
 */
export default function usePhotoMembre(membreId, aUnePhoto) {
  const [blobUrl, setBlobUrl] = useState(null)

  useEffect(() => {
    if (!membreId || !aUnePhoto) {
      setBlobUrl(null)
      return
    }
    let url = null
    let annule = false
    api.get(`/auth/users/${membreId}/photo/`, { responseType: 'blob' })
      .then(({ data }) => {
        if (annule) return
        url = URL.createObjectURL(data)
        setBlobUrl(url)
      })
      .catch(() => { if (!annule) setBlobUrl(null) })
    return () => {
      annule = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [membreId, aUnePhoto])

  return blobUrl
}
