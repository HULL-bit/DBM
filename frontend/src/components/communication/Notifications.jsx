import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
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
  Checkbox,
} from '@mui/material'
import { Add, Done } from '@mui/icons-material'
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
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [list, setList] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openCreate, setOpenCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ utilisateurs: [], type_notification: 'info', titre: '', message: '', lien: '' })

  const loadList = () => {
    setLoading(true)
    api.get('/communication/notifications/').then(({ data }) => setList(data.results || data)).catch(() => setList([])).finally(() => setLoading(false))
  }
  useEffect(() => { loadList() }, [])
  useEffect(() => {
    if (isAdmin) api.get('/auth/users/').then(({ data }) => setUsers(data.results || data)).catch(() => setUsers([]))
  }, [isAdmin])

  const handleMarquerLue = async (id) => {
    try {
      await api.post(`/communication/notifications/${id}/marquer_lue/`)
      loadList()
    } catch (_) {}
  }

  const handleCreate = async () => {
    const dest = Array.isArray(form.utilisateurs) ? form.utilisateurs : []
    if (!form.titre || !form.message) {
      setMessage({ type: 'error', text: 'Titre et message requis.' })
      return
    }
    if (dest.length === 0) {
      setMessage({ type: 'error', text: 'Sélectionnez au moins un destinataire.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const { data } = await api.post('/communication/notifications/', {
        utilisateurs: dest.map((id) => Number(id)),
        type_notification: form.type_notification,
        titre: form.titre,
        message: form.message,
        lien: form.lien || '',
      })
      const count = data?.count
      setMessage({ type: 'success', text: count ? `${count} notifications créées.` : 'Notification créée.' })
      setOpenCreate(false)
      setForm({ utilisateurs: [], type_notification: 'info', titre: '', message: '', lien: '' })
      loadList()
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
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
        <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Créer une notification</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                select
                SelectProps={{
                  multiple: true,
                  renderValue: (selected) => {
                    if (selected.length === 0) return ''
                    return selected.map((id) => users.find((u) => u.id === id)).filter(Boolean).map((u) => `${u.first_name} ${u.last_name}`).join(', ')
                  },
                  MenuProps: { PaperProps: { sx: { maxHeight: 300 } } }
                }}
                fullWidth
                label="Destinataires"
                value={form.utilisateurs}
                onChange={(e) => setForm((f) => ({ ...f, utilisateurs: e.target.value }))}
                helperText={`${form.utilisateurs.length} destinataire(s) sélectionné(s)`}
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    <ListItemIcon>
                      <Checkbox checked={form.utilisateurs.includes(u.id)} sx={{ color: COLORS.vert, '&.Mui-checked': { color: COLORS.vert } }} />
                    </ListItemIcon>
                    <ListItemText primary={`${u.first_name} ${u.last_name}`} secondary={u.email} />
                  </MenuItem>
                ))}
              </TextField>
              <TextField select fullWidth label="Type" value={form.type_notification} onChange={(e) => setForm((f) => ({ ...f, type_notification: e.target.value }))}>
                {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
              <TextField fullWidth label="Titre" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} required />
              <TextField fullWidth label="Message" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} multiline rows={3} required />
              <TextField fullWidth label="Lien (optionnel)" value={form.lien} onChange={(e) => setForm((f) => ({ ...f, lien: e.target.value }))} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreate(false)}>Annuler</Button>
            <Button variant="contained" onClick={handleCreate} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Créer'}</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  )
}
