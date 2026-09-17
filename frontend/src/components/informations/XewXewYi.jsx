import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  Avatar,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem as MenuOption,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Add, Delete, Edit, Event as EventIcon, Favorite, FavoriteBorder,
  Bookmark, BookmarkBorder, Comment as CommentIcon, MoreVert, ArrowBack,
} from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }
const TYPES_EVENEMENT = [
  { value: 'rencontre', label: 'Rencontre' },
  { value: 'ceremonie', label: 'Cérémonie' },
  { value: 'conference', label: 'Conférence' },
  { value: 'ziara', label: 'Ziara' },
  { value: 'formation', label: 'Formation' },
  { value: 'assemblee', label: 'Assemblée Générale' },
  { value: 'autre', label: 'Autre' },
]
const INITIAL_FORM_NEWS = { titre: '', contenu: '', est_publie: true, images: [] }
const INITIAL_FORM_EVT = {
  titre: '', description: '', type_evenement: 'rencontre', date_debut: '', date_fin: '',
  lieu: '', adresse_complete: '', lien_visio: '', capacite_max: '', est_publie: false,
}

function initials(nom) {
  if (!nom) return '?'
  const parts = nom.trim().split(' ')
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : (parts[0]?.[0] || '?').toUpperCase()
}

/** Normalise les médias d'une actualité ou d'un événement vers une forme commune
 * { id, type_media, url }, pour un rendu de grille unique quel que soit le type. */
function mediasNormalises(item) {
  if (item._type === 'news') {
    return (item.images || []).map((m) => ({ id: m.id, type_media: m.type_media, url: getMediaUrl(m.image) }))
  }
  const bruts = (item.medias && item.medias.length > 0) ? item.medias : (item.image ? [{ id: 'cover', type_media: 'image', fichier: item.image }] : [])
  return bruts.map((m) => ({ id: m.id, type_media: m.type_media, url: getMediaUrl(m.fichier || m.image) }))
}

