import { useState, useEffect } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Divider, Collapse, Avatar, Rating, Tooltip,
} from '@mui/material'
import {
  Add, Edit, Delete, ArrowBack, ExpandMore, ExpandLess, Groups,
  Schedule, MusicNote, Star, EventNote, CalendarMonth, ArrowForward,
} from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029', vertClair: '#3d7a52' }

const TYPE_EVENT = [
  { value: 'magal', label: 'Magal', color: '#C9A961' },
  { value: 'gamou', label: 'Gamou', color: '#6A1B9A' },
  { value: 'ziarra', label: 'Ziarra', color: '#1565C0' },
  { value: 'conference', label: 'Conférence', color: '#2E7D32' },
  { value: 'autre', label: 'Autre', color: '#555' },
]

function typeInfo(type) {
  return TYPE_EVENT.find(t => t.value === type) || TYPE_EVENT[4]
}

// ─── Sous-composant: liste des Kourels invités pour une journée ───────────────
function KourelsInvitesSection({ journee, kourels, isAdmin, onRefresh }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ kourel: '', heure_debut: '', duree: 60, programme: '', appreciation: '', note: '' })

  const loadList = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/organisation/kourels-invites/?journee=${journee.id}`)
      setList(data.results || data)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadList() }, [journee.id])

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({ kourel: '', heure_debut: '', duree: 60, programme: '', appreciation: '', note: '' })
    setOpenForm(true)
  }

  const handleOpenEdit = (item) => {
    setEditingId(item.id)
    setForm({
      kourel: item.kourel,
      heure_debut: item.heure_debut || '',
      duree: item.duree || 60,
      programme: item.programme || '',
      appreciation: item.appreciation || '',
      note: item.note || '',
    })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.kourel) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        journee: journee.id,
        duree: Number(form.duree),
        note: form.note !== '' ? Number(form.note) : null,
        heure_debut: form.heure_debut || null,
      }
      if (editingId) {
        await api.patch(`/organisation/kourels-invites/${editingId}/`, payload)
      } else {
        await api.post('/organisation/kourels-invites/', payload)
      }
      await loadList()
      setOpenForm(false)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    await api.delete(`/organisation/kourels-invites/${id}/`)
    await loadList()
  }

  const setF = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }))

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="subtitle2" sx={{ color: C.vertFonce, fontWeight: 700 }}>
          Kourels invités ({list.length})
        </Typography>
        {isAdmin && (
          <Button size="small" startIcon={<Add />} onClick={handleOpenAdd}
            sx={{ color: C.vert, borderColor: `${C.vert}50`, borderRadius: 2 }} variant="outlined">
            Ajouter un kourel
          </Button>
        )}
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} sx={{ color: C.vert }} /></Box>
      ) : list.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 2 }}>
          Aucun kourel invité pour cette journée
        </Typography>
      ) : (
        <Box display="flex" flexDirection="column" gap={1.5}>
          {list.map((item, idx) => (
            <Card key={item.id} sx={{ borderRadius: 2, border: `1px solid ${C.or}25`, bgcolor: '#FDFAF5' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box display="flex" alignItems="center" gap={1.5} flex={1}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: C.or, color: C.vertFonce, fontWeight: 700, fontSize: '0.8rem' }}>
                      {idx + 1}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.vert }}>{item.kourel_nom}</Typography>
                      <Box display="flex" flexWrap="wrap" gap={1} mt={0.5}>
                        {item.heure_debut && (
                          <Chip icon={<Schedule sx={{ fontSize: 12 }} />} label={item.heure_debut.slice(0, 5)} size="small" sx={{ bgcolor: `${C.vert}12`, color: C.vert, fontWeight: 600, fontSize: '0.68rem' }} />
                        )}
                        <Chip label={`${item.duree} min`} size="small" sx={{ bgcolor: '#F3E5F5', color: '#6A1B9A', fontWeight: 600, fontSize: '0.68rem' }} />
                        {item.note && (
                          <Chip icon={<Star sx={{ fontSize: 12 }} />} label={`${item.note}/20`} size="small" sx={{ bgcolor: `${C.or}20`, color: C.or, fontWeight: 700, fontSize: '0.68rem' }} />
                        )}
                      </Box>
                    </Box>
                  </Box>
                  {isAdmin && (
                    <Box display="flex" gap={0.5}>
                      <IconButton size="small" onClick={() => handleOpenEdit(item)} sx={{ color: C.vert }}><Edit sx={{ fontSize: 15 }} /></IconButton>
                      <IconButton size="small" onClick={() => handleDelete(item.id)} sx={{ color: 'error.main' }}><Delete sx={{ fontSize: 15 }} /></IconButton>
                    </Box>
                  )}
                </Box>
                {item.programme && (
                  <Box mt={1.5} p={1.5} sx={{ bgcolor: '#F0F7F2', borderRadius: 1.5, borderLeft: `3px solid ${C.vert}` }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: C.vert, display: 'block', mb: 0.25 }}>Programme</Typography>
                    <Typography variant="caption" color="text.secondary">{item.programme}</Typography>
                  </Box>
                )}
                {item.appreciation && (
                  <Box mt={1} p={1.5} sx={{ bgcolor: '#FFF8EC', borderRadius: 1.5, borderLeft: `3px solid ${C.or}` }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: C.or, display: 'block', mb: 0.25 }}>Appréciation conservatoire</Typography>
                    <Typography variant="caption" color="text.secondary">{item.appreciation}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Form dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: C.vertFonce, fontWeight: 700 }}>
          {editingId ? 'Modifier le kourel invité' : 'Ajouter un kourel invité'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField select fullWidth label="Kourel *" value={form.kourel} onChange={setF('kourel')}>
                <MenuItem value="">— Choisir un kourel —</MenuItem>
                {kourels.map(k => <MenuItem key={k.id} value={k.id}>{k.nom}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="time" label="Heure de début" value={form.heure_debut} onChange={setF('heure_debut')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Durée (minutes)" value={form.duree} onChange={setF('duree')} inputProps={{ min: 1 }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Note /20" value={form.note} onChange={setF('note')} inputProps={{ min: 0, max: 20, step: 0.5 }} placeholder="Ex: 17.5" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Programme de prestation" value={form.programme} onChange={setF('programme')} placeholder="Décrivez le programme de la prestation..." />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Appréciation conservatoire" value={form.appreciation} onChange={setF('appreciation')} placeholder="Notes et appréciations de la direction conservatoire..." />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setOpenForm(false)} sx={{ color: '#666' }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.kourel}
            sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, fontWeight: 700 }}>
            {saving ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : (editingId ? 'Enregistrer' : 'Ajouter')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Sous-composant: journées d'un événement ──────────────────────────────────
function JourneesSection({ evenement, kourels, isAdmin }) {
  const [journees, setJournees] = useState([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [form, setForm] = useState({ nom: '', date: '', ordre: 0, notes: '' })

  const loadJournees = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/organisation/journees/?evenement=${evenement.id}`)
      const list = data.results || data
      setJournees(list)
      if (list.length > 0 && !expandedId) setExpandedId(list[0].id)
    } catch {
      setJournees([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadJournees() }, [evenement.id])

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({ nom: '', date: '', ordre: journees.length, notes: '' })
    setOpenForm(true)
  }

  const handleOpenEdit = (j) => {
    setEditingId(j.id)
    setForm({ nom: j.nom, date: j.date || '', ordre: j.ordre, notes: j.notes || '' })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.nom) return
    setSaving(true)
    try {
      const payload = { ...form, evenement: evenement.id, ordre: Number(form.ordre), date: form.date || null }
      if (editingId) {
        await api.patch(`/organisation/journees/${editingId}/`, payload)
      } else {
        await api.post('/organisation/journees/', payload)
      }
      await loadJournees()
      setOpenForm(false)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    await api.delete(`/organisation/journees/${id}/`)
    await loadJournees()
  }

  const setF = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }))

  if (loading) return <Box display="flex" justifyContent="center" py={3}><CircularProgress size={28} sx={{ color: C.vert }} /></Box>

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ color: C.vertFonce, fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}>
          Journées ({journees.length})
        </Typography>
        {isAdmin && (
          <Button startIcon={<Add />} variant="outlined" onClick={handleOpenAdd}
            sx={{ borderColor: `${C.vert}50`, color: C.vert, borderRadius: 2, fontWeight: 600 }}>
            Ajouter une journée
          </Button>
        )}
      </Box>

      {journees.length === 0 ? (
        <Box textAlign="center" py={4} sx={{ bgcolor: `${C.vert}05`, borderRadius: 2, border: `1px dashed ${C.vert}30` }}>
          <CalendarMonth sx={{ fontSize: 40, color: '#CCC', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">Aucune journée pour cet événement</Typography>
          {isAdmin && <Button size="small" startIcon={<Add />} onClick={handleOpenAdd} sx={{ mt: 1.5, color: C.vert }}>Ajouter la première journée</Button>}
        </Box>
      ) : (
        journees.map((j, idx) => (
          <Card key={j.id} sx={{ mb: 2, borderRadius: 2.5, border: `1px solid ${C.or}25`, overflow: 'hidden' }}>
            {/* Day header */}
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5,
                bgcolor: expandedId === j.id ? `${C.vert}0D` : '#fff',
                cursor: 'pointer',
                '&:hover': { bgcolor: `${C.or}08` },
                borderBottom: expandedId === j.id ? `1px solid ${C.or}25` : 'none',
              }}
              onClick={() => setExpandedId(expandedId === j.id ? null : j.id)}
            >
              <Avatar sx={{ width: 36, height: 36, bgcolor: C.or, color: C.vertFonce, fontWeight: 700, fontSize: '0.85rem' }}>
                {idx + 1}
              </Avatar>
              <Box flex={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: C.vert }}>{j.nom}</Typography>
                {j.date && (
                  <Typography variant="caption" color="text.secondary">
                    {new Date(j.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </Typography>
                )}
              </Box>
              {isAdmin && (
                <Box display="flex" gap={0.5} onClick={e => e.stopPropagation()}>
                  <IconButton size="small" onClick={() => handleOpenEdit(j)} sx={{ color: C.vert }}><Edit sx={{ fontSize: 16 }} /></IconButton>
                  <IconButton size="small" onClick={() => handleDelete(j.id)} sx={{ color: 'error.main' }}><Delete sx={{ fontSize: 16 }} /></IconButton>
                </Box>
              )}
              {expandedId === j.id ? <ExpandLess sx={{ color: '#999' }} /> : <ExpandMore sx={{ color: '#999' }} />}
            </Box>

            {/* Day content */}
            <Collapse in={expandedId === j.id}>
              <Box sx={{ p: 2.5 }}>
                {j.notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>{j.notes}</Typography>
                )}
                <KourelsInvitesSection journee={j} kourels={kourels} isAdmin={isAdmin} />
              </Box>
            </Collapse>
          </Card>
        ))
      )}

      {/* Form dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: C.vertFonce, fontWeight: 700 }}>{editingId ? 'Modifier la journée' : 'Ajouter une journée'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Nom *" value={form.nom} onChange={setF('nom')} placeholder="Ex: 17 Safar" /></Grid>
            <Grid item xs={6}><TextField fullWidth type="date" label="Date" value={form.date} onChange={setF('date')} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField fullWidth type="number" label="Ordre" value={form.ordre} onChange={setF('ordre')} inputProps={{ min: 0 }} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Notes" value={form.notes} onChange={setF('notes')} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setOpenForm(false)} sx={{ color: '#666' }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.nom}
            sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, fontWeight: 700 }}>
            {saving ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : (editingId ? 'Enregistrer' : 'Ajouter')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function EvenementsOrganisation({ onBack }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role?.startsWith('jewrine_')
  const [evenements, setEvenements] = useState([])
  const [kourels, setKourels] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [openForm, setOpenForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openDelete, setOpenDelete] = useState(null)
  const [form, setForm] = useState({ nom: '', type_evenement: 'autre', annee: new Date().getFullYear(), lieu: '', description: '', notes: '' })

  const loadEvenements = async () => {
    setLoading(true)
    try {
      const [evRes, kRes] = await Promise.all([
        api.get('/organisation/evenements/'),
        api.get('/conservatoire/kourels/'),
      ])
      setEvenements(evRes.data.results || evRes.data)
      setKourels(kRes.data.results || kRes.data)
    } catch {
      setEvenements([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEvenements() }, [])

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({ nom: '', type_evenement: 'autre', annee: new Date().getFullYear(), lieu: '', description: '', notes: '' })
    setOpenForm(true)
  }

  const handleOpenEdit = (ev) => {
    setEditingId(ev.id)
    setForm({ nom: ev.nom, type_evenement: ev.type_evenement, annee: ev.annee, lieu: ev.lieu || '', description: ev.description || '', notes: ev.notes || '' })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.nom) { setMessage({ type: 'error', text: 'Le nom est requis.' }); return }
    setSaving(true)
    try {
      const payload = { ...form, annee: Number(form.annee) }
      if (editingId) {
        await api.patch(`/organisation/evenements/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Événement modifié.' })
      } else {
        await api.post('/organisation/evenements/', payload)
        setMessage({ type: 'success', text: 'Événement créé.' })
      }
      await loadEvenements()
      setOpenForm(false)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!openDelete) return
    setSaving(true)
    try {
      await api.delete(`/organisation/evenements/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Événement supprimé.' })
      if (selectedEvent?.id === openDelete.id) setSelectedEvent(null)
      await loadEvenements()
      setOpenDelete(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  const setF = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }))

  // Detail view for a selected event
  if (selectedEvent) {
    const ti = typeInfo(selectedEvent.type_evenement)
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={1.5} mb={3}>
          <IconButton onClick={() => setSelectedEvent(null)} sx={{ color: C.vert }}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Chip label={ti.label} size="small" sx={{ bgcolor: `${ti.color}20`, color: ti.color, fontWeight: 700, border: 'none' }} />
              <Typography variant="h5" sx={{ color: C.vert, fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}>
                {selectedEvent.nom}
              </Typography>
              <Chip label={selectedEvent.annee} size="small" sx={{ bgcolor: `${C.vert}15`, color: C.vert, fontWeight: 600 }} />
            </Box>
            {selectedEvent.lieu && (
              <Typography variant="body2" color="text.secondary" mt={0.25}>{selectedEvent.lieu}</Typography>
            )}
          </Box>
          {isAdmin && (
            <Box ml="auto" display="flex" gap={1}>
              <Button size="small" startIcon={<Edit />} variant="outlined" onClick={() => handleOpenEdit(selectedEvent)}
                sx={{ borderColor: `${C.vert}50`, color: C.vert, borderRadius: 2 }}>
                Modifier
              </Button>
              <Button size="small" startIcon={<Delete />} color="error" variant="outlined" onClick={() => setOpenDelete(selectedEvent)}
                sx={{ borderRadius: 2 }}>
                Supprimer
              </Button>
            </Box>
          )}
        </Box>
        {selectedEvent.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontStyle: 'italic' }}>{selectedEvent.description}</Typography>
        )}
        <JourneesSection evenement={selectedEvent} kourels={kourels} isAdmin={isAdmin} />
      </Box>
    )
  }

  // Events list
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          {onBack && <IconButton onClick={onBack} sx={{ color: C.vert }}><ArrowBack /></IconButton>}
          <Box>
            <Typography variant="h5" sx={{ color: C.vert, fontWeight: 700, fontFamily: '"Cormorant Garamond", serif' }}>
              Organisation des Événements
            </Typography>
            <Typography variant="body2" color="text.secondary">Magal, Gamou, Ziarra — gestion des journées et kourels invités</Typography>
          </Box>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}
            sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, fontWeight: 700 }}>
            Nouvel événement
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress sx={{ color: C.vert }} /></Box>
      ) : evenements.length === 0 ? (
        <Box textAlign="center" py={8} sx={{ bgcolor: `${C.vert}04`, borderRadius: 3, border: `1px dashed ${C.vert}30` }}>
          <EventNote sx={{ fontSize: 60, color: '#CCC', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>Aucun événement organisé</Typography>
          {isAdmin && <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, mt: 1 }}>Créer le premier événement</Button>}
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {evenements.map(ev => {
            const ti = typeInfo(ev.type_evenement)
            return (
              <Grid item xs={12} sm={6} md={4} key={ev.id}>
                <Card sx={{
                  borderRadius: 2.5, height: '100%', cursor: 'pointer',
                  border: `1px solid ${ti.color}25`,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 28px ${ti.color}30` },
                }} onClick={() => setSelectedEvent(ev)}>
                  <Box sx={{ height: 5, background: `linear-gradient(90deg, ${ti.color} 0%, ${ti.color}80 100%)`, borderRadius: '8px 8px 0 0' }} />
                  <CardContent sx={{ p: 2.5 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Chip label={ti.label} size="small" sx={{ bgcolor: `${ti.color}20`, color: ti.color, fontWeight: 700, fontSize: '0.7rem', border: 'none' }} />
                      <Chip label={ev.annee} size="small" sx={{ bgcolor: `${C.vert}12`, color: C.vert, fontWeight: 600, fontSize: '0.7rem' }} />
                    </Box>
                    <Typography variant="h6" sx={{ color: C.vert, fontWeight: 700, fontFamily: '"Cormorant Garamond", serif', mb: 0.5 }}>
                      {ev.nom}
                    </Typography>
                    {ev.lieu && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{ev.lieu}</Typography>}
                    {ev.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {ev.description}
                      </Typography>
                    )}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                      <Chip icon={<CalendarMonth sx={{ fontSize: 12 }} />} label={`${ev.nb_journees} journée${ev.nb_journees > 1 ? 's' : ''}`} size="small" sx={{ bgcolor: `${C.vert}10`, color: C.vertFonce, fontWeight: 600, fontSize: '0.68rem' }} />
                      <Box display="flex" gap={0.5} onClick={e => e.stopPropagation()}>
                        {isAdmin && (
                          <>
                            <IconButton size="small" onClick={() => handleOpenEdit(ev)} sx={{ color: C.vert, '&:hover': { bgcolor: `${C.vert}15` } }}><Edit sx={{ fontSize: 16 }} /></IconButton>
                            <IconButton size="small" onClick={() => setOpenDelete(ev)} sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(211,47,47,0.1)' } }}><Delete sx={{ fontSize: 16 }} /></IconButton>
                          </>
                        )}
                        <Tooltip title="Voir les journées" arrow>
                          <IconButton size="small" onClick={() => setSelectedEvent(ev)} sx={{ color: C.vert, '&:hover': { bgcolor: `${C.or}20` } }}>
                            <ArrowForward sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Form dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: `${C.vert}08`, borderBottom: `1px solid ${C.vert}1A`, fontWeight: 700, color: C.vertFonce }}>
          {editingId ? 'Modifier l\'événement' : 'Nouvel événement'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Nom de l'événement *" value={form.nom} onChange={setF('nom')} placeholder="Ex: Magal de Touba 2025" /></Grid>
            <Grid item xs={6}>
              <TextField select fullWidth label="Type" value={form.type_evenement} onChange={setF('type_evenement')}>
                {TYPE_EVENT.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth type="number" label="Année" value={form.annee} onChange={setF('annee')} inputProps={{ min: 2020, max: 2100 }} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Lieu" value={form.lieu} onChange={setF('lieu')} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Description" value={form.description} onChange={setF('description')} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Notes" value={form.notes} onChange={setF('notes')} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenForm(false)} sx={{ color: '#666' }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, fontWeight: 700, px: 3 }}>
            {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : (editingId ? 'Enregistrer' : 'Créer')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)} maxWidth="xs">
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>Supprimer cet événement ?</DialogTitle>
        <DialogContent>
          {openDelete && <Typography>Supprimer <strong>{openDelete.nom}</strong> ? Toutes les journées et kourels invités seront supprimés.</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setOpenDelete(null)} sx={{ color: '#666' }}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving} sx={{ borderRadius: 2, fontWeight: 700 }}>
            {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
