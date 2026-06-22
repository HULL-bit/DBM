import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Alert, CircularProgress, InputAdornment, Fade,
} from '@mui/material'
import { ArrowBack, Add, Edit, Delete, Search, PlayArrow, Folder, MusicNote } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

const getLien = (a) => (a?.lien_telegramme_du_son || '').trim()
const toAbs = (url) => { const u = (url || '').trim(); if (!u) return ''; if (/^https?:\/\//i.test(u)) return u; return `https://${u}` }

export default function RepertoirePage({ onBack }) {
  const { user } = useAuth()
  const canManage = user?.role === 'admin' || user?.role === 'jewrin' || user?.role === 'jewrine_conservatoire'
  const [archives, setArchives] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ titre: '', evenement: '', date_evenement: '', lien_telegramme_du_son: '', description: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = () => api.get('/conservatoire/archives/')
    .then(({ data }) => setArchives(data.results || data))
    .catch(() => setArchives([]))
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditId(null)
    setForm({ titre: '', evenement: '', date_evenement: '', lien_telegramme_du_son: '', description: '' })
    setOpenForm(true)
  }
  const openEdit = (a) => {
    setEditId(a.id)
    setForm({ titre: a.titre, evenement: a.evenement || '', date_evenement: a.date_evenement?.slice(0, 10) || '', lien_telegramme_du_son: getLien(a), description: a.description || '' })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.titre || !form.lien_telegramme_du_son?.trim()) {
      setMsg({ type: 'error', text: 'Titre et lien Telegram requis.' }); return
    }
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      const dateVal = form.date_evenement || null
      const payload = {
        titre: form.titre.trim(), evenement: form.evenement.trim(), type_archive: 'autre',
        date_evenement: dateVal, annee: dateVal ? new Date(dateVal).getFullYear() : null,
        lien_telegramme_du_son: form.lien_telegramme_du_son.trim(), description: form.description.trim(),
      }
      if (editId) {
        await api.patch(`/conservatoire/archives/${editId}/`, payload)
        setArchives(prev => prev.map(a => a.id === editId ? { ...a, ...payload } : a))
        setMsg({ type: 'success', text: 'Entrée modifiée.' })
      } else {
        const { data } = await api.post('/conservatoire/archives/', payload)
        setArchives(prev => [{ ...data, ...payload }, ...prev])
        setMsg({ type: 'success', text: 'Entrée ajoutée.' })
      }
      setOpenForm(false)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMsg({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await api.delete(`/conservatoire/archives/${deleteTarget}/`)
      setArchives(prev => prev.filter(a => a.id !== deleteTarget))
      setMsg({ type: 'success', text: 'Entrée supprimée.' }); setDeleteTarget(null)
    } catch { setMsg({ type: 'error', text: 'Erreur.' }) }
    finally { setSaving(false) }
  }

  const filtered = archives.filter(a =>
    !search ||
    a.titre?.toLowerCase().includes(search.toLowerCase()) ||
    a.evenement?.toLowerCase().includes(search.toLowerCase())
  )

  const byYear = filtered.reduce((acc, a) => {
    const y = a.annee || (a.date_evenement ? new Date(a.date_evenement).getFullYear() : 'Sans date')
    ;(acc[y] = acc[y] || []).push(a)
    return acc
  }, {})
  const years = Object.keys(byYear).sort((a, b) => b - a)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={onBack} sx={{ bgcolor: `${C.vert}12`, '&:hover': { bgcolor: `${C.vert}22` } }}>
          <ArrowBack sx={{ color: C.vert }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ color: C.vert, fontWeight: 700 }}>Répertoire</Typography>
          <Typography variant="body2" color="text.secondary">Archives sonores — {archives.length} entrée(s)</Typography>
        </Box>
        {canManage && (
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}
            sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2 }}>
            Ajouter
          </Button>
        )}
      </Box>

      {msg.text && <Alert severity={msg.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMsg({ type: '', text: '' })}>{msg.text}</Alert>}

      <TextField
        fullWidth size="small" placeholder="Rechercher par titre ou événement..."
        value={search} onChange={e => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: C.vert, fontSize: 20 }} /></InputAdornment> }}
        sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: C.vert }} /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Folder sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="h6">{search ? 'Aucun résultat' : 'Répertoire vide'}</Typography>
        </Box>
      ) : years.map(year => (
        <Box key={year} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: C.or, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MusicNote sx={{ color: 'white', fontSize: 18 }} />
            </Box>
            <Typography variant="h6" sx={{ color: C.vertFonce, fontWeight: 700 }}>{year}</Typography>
            <Box sx={{ flex: 1, height: 1, bgcolor: `${C.or}40` }} />
            <Typography variant="caption" color="text.secondary">{byYear[year].length} entrée(s)</Typography>
          </Box>
          <Grid container spacing={2}>
            {byYear[year].map((a, idx) => (
              <Grid item xs={12} sm={6} md={4} key={a.id}>
                <Fade in timeout={300 + idx * 60}>
                  <Card sx={{
                    height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2,
                    borderLeft: `4px solid ${C.vert}`,
                    transition: 'all 0.2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
                  }}>
                    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: C.vertFonce }}>{a.titre}</Typography>
                      {a.evenement?.trim() && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          {a.evenement}
                        </Typography>
                      )}
                      {a.date_evenement && (
                        <Typography variant="caption" color="text.secondary">
                          {new Date(a.date_evenement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Typography>
                      )}
                      {a.description?.trim() && (
                        <Typography variant="body2" color="text.secondary" sx={{
                          flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {a.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button
                          component="a" href={toAbs(getLien(a))} target="_blank" rel="noopener noreferrer"
                          variant={getLien(a) ? 'contained' : 'outlined'} size="small" startIcon={<PlayArrow />}
                          disabled={!getLien(a)}
                          sx={{
                            ...(getLien(a) ? { bgcolor: '#0088cc', '&:hover': { bgcolor: '#006699' } } : {}),
                            borderRadius: 1.5, fontSize: '0.75rem',
                          }}
                        >
                          Écouter
                        </Button>
                        {canManage && (
                          <>
                            <IconButton size="small" onClick={() => openEdit(a)} sx={{ color: C.vert }}><Edit fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(a.id)}><Delete fontSize="small" /></IconButton>
                          </>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: C.vert }}>{editId ? 'Modifier l\'entrée' : 'Ajouter au répertoire'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Titre *" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Événement" value={form.evenement} onChange={e => setForm(f => ({ ...f, evenement: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth type="date" label="Date" value={form.date_evenement} onChange={e => setForm(f => ({ ...f, date_evenement: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Lien Telegram du son *" value={form.lien_telegramme_du_son} onChange={e => setForm(f => ({ ...f, lien_telegramme_du_son: e.target.value }))} placeholder="https://t.me/..." /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" multiline rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            {saving ? <CircularProgress size={20} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Supprimer cette entrée ?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
