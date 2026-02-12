import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Grid, Card, CardContent, Typography, Button } from '@mui/material'
import { People, AccountBalance, Event, MenuBook, Add } from '@mui/icons-material'
import api from '../../services/api'

const COLORS = { vert: '#2D5F3F', vertClair: '#3d7a52', or: '#C9A961', noir: '#1A1A1A' }

const StatCard = ({ title, value, icon, color }) => (
  <Card
    sx={{
      borderTop: `4px solid ${color}`,
      borderRadius: 3,
      background: 'rgba(255, 255, 255, 0.88)',
      backdropFilter: 'blur(12px)',
      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 40px ${color}25`,
      },
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" sx={{ color: COLORS.noir, fontWeight: 500 }}>{title}</Typography>
          <Typography variant="h4" sx={{ color, fontWeight: 700, fontFamily: '"Cormorant Garamond", serif', mt: 0.5 }}>{value}</Typography>
        </Box>
        <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
)

export default function DashboardAdmin() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/auth/admin/statistiques/').then(({ data }) => setStats(data)).catch(() => setStats({ membres_actifs: 0, total_membres: 0, cotisations_payees_ce_mois: 0, evenements: 0 })).finally(() => setLoading(false))
  }, [])

  if (loading) return <Typography sx={{ color: COLORS.noir }}>Chargement...</Typography>

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
      <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="flex-start" gap={2} mb={3}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontFamily: '"Dancing Script", "Cormorant Garamond", serif', fontWeight: 700 }}>
            Tableau de bord Administrateur
          </Typography>
          <Typography variant="body1" sx={{ color: COLORS.noir, mt: 0.5 }}>
            Vue d'ensemble de la plateforme Daara Barakatul Mahaahidi
          </Typography>
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<Event />}
            onClick={() => navigate('/informations/evenements')}
            sx={{
              borderColor: COLORS.or,
              color: COLORS.noir,
              borderRadius: 2,
              '&:hover': { borderColor: COLORS.or, backgroundColor: 'rgba(201, 169, 97, 0.12)' },
            }}
          >
            Créer Événement
          </Button>
        </Box>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Membres actifs" value={stats?.membres_actifs ?? 0} icon={<People />} color={COLORS.vert} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total membres" value={stats?.total_membres ?? 0} icon={<People />} color={COLORS.vertClair} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cotisations ce mois"
            value={
              stats
                ? `${stats.cotisations_payees_ce_mois ?? 0} / ${stats.cotisations_total_ce_mois ?? 0} (${Math.round(
                    (stats.taux_paiement_cotisations_ce_mois ?? 0) * 10,
                  ) / 10} %)`
                : '0 / 0 (0 %)'
            }
            icon={<AccountBalance />}
            color={COLORS.or}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Événements" value={stats?.evenements ?? 0} icon={<Event />} color={COLORS.vert} />
        </Grid>
      </Grid>
      <Card
        sx={{
          mt: 3,
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          borderLeft: '3px solid #C9A961',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ color: COLORS.vert, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 }} gutterBottom>
            Actions rapides
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => navigate('/admin/membres')} sx={{ borderRadius: 2, background: `linear-gradient(135deg, ${COLORS.vert} 0%, #3A7750 100%)` }}>
              Gestion des membres
            </Button>
            <Button variant="outlined" size="small" startIcon={<AccountBalance />} onClick={() => navigate('/finance/cotisations')} sx={{ borderColor: COLORS.or, color: COLORS.noir, borderRadius: 2 }}>
              Cotisations
            </Button>
            <Button variant="outlined" size="small" startIcon={<Event />} onClick={() => navigate('/informations/evenements')} sx={{ borderColor: COLORS.or, color: COLORS.noir, borderRadius: 2 }}>
              Événements
            </Button>
            <Button variant="outlined" size="small" startIcon={<MenuBook />} onClick={() => navigate('/culturelle/kamil')} sx={{ borderColor: COLORS.or, color: COLORS.noir, borderRadius: 2 }}>
              Programme Kamil
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
