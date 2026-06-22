import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip, Badge, LinearProgress, Avatar,
} from '@mui/material'
import {
  CheckCircle, MenuBook, Mosque, Add, School, TrendingUp, People,
  Message, ArrowForward, Warning,
} from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029', vertClair: '#3d7a52' }

function KpiCard({ label, value, icon: Icon, color, sub, alert }) {
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
            <Chip
              label={sub}
              icon={alert ? <Warning sx={{ fontSize: 13 }} /> : undefined}
              size="small"
              sx={{ bgcolor: alert ? 'rgba(230,81,0,0.15)' : `${color}15`, color: alert ? '#E65100' : color, fontWeight: 700, fontSize: '0.7rem', border: 'none' }}
            />
          )}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontFamily: '"Cormorant Garamond", serif', lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mt: 0.5, fontWeight: 500 }}>{label}</Typography>
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

export default function DashboardJewrin() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [validationsEnAttente, setValidationsEnAttente] = useState(0)
  const [progressionsKamil, setProgressionsKamil] = useState(0)
  const [versementsEnAttente, setVersementsEnAttente] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/culturelle/progressions/').then(({ data }) => {
        const progressions = data.results || data || []
        const enAttente = Array.isArray(progressions) ? progressions.filter(p => p.statut === 'en_attente').length : 0
        return { enAttente, total: Array.isArray(progressions) ? progressions.length : 0 }
      }).catch(() => ({ enAttente: 0, total: 0 })),
      api.get('/culturelle/versements-kamil/').then(({ data }) => {
        const versements = data.results || data || []
        return Array.isArray(versements) ? versements.filter(v => v.statut === 'en_attente').length : 0
      }).catch(() => 0),
      api.get('/communication/messages/conversations/').then(({ data }) => {
        const convs = Array.isArray(data) ? data : []
        return convs.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
      }).catch(() => 0),
    ]).then(([progressions, versements, unread]) => {
      setValidationsEnAttente(progressions.enAttente)
      setProgressionsKamil(progressions.total)
      setVersementsEnAttente(versements)
      setUnreadMessages(unread)
    }).finally(() => setLoading(false))
  }, [])

  const formatName = useCallback(() => {
    if (!user) return 'Jewrin'
    const sexe = user.sexe || user.gender
    const prefix = sexe === 'M' ? 'Sen' : sexe === 'F' ? 'Sokhna' : ''
    const full = `${user.first_name || ''} ${user.last_name || ''}`.trim()
    return prefix ? `${prefix} ${full}` : full || user.username || 'Jewrin'
  }, [user])

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1)
  const alertsCount = (validationsEnAttente > 0 ? 1 : 0) + (versementsEnAttente > 0 ? 1 : 0) + (unreadMessages > 0 ? 1 : 0)

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
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Jewrin — {todayFormatted}</Typography>
              </Box>
            </Box>
            {alertsCount > 0 && (
              <Chip
                icon={<Warning sx={{ fontSize: 15 }} />}
                label={`${alertsCount} élément${alertsCount > 1 ? 's' : ''} à traiter`}
                sx={{ bgcolor: 'rgba(255,107,53,0.9)', color: '#fff', fontWeight: 700, border: 'none' }}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* KPIs */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label="Validations en attente"
            value={loading ? '…' : validationsEnAttente}
            icon={CheckCircle}
            color={validationsEnAttente > 0 ? '#E65100' : C.vert}
            sub={validationsEnAttente > 0 ? 'À valider' : null}
            alert={validationsEnAttente > 0}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label="Versements en attente"
            value={loading ? '…' : versementsEnAttente}
            icon={School}
            color={versementsEnAttente > 0 ? '#E65100' : C.vert}
            sub={versementsEnAttente > 0 ? 'À valider' : null}
            alert={versementsEnAttente > 0}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard label="Total progressions" value={loading ? '…' : progressionsKamil} icon={TrendingUp} color={C.or} />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label="Messages non lus"
            value={loading ? '…' : unreadMessages}
            icon={Message}
            color={unreadMessages > 0 ? '#D32F2F' : C.vert}
            sub={unreadMessages > 0 ? 'Non lus' : null}
            alert={unreadMessages > 0}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard label="Programme Kamil" value="Actif" icon={MenuBook} color={C.vert} />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard label="Activités religieuses" value="—" icon={Mosque} color={C.or} />
        </Grid>
      </Grid>

      {/* Actions */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${C.or}30` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Box sx={{ width: 4, height: 22, bgcolor: C.or, borderRadius: 2 }} />
                <Typography variant="h6" sx={{ color: C.vertFonce, fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}>Validations & Kamil</Typography>
              </Box>
              <Box display="flex" flexDirection="column" gap={1.2}>
                <ActionBtn label="Valider les progressions" icon={CheckCircle} onClick={() => navigate('/culturelle/validations')} primary badge={validationsEnAttente} />
                <ActionBtn label="Valider les versements Kamil" icon={School} onClick={() => navigate('/culturelle/versements-kamil')} badge={versementsEnAttente} />
                <ActionBtn label="Programme Kamil" icon={MenuBook} onClick={() => navigate('/culturelle/kamil')} />
                <ActionBtn label="Toutes les progressions" icon={People} onClick={() => navigate('/culturelle/progressions')} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${C.vert}30` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Box sx={{ width: 4, height: 22, bgcolor: C.vert, borderRadius: 2 }} />
                <Typography variant="h6" sx={{ color: C.vertFonce, fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}>Activités & Communication</Typography>
              </Box>
              <Box display="flex" flexDirection="column" gap={1.2}>
                <ActionBtn label="Créer une activité religieuse" icon={Add} onClick={() => navigate('/culturelle/activites-religieuses')} />
                <ActionBtn label="Gérer les activités religieuses" icon={Mosque} onClick={() => navigate('/culturelle/activites-religieuses')} />
                <ActionBtn label="Messagerie" icon={Message} onClick={() => navigate('/communication/messagerie')} badge={unreadMessages} />
                <ActionBtn label="Statistiques Kamil" icon={TrendingUp} onClick={() => navigate('/culturelle/statistiques')} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
