import { useNavigate } from 'react-router-dom'
import { Box, Grid, Card, CardContent, Typography, Button } from '@mui/material'
import { CheckCircle, MenuBook, Mosque, Add } from '@mui/icons-material'

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

export default function DashboardJewrin() {
  const navigate = useNavigate()
  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontFamily: '"Dancing Script", "Cormorant Garamond", serif', fontWeight: 700, mb: 0.5 }}>
        Tableau de bord Jewrin
      </Typography>
      <Typography variant="body1" sx={{ color: COLORS.noir, mb: 3 }}>
        Gestion culturelle et religieuse — Validations Kamil, activités, enseignements
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Validations en attente" value="—" icon={<CheckCircle />} color={COLORS.vert} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Programme Kamil" value="Actif" icon={<MenuBook />} color={COLORS.or} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Activités religieuses" value="—" icon={<Mosque />} color={COLORS.vert} />
        </Grid>
      </Grid>
      <Card sx={{ mt: 3, borderRadius: 3, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderLeft: '3px solid #C9A961' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ color: COLORS.vert, fontFamily: '"Cormorant Garamond", serif' }} gutterBottom>Actions prioritaires</Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
            <Button variant="contained" size="small" startIcon={<CheckCircle />} onClick={() => navigate('/culturelle/validations')} sx={{ borderRadius: 2, background: `linear-gradient(135deg, ${COLORS.vert} 0%, #3A7750 100%)` }}>Valider les progressions</Button>
            <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => navigate('/culturelle/activites-religieuses')} sx={{ borderColor: COLORS.or, color: COLORS.noir, borderRadius: 2 }}>Créer une activité religieuse</Button>
            <Button variant="outlined" size="small" startIcon={<MenuBook />} onClick={() => navigate('/culturelle/kamil')} sx={{ borderColor: COLORS.or, color: COLORS.noir, borderRadius: 2 }}>Programme Kamil</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
