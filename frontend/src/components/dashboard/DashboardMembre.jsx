import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip, Badge, LinearProgress, Avatar,
} from '@mui/material'
import {
  AccountBalance, MenuBook, Event, Message, AttachMoney, TrendingUp,
  Forum, School, Payment, ArrowForward, Person,
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

export default function DashboardMembre() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cotisationStats, setCotisationStats] = useState(null)
  const [kamilStats, setKamilStats] = useState(null)
  const [leveesFonds, setLeveesFonds] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/finance/cotisations/statistiques/').then(({ data }) => data).catch(() => null),
      api.get('/culturelle/versements-kamil/mes_stats/').then(({ data }) => data).catch(() => null),
      api.get('/finance/levees-fonds/').then(({ data }) => {
        const lf = data.results || data
        return Array.isArray(lf) ? lf.filter(l => (l.statut_reel || l.statut) === 'active') : []
      }).catch(() => []),
      api.get('/communication/messages/conversations/').then(({ data }) => {
        const convs = Array.isArray(data) ? data : []
        return convs.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
      }).catch(() => 0),
    ]).then(([cotisations, kamil, levees, unread]) => {
      setCotisationStats(cotisations)
      setKamilStats(kamil)
      setLeveesFonds(levees)
      setUnreadMessages(unread)
    }).finally(() => setLoading(false))
  }, [])

  const cotisationsValue = useMemo(() => {
    const totalAssignations = cotisationStats?.total_assignations ?? 0
    const totalPayees = cotisationStats?.total_payees ?? 0
    return `${totalPayees} / ${totalAssignations}`
  }, [cotisationStats])

  const tauxCotisations = cotisationStats
    ? Math.round((cotisationStats.pourcentage_payees ?? 0) * 10) / 10
    : 0

  const kamilPct = Math.round(kamilStats?.pourcentage_global ?? 0)

  const formatName = useCallback(() => {
    if (!user) return ''
    const sexe = user.sexe || user.gender
    const prefix = sexe === 'M' ? 'Sen' : sexe === 'F' ? 'Sokhna' : ''
    const full = `${user.first_name || ''} ${user.last_name || ''}`.trim()
    return prefix ? `${prefix} ${full}` : full || user.username || 'Membre'
  }, [user])

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1)

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Hero */}
      <Card sx={{
        mb: 3, borderRadius: 3, overflow: 'hidden',
        background: `linear-gradient(135deg, ${C.vertFonce} 0%, ${C.vert} 55%, ${C.vertClair} 100%)`,
        boxShadow: `0 6px 24px ${C.vert}35`,
      }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: C.or, color: C.vertFonce, width: 48, height: 48, fontWeight: 700, fontSize: '1.2rem' }}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ color: '#fff', fontFamily: '"Dancing Script", "Cormorant Garamond", serif', fontWeight: 700, lineHeight: 1.2 }}>
                  Bienvenue, {formatName()}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>{todayFormatted}</Typography>
              </Box>
            </Box>
            {unreadMessages > 0 && (
              <Chip
                icon={<Message sx={{ fontSize: 15 }} />}
                label={`${unreadMessages} message${unreadMessages > 1 ? 's' : ''} non lu${unreadMessages > 1 ? 's' : ''}`}
                onClick={() => navigate('/communication/messagerie')}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* KPIs */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label="Cotisations payées"
            value={loading ? '…' : cotisationsValue}
            icon={AccountBalance}
            color={C.vert}
            sub={`${tauxCotisations}%`}
            progress={tauxCotisations}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label="Versements Kamil"
            value={loading ? '…' : `${kamilStats?.nb_valides ?? 0} / ${kamilStats?.nb_versements ?? 0}`}
            icon={School}
            color={C.or}
            sub={`${kamilPct}%`}
            progress={kamilPct}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard label="Événements participés" value={loading ? '…' : user?.evenements_participes ?? 0} icon={Event} color={C.vert} />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label="Messages non lus"
            value={loading ? '…' : unreadMessages}
            icon={Message}
            color={unreadMessages > 0 ? '#D32F2F' : C.vert}
            sub={unreadMessages > 0 ? 'Non lus' : null}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard label="Chapitres lus (Kamil)" value={loading ? '…' : user?.chapitres_lus ?? 0} icon={MenuBook} color={C.or} />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard label="Levées de fonds actives" value={loading ? '…' : leveesFonds.length} icon={AttachMoney} color={C.vertClair} />
        </Grid>
        {kamilStats && (
          <>
            <Grid item xs={6} sm={4} md={3}>
              <KpiCard label="Montant versé (Kamil)" value={loading ? '…' : `${(kamilStats.total_verse ?? 0).toLocaleString('fr-FR')} F`} icon={TrendingUp} color={C.vert} />
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <KpiCard label="Reste à verser" value={loading ? '…' : `${(kamilStats.reste_global ?? 0).toLocaleString('fr-FR')} F`} icon={Payment} color={C.or} />
            </Grid>
          </>
        )}
      </Grid>

      {/* Actions */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${C.or}30` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Box sx={{ width: 4, height: 22, bgcolor: C.or, borderRadius: 2 }} />
                <Typography variant="h6" sx={{ color: C.vertFonce, fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}>Mes actions rapides</Typography>
              </Box>
              <Box display="flex" flexDirection="column" gap={1.2}>
                <ActionBtn label="Payer ma cotisation" icon={AccountBalance} onClick={() => navigate('/finance/cotisations')} primary />
                <ActionBtn label="Mes JUKKI" icon={MenuBook} onClick={() => navigate('/culturelle/mes-progressions')} />
                <ActionBtn label="Voir les événements" icon={Event} onClick={() => navigate('/informations/evenements')} />
                <ActionBtn label="Messagerie" icon={Message} onClick={() => navigate('/communication/messagerie')} badge={unreadMessages} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${C.vert}30` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Box sx={{ width: 4, height: 22, bgcolor: C.vert, borderRadius: 2 }} />
                <Typography variant="h6" sx={{ color: C.vertFonce, fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}>Finance & Participation</Typography>
              </Box>
              <Box display="flex" flexDirection="column" gap={1.2}>
                {leveesFonds.length > 0 && (
                  <ActionBtn label="Participer aux levées de fonds" icon={AttachMoney} onClick={() => navigate('/finance/levees-fonds')} primary badge={leveesFonds.length} />
                )}
                <ActionBtn label="Mes participations" icon={Payment} onClick={() => navigate('/finance/levees-fonds')} />
                <ActionBtn label="Mes versements Kamil" icon={TrendingUp} onClick={() => navigate('/culturelle/versements-kamil')} />
                <ActionBtn label="Forums de discussion" icon={Forum} onClick={() => navigate('/communication/forums')} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
