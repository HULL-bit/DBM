import { useState, useEffect } from 'react'
import { Box, Grid, Card, CardContent, Typography, Button } from '@mui/material'
import { AccountBalance, MenuBook, Event, Message } from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', noir: '#1A1A1A' }

const StatCard = ({ title, value, icon, color }) => (
  <Card
    sx={{
      borderTop: `4px solid ${color}`,
      borderRadius: 3,
      background: 'rgba(255, 255, 255, 0.88)',
      backdropFilter: 'blur(12px)',
      transition: 'all 0.35s ease',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 40px ${color}25` },
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" sx={{ color: COLORS.noir, fontWeight: 500 }}>{title}</Typography>
          <Typography variant="h5" sx={{ color, fontWeight: 700, fontFamily: '"Cormorant Garamond", serif' }}>{value}</Typography>
        </Box>
        <Box sx={{ color }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
)

export default function DashboardMembre() {
  const { user } = useAuth()
  const [cotisationStats, setCotisationStats] = useState(null)

  useEffect(() => {
    api
      .get('/finance/cotisations/statistiques/')
      .then(({ data }) => setCotisationStats(data))
      .catch(() => setCotisationStats(null))
  }, [])

  const totalAssignations = cotisationStats?.total_assignations ?? 0
  const totalPayees = cotisationStats?.total_payees ?? 0
  const pourcentagePayees = cotisationStats?.pourcentage_payees ?? 0
  const valeurCotisations =
    totalAssignations > 0
      ? `${totalPayees} / ${totalAssignations} (${Math.round(pourcentagePayees * 10) / 10} %)`
      : `${user?.cotisations_payees ?? 0}`

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontFamily: '"Dancing Script", "Cormorant Garamond", serif', fontWeight: 700, mb: 0.5 }}>
        Bienvenue, {user?.first_name} {user?.last_name}
      </Typography>
      <Typography variant="body1" sx={{ color: COLORS.noir, mb: 3 }}>
        Tableau de bord membre — Daara Barakatul Mahaahidi
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cotisations payées"
            value={valeurCotisations}
            icon={<AccountBalance />}
            color={COLORS.vert}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Chapitres lus (Kamil)" value={user?.chapitres_lus ?? 0} icon={<MenuBook />} color={COLORS.or} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Événements participés" value={user?.evenements_participes ?? 0} icon={<Event />} color={COLORS.vert} />
        </Grid>
      </Grid>
      <Card sx={{ mt: 3, borderRadius: 3, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderLeft: '3px solid #C9A961' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ color: COLORS.vert, fontFamily: '"Cormorant Garamond", serif' }} gutterBottom>Mes actions rapides</Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
            <Button variant="contained" size="small" sx={{ borderRadius: 2, background: `linear-gradient(135deg, ${COLORS.vert} 0%, #3A7750 100%)` }}>Payer ma cotisation</Button>
            <Button variant="outlined" size="small" sx={{ borderColor: COLORS.or, color: COLORS.noir, borderRadius: 2 }}>Lire un chapitre Kamil</Button>
            <Button variant="outlined" size="small" startIcon={<Event />} sx={{ borderColor: COLORS.or, color: COLORS.noir, borderRadius: 2 }}>Voir les événements</Button>
            <Button variant="outlined" size="small" startIcon={<Message />} sx={{ borderColor: COLORS.or, color: COLORS.noir, borderRadius: 2 }}>Messagerie</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
