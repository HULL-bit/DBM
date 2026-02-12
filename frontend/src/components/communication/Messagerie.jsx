import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
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
  Chip,
  Checkbox,
  ListItemIcon,
} from '@mui/material'
import { Add, Send, Inbox, Outbox, AttachFile, Image as ImageIcon } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { getMediaUrl } from '../../services/media'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

export default function Messagerie() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openCompose, setOpenCompose] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState({ destinataires: [], sujet: '', contenu: '', fichier: null })
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const loadMessages = () => {
    setLoading(true)
    api.get('/communication/messages/').then(({ data }) => setMessages(data.results || data)).catch(() => setMessages([])).finally(() => setLoading(false))
  }
  useEffect(() => { loadMessages() }, [])
  useEffect(() => {
    api.get('/communication/messages/destinataires/').then(({ data }) => setUsers(Array.isArray(data) ? data : [])).catch(() => setUsers([]))
  }, [])

  const recus = messages.filter((m) => m.destinataire === user?.id)
  const envoyes = messages.filter((m) => m.expediteur === user?.id)
  const list = tab === 0 ? recus : envoyes

  const handleSend = async () => {
    const dest = Array.isArray(form.destinataires) ? form.destinataires : []
    const errors = {}
    if (dest.length === 0) errors.destinataires = 'Sélectionnez au moins un destinataire.'
    if (!form.sujet) errors.sujet = 'Sujet requis.'
    if (!form.contenu) errors.contenu = 'Message requis.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      if (form.fichier) {
        const fd = new FormData()
        dest.forEach((id) => fd.append('destinataires', String(id)))
        fd.append('sujet', form.sujet)
        fd.append('contenu', form.contenu)
        fd.append('fichier_joint', form.fichier)
        const { data } = await api.post('/communication/messages/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const count = data?.count
        setMessage({ type: 'success', text: count ? `${count} messages envoyés.` : 'Message envoyé.' })
      } else {
        const { data } = await api.post('/communication/messages/', {
          destinataires: dest.map((id) => Number(id)),
          sujet: form.sujet,
          contenu: form.contenu,
        })
        const count = data?.count
        setMessage({ type: 'success', text: count ? `${count} messages envoyés.` : 'Message envoyé.' })
      }
      setOpenCompose(false)
      setForm({ destinataires: [], sujet: '', contenu: '', fichier: null })
      setFilePreview(null)
      loadMessages()
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Seules les images sont autorisées.' })
      return
    }
    setForm((f) => ({ ...f, fichier: file }))
    setFilePreview(URL.createObjectURL(file))
    setMessage({ type: '', text: '' })
  }

  const handleOpenMessage = async (m) => {
    setSelectedMessage(m)
    // Si message reçu non lu, le marquer comme lu
    if (tab === 0 && !m.est_lu) {
      try {
        await api.post(`/communication/messages/${m.id}/marquer_lu/`)
        loadMessages()
      } catch (_) {
        // on ignore l'erreur, l'UI reste fonctionnelle
      }
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Messagerie</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>Messages internes</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setOpenCompose(true); setForm({ destinataires: [], sujet: '', contenu: '', fichier: null }); setFilePreview(null) }} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
          Nouveau message
        </Button>
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      )}

      <Paper sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab icon={<Inbox />} iconPosition="start" label={`Reçus (${recus.length})`} />
          <Tab icon={<Outbox />} iconPosition="start" label={`Envoyés (${envoyes.length})`} />
        </Tabs>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : list.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Aucun message</Typography></Box>
        ) : (
          <List disablePadding>
            {list.map((m) => (
              <ListItem
                key={m.id}
                divider
                button
                onClick={() => handleOpenMessage(m)}
                sx={{ alignItems: 'flex-start' }}
              >
                <ListItemAvatar>
                  <Avatar 
                    src={tab === 0 ? getMediaUrl(m.expediteur_photo, m.expediteur_photo_updated_at ? `v=${m.expediteur_photo_updated_at}` : '') : getMediaUrl(m.destinataire_photo, m.destinataire_photo_updated_at ? `v=${m.destinataire_photo_updated_at}` : '')}
                    sx={{ bgcolor: COLORS.or, color: COLORS.vert }}
                  >
                    {tab === 0 ? (m.expediteur_nom || '?')[0] : (m.destinataire_nom || '?')[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography fontWeight={600}>{m.sujet}</Typography>
                      {!m.est_lu && tab === 0 && <Chip label="Non lu" size="small" color="primary" />}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {tab === 0 ? `De : ${m.expediteur_nom}` : `À : ${m.destinataire_nom}`} — {new Date(m.date_envoi).toLocaleString('fr-FR')}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{m.contenu?.slice(0, 150)}{m.contenu?.length > 150 ? '…' : ''}</Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Dialog open={!!selectedMessage} onClose={() => setSelectedMessage(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedMessage?.sujet}</DialogTitle>
        <DialogContent dividers>
          {selectedMessage && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                {tab === 0
                  ? `De : ${selectedMessage.expediteur_nom}`
                  : `À : ${selectedMessage.destinataire_nom}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Envoyé le {new Date(selectedMessage.date_envoi).toLocaleString('fr-FR')}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                {selectedMessage.contenu}
              </Typography>
              {selectedMessage.fichier_joint && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Fichier joint :
                  </Typography>
                  {selectedMessage.fichier_joint.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <Box component="img" src={getMediaUrl(selectedMessage.fichier_joint)} alt="Pièce jointe" sx={{ maxWidth: '100%', maxHeight: 400, borderRadius: 1 }} />
                  ) : (
                    <Button
                      startIcon={<AttachFile />}
                      href={getMediaUrl(selectedMessage.fichier_joint)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: COLORS.vert }}
                    >
                      Voir le fichier
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedMessage(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCompose} onClose={() => setOpenCompose(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau message</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              select
              SelectProps={{
                multiple: true,
                renderValue: (selected) => {
                  if (selected.length === 0) return 'Choisir le ou les destinataires…'
                  return selected.map((id) => users.find((u) => u.id === id)).filter(Boolean).map((u) => `${u.first_name} ${u.last_name}`).join(', ')
                },
                MenuProps: { PaperProps: { sx: { maxHeight: 300 } } }
              }}
              fullWidth
              label="Destinataire(s)"
              value={form.destinataires}
              onChange={(e) => {
                setForm((f) => ({ ...f, destinataires: e.target.value }))
                setFieldErrors((fe) => ({ ...fe, destinataires: undefined }))
              }}
              helperText={fieldErrors.destinataires || (users.length === 0 ? 'Aucun autre membre à afficher.' : `${form.destinataires.length} destinataire(s) sélectionné(s)`)}
              error={!!fieldErrors.destinataires}
            >
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  <ListItemIcon>
                    <Checkbox checked={form.destinataires.includes(u.id)} sx={{ color: COLORS.vert, '&.Mui-checked': { color: COLORS.vert } }} />
                  </ListItemIcon>
                  <ListItemText primary={`${u.first_name} ${u.last_name}`} secondary={u.email} />
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Sujet"
              value={form.sujet}
              onChange={(e) => {
                setForm((f) => ({ ...f, sujet: e.target.value }))
                setFieldErrors((fe) => ({ ...fe, sujet: undefined }))
              }}
              required
              error={!!fieldErrors.sujet}
              helperText={fieldErrors.sujet || ''}
            />
            <TextField
              fullWidth
              label="Message"
              value={form.contenu}
              onChange={(e) => {
                setForm((f) => ({ ...f, contenu: e.target.value }))
                setFieldErrors((fe) => ({ ...fe, contenu: undefined }))
              }}
              multiline
              rows={5}
              required
              error={!!fieldErrors.contenu}
              helperText={fieldErrors.contenu || ''}
            />
            <Box>
              <Button
                component="label"
                variant="outlined"
                startIcon={<ImageIcon />}
                sx={{ mb: 1, borderColor: COLORS.vert, color: COLORS.vert, '&:hover': { borderColor: COLORS.vertFonce } }}
              >
                Ajouter une photo
                <input type="file" accept="image/*" hidden onChange={handleFileChange} />
              </Button>
              {filePreview && (
                <Box sx={{ mt: 1 }}>
                  <Box component="img" src={filePreview} alt="Aperçu" sx={{ maxWidth: 200, maxHeight: 200, borderRadius: 1 }} />
                  <Button size="small" onClick={() => { setForm((f) => ({ ...f, fichier: null })); setFilePreview(null) }} sx={{ ml: 1, color: 'error.main' }}>
                    Supprimer
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCompose(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSend} disabled={saving} startIcon={saving ? <CircularProgress size={20} /> : <Send />} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Envoyer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
