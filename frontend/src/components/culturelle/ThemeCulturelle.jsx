import { useState, useEffect } from 'react'
import {
  Box, Typography, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Chip, Paper,
} from '@mui/material'
import { Add, Edit, Delete, Visibility, AutoStories, PictureAsPdf, Mic, Videocam } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { getMediaUrl } from '../../services/media'
import usePagination from '../../hooks/usePagination'
import TablePaginationFr from '../ui/TablePaginationFr'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }
const CATEGORIES = [
  { value: 'coran', label: 'Coran et Tafsir' },
  { value: 'hadith', label: 'Hadith' },
  { value: 'fiqh', label: 'Fiqh (Jurisprudence)' },
  { value: 'aqida', label: 'Aqida (Croyance)' },
  { value: 'sira', label: 'Sira (Vie du Prophète)' },
  { value: 'akhlaq', label: 'Akhlaq (Morale)' },
  { value: 'khassaida', label: 'Khassaïd' },
  { value: 'autre', label: 'Autre' },
]

export default function ThemeCulturelle() {
  const { user, peut } = useAuth()
  const canManage = user?.role === 'admin' || user?.role === 'jewrin' || user?.role === 'jewrine_culturelle' || peut('culturelle', 'gerer')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [categorieFilter, setCategorieFilter] = useState('')

  const [openForm, setOpenForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ titre: '', categorie: 'autre', contenu: '', tags: '', fichier_pdf: null, fichier_audio: null, fichier_video: null })
  const [saving, setSaving] = useState(false)
  const [openDelete, setOpenDelete] = useState(null)
  const [detail, setDetail] = useState(null)

  const loadList = () => {
    setLoading(true)
    api.get('/culturelle/enseignements/', { params: { page_size: 500 } })
      .then(({ data }) => setList(data.results || data))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadList() }, [])

  const filtered = list.filter((t) => !categorieFilter || t.categorie === categorieFilter)
  const { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate } = usePagination(filtered.length)

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({ titre: '', categorie: 'autre', contenu: '', tags: '', fichier_pdf: null, fichier_audio: null, fichier_video: null })
    setMessage({ type: '', text: '' })
    setOpenForm(true)
  }

  const handleOpenEdit = (t) => {
    setEditingId(t.id)
    setForm({ titre: t.titre, categorie: t.categorie, contenu: t.contenu, tags: t.tags || '', fichier_pdf: null, fichier_audio: null, fichier_video: null })
    setMessage({ type: '', text: '' })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.titre.trim() || !form.contenu.trim()) {
      setMessage({ type: 'error', text: 'Titre et contenu requis.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = new FormData()
      payload.append('titre', form.titre.trim())
      payload.append('categorie', form.categorie)
      payload.append('contenu', form.contenu)
      payload.append('tags', form.tags || '')
      if (form.fichier_pdf) payload.append('fichier_pdf', form.fichier_pdf)
      if (form.fichier_audio) payload.append('fichier_audio', form.fichier_audio)
      if (form.fichier_video) payload.append('fichier_video', form.fichier_video)
      if (editingId) {
        await api.patch(`/culturelle/enseignements/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Thème modifié.' })
      } else {
        await api.post('/culturelle/enseignements/', payload)
        setMessage({ type: 'success', text: 'Thème créé.' })
      }
      loadList()
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
      await api.delete(`/culturelle/enseignements/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Thème supprimé.' })
      loadList()
      setOpenDelete(null)
      setDetail(null)
    } catch {
      setMessage({ type: 'error', text: 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: C.vert, fontWeight: 600, fontSize: { xs: '1.5rem', sm: '2.125rem' } }} gutterBottom>Thème culturel</Typography>
          <Typography variant="body2" sx={{ color: C.vertFonce }}>Thèmes culturels et religieux déjà traités par la daara</Typography>
        </Box>
        {canManage && (
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            Ajouter un thème
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField select size="small" label="Catégorie" value={categorieFilter} onChange={(e) => setCategorieFilter(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">Toutes</MenuItem>
          {CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
        </TextField>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <AutoStories sx={{ fontSize: 56, color: 'action.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="h6">Aucun thème enregistré</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${C.or}30` }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, color: C.vertFonce, bgcolor: `${C.vert}08`, whiteSpace: 'nowrap' } }}>
                <TableCell>Titre</TableCell>
                <TableCell>Catégorie</TableCell>
                <TableCell>Auteur</TableCell>
                <TableCell>Publié le</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginate(filtered).map((t) => (
                <TableRow key={t.id} hover onClick={() => setDetail(t)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ fontWeight: 600, color: C.vert }}>{t.titre}</TableCell>
                  <TableCell>
                    <Chip label={t.categorie_display} size="small" sx={{ bgcolor: `${C.vert}15`, color: C.vert, fontWeight: 600 }} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.auteur_nom || '—'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(t.date_publication).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={() => setDetail(t)} sx={{ color: C.vertFonce }}><Visibility fontSize="small" /></IconButton>
                    {canManage && (
                      <>
                        <IconButton size="small" onClick={() => handleOpenEdit(t)} sx={{ color: C.vert }}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => setOpenDelete(t)}><Delete fontSize="small" /></IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePaginationFr
            count={filtered.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      )}

      {/* Détail du thème */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        {detail && (
          <>
            <DialogTitle sx={{ color: C.vert }}>
              <Chip label={detail.categorie_display} size="small" sx={{ bgcolor: `${C.vert}15`, color: C.vert, fontWeight: 600, mb: 1 }} />
              <Typography variant="h6" sx={{ color: C.vert, fontWeight: 700 }}>{detail.titre}</Typography>
              <Typography variant="caption" color="text.secondary">
                {detail.auteur_nom} · {new Date(detail.date_publication).toLocaleDateString('fr-FR')}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{detail.contenu}</Typography>
              {detail.tags && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                  {detail.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {detail.fichier_audio && (
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: C.vertFonce, display: 'flex', alignItems: 'center', gap: 0.5 }}><Mic fontSize="small" /> Audio</Typography>
                    <audio controls src={getMediaUrl(detail.fichier_audio)} style={{ width: '100%', height: 36 }} />
                  </Box>
                )}
                {detail.fichier_video && (
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: C.vertFonce, display: 'flex', alignItems: 'center', gap: 0.5 }}><Videocam fontSize="small" /> Vidéo</Typography>
                    <video controls src={getMediaUrl(detail.fichier_video)} style={{ width: '100%', maxHeight: 260 }} />
                  </Box>
                )}
                {detail.fichier_pdf && (
                  <Button startIcon={<PictureAsPdf />} href={getMediaUrl(detail.fichier_pdf)} target="_blank" rel="noopener noreferrer" sx={{ alignSelf: 'flex-start', color: C.vert }}>
                    Ouvrir le document PDF
                  </Button>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              {canManage && (
                <>
                  <Button startIcon={<Edit />} onClick={() => { setDetail(null); handleOpenEdit(detail) }} sx={{ color: C.vert }}>Modifier</Button>
                  <Button startIcon={<Delete />} color="error" onClick={() => setOpenDelete(detail)}>Supprimer</Button>
                </>
              )}
              <Button onClick={() => setDetail(null)}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Formulaire ajout/édition */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: C.vert }}>{editingId ? 'Modifier le thème' : 'Ajouter un thème culturel'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField fullWidth label="Titre" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} required />
            <TextField select fullWidth label="Catégorie" value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}>
              {CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>
            <TextField fullWidth label="Contenu" value={form.contenu} onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))} multiline rows={6} required />
            <TextField fullWidth label="Tags (séparés par des virgules)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="ex : ramadan, jeûne, spiritualité" />
            <Button component="label" variant="outlined" sx={{ borderColor: C.vert, color: C.vert }}>
              {form.fichier_pdf ? form.fichier_pdf.name : 'Joindre un PDF (optionnel)'}
              <input type="file" hidden accept="application/pdf" onChange={(e) => setForm((f) => ({ ...f, fichier_pdf: e.target.files?.[0] || null }))} />
            </Button>
            <Button component="label" variant="outlined" sx={{ borderColor: C.vert, color: C.vert }}>
              {form.fichier_audio ? form.fichier_audio.name : 'Joindre un audio (optionnel)'}
              <input type="file" hidden accept="audio/*" onChange={(e) => setForm((f) => ({ ...f, fichier_audio: e.target.files?.[0] || null }))} />
            </Button>
            <Button component="label" variant="outlined" sx={{ borderColor: C.vert, color: C.vert }}>
              {form.fichier_video ? form.fichier_video.name : 'Joindre une vidéo (optionnel)'}
              <input type="file" hidden accept="video/*" onChange={(e) => setForm((f) => ({ ...f, fichier_video: e.target.files?.[0] || null }))} />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            {saving ? <CircularProgress size={20} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
        <DialogTitle>Supprimer ce thème ?</DialogTitle>
        <DialogContent>{openDelete && <Typography>Supprimer « {openDelete.titre} » ?</Typography>}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>{saving ? <CircularProgress size={20} /> : 'Supprimer'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
