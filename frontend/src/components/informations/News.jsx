import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  useMediaQuery,
  useTheme,
  ImageList,
  ImageListItem,
  Divider,
} from '@mui/material'
import { Add, Delete, Favorite, FavoriteBorder, Bookmark, BookmarkBorder, Comment as CommentIcon, Feed as FeedIcon } from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

export default function News() {
  const { user } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const canManage = user?.role === 'admin' || user?.role === 'jewrine_communication'

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })

  const [openCreate, setOpenCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ titre: '', contenu: '', est_publie: true, images: [] })

  const [openComments, setOpenComments] = useState(null) // post
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [openDetails, setOpenDetails] = useState(null) // post
  const [imageInfos, setImageInfos] = useState({})

  const loadList = () => {
    setLoading(true)
    api.get('/informations/news/')
      .then(({ data }) => setList(data.results || data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadList() }, [])

  const handleToggleLike = async (post) => {
    try {
      const endpoint = post.is_liked ? 'unlike' : 'like'
      await api.post(`/informations/news/${post.id}/${endpoint}/`)
      setList((prev) => prev.map((p) => (p.id !== post.id ? p : {
        ...p,
        is_liked: !p.is_liked,
        nb_likes: (Number(p.nb_likes) || 0) + (p.is_liked ? -1 : 1),
      })))
    } catch (_) {}
  }

  const handleToggleBookmark = async (post) => {
    try {
      const endpoint = post.is_bookmarked ? 'unbookmark' : 'bookmark'
      await api.post(`/informations/news/${post.id}/${endpoint}/`)
      setList((prev) => prev.map((p) => (p.id !== post.id ? p : { ...p, is_bookmarked: !p.is_bookmarked })))
    } catch (_) {}
  }

  const handleOpenComments = async (post) => {
    setOpenComments(post)
    setNewComment('')
    setComments([])
    setLoadingComments(true)
    try {
      const { data } = await api.get(`/informations/news/${post.id}/comments/`)
      setComments(data || [])
    } catch (_) {
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  const handleSendComment = async () => {
    if (!openComments) return
    const texte = (newComment || '').trim()
    if (!texte) return
    try {
      const { data } = await api.post(`/informations/news/${openComments.id}/comment/`, { texte })
      setComments((prev) => [...prev, data])
      setNewComment('')
      setList((prev) => prev.map((p) => (p.id !== openComments.id ? p : { ...p, nb_comments: (Number(p.nb_comments) || 0) + 1 })))
    } catch (_) {}
  }

  const handleCreate = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const fd = new FormData()
      fd.append('titre', form.titre)
      fd.append('contenu', form.contenu)
      fd.append('est_publie', String(!!form.est_publie))
      ;(form.images || []).forEach((f) => fd.append('images', f))
      await api.post('/informations/news/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setOpenCreate(false)
      setForm({ titre: '', contenu: '', est_publie: true, images: [] })
      setMessage({ type: 'success', text: 'Actualité publiée.' })
      loadList()
    } catch (err) {
      const d = err.response?.data?.detail || 'Erreur lors de la publication.'
      setMessage({ type: 'error', text: d })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (post) => {
    if (!post?.id) return
    try {
      await api.delete(`/informations/news/${post.id}/`)
      setMessage({ type: 'success', text: 'Actualité supprimée.' })
      setList((prev) => prev.filter((p) => p.id !== post.id))
    } catch (_) {
      setMessage({ type: 'error', text: 'Suppression impossible.' })
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>
            <FeedIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> News
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>
            Actualités et informations de la daara
          </Typography>
        </Box>
        {canManage && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Publier
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
      ) : list.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Aucune actualité.</Typography></Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {list.map((post) => (
            <Card key={post.id} sx={{ borderRadius: 2, overflow: 'hidden', borderLeft: `4px solid ${COLORS.or}` }}>
              <CardContent sx={{ pb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.vert, mb: 0.5 }}>
                      {post.titre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {post.auteur_nom || '—'} • {post.date_creation ? new Date(post.date_creation).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </Typography>
                  </Box>
                  {canManage && (
                    <IconButton size="small" onClick={() => handleDelete(post)} sx={{ color: '#c62828' }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>
                  {post.contenu}
                </Typography>

                {(post.images || []).length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <ImageList cols={isMobile ? 1 : Math.min(3, (post.images || []).length)} gap={8} rowHeight={isMobile ? 220 : 180} sx={{ m: 0 }}>
                      {(post.images || []).slice(0, isMobile ? 3 : 6).map((img) => (
                        <ImageListItem key={img.id}>
                          <Box
                            component="img"
                            src={getMediaUrl(img.image)}
                            alt=""
                            loading="lazy"
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1 }}
                          />
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </Box>
                )}
              </CardContent>

              <Divider />
              <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton onClick={() => handleToggleLike(post)} sx={{ color: post.is_liked ? '#c62828' : 'inherit' }}>
                    {post.is_liked ? <Favorite /> : <FavoriteBorder />}
                  </IconButton>
                  <Chip size="small" label={`${post.nb_likes ?? 0}`} sx={{ bgcolor: `${COLORS.or}30` }} />

                  <IconButton onClick={() => handleOpenComments(post)}>
                    <CommentIcon />
                  </IconButton>
                  <Chip size="small" label={`${post.nb_comments ?? 0}`} sx={{ bgcolor: `${COLORS.or}30` }} />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button size="small" onClick={() => setOpenDetails(post)}>Détails</Button>
                  <IconButton onClick={() => handleToggleBookmark(post)} sx={{ color: post.is_bookmarked ? COLORS.vert : 'inherit' }}>
                    {post.is_bookmarked ? <Bookmark /> : <BookmarkBorder />}
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Create dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Publier une actualité</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField fullWidth label="Titre (optionnel)" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} />
            <TextField fullWidth label="Contenu (optionnel)" value={form.contenu} onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))} multiline rows={5} />
            <Button variant="outlined" component="label" sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
              Ajouter des images
              <input hidden type="file" multiple accept="image/*" onChange={(e) => setForm((f) => ({ ...f, images: Array.from(e.target.files || []) }))} />
            </Button>
            {form.images?.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {form.images.length} image(s) sélectionnée(s)
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {saving ? <CircularProgress size={24} /> : 'Publier'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comments dialog */}
      <Dialog open={!!openComments} onClose={() => setOpenComments(null)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Commentaires</DialogTitle>
        <DialogContent>
          {loadingComments ? (
            <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>
          ) : comments.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>Aucun commentaire.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: 1 }}>
              {comments.map((c) => (
                <Box key={c.id} sx={{ p: 1.25, borderRadius: 2, bgcolor: '#fafafa', border: '1px solid #eee' }}>
                  <Typography variant="caption" color="text.secondary">
                    {c.membre_nom || `#${c.membre}`} • {c.date_creation ? new Date(c.date_creation).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{c.texte}</Typography>
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <TextField
              fullWidth
              placeholder="Écrire un commentaire…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendComment()
                }
              }}
              multiline
              minRows={1}
              maxRows={4}
            />
            <Button variant="contained" onClick={handleSendComment} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
              Envoyer
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenComments(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Details dialog */}
      <Dialog open={!!openDetails} onClose={() => setOpenDetails(null)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>Détails de l’actualité</DialogTitle>
        <DialogContent>
          {openDetails && (
            <Box sx={{ py: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.vert, mb: 0.5 }}>
                {openDetails.titre || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {openDetails.auteur_nom || '—'} • {openDetails.date_creation ? new Date(openDetails.date_creation).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
                {openDetails.contenu || 'Aucun texte.'}
              </Typography>

              {(openDetails.images || []).length > 0 && (
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(openDetails.images || []).map((img) => (
                    <Box key={img.id} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #eee', p: 1, bgcolor: '#fafafa' }}>
                      <Box
                        component="img"
                        src={getMediaUrl(img.image)}
                        alt=""
                        loading="lazy"
                        sx={{ width: '100%', maxHeight: 480, objectFit: 'contain', borderRadius: 1, display: 'block', mx: 'auto' }}
                        onLoad={(e) => {
                          const el = e.target
                          const w = el.naturalWidth
                          const h = el.naturalHeight
                          setImageInfos((prev) => ({ ...prev, [img.id]: { w, h } }))
                        }}
                      />
                      {imageInfos[img.id] && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                          {imageInfos[img.id].w} × {imageInfos[img.id].h} px
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetails(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

