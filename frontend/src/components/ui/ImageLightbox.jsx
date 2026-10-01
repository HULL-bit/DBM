import { useEffect } from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import { Close, Download } from '@mui/icons-material'

/**
 * Visionneuse plein écran pour une image (pièce jointe de message, etc.) : clic en dehors,
 * bouton X ou touche Échap pour fermer ; bouton pour ouvrir l'original dans un nouvel onglet
 * (un vrai téléchargement forcé n'est pas fiable sur un fichier hébergé sur un autre domaine).
 */
export default function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    if (!src) return undefined
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [src, onClose])

  if (!src) return null

  return (
    <Box
      onClick={onClose}
      sx={{
        position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.92)', zIndex: 1400,
        display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
      }}
    >
      <Tooltip title="Fermer (Échap)">
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', top: 16, right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
        >
          <Close />
        </IconButton>
      </Tooltip>
      <Tooltip title="Ouvrir l'original">
        <IconButton
          component="a"
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          sx={{ position: 'absolute', top: 16, right: 72, color: 'white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
        >
          <Download />
        </IconButton>
      </Tooltip>
      <Box
        component="img"
        src={src}
        alt={alt || 'Image'}
        onClick={(e) => e.stopPropagation()}
        sx={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 1.5 }}
      />
    </Box>
  )
}
