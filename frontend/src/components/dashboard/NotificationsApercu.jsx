import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Card, CardContent, Typography, Button, Chip, List, ListItemButton, ListItemText } from '@mui/material'
import { ArrowForward } from '@mui/icons-material'
import api from '../../services/api'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

/** Aperçu des notifications récentes, réutilisé sur les 3 tableaux de bord (admin, membre,
 * jewrin) — évite de naviguer vers la page Notifications juste pour voir ce qui est arrivé. */
export default function NotificationsApercu() {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/communication/notifications/', { params: { page_size: 5 } })
      .then(({ data }) => setList((data.results || data || []).slice(0, 5)))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [])

  const handleClick = async (n) => {
    if (!n.est_lue) {
      setList((prev) => prev.map((x) => (x.id === n.id ? { ...x, est_lue: true } : x)))
      try { await api.post(`/communication/notifications/${n.id}/marquer_lue/`) } catch { /* pas bloquant */ }
    }
    if (n.lien) {
      if (/^https?:\/\//i.test(n.lien)) window.open(n.lien, '_blank', 'noopener,noreferrer')
      else navigate(n.lien)
    } else {
      navigate('/communication/notifications')
    }
  }

  const nbNonLues = list.filter((n) => !n.est_lue).length

  return (
    <Card sx={{ borderRadius: 3, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${C.vert}30` }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box sx={{ width: 4, height: 22, bgcolor: C.vert, borderRadius: 2 }} />
            <Typography variant="h6" sx={{ color: C.vertFonce, fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}>
              Notifications
            </Typography>
            {nbNonLues > 0 && <Chip label={nbNonLues} size="small" color="error" sx={{ height: 20, fontWeight: 700 }} />}
          </Box>
          <Button size="small" endIcon={<ArrowForward sx={{ fontSize: 14 }} />} onClick={() => navigate('/communication/notifications')} sx={{ color: C.vert }}>
            Voir tout
          </Button>
        </Box>
        {loading ? (
          <Typography variant="body2" color="text.secondary">Chargement...</Typography>
        ) : list.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Aucune notification pour l'instant.</Typography>
        ) : (
          <List dense disablePadding>
            {list.map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => handleClick(n)}
                sx={{
                  borderRadius: 1.5, mb: 0.5, alignItems: 'flex-start',
                  bgcolor: n.est_lue ? 'transparent' : `${C.vert}0A`,
                  '&:hover': { bgcolor: `${C.or}18` },
                }}
              >
                <ListItemText
                  primary={n.titre}
                  secondary={n.message}
                  primaryTypographyProps={{ fontWeight: n.est_lue ? 500 : 700, fontSize: '0.85rem', color: C.vertFonce }}
                  secondaryTypographyProps={{ fontSize: '0.78rem', color: 'text.secondary', noWrap: true }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  )
}
