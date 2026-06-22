import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip, Badge,
  LinearProgress, Avatar,
} from '@mui/material'
import {
  People, AccountBalance, Event, MenuBook, Add, AttachMoney,
  Message, School, TrendingUp, Forum, ArrowForward,
  Warning, Groups, AdminPanelSettings,
} from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029', vertClair: '#3d7a52' }

function KpiCard({ label, value, icon: Icon, color, sub, progress }) {
  return (
    <Card sx={{
      borderRadius: 3, height: '100%', background: '#fff',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${color}22`,
      transition: 'all 0.25s ease',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 28px ${color}30` },
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon sx={{ color, fontSize: 22 }} />
          </Box>
          {sub && (
            <Chip label={sub} size="small" sx={{ bgcolor: `${color}15`, color, fontWeight: 600, fontSize: '0.7rem', border: 'none' }} />
          )}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontFamily: '"Cormorant Garamond", serif', lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mt: 0.5, fontWeight: 500 }}>{label}</Typography>
        {progress != null && (
          <Box mt={1.5}>
            <LinearProgress
              variant="determinate"
              value={Math.min(progress, 100)}
              sx={{
                height: 5, borderRadius: 3, bgcolor: `${color}20`,
                '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

function ActionBtn({ label, icon: Icon, onClick, primary, badge }) {
  return (
    <Button
      variant={primary ? 'contained' : 'outlined'}
      fullWidth
      startIcon={<Icon />}
      onClick={onClick}
      endIcon={badge > 0 ? <Chip label={badge} size="small" color="error" sx={{ height: 18, minWidth: 0, ml: 0 }} /> : <ArrowForward sx={{ fontSize: 15, opacity: 0.4 }} />}
      sx={{
        justifyContent: 'flex-start', borderRadius: 2, py: 1.2, px: 2, fontWeight: 600,
        ...(primary
          ? { background: `linear-gradient(135deg, ${C.vert} 0%, ${C.vertClair} 100%)`, color: '#fff', border: 'none' }
          : { borderColor: `${C.vert}40`, color: '#333', bgcolor: `${C.vert}06`, '&:hover': { bgcolor: `${C.vert}14`, borderColor: C.vert } }),
      }}
    >
      {label}
    </Button>
  )
}

export default function DashboardAdmin() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [leveesFonds, setLeveesFonds] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [kamilStats, setKamilStats] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/auth/admin/statistiques/').then(({ data }) => data).catch(() => ({ membres_actifs: 0, total_membres: 0, cotisations_payees_ce_mois: 0, evenements: 0 })),
      api.get('/finance/levees-fonds/').then(({ data }) => {
        const lf = data.results || data
        return Array.isArray(lf) ? lf.filter(l => (l.statut_reel || l.statut) === 'active') : []
      }).catch(() => []),
      api.get('/communication/messages/conversations/').then(({ data }) => {
        const convs = Array.isArray(data) ? data : []
        return convs.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
      }).catch(() => 0),
      api.get('/culturelle/versements-kamil/').then(({ data }) => {
        const versements = data.results || data || []
        const enAttente = Array.isArray(versements) ? versements.filter(v => v.statut === 'en_attente').length : 0
        return { en_attente: enAttente, total: Array.isArray(versements) ? versements.length : 0 }
      }).catch(() => null),
    ]).then(([statsData, levees, unread, kamil]) => {
      setStats(statsData)
      setLeveesFonds(levees)
      setUnreadMessages(unread)
      setKamilStats(kamil)
    }).finally(() => setLoading(false))
  }, [])

  const formatName = useCallback(() => {
    if (!user) return 'Administrateur'
    const sexe = user.sexe || user.gender
    const prefix = sexe === 'M' ? 'Sen' : sexe === 'F' ? 'Sokhna' : ''
    const full = `${user.first_name || ''} ${user.last_name || ''}`.trim()
    return prefix ? `${prefix} ${full}` : full || user.username || 'Administrateur'
  }, [user])

  const tauxCotisations = stats
    ? Math.round((stats.taux_paiement_cotisations_ce_mois ?? 0) * 10) / 10
    : 0

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1)
  const alertsCount = (unreadMessages > 0 ? 1 : 0) + (kamilStats?.en_attente > 0 ? 1 : 0)

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Hero banner */}
      <Card sx={{
        mb: 3, borderRadius: 3, overflow: 'hidden',
        background: 'linear-gradient(135deg, #F0F8F4 0%, #FDF9EE 100%)',
        boxShadow: '0 4px 20px rgba(45,95,63,0.10)',
        border: `1px solid ${C.vert}18`,
      }}>
        <Box sx={{ height: 4, background: `linear-gradient(90deg, ${C.vertFonce}, ${C.vert} 55%, ${C.or})` }} />
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: C.vert, color: '#fff', width: 50, height: 50, boxShadow: `0 4px 14px ${C.vert}30` }}>
                <AdminPanelSettings />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ color: C.vertFonce, fontFamily: '"Dancing Script", "Cormorant Garamond", serif', fontWeight: 700, lineHeight: 1.2 }}>
                  Bienvenue, {formatName()}
                </Typography>
                <Typography variant="caption" sx={{ color: '#888' }}>{todayFormatted}</Typography>
              </Box>
            </Box>
            <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center">
              {alertsCount > 0 && (
                <Chip
                  icon={<Warning sx={{ fontSize: 15 }} />}
                  label={`${alertsCount} alerte${alertsCount > 1 ? 's' : ''} en attente`}
                  sx={{ bgcolor: '#FEF3E7', color: '#E65100', fontWeight: 700, border: '1px solid #FFCC80' }}
                />
              )}
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/informations/evenements')}
                sx={{ bgcolor: C.vert, color: '#fff', fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: C.vertFonce } }}
              >
                Créer Événement
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* KPI grid */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard label="Membres actifs" value={loading ? '…' : stats?.membres_actifs ?? 0} icon={People} color={C.vert} sub={stats ? `/ ${stats.total_membres ?? 0} total` : null} />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label="Cotisations ce mois"
            value={loading ? '…' : `${stats?.cotisations_payees_ce_mois ?? 0} / ${stats?.cotisations_total_ce_mois ?? 0}`}
            icon={AccountBalance}
            color={C.or}
            sub={`${tauxCotisations}%`}
            progress={tauxCotisations}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard label="Événements" value={loading ? '…' : stats?.evenements ?? 0} icon={Event} color={C.vert} />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard label="Levées actives" value={loading ? '…' : leveesFonds.length} icon={AttachMoney} color={C.or} />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label="Messages non lus"
            value={loading ? '…' : unreadMessages}
            icon={Message}
            color={unreadMessages > 0 ? '#D32F2F' : C.vert}
            sub={unreadMessages > 0 ? 'À traiter' : null}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label="Versements Kamil en attente"
            value={loading ? '…' : kamilStats?.en_attente ?? 0}
            icon={School}
            color={kamilStats?.en_attente > 0 ? '#E65100' : C.vert}
            sub={kamilStats?.en_attente > 0 ? 'À valider' : null}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard label="Total versements Kamil" value={loading ? '…' : kamilStats?.total ?? 0} icon={TrendingUp} color={C.vertClair} />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard label="Total membres" value={loading ? '…' : stats?.total_membres ?? 0} icon={Groups} color={C.vert} />
        </Grid>
      </Grid>

      {/* Actions rapides */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${C.or}30` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Box sx={{ width: 4, height: 22, bgcolor: C.or, borderRadius: 2 }} />
                <Typography variant="h6" sx={{ color: C.vertFonce, fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}>Gestion & Administration</Typography>
              </Box>
              <Box display="flex" flexDirection="column" gap={1.2}>
                <ActionBtn label="Gestion des membres" icon={People} onClick={() => navigate('/admin/membres')} primary />
                <ActionBtn label="Gérer les cotisations" icon={AccountBalance} onClick={() => navigate('/finance/cotisations')} />
                <ActionBtn label="Levées de fonds" icon={AttachMoney} onClick={() => navigate('/finance/levees-fonds')} badge={leveesFonds.length} />
                <ActionBtn label="Gérer les événements" icon={Event} onClick={() => navigate('/informations/evenements')} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${C.vert}30` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Box sx={{ width: 4, height: 22, bgcolor: C.vert, borderRadius: 2 }} />
                <Typography variant="h6" sx={{ color: C.vertFonce, fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}>Culture & Communication</Typography>
              </Box>
              <Box display="flex" flexDirection="column" gap={1.2}>
                <ActionBtn label="Programme Kamil" icon={MenuBook} onClick={() => navigate('/culturelle/kamil')} />
                <ActionBtn label="Versements Kamil" icon={School} onClick={() => navigate('/culturelle/versements-kamil')} badge={kamilStats?.en_attente} />
                <ActionBtn label="Messagerie" icon={Message} onClick={() => navigate('/communication/messagerie')} badge={unreadMessages} />
                <ActionBtn label="Forums de discussion" icon={Forum} onClick={() => navigate('/communication/forums')} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