function MediaGrid({ items, isMobile }) {
  if (!items || items.length === 0) return null
  const tile = (m, style) => (
    m.type_media === 'video'
      ? <Box component="video" src={m.url} controls sx={style} />
      : <Box component="img" src={m.url} alt="" loading="lazy" sx={style} />
  )
  if (items.length === 1) {
    return tile(items[0], { width: '100%', maxHeight: isMobile ? '65vh' : 480, objectFit: 'contain', bgcolor: '#000', display: 'block' })
  }
  const cols = items.length === 3 ? 3 : 2
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '2px' }}>
      {items.slice(0, 4).map((m, i) => (
        <Box key={m.id} sx={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden' }}>
          {tile(m, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' })}
          {i === 3 && items.length > 4 && (
            <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 700 }}>
              +{items.length - 4}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  )
}

/** Flux unique "Xew-Xew Yi" : mélange actualités et événements dans un seul fil chronologique
 * façon Facebook (l'utilisateur voit ça comme une seule et même chose). Chaque type garde ses
 * actions propres (bookmark pour une actualité, date/lieu/détails pour un événement) et son
 * propre formulaire de création (les champs diffèrent trop pour être unifiés), mais tout vit
 * dans un seul flux, avec les mêmes likes/commentaires partout. */
export default function XewXewYi() {
  const { user, peut } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const canManage = user?.role === 'admin' || user?.role === 'jewrine_communication' || peut('informations', 'gerer')

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [filtreAuteur, setFiltreAuteur] = useState(null) // { id, nom }
  const [menuAnchor, setMenuAnchor] = useState(null) // { el, item }

  const [createAnchor, setCreateAnchor] = useState(null)
  const [openCreateNews, setOpenCreateNews] = useState(false)
  const [formNews, setFormNews] = useState(INITIAL_FORM_NEWS)
  const [savingNews, setSavingNews] = useState(false)

  const [openCreateEvt, setOpenCreateEvt] = useState(false)
  const [formEvt, setFormEvt] = useState(INITIAL_FORM_EVT)
  const [savingEvt, setSavingEvt] = useState(false)
  const [editingEvtId, setEditingEvtId] = useState(null)
  const [fieldErrorsEvt, setFieldErrorsEvt] = useState({})
  const [mediaFilesEvt, setMediaFilesEvt] = useState([])
  const [detailEvt, setDetailEvt] = useState(null)
  const [openDeleteEvt, setOpenDeleteEvt] = useState(null)

  const [openComments, setOpenComments] = useState(null) // item
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')

  const endpoint = (item) => (item._type === 'news' ? '/informations/news/' : '/informations/evenements/')

  const loadAll = () => {
    setLoading(true)
    Promise.all([
      api.get('/informations/news/').then(({ data }) => (data.results || data || []).map((p) => ({ ...p, _type: 'news' }))).catch(() => []),
      api.get('/informations/evenements/').then(({ data }) => (data.results || data || []).map((e) => ({ ...e, _type: 'evenement' }))).catch(() => []),
    ]).then(([news, evts]) => {
      const fusion = [...news, ...evts].sort((a, b) => new Date(b.date_creation || 0) - new Date(a.date_creation || 0))
      setList(fusion)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [])

  const auteurDe = (item) => (item._type === 'news'
    ? { id: item.auteur, nom: item.auteur_nom, photo: item.auteur_photo, photoVersion: item.auteur_photo_updated_at }
    : { id: item.cree_par, nom: item.cree_par_nom, photo: item.cree_par_photo, photoVersion: item.cree_par_photo_updated_at })

  const listeFiltree = filtreAuteur ? list.filter((it) => auteurDe(it).id === filtreAuteur.id) : list

  const voirPublicationsDe = (item) => {
    const a = auteurDe(item)
    if (!a.id) return
    setFiltreAuteur({ id: a.id, nom: a.nom })
  }

  const handleToggleLike = async (item) => {
    try {
      const act = item.is_liked ? 'unlike' : 'like'
      await api.post(`${endpoint(item)}${item.id}/${act}/`)
      const maj = (it) => (it._type !== item._type || it.id !== item.id ? it : { ...it, is_liked: !it.is_liked, nb_likes: (Number(it.nb_likes) || 0) + (it.is_liked ? -1 : 1) })
      setList((prev) => prev.map(maj))
      setDetailEvt((prev) => (prev && prev.id === item.id && prev._type === item._type ? maj(prev) : prev))
    } catch (_) {}
  }

  const handleToggleBookmark = async (item) => {
    try {
      const act = item.is_bookmarked ? 'unbookmark' : 'bookmark'
      await api.post(`${endpoint(item)}${item.id}/${act}/`)
      setList((prev) => prev.map((it) => (it._type !== item._type || it.id !== item.id ? it : { ...it, is_bookmarked: !it.is_bookmarked })))
    } catch (_) {}
  }

  const handleOpenComments = async (item) => {
    setOpenComments(item)
    setNewComment('')
    setComments([])
    setLoadingComments(true)
    try {
      const { data } = await api.get(`${endpoint(item)}${item.id}/comments/`)
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
      const { data } = await api.post(`${endpoint(openComments)}${openComments.id}/comment/`, { texte })
      setComments((prev) => [...prev, data])
      setNewComment('')
      const maj = (it) => (it._type !== openComments._type || it.id !== openComments.id ? it : { ...it, nb_comments: (Number(it.nb_comments) || 0) + 1 })
      setList((prev) => prev.map(maj))
      setDetailEvt((prev) => (prev && prev.id === openComments.id && prev._type === 'evenement' ? maj(prev) : prev))
    } catch (_) {}
  }

  // ── Actualité ────────────────────────────────────────────────────────────
  const handleCreateNews = async () => {
    setSavingNews(true)
    setMessage({ type: '', text: '' })
    try {
      const fd = new FormData()
      fd.append('titre', formNews.titre)
      fd.append('contenu', formNews.contenu)
      fd.append('est_publie', String(!!formNews.est_publie))
      ;(formNews.images || []).forEach((f) => fd.append('images', f))
      await api.post('/informations/news/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setOpenCreateNews(false)
      setFormNews(INITIAL_FORM_NEWS)
      setMessage({ type: 'success', text: 'Actualité publiée.' })
      loadAll()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur lors de la publication.' })
    } finally {
      setSavingNews(false)
    }
  }

  const handleDeleteNews = async (item) => {
    try {
      await api.delete(`/informations/news/${item.id}/`)
      setMessage({ type: 'success', text: 'Actualité supprimée.' })
      setList((prev) => prev.filter((it) => !(it._type === 'news' && it.id === item.id)))
    } catch (_) {
      setMessage({ type: 'error', text: 'Suppression impossible.' })
    }
  }

  // ── Événement ────────────────────────────────────────────────────────────
  const handleOpenAddEvt = () => {
    setEditingEvtId(null)
    setFormEvt(INITIAL_FORM_EVT)
    setFieldErrorsEvt({})
    setMediaFilesEvt([])
    setOpenCreateEvt(true)
  }

  const handleOpenEditEvt = (evt) => {
    setEditingEvtId(evt.id)
    setFormEvt({
      titre: evt.titre || '',
      description: evt.description || '',
      type_evenement: evt.type_evenement || 'rencontre',
      date_debut: evt.date_debut ? evt.date_debut.slice(0, 16) : '',
      date_fin: evt.date_fin ? evt.date_fin.slice(0, 16) : '',
      lieu: evt.lieu || '',
      adresse_complete: evt.adresse_complete || '',
      lien_visio: evt.lien_visio || '',
      capacite_max: evt.capacite_max ?? '',
      est_publie: evt.est_publie ?? false,
    })
    setFieldErrorsEvt({})
    setMediaFilesEvt([])
    setOpenCreateEvt(true)
  }

  const handleSaveEvt = async () => {
    const errors = {}
    if (!formEvt.titre) errors.titre = 'Titre requis.'
    if (!formEvt.date_debut) errors.date_debut = 'Date de début requise.'
    if (!formEvt.date_fin) errors.date_fin = 'Date de fin requise.'
    if (!formEvt.lieu) errors.lieu = 'Lieu requis.'
    setFieldErrorsEvt(errors)
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      return
    }
    setSavingEvt(true)
    setMessage({ type: '', text: '' })
    try {
      const fd = new FormData()
      fd.append('titre', formEvt.titre)
      fd.append('description', formEvt.description || '')
      fd.append('type_evenement', formEvt.type_evenement)
      fd.append('date_debut', formEvt.date_debut)
      fd.append('date_fin', formEvt.date_fin)
      fd.append('lieu', formEvt.lieu)
      fd.append('adresse_complete', formEvt.adresse_complete || '')
      fd.append('lien_visio', formEvt.lien_visio || '')
      if (formEvt.capacite_max) fd.append('capacite_max', String(Number(formEvt.capacite_max)))
      fd.append('est_publie', String(!!formEvt.est_publie))
      mediaFilesEvt.forEach((f) => fd.append('medias', f))
      const config = { headers: { 'Content-Type': 'multipart/form-data' } }
      if (editingEvtId) {
        await api.patch(`/informations/evenements/${editingEvtId}/`, fd, config)
        setMessage({ type: 'success', text: 'Événement modifié.' })
      } else {
        await api.post('/informations/evenements/', fd, config)
        setMessage({ type: 'success', text: 'Événement créé.' })
      }
      loadAll()
      setOpenCreateEvt(false)
      setEditingEvtId(null)
      setMediaFilesEvt([])
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const apiFieldErrors = {}
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) apiFieldErrors[key] = String(value[0])
          else if (typeof value === 'string') apiFieldErrors[key] = value
        })
        setFieldErrorsEvt((prev) => ({ ...prev, ...apiFieldErrors }))
        setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      } else {
        const detail = err.response?.data?.detail || data
        setMessage({ type: 'error', text: typeof detail === 'object' ? JSON.stringify(detail) : (detail || 'Erreur') })
      }
    } finally {
      setSavingEvt(false)
    }
  }

  const handleDeleteEvt = async () => {
    if (!openDeleteEvt) return
    setSavingEvt(true)
    try {
      await api.delete(`/informations/evenements/${openDeleteEvt.id}/`)
      setMessage({ type: 'success', text: 'Événement supprimé.' })
      setList((prev) => prev.filter((it) => !(it._type === 'evenement' && it.id === openDeleteEvt.id)))
      setOpenDeleteEvt(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setSavingEvt(false)
    }
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 640, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, px: { xs: 0.5, md: 0 } }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600, fontSize: { xs: '1.4rem', md: '2.125rem' } }} gutterBottom>
            Xew-Xew Yi
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>
            Actualités et événements de la daara
          </Typography>
        </Box>
        {canManage && (
          <>
            <Button variant="contained" startIcon={<Add />} onClick={(e) => setCreateAnchor(e.currentTarget)} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
              Publier
            </Button>
            <Menu anchorEl={createAnchor} open={!!createAnchor} onClose={() => setCreateAnchor(null)}>
              <MenuOption onClick={() => { setCreateAnchor(null); setFormNews(INITIAL_FORM_NEWS); setOpenCreateNews(true) }}>
                Une actualité
              </MenuOption>
              <MenuOption onClick={() => { setCreateAnchor(null); handleOpenAddEvt() }}>
                Un événement
              </MenuOption>
            </Menu>
          </>
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
      ) : listeFiltree.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {filtreAuteur ? `${filtreAuteur.nom} n'a rien publié.` : 'Aucune actualité ni événement pour le moment.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {listeFiltree.map((item) => {
            const a = auteurDe(item)
            const photoUrl = a.photo ? getMediaUrl(a.photo, a.photoVersion ? `v=${a.photoVersion}` : '') : null
            const isEvt = item._type === 'evenement'
            return (
              <Card key={`${item._type}-${item.id}`} sx={{ borderRadius: { xs: 0, sm: 2 }, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Avatar src={photoUrl} onClick={() => voirPublicationsDe(item)} sx={{ width: 44, height: 44, bgcolor: COLORS.vert, cursor: a.id ? 'pointer' : 'default' }}>
                    {initials(a.nom)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography onClick={() => voirPublicationsDe(item)} sx={{ fontWeight: 700, fontSize: '0.9rem', color: COLORS.vertFonce, cursor: a.id ? 'pointer' : 'default', '&:hover': a.id ? { textDecoration: 'underline' } : undefined }} noWrap>
                      {a.nom || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {item.date_creation ? new Date(item.date_creation).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </Typography>
                  </Box>
                  {isEvt && <Chip label={item.type_evenement_display || item.type_evenement} size="small" sx={{ bgcolor: `${COLORS.or}30`, fontWeight: 600 }} />}
                  {canManage && (
                    <IconButton size="small" onClick={(e) => setMenuAnchor({ el: e.currentTarget, item })}>
                      <MoreVert fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                {item.titre && (
                  <Typography sx={{ px: 1.5, pb: isEvt ? 0.25 : 0.5, fontWeight: 700, color: COLORS.vert }}>{item.titre}</Typography>
                )}
                {isEvt ? (
                  <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, pb: 1 }}>
                    <EventIcon sx={{ fontSize: 14, verticalAlign: 'text-bottom', mr: 0.5 }} />
                    {item.date_debut ? new Date(item.date_debut).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) : '—'} · {item.lieu}
                  </Typography>
                ) : (
                  item.contenu && <Typography variant="body2" sx={{ px: 1.5, pb: 1.5, whiteSpace: 'pre-wrap' }}>{item.contenu}</Typography>
                )}

                <MediaGrid items={mediasNormalises(item)} isMobile={isMobile} />

                {(item.nb_likes > 0 || item.nb_comments > 0) && (
                  <Box sx={{ px: 1.5, py: 0.75, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">{item.nb_likes > 0 ? `👍 ${item.nb_likes}` : ''}</Typography>
                    {item.nb_comments > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => handleOpenComments(item)}>
                        {item.nb_comments} commentaire{item.nb_comments > 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Box>
                )}

                <Divider />
                <Box sx={{ display: 'flex' }}>
                  <Button onClick={() => handleToggleLike(item)} startIcon={item.is_liked ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
                    sx={{ flex: 1, borderRadius: 0, py: 1, color: item.is_liked ? COLORS.vert : 'text.secondary', fontWeight: 600, fontSize: '0.8rem' }}>
                    J'aime
                  </Button>
                  <Button onClick={() => handleOpenComments(item)} startIcon={<CommentIcon fontSize="small" />}
                    sx={{ flex: 1, borderRadius: 0, py: 1, color: 'text.secondary', fontWeight: 600, fontSize: '0.8rem' }}>
                    Commenter
                  </Button>
                  {isEvt ? (
                    <Button onClick={() => setDetailEvt(item)} sx={{ flex: 1, borderRadius: 0, py: 1, color: 'text.secondary', fontWeight: 600, fontSize: '0.8rem' }}>
                      Détails
                    </Button>
                  ) : (
                    <Button onClick={() => handleToggleBookmark(item)} startIcon={item.is_bookmarked ? <Bookmark fontSize="small" /> : <BookmarkBorder fontSize="small" />}
                      sx={{ flex: 1, borderRadius: 0, py: 1, color: item.is_bookmarked ? COLORS.vert : 'text.secondary', fontWeight: 600, fontSize: '0.8rem' }}>
                      Enregistrer
                    </Button>
                  )}
                </Box>
              </Card>
            )
          })}
        </Box>
      )}

      <Menu anchorEl={menuAnchor?.el} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        {menuAnchor?.item?._type === 'evenement' && (
          <MenuOption onClick={() => { handleOpenEditEvt(menuAnchor.item); setMenuAnchor(null) }}>
            <Edit fontSize="small" sx={{ mr: 1 }} /> Modifier
          </MenuOption>
        )}
        <MenuOption
          onClick={() => {
            const it = menuAnchor.item
            setMenuAnchor(null)
            if (it._type === 'evenement') setOpenDeleteEvt(it)
            else handleDeleteNews(it)
          }}
          sx={{ color: '#c62828' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} /> Supprimer
        </MenuOption>
      </Menu>

      {/* Créer une actualité */}
      <Dialog open={openCreateNews} onClose={() => setOpenCreateNews(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Publier une actualité</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField fullWidth label="Titre (optionnel)" value={formNews.titre} onChange={(e) => setFormNews((f) => ({ ...f, titre: e.target.value }))} />
            <TextField fullWidth label="Contenu (optionnel)" value={formNews.contenu} onChange={(e) => setFormNews((f) => ({ ...f, contenu: e.target.value }))} multiline rows={5} />
            <Button variant="outlined" component="label" sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
              Ajouter des images ou vidéos
              <input hidden type="file" multiple accept="image/*,video/*" onChange={(e) => setFormNews((f) => ({ ...f, images: Array.from(e.target.files || []) }))} />
            </Button>
            {formNews.images?.length > 0 && (
              <Typography variant="caption" color="text.secondary">{formNews.images.length} fichier(s) sélectionné(s)</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateNews(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateNews} disabled={savingNews} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {savingNews ? <CircularProgress size={24} /> : 'Publier'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Créer / modifier un événement */}
      <Dialog open={openCreateEvt} onClose={() => { setOpenCreateEvt(false); setEditingEvtId(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEvtId ? 'Modifier l\'événement' : 'Créer un événement'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Titre" value={formEvt.titre}
              onChange={(e) => { setFormEvt((f) => ({ ...f, titre: e.target.value })); setFieldErrorsEvt((fe) => ({ ...fe, titre: undefined })) }}
              required fullWidth error={!!fieldErrorsEvt.titre} helperText={fieldErrorsEvt.titre || ''}
            />
            <TextField label="Description" value={formEvt.description} onChange={(e) => setFormEvt((f) => ({ ...f, description: e.target.value }))} multiline rows={2} fullWidth />
            <TextField select label="Type" value={formEvt.type_evenement} onChange={(e) => setFormEvt((f) => ({ ...f, type_evenement: e.target.value }))} fullWidth>
              {TYPES_EVENEMENT.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
            <TextField
              label="Date début" type="datetime-local" value={formEvt.date_debut}
              onChange={(e) => { setFormEvt((f) => ({ ...f, date_debut: e.target.value })); setFieldErrorsEvt((fe) => ({ ...fe, date_debut: undefined })) }}
              required fullWidth InputLabelProps={{ shrink: true }} error={!!fieldErrorsEvt.date_debut} helperText={fieldErrorsEvt.date_debut || ''}
            />
            <TextField
              label="Date fin" type="datetime-local" value={formEvt.date_fin}
              onChange={(e) => { setFormEvt((f) => ({ ...f, date_fin: e.target.value })); setFieldErrorsEvt((fe) => ({ ...fe, date_fin: undefined })) }}
              required fullWidth InputLabelProps={{ shrink: true }} error={!!fieldErrorsEvt.date_fin} helperText={fieldErrorsEvt.date_fin || ''}
            />
            <TextField
              label="Lieu" value={formEvt.lieu}
              onChange={(e) => { setFormEvt((f) => ({ ...f, lieu: e.target.value })); setFieldErrorsEvt((fe) => ({ ...fe, lieu: undefined })) }}
              required fullWidth error={!!fieldErrorsEvt.lieu} helperText={fieldErrorsEvt.lieu || ''}
            />
            <TextField label="Adresse complète" value={formEvt.adresse_complete} onChange={(e) => setFormEvt((f) => ({ ...f, adresse_complete: e.target.value }))} multiline fullWidth />
            <TextField label="Lien visio" value={formEvt.lien_visio} onChange={(e) => setFormEvt((f) => ({ ...f, lien_visio: e.target.value }))} fullWidth />
            <TextField label="Capacité max" type="number" value={formEvt.capacite_max} onChange={(e) => setFormEvt((f) => ({ ...f, capacite_max: e.target.value }))} fullWidth />
            <Button variant="outlined" component="label" sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
              Ajouter des photos ou vidéos
              <input hidden type="file" multiple accept="image/*,video/*" onChange={(e) => setMediaFilesEvt(Array.from(e.target.files || []))} />
            </Button>
            {mediaFilesEvt.length > 0 && <Typography variant="caption" color="text.secondary">{mediaFilesEvt.length} fichier(s) sélectionné(s)</Typography>}
            <TextField select label="Publié" value={formEvt.est_publie ? 'oui' : 'non'} onChange={(e) => setFormEvt((f) => ({ ...f, est_publie: e.target.value === 'oui' }))} fullWidth>
              <MenuItem value="non">Non</MenuItem>
              <MenuItem value="oui">Oui</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenCreateEvt(false); setEditingEvtId(null) }}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveEvt} disabled={savingEvt} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {savingEvt ? <CircularProgress size={24} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Détail d'un événement */}
      <Dialog open={!!detailEvt} onClose={() => setDetailEvt(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{detailEvt?.titre}</DialogTitle>
        <DialogContent dividers>
          {detailEvt && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon fontSize="small" sx={{ color: COLORS.vert }} />
                <Chip label={detailEvt.type_evenement_display || detailEvt.type_evenement} size="small" sx={{ bgcolor: `${COLORS.or}30` }} />
              </Box>
              <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>{detailEvt.lieu}</Typography>
              <Typography variant="caption" color="text.secondary">
                Du {detailEvt.date_debut ? new Date(detailEvt.date_debut).toLocaleString('fr-FR') : '-'} au {detailEvt.date_fin ? new Date(detailEvt.date_fin).toLocaleString('fr-FR') : '-'}
              </Typography>
              {detailEvt.adresse_complete && <Typography variant="body2">{detailEvt.adresse_complete}</Typography>}
              {detailEvt.description && <Typography variant="body2" sx={{ mt: 1 }}>{detailEvt.description}</Typography>}
              {detailEvt.lien_visio && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Lien visio : <a href={detailEvt.lien_visio} target="_blank" rel="noopener noreferrer">{detailEvt.lien_visio}</a>
                </Typography>
              )}
              {detailEvt.capacite_max && <Typography variant="body2" sx={{ mt: 1 }}>Capacité : {detailEvt.capacite_max} personne(s)</Typography>}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <IconButton size="small" onClick={() => handleToggleLike(detailEvt)} sx={{ color: detailEvt.is_liked ? '#c62828' : 'inherit' }}>
                  {detailEvt.is_liked ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
                </IconButton>
                <Typography variant="caption" sx={{ mr: 1 }}>{detailEvt.nb_likes ?? 0}</Typography>
                <IconButton size="small" onClick={() => handleOpenComments(detailEvt)}><CommentIcon fontSize="small" /></IconButton>
                <Typography variant="caption">{detailEvt.nb_comments ?? 0} commentaire(s)</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailEvt(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openDeleteEvt} onClose={() => setOpenDeleteEvt(null)}>
        <DialogTitle>Supprimer cet événement ?</DialogTitle>
        <DialogContent>{openDeleteEvt && <Typography>Supprimer « {openDeleteEvt.titre} » ?</Typography>}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteEvt(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDeleteEvt} disabled={savingEvt}>{savingEvt ? <CircularProgress size={24} /> : 'Supprimer'}</Button>
        </DialogActions>
      </Dialog>

      {/* Commentaires (actualité ou événement) */}
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
                  <Avatar sx={{ width: 32, height: 32, bgcolor: COLORS.vert, fontSize: '0.75rem', flexShrink: 0 }}>{initials(c.membre_nom)}</Avatar>
                  <Box sx={{ p: 1.25, borderRadius: 3, bgcolor: '#f0f2f5', flex: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{c.membre_nom || `#${c.membre}`}</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.texte}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <TextField
              fullWidth placeholder="Écrire un commentaire…" value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() } }}
              multiline minRows={1} maxRows={4}
            />
            <Button variant="contained" onClick={handleSendComment} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>Envoyer</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenComments(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
