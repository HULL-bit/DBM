import { useRef, useState } from 'react'
import { Box, Typography, Button, CircularProgress } from '@mui/material'
import { Download } from '@mui/icons-material'
import logo from '/logo.png'
import { capturerAvecPhotos } from '../../utils/exportCarte'
import usePhotoMembre from '../../hooks/usePhotoMembre'

const C = { vert: '#2D5F3F', vertFonce: '#1e4029', or: '#C9A961', noir: '#1A1A1A' }

function initials(nom) {
  if (!nom) return '?'
  const parts = nom.trim().split(' ')
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : (parts[0]?.[0] || '?').toUpperCase()
}

/**
 * Badge d'événement/mission — distinct de la carte de membre : attribué pour une mission
 * précise à un événement donné (ex. Sécurité — Magal 2026), avec date et rôle. Réutilise
 * toujours la photo de profil actuelle du membre.
 */
export default function BadgeMissionCard({ membre, badge }) {
  const cardRef = useRef(null)
  const [exporting, setExporting] = useState(false)
  const photoBlobUrl = usePhotoMembre(membre.id, !!membre.photo)

  const nomComplet = `${membre.first_name || membre.membre_nom || ''} ${membre.last_name || ''}`.trim() || membre.membre_nom || membre.username
  const dateEvenement = badge.date_evenement
    ? new Date(badge.date_evenement).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  const handleTelecharger = async () => {
    if (!cardRef.current) return
    setExporting(true)
    try {
      const canvas = await capturerAvecPhotos(cardRef.current)
      const link = document.createElement('a')
      link.download = `badge_${(badge.mission || 'mission').replace(/\s+/g, '_')}_${membre.username || membre.id}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setExporting(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
      <Box
        ref={cardRef}
        sx={{
          width: 260,
          maxWidth: '100%',
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${C.or}66`,
          boxShadow: '0 8px 28px rgba(45,95,63,0.18)',
          fontFamily: '"Poppins", sans-serif',
          bgcolor: '#FBF6EC',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <Box
          component="img"
          src={logo}
          alt=""
          sx={{
            position: 'absolute', right: -30, bottom: -20, width: 150, height: 150,
            opacity: 0.07, transform: 'rotate(-8deg)', pointerEvents: 'none',
          }}
        />
        <Box sx={{
          background: `linear-gradient(135deg, ${C.or} 0%, #b89447 100%)`,
          color: '#fff', px: 2, py: 1, textTransform: 'uppercase', letterSpacing: '0.05em',
          position: 'relative',
        }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700 }}>Badge de mission</Typography>
        </Box>

        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, position: 'relative' }}>
          {photoBlobUrl ? (
            <Box
              component="img"
              src={photoBlobUrl}
              sx={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${C.vert}`, mb: 1 }}
            />
          ) : (
            <Box sx={{
              width: 90, height: 90, borderRadius: '50%', border: `3px solid ${C.vert}`, mb: 1,
              bgcolor: C.vert, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 700,
            }}>
              {initials(nomComplet)}
            </Box>
          )}
          <Typography sx={{ fontWeight: 700, color: C.vertFonce, fontSize: '1.05rem', lineHeight: 1.2 }}>
            {nomComplet}
          </Typography>

          <Box sx={{ mt: 1, width: '100%', bgcolor: '#fff', border: `1px solid ${C.or}30`, borderRadius: 2, p: 1.25 }}>
            <Typography sx={{ color: C.vert, fontWeight: 700, fontSize: '0.95rem' }}>
              {badge.mission}
            </Typography>
            <Typography sx={{ color: C.noir, fontSize: '0.78rem', mt: 0.25 }}>
              {badge.evenement}
            </Typography>
            {dateEvenement && (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem', mt: 0.25 }}>
                {dateEvenement}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.5 }}>
            <Box component="img" src={logo} alt="Logo" sx={{ height: 22 }} />
            <Typography sx={{ fontSize: '0.65rem', color: C.vertFonce, fontWeight: 600 }}>
              Daara Barakatul Mahaahidi
            </Typography>
          </Box>
        </Box>

        <Box sx={{ height: 5, background: `linear-gradient(90deg, ${C.vert}, ${C.or})` }} />
      </Box>

      <Button
        size="small"
        variant="outlined"
        startIcon={exporting ? <CircularProgress size={16} /> : <Download />}
        onClick={handleTelecharger}
        disabled={exporting}
        sx={{ borderColor: C.vert, color: C.vert }}
      >
        Télécharger le badge
      </Button>
    </Box>
  )
}
