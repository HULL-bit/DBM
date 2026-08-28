import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  Avatar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Add, Delete, Favorite, FavoriteBorder, Bookmark, BookmarkBorder, Comment as CommentIcon, Feed as FeedIcon, MoreVert, ArrowBack } from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

function initials(nom) {
  if (!nom) return '?'
  const parts = nom.trim().split(' ')
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : (parts[0]?.[0] || '?').toUpperCase()
}

function MediaTile({ media, single, maxHeight }) {
  const url = getMediaUrl(media.image)
  const commonSx = single
    ? { width: '100%', maxHeight, objectFit: 'contain', bgcolor: '#000', display: 'block' }
    : { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
  if (media.type_media === 'video') {
    return <Box component="video" src={url} controls sx={commonSx} />
  }
  return <Box component="img" src={url} alt="" loading="lazy" sx={commonSx} />
}

/** Grille de médias façon Facebook : un seul média en pleine largeur, plusieurs en grille
 * carrée à colonnes égales, sans bordure ni cadre — collé aux bords de la carte. */
function MediaGrid({ images, isMobile }) {
  if (!images || images.length === 0) return null
  if (images.length === 1) {
    return <MediaTile media={images[0]} single maxHeight={isMobile ? '65vh' : '520px'} />
  }
  const cols = images.length === 2 ? 2 : images.length === 3 ? 3 : 2
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '2px' }}>
      {images.slice(0, 4).map((img, i) => (
        <Box key={img.id} sx={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', gridColumn: images.length === 3 && i === 0 ? 'span 1' : undefined }}>
          <MediaTile media={img} />
          {i === 3 && images.length > 4 && (
            <Box sx={{
              position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 700,
            }}>
              +{images.length - 4}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  )
}

export default function News() {
  const { user, peut } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const canManage = user?.role === 'admin' || user?.role === 'jewrine_communication' || peut('informations', 'gerer')

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [filtreAuteur, setFiltreAuteur] = useState(null) // { id, nom }
  const [menuAnchor, setMenuAnchor] = useState(null) // { el, post }

  const [openCreate, setOpenCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ titre: '', contenu: '', est_publie: true, images: [] })

  const [openComments, setOpenComments] = useState(null) // post
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')

  const loadList = () => {
    setLoading(true)
    api.get('/informations/news/', { params: filtreAuteur ? { auteur: filtreAuteur.id } : {} })
      .then(({ data }) => setList(data.results || data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadList() }, [filtreAuteur])

  const voirPublicationsDe = (post) => {
    if (!post.auteur) return
    setFiltreAuteur({ id: post.auteur, nom: post.auteur_nom })
  }

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
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 640, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, px: { xs: 0.5, md: 0 } }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600, fontSize: { xs: '1.4rem', md: '2.125rem' } }} gutterBottom>
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

      {filtreAuteur && (
        <Card sx={{ mb: 2, p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderRadius: 2, bgcolor: `${COLORS.vert}0d` }}>
          <IconButton size="small" onClick={() => setFiltreAuteur(null)} sx={{ color: COLORS.vert }}>
            <ArrowBack fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce, fontWeight: 600 }}>
            Publications de {filtreAuteur.nom}
          </Typography>
        </Card>
      )}

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
      ) : list.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {filtreAuteur ? `${filtreAuteur.nom} n'a publié aucune actualité.` : 'Aucune actualité.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {list.map((post) => {
            const photoUrl = post.auteur_photo ? getMediaUrl(post.auteur_photo, post.auteur_photo_updated_at ? `v=${post.auteur_photo_updated_at}` : '') : null
            return (
              <Card key={post.id} sx={{ borderRadius: { xs: 0, sm: 2 }, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Avatar
                    src={photoUrl}
                    onClick={() => voirPublicationsDe(post)}
                    sx={{ width: 44, height: 44, bgcolor: COLORS.vert, cursor: post.auteur ? 'pointer' : 'default' }}
                  >
                    {initials(post.auteur_nom)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      onClick={() => voirPublicationsDe(post)}
                      sx={{ fontWeight: 700, fontSize: '0.9rem', color: COLORS.vertFonce, cursor: post.auteur ? 'pointer' : 'default', '&:hover': post.auteur ? { textDecoration: 'underline' } : undefined }}
                      noWrap
                    >
                      {post.auteur_nom || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {post.date_creation ? new Date(post.date_creation).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </Typography>
                  </Box>
                  {canManage && (
                    <IconButton size="small" onClick={(e) => setMenuAnchor({ el: e.currentTarget, post })}>
                      <MoreVert fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                {post.titre && (
                  <Typography sx={{ px: 1.5, pb: 0.5, fontWeight: 700, color: COLORS.vert }}>
                    {post.titre}
                  </Typography>
                )}
                {post.contenu && (
                  <Typography variant="body2" sx={{ px: 1.5, pb: 1.5, whiteSpace: 'pre-wrap' }}>
                    {post.contenu}
                  </Typography>
                )}

                <MediaGrid images={post.images} isMobile={isMobile} />

                {(post.nb_likes > 0 || post.nb_comments > 0) && (
                  <Box sx={{ px: 1.5, py: 0.75, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      {post.nb_likes > 0 ? `👍 ${post.nb_likes}` : ''}
                    </Typography>
                    {post.nb_comments > 0 && (
                      <Typography
                        variant="caption" color="text.secondary"
                        sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => handleOpenComments(post)}
                      >
                        {post.nb_comments} commentaire{post.nb_comments > 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Box>
                )}

                <Divider />
                <Box sx={{ display: 'flex' }}>
                  <Button
                    onClick={() => handleToggleLike(post)}
                    startIcon={post.is_liked ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
                    sx={{ flex: 1, borderRadius: 0, py: 1, color: post.is_liked ? COLORS.vert : 'text.secondary', fontWeight: 600, fontSize: '0.8rem' }}
                  >
                    J'aime
                  </Button>
                  <Button
                    onClick={() => handleOpenComments(post)}
                    startIcon={<CommentIcon fontSize="small" />}
                    sx={{ flex: 1, borderRadius: 0, py: 1, color: 'text.secondary', fontWeight: 600, fontSize: '0.8rem' }}
                  >
                    Commenter
                  </Button>
                  <Button
                    onClick={() => handleToggleBookmark(post)}
                    startIcon={post.is_bookmarked ? <Bookmark fontSize="small" /> : <BookmarkBorder fontSize="small" />}
                    sx={{ flex: 1, borderRadius: 0, py: 1, color: post.is_bookmarked ? COLORS.vert : 'text.secondary', fontWeight: 600, fontSize: '0.8rem' }}
                  >
                    Enregistrer
                  </Button>
                </Box>
              </Card>
            )
          })}
        </Box>
      )}

      <Menu anchorEl={menuAnchor?.el} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => { handleDelete(menuAnchor.post); setMenuAnchor(null) }}
          sx={{ color: '#c62828' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} /> Supprimer
        </MenuItem>
      </Menu>

      {/* Create dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Publier une actualité</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField fullWidth label="Titre (optionnel)" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} />
            <TextField fullWidth label="Contenu (optionnel)" value={form.contenu} onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))} multiline rows={5} />
            <Button variant="outlined" component="label" sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
              Ajouter des images ou vidéos
              <input hidden type="file" multiple accept="image/*,video/*" onChange={(e) => setForm((f) => ({ ...f, images: Array.from(e.target.files || []) }))} />
            </Button>
            {form.images?.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {form.images.length} fichier(s) sélectionné(s)
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
                <Box key={c.id} sx={{ display: 'flex', gap: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: COLORS.vert, fontSize: '0.75rem', flexShrink: 0 }}>
                    {initials(c.membre_nom)}
                  </Avatar>
                  <Box sx={{ p: 1.25, borderRadius: 3, bgcolor: '#f0f2f5', flex: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                      {c.membre_nom || `#${c.membre}`}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.texte}</Typography>
                  </Box>
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
    </Box>
  )
}
