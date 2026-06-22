import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Chip, Checkbox,
} from '@mui/material'
import { ArrowBack, Add, Edit, Delete, PhotoLibrary, Collections, Close, ZoomIn } from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'
import { useAuth } from '../../context/AuthContext'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

function LightBox({ photo, onClose, onPrev, onNext }) {
  if (!photo) return null
  return (
    <Box sx={{
      position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.92)', zIndex: 1400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <IconButton onClick={onClose} sx={{ position: 'absolute', top: 16, right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.15)' }}>
        <Close />
      </IconButton>
      {onPrev && (
        <IconButton onClick={e => { e.stopPropagation(); onPrev() }} sx={{ position: 'absolute', left: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.15)', fontSize: '2rem' }}>
          ‹
        </IconButton>
      )}
      <Box
        component="img" src={getMediaUrl(photo.fichier)} alt={photo.titre || ''} onClick={e => e.stopPropagation()}
        sx={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 2 }}
      />
      {onNext && (
        <IconButton onClick={e => { e.stopPropagation(); onNext() }} sx={{ position: 'absolute', right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.15)', fontSize: '2rem' }}>
          ›
        </IconButton>
      )}
      {photo.titre && (
        <Box sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', bgcolor: 'rgba(0,0,0,0.6)', px: 2, py: 0.75, borderRadius: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'white' }}>{photo.titre}</Typography>
        </Box>
      )}
    </Box>
  )
}

