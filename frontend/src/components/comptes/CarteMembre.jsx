import { useRef, useState } from 'react'
import { Box, Typography, Button, CircularProgress } from '@mui/material'
import { Download } from '@mui/icons-material'
import logo from '/logo.png'
import { getMediaUrl } from '../../services/media'

const C = { vert: '#2D5F3F', vertFonce: '#1e4029', or: '#C9A961', noir: '#1A1A1A' }

function initials(nom) {
  if (!nom) return '?'
  const parts = nom.trim().split(' ')
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : (parts[0]?.[0] || '?').toUpperCase()
}

/**
 * Carte de membre au format badge (utilisable pour Mon Profil comme pour la fiche
 * admin d'un membre) — visuelle, imprimable/téléchargeable en image.
 */
export default function CarteMembre({ membre }) {
  const cardRef = useRef(null)
  const [exporting, setExporting] = useState(false)

  const nomComplet = `${membre.first_name || ''} ${membre.last_name || ''}`.trim() || membre.username
  const identifiant = membre.numero_carte || `#${String(membre.id).padStart(5, '0')}`
  const dateInscription = membre.date_inscription
    ? new Date(membre.date_inscription).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : ''

  const handleTelecharger = async () => {
    if (!cardRef.current) return
    setExporting(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#ffffff', scale: 3, useCORS: true, logging: false })
      const link = document.createElement('a')
      link.download = `carte_membre_${(membre.username || membre.id)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setExporting(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Box
        ref={cardRef}
        sx={{
          width: 360,
          maxWidth: '100%',
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${C.or}66`,
          boxShadow: '0 8px 28px rgba(45,95,63,0.18)',
          fontFamily: '"Poppins", sans-serif',
          bgcolor: '#fff',
        }}
      >
        <Box sx={{
          background: `linear-gradient(135deg, ${C.vert} 0%, ${C.vertFonce} 100%)`,
          color: '#fff', px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1,
        }}>
          <Box component="img" src={logo} alt="Logo" sx={{ height: 32, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.1 }} noWrap>
              Daara Barakatul Mahaahidi
            </Typography>
            <Typography sx={{ fontSize: '0.65rem', color: C.or, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Carte de membre
            </Typography>
          </Box>
        </Box>

        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          {membre.photo ? (
            <Box
              component="img"
              src={getMediaUrl(membre.photo, membre.photo_updated_at ? `v=${membre.photo_updated_at}` : '')}
              sx={{ width: 84, height: 84, borderRadius: 2, flexShrink: 0, objectFit: 'cover', border: `2px solid ${C.or}` }}
            />
          ) : (
            <Box
              sx={{
                width: 84, height: 84, borderRadius: 2, flexShrink: 0,
                border: `2px solid ${C.or}`, bgcolor: C.vert, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', fontWeight: 700,
              }}
            >
              {initials(nomComplet)}
            </Box>
          )}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 700, color: C.vertFonce, fontSize: '1.05rem', lineHeight: 1.2 }} noWrap>
              {nomComplet}
            </Typography>
            <Typography sx={{ color: C.vert, fontWeight: 600, fontSize: '0.8rem', mt: 0.25 }}>
              {membre.role_display || membre.role}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', mt: 0.5 }}>
              N° {identifiant}
            </Typography>
            {dateInscription && (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                Membre depuis {dateInscription}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ height: 5, background: `linear-gradient(90deg, ${C.or}, ${C.vert})` }} />
      </Box>

      <Button
        size="small"
        variant="outlined"
        startIcon={exporting ? <CircularProgress size={16} /> : <Download />}
        onClick={handleTelecharger}
        disabled={exporting}
        sx={{ borderColor: C.vert, color: C.vert }}
      >
        Télécharger la carte
      </Button>
    </Box>
  )
}
