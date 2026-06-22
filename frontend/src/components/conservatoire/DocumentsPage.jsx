import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Alert, CircularProgress, Chip, InputAdornment,
} from '@mui/material'
import { ArrowBack, Add, Edit, Delete, Download, Description, Search } from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'
import { useAuth } from '../../context/AuthContext'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

const TYPE_LABELS = {
  livre: 'Livre', article: 'Article', these: 'Thèse',
  memoire: 'Mémoire', rapport: 'Rapport', guide: 'Guide', autre: 'Autre',
}
const TYPE_COLORS = {
  livre: '#1565C0', article: '#2E7D32', these: '#6A1B9A',
  memoire: '#E65100', rapport: '#00695C', guide: '#F57F17', autre: '#37474F',
}

export default function DocumentsPage({ onBack }) {
  const { user } = useAuth()
  const canManage = user?.role === 'admin' || user?.role === 'jewrin' || user?.role === 'jewrine_conservatoire'
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ titre: '', auteur: '', description: '' })
  const [file, setFile] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = () => api.get('/conservatoire/documents/')
    .then(({ data }) => setDocs(data.results || data))
    .catch(() => setDocs([]))
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditId(null); setForm({ titre: '', auteur: '', description: '' }); setFile(null); setOpenForm(true) }
  const openEdit = (d) => { setEditId(d.id); setForm({ titre: d.titre, auteur: d.auteur, description: d.description || '' }); setFile(null); setOpenForm(true) }

  const handleSave = async () => {
    if (!form.titre || !form.auteur) { setMsg({ type: 'error', text: 'Titre et auteur requis.' }); return }
    if (!editId && !file) { setMsg({ type: 'error', text: 'Fichier requis.' }); return }
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      if (editId) {
        await api.patch(`/conservatoire/documents/${editId}/`, { ...form, type_document: 'autre' })
        setMsg({ type: 'success', text: 'Document modifié.' })
      } else {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => v && fd.append(k, v))
        fd.append('type_document', form.type_document || 'autre')
        fd.append('fichier', file)
        await api.post('/conservatoire/documents/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setMsg({ type: 'success', text: 'Document ajouté.' })
      }
      load(); setOpenForm(false)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMsg({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await api.delete(`/conservatoire/documents/${deleteTarget}/`)
      setMsg({ type: 'success', text: 'Document supprimé.' }); load(); setDeleteTarget(null)
    } catch { setMsg({ type: 'error', text: 'Erreur suppression.' }) }
    finally { setSaving(false) }
  }

  const filtered = docs.filter(d =>
    !search || d.titre?.toLowerCase().includes(search.toLowerCase()) ||
    d.auteur?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={onBack} sx={{ bgcolor: `${C.vert}12`, '&:hover': { bgcolor: `${C.vert}22` } }}>
          <ArrowBack sx={{ color: C.vert }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ color: C.vert, fontWeight: 700 }}>Documents</Typography>
          <Typography variant="body2" color="text.secondary">Bibliothèque numérique — {docs.length} document(s)</Typography>
        </Box>
        {canManage && (
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}
            sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2 }}>
            Ajouter
          </Button>
        )}
      </Box>

      {msg.text && <Alert severity={msg.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMsg({ type: '', text: '' })}>{msg.text}</Alert>}

      {/* Search */}
      <TextField
        fullWidth size="small" placeholder="Rechercher par titre ou auteur..."
        value={search} onChange={e => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: C.vert, fontSize: 20 }} /></InputAdornment> }}
        sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: C.vert }} /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Description sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="h6">{search ? 'Aucun résultat' : 'Aucun document'}</Typography>
          <Typography color="text.secondary" variant="body2">
            {canManage ? 'Cliquez sur "Ajouter" pour déposer un document.' : 'Aucun document disponible.'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(d => (
            <Grid item xs={12} sm={6} md={4} key={d.id}>
              <Card sx={{
                height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2,
                borderTop: `4px solid ${TYPE_COLORS[d.type_document] || C.or}`,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 4 },
              }}>
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ color: C.vert, fontWeight: 600, lineHeight: 1.3, fontSize: '1rem' }}>
                        {d.titre}
                      </Typography>
                    </Box>
                    {d.type_document && (
                      <Chip
                        label={TYPE_LABELS[d.type_document] || d.type_document}
                        size="small"
                        sx={{ bgcolor: `${TYPE_COLORS[d.type_document] || C.or}18`, color: TYPE_COLORS[d.type_document] || C.vertFonce, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ color: C.vertFonce }}>
                    <strong>Auteur :</strong> {d.auteur}
                  </Typography>
                  {d.description && (
                    <Typography variant="body2" color="text.secondary" sx={{
                      flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {d.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1.5, flexWrap: 'wrap' }}>
                    {d.fichier && (
                      <Button
                        size="small" variant="contained" startIcon={<Download />}
                        href={getMediaUrl(d.fichier)} target="_blank" rel="noopener noreferrer"
                        sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, flex: 1, borderRadius: 1.5 }}
                      >
                        Télécharger
                      </Button>
                    )}
                    {canManage && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => openEdit(d)} sx={{ color: C.vert }}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(d.id)}><Delete fontSize="small" /></IconButton>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Form dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: C.vert }}>{editId ? 'Modifier le document' : 'Ajouter un document'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Titre *" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Auteur *" value={form.auteur} onChange={e => setForm(f => ({ ...f, auteur: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" multiline rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </Grid>
            {!editId && (
              <Grid item xs={12}>
                <Box sx={{ border: `2px dashed ${C.or}`, borderRadius: 2, p: 2, textAlign: 'center' }}>
                  <Button variant="outlined" component="label" sx={{ borderColor: C.vert, color: C.vert }}>
                    Choisir un fichier
                    <input type="file" hidden onChange={e => setFile(e.target.files?.[0])} accept=".pdf,.doc,.docx,.txt,.odt" />
                  </Button>
                  {file ? (
                    <Typography variant="body2" sx={{ mt: 1, color: C.vert }}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>PDF, DOC, DOCX, TXT, ODT</Typography>
                  )}
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            {saving ? <CircularProgress size={20} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Supprimer ce document ?</DialogTitle>
        <DialogContent><Typography>Cette action est irréversible.</Typography></DialogContent>
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