export default function GaleriePage({ onBack }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)
  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [openAlbum, setOpenAlbum] = useState(false)
  const [openPhoto, setOpenPhoto] = useState(false)
  const [editId, setEditId] = useState(null)
  const [albumForm, setAlbumForm] = useState({ titre: '', description: '', date_evenement: '', est_public: true })
  const [albumFile, setAlbumFile] = useState(null)
  const [photoForm, setPhotoForm] = useState({ album: '', titre: '', description: '', lieu: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = () => api.get('/conservatoire/albums/').then(({ data }) => setAlbums(data.results || data)).catch(() => setAlbums([])).finally(() => setLoading(false))
  const loadAlbum = async (id) => {
    try { const { data } = await api.get(`/conservatoire/albums/${id}/`); setSelectedAlbum(data) } catch { }
  }

  useEffect(() => { load() }, [])

  const handleSaveAlbum = async () => {
    if (!albumForm.titre || !albumForm.date_evenement) { setMsg({ type: 'error', text: 'Titre et date requis.' }); return }
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      if (editId) {
        if (albumFile) {
          const fd = new FormData()
          Object.entries(albumForm).forEach(([k, v]) => fd.append(k, v ?? ''))
          fd.append('couverture', albumFile)
          await api.patch(`/conservatoire/albums/${editId}/`, fd)
        } else {
          await api.patch(`/conservatoire/albums/${editId}/`, albumForm)
        }
        setMsg({ type: 'success', text: 'Album modifié.' })
      } else {
        const fd = new FormData()
        Object.entries(albumForm).forEach(([k, v]) => fd.append(k, v ?? ''))
        if (albumFile) fd.append('couverture', albumFile)
        await api.post('/conservatoire/albums/', fd)
        setMsg({ type: 'success', text: 'Album créé.' })
      }
      load(); setOpenAlbum(false); setEditId(null); setAlbumFile(null)
      if (selectedAlbum && editId === selectedAlbum.id) loadAlbum(editId)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMsg({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally { setSaving(false) }
  }

  const handleSavePhoto = async () => {
    if (!photoForm.album || !photoFile) { setMsg({ type: 'error', text: 'Album et photo requis.' }); return }
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      const fd = new FormData()
      fd.append('album', photoForm.album)
      fd.append('fichier', photoFile)
      if (photoForm.titre) fd.append('titre', photoForm.titre)
      if (photoForm.description) fd.append('description', photoForm.description)
      if (photoForm.lieu) fd.append('lieu', photoForm.lieu)
      await api.post('/conservatoire/photos/', fd)
      setMsg({ type: 'success', text: 'Photo ajoutée.' })
      await load()
      if (selectedAlbum && Number(photoForm.album) === selectedAlbum.id) loadAlbum(selectedAlbum.id)
      setOpenPhoto(false); setPhotoFile(null)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMsg({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally { setSaving(false) }
  }

  const handleDeleteAlbum = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await api.delete(`/conservatoire/albums/${deleteTarget}/`)
      setMsg({ type: 'success', text: 'Album supprimé.' })
      setAlbums(prev => prev.filter(a => a.id !== deleteTarget))
      if (selectedAlbum?.id === deleteTarget) setSelectedAlbum(null)
      setDeleteTarget(null)
    } catch { setMsg({ type: 'error', text: 'Erreur.' }) }
    finally { setSaving(false) }
  }

  const handleDeletePhoto = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await api.delete(`/conservatoire/photos/${deleteTarget}/`)
      setMsg({ type: 'success', text: 'Photo supprimée.' })
      if (selectedAlbum) loadAlbum(selectedAlbum.id)
      setDeleteTarget(null)
    } catch { setMsg({ type: 'error', text: 'Erreur.' }) }
    finally { setSaving(false) }
  }

  const photos = selectedAlbum?.photos || []
  const openLightbox = (photo, index) => { setLightboxPhoto(photo); setLightboxIndex(index) }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton
          onClick={() => { if (selectedAlbum) { setSelectedAlbum(null) } else { onBack() } }}
          sx={{ bgcolor: `${C.vert}12`, '&:hover': { bgcolor: `${C.vert}22` } }}
        >
          <ArrowBack sx={{ color: C.vert }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ color: C.vert, fontWeight: 700 }}>
            {selectedAlbum ? selectedAlbum.titre : 'Galerie'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedAlbum
              ? `${photos.length} photo(s) · ${new Date(selectedAlbum.date_evenement).toLocaleDateString('fr-FR')}`
              : `${albums.length} album(s)`}
          </Typography>
        </Box>
        {isAdmin && !selectedAlbum && (
          <Button variant="contained" startIcon={<Add />} onClick={() => { setEditId(null); setAlbumForm({ titre: '', description: '', date_evenement: new Date().toISOString().slice(0, 10), est_public: true }); setAlbumFile(null); setOpenAlbum(true) }}
            sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2 }}>
            Nouvel album
          </Button>
        )}
        {isAdmin && selectedAlbum && (
          <Button variant="outlined" startIcon={<Add />} onClick={() => { setPhotoForm({ album: selectedAlbum.id, titre: '', description: '', lieu: '' }); setPhotoFile(null); setOpenPhoto(true) }}
            sx={{ borderColor: C.vert, color: C.vert, borderRadius: 2 }}>
            Ajouter photo
          </Button>
        )}
      </Box>

      {msg.text && <Alert severity={msg.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMsg({ type: '', text: '' })}>{msg.text}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: C.vert }} /></Box>
      ) : !selectedAlbum ? (
        /* Album grid */
        albums.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <PhotoLibrary sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
            <Typography color="text.secondary" variant="h6">Aucun album</Typography>
            {isAdmin && <Typography color="text.secondary" variant="body2">Créez votre premier album photo.</Typography>}
          </Box>
        ) : (
          <Grid container spacing={2}>
            {albums.map(album => (
              <Grid item xs={12} sm={6} md={4} key={album.id}>
                <Card
                  onClick={() => { setSelectedAlbum(null); loadAlbum(album.id) }}
                  sx={{ cursor: 'pointer', borderRadius: 2.5, overflow: 'hidden', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}
                >
                  <Box sx={{ height: 180, bgcolor: `${C.vert}12`, position: 'relative', overflow: 'hidden' }}>
                    {getMediaUrl(album.couverture) ? (
                      <Box component="img" src={getMediaUrl(album.couverture)} alt={album.titre}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.05)' } }} />
                    ) : (
                      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PhotoLibrary sx={{ fontSize: 56, color: `${C.or}80` }} />
                      </Box>
                    )}
                    <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
                      <Chip label={`${album.photos?.length ?? 0} photo(s)`} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.7rem' }} />
                    </Box>
                  </Box>
                  <CardContent sx={{ py: 1.5, px: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: C.vert, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.titre}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(album.date_evenement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Typography>
                      </Box>
                      {isAdmin && (
                        <Box sx={{ display: 'flex', gap: 0.25, ml: 1 }}>
                          <IconButton size="small" onClick={e => { e.stopPropagation(); setEditId(album.id); setAlbumForm({ titre: album.titre, description: album.description || '', date_evenement: album.date_evenement?.slice(0, 10) || '', est_public: album.est_public ?? true }); setAlbumFile(null); setOpenAlbum(true) }} sx={{ color: C.vert }}><Edit fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); setDeleteTarget(album.id) }}><Delete fontSize="small" /></IconButton>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      ) : (
        /* Photo grid inside album */
        <>
          {selectedAlbum.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{selectedAlbum.description}</Typography>
          )}
          {photos.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Collections sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
              <Typography color="text.secondary" variant="h6">Aucune photo dans cet album</Typography>
              {isAdmin && <Typography color="text.secondary" variant="body2">Cliquez sur "Ajouter photo".</Typography>}
            </Box>
          ) : (
            <Grid container spacing={1.5}>
              {photos.map((photo, idx) => (
                <Grid item xs={6} sm={4} md={3} key={photo.id}>
                  <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', aspectRatio: '1', cursor: 'pointer', '&:hover .overlay': { opacity: 1 } }}>
                    <Box component="img" src={getMediaUrl(photo.fichier)} alt={photo.titre || ''}
                      onClick={() => openLightbox(photo, idx)}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.04)' } }} />
                    <Box className="overlay" sx={{
                      position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.45)',
                      opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                    }}>
                      <IconButton size="small" onClick={() => openLightbox(photo, idx)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)' }}>
                        <ZoomIn />
                      </IconButton>
                      {isAdmin && (
                        <IconButton size="small" onClick={() => setDeleteTarget(photo.id)} sx={{ color: 'white', bgcolor: 'rgba(255,0,0,0.3)' }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                  {photo.titre && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, px: 0.5, color: C.vertFonce, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {photo.titre}
                    </Typography>
                  )}
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Lightbox */}
      <LightBox
        photo={lightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
        onPrev={lightboxIndex > 0 ? () => { setLightboxIndex(i => i - 1); setLightboxPhoto(photos[lightboxIndex - 1]) } : null}
        onNext={lightboxIndex < photos.length - 1 ? () => { setLightboxIndex(i => i + 1); setLightboxPhoto(photos[lightboxIndex + 1]) } : null}
      />

      {/* Album form */}
      <Dialog open={openAlbum} onClose={() => setOpenAlbum(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: C.vert }}>{editId ? 'Modifier l\'album' : 'Nouvel album'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Titre *" value={albumForm.titre} onChange={e => setAlbumForm(f => ({ ...f, titre: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" multiline rows={2} value={albumForm.description} onChange={e => setAlbumForm(f => ({ ...f, description: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth type="date" label="Date *" value={albumForm.date_evenement} onChange={e => setAlbumForm(f => ({ ...f, date_evenement: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox checked={albumForm.est_public} onChange={e => setAlbumForm(f => ({ ...f, est_public: e.target.checked }))} sx={{ color: C.vert, '&.Mui-checked': { color: C.vert } }} />
                <Typography variant="body2">Album public</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Button variant="outlined" component="label" sx={{ borderColor: C.vert, color: C.vert }}>
                Photo de couverture
                <input type="file" accept="image/*" hidden onChange={e => setAlbumFile(e.target.files?.[0])} />
              </Button>
              {albumFile && <Typography variant="caption" sx={{ ml: 1 }}>{albumFile.name}</Typography>}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAlbum(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveAlbum} disabled={saving} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            {saving ? <CircularProgress size={20} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Photo form */}
      <Dialog open={openPhoto} onClose={() => setOpenPhoto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: C.vert }}>Ajouter une photo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField select fullWidth label="Album *" value={photoForm.album} onChange={e => setPhotoForm(f => ({ ...f, album: Number(e.target.value) }))}>
                {albums.map(a => <MenuItem key={a.id} value={a.id}>{a.titre}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Titre (optionnel)" value={photoForm.titre} onChange={e => setPhotoForm(f => ({ ...f, titre: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Lieu (optionnel)" value={photoForm.lieu} onChange={e => setPhotoForm(f => ({ ...f, lieu: e.target.value }))} /></Grid>
            <Grid item xs={12}>
              <Box sx={{ border: `2px dashed ${C.or}`, borderRadius: 2, p: 2, textAlign: 'center' }}>
                <Button variant="outlined" component="label" sx={{ borderColor: C.vert, color: C.vert }}>
                  Choisir une photo
                  <input type="file" accept="image/*" hidden onChange={e => setPhotoFile(e.target.files?.[0])} />
                </Button>
                {photoFile ? (
                  <Typography variant="body2" sx={{ mt: 1, color: C.vert }}>{photoFile.name}</Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>JPG, PNG, WebP</Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPhoto(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSavePhoto} disabled={saving || !photoFile} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            {saving ? <CircularProgress size={20} /> : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Confirmer la suppression ?</DialogTitle>
        <DialogContent><Typography>Cette action est irréversible.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={selectedAlbum ? handleDeletePhoto : handleDeleteAlbum} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
