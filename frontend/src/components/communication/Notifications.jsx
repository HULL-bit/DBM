import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material'
import { Add, Done, Public, People, Forum } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }
const TYPES = [
  { value: 'info', label: 'Information' },
  { value: 'succes', label: 'Succès' },
  { value: 'avertissement', label: 'Avertissement' },
  { value: 'erreur', label: 'Erreur' },
  { value: 'message', label: 'Message' },
  { value: 'evenement', label: 'Événement' },
  { value: 'finance', label: 'Finance' },
  { value: 'kamil', label: 'Kamil' },
  { value: 'systeme', label: 'Système' },
]

export default function Notifications() {
  const { user, peut } = useAuth()
  // Admin global, ou droits de gestion sur la rubrique communication (rôle ou exception
  // accordée par l'admin via la page Rôles & Permissions) — pas seulement role === 'admin'.
  const isAdmin = user?.role === 'admin' || peut('communication', 'gerer')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openCreate, setOpenCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState('generale') // 'generale' | 'membres' | 'canal'
  const [form, setForm] = useState({ type_notification: 'info', message: '', lien: '', destinataires: [] })
  const [fieldErrors, setFieldErrors] = useState({})
  const [membres, setMembres] = useState([])
  const [loadingMembres, setLoadingMembres] = useState(false)
  const [canaux, setCanaux] = useState([])
  const [canalCible, setCanalCible] = useState('')

  const loadList = () => {
    setLoading(true)
    api.get('/communication/notifications/').then(({ data }) => setList(data.results || data)).catch(() => setList([])).finally(() => setLoading(false))
  }
  useEffect(() => { loadList() }, [])

  const loadMembres = () => {
    if (!isAdmin) return
    setLoadingMembres(true)
    api.get('/auth/users/')
      .then(({ data }) => {
        const arr = data.results || data || []
        setMembres(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setMembres([]))
      .finally(() => setLoadingMembres(false))
  }

  useEffect(() => {
    if (openCreate && isAdmin && membres.length === 0 && !loadingMembres) {
      loadMembres()
    }
    if (openCreate && isAdmin && canaux.length === 0) {
      api.get('/communication/canaux/').then(({ data }) => setCanaux(data.results || data)).catch(() => setCanaux([]))
    }
  }, [openCreate]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarquerLue = async (id) => {
    try {
      await api.post(`/communication/notifications/${id}/marquer_lue/`)
      loadList()
    } catch (_) {}
  }

  const resetForm = () => {
    setForm({ type_notification: 'info', message: '', lien: '', destinataires: [] })
    setCanalCible('')
    setMode('generale')
    setFieldErrors({})
  }

  const handleCreate = async () => {
    const errors = {}
    if (!form.message) errors.message = 'Message requis.'
    if (mode === 'membres' && form.destinataires.length === 0) errors.destinataires = 'Choisissez au moins un membre.'
    if (mode === 'canal' && !canalCible) errors.canal = 'Choisissez un canal.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      // Résolu au moment de l'envoi (pas de state intermédiaire) : les membres du canal
      // sélectionné, ou la sélection manuelle, ou rien (= tous les membres) en mode général.
      let destinataires
      if (mode === 'membres') destinataires = form.destinataires
      else if (mode === 'canal') {
        const canal = canaux.find((c) => c.id === canalCible)
        destinataires = (canal?.membres || []).map((m) => m.user)
      }
      const { data } = await api.post('/communication/notifications/', {
        type_notification: form.type_notification,
        message: form.message,
        lien: form.lien || '',
        destinataires: destinataires && destinataires.length > 0 ? destinataires : undefined,
      })
      const detail = data?.detail
      setMessage({ type: 'success', text: detail || '1 message envoyé à tous les membres.' })
      setOpenCreate(false)
      resetForm()
      loadList()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const apiFieldErrors = {}
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) apiFieldErrors[key] = String(value[0])
          else if (typeof value === 'string') apiFieldErrors[key] = value
        })
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }))
        setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      } else {
        const d = err.response?.data?.detail || data
        setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Notifications</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>Toutes vos notifications</Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Créer une notification
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <Paper sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2, overflow: 'hidden' }}>
          {list.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Aucune notification</Typography></Box>
          ) : (
            <List disablePadding>
              {list.map((n) => (
                <ListItem
                  key={n.id}
                  divider
                  sx={{
                    bgcolor: n.est_lue ? 'transparent' : `${COLORS.vert}08`,
                    alignItems: 'flex-start',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography fontWeight={600}>{n.titre}</Typography>
                        <Chip size="small" label={n.type_display || n.type_notification} sx={{ bgcolor: `${COLORS.or}30` }} />
                        {!n.est_lue && <Chip size="small" label="Non lue" color="primary" />}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>{n.message}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{new Date(n.date_creation).toLocaleString('fr-FR')}</Typography>
                      </>
                    }
                  />
                  {!n.est_lue && (
                    <ListItemSecondaryAction>
                      <IconButton size="small" onClick={() => handleMarquerLue(n.id)} title="Marquer comme lue" sx={{ color: COLORS.vert }}>
                        <Done />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}

      {isAdmin && (
        <Dialog open={openCreate} onClose={() => { setOpenCreate(false); resetForm() }} maxWidth="sm" fullWidth>
          <DialogTitle>Créer une notification</DialogTitle>
          <Tabs
            value={mode}
            onChange={(_, v) => { setMode(v); setFieldErrors({}) }}
            variant="fullWidth"
            sx={{ borderBottom: `1px solid ${COLORS.or}30`, px: 1 }}
          >
            <Tab value="generale" icon={<Public fontSize="small" />} iconPosition="start" label="Générale" />
            <Tab value="membres" icon={<People fontSize="small" />} iconPosition="start" label="Membres choisis" />
            <Tab value="canal" icon={<Forum fontSize="small" />} iconPosition="start" label="Par canal" />
          </Tabs>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              {mode === 'generale' && (
                <Alert severity="info">Envoyée à tous les membres de la daara.</Alert>
              )}

              {mode === 'membres' && (
                <TextField
                  select
                  fullWidth
                  label="Destinataires"
                  value={form.destinataires}
                  onChange={(e) => {
                    const value = e.target.value
                    const ids = Array.isArray(value) ? value.map((v) => Number(v)) : []
                    setForm((f) => ({ ...f, destinataires: ids }))
                    setFieldErrors((fe) => ({ ...fe, destinataires: undefined }))
                  }}
                  error={!!fieldErrors.destinataires}
                  SelectProps={{
                    multiple: true,
                    renderValue: (selected) => {
                      if (!selected || selected.length === 0) return 'Choisir des membres…'
                      const labels = selected.map((id) => {
                        const m = membres.find((u) => u.id === id)
                        if (!m) return `#${id}`
                        return `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username || `#${m.id}`
                      })
                      return labels.join(', ')
                    },
                  }}
                  helperText={fieldErrors.destinataires || (loadingMembres ? 'Chargement des membres…' : `${form.destinataires.length} destinataire(s) sélectionné(s)`)}
                >
                  {loadingMembres && (
                    <MenuItem disabled><CircularProgress size={20} sx={{ mr: 1 }} /> Chargement…</MenuItem>
                  )}
                  {!loadingMembres && membres.map((m) => {
                    const nom = `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username || `#${m.id}`
                    return (
                      <MenuItem key={m.id} value={m.id}>
                        {nom} — {m.telephone || m.email || ''}
                      </MenuItem>
                    )
                  })}
                </TextField>
              )}

              {mode === 'canal' && (
                <TextField
                  select
                  fullWidth
                  label="Canal"
                  value={canalCible}
                  onChange={(e) => { setCanalCible(e.target.value); setFieldErrors((fe) => ({ ...fe, canal: undefined })) }}
                  error={!!fieldErrors.canal}
                  helperText={fieldErrors.canal || 'Tous les membres de ce canal seront notifiés.'}
                >
                  {canaux.map((c) => <MenuItem key={c.id} value={c.id}>{c.nom} ({c.nb_membres} membre(s))</MenuItem>)}
                </TextField>
              )}

              <TextField select fullWidth label="Type" value={form.type_notification} onChange={(e) => setForm((f) => ({ ...f, type_notification: e.target.value }))}>
                {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
              <TextField
                fullWidth
                label="Message"
                value={form.message}
                onChange={(e) => {
                  setForm((f) => ({ ...f, message: e.target.value }))
                  setFieldErrors((fe) => ({ ...fe, message: undefined }))
                }}
                multiline
                rows={3}
                required
                error={!!fieldErrors.message}
                helperText={fieldErrors.message || ''}
              />
              <TextField fullWidth label="Lien (optionnel)" value={form.lien} onChange={(e) => setForm((f) => ({ ...f, lien: e.target.value }))} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpenCreate(false); resetForm() }}>Annuler</Button>
            <Button variant="contained" onClick={handleCreate} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Créer'}</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  )
}
