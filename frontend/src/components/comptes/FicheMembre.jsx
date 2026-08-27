import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Paper, Grid, Avatar, Chip, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert, Divider,
} from '@mui/material'
import { ArrowBack, Edit, EmojiEvents, Add, Close, Badge as BadgeIcon, PhotoCamera, Delete, Save } from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'
import CarteMembre from './CarteMembre'
import BadgeMissionCard from './BadgeMissionCard'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

const CELLULES = { dakar: 'Dakar', touba_mbacke: 'Touba / Mbacké', diaspora: 'Diaspora' }
const NIVEAUX = { faible: 'Faible', debutant: 'Débutant', moyen: 'Moyen', intermediaire: 'Intermédiaire', avance: 'Avancé' }
const CATEGORIES_BADGE = [
  { value: 'contribution', label: 'Contribution' },
  { value: 'assiduite', label: 'Assiduité' },
  { value: 'kamil', label: 'Kamil' },
  { value: 'social', label: 'Social' },
  { value: 'anciennete', label: 'Ancienneté' },
  { value: 'special', label: 'Spécial' },
]

function SectionCard({ title, children }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${C.or}30`, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: C.vert, mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  )
}

export default function FicheMembre() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [membre, setMembre] = useState(null)
  const [cotisations, setCotisations] = useState([])
  const [transactions, setTransactions] = useState([])
  const [jukkis, setJukkis] = useState([])
  const [versements, setVersements] = useState([])
  const [presences, setPresences] = useState([])
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('finance')

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openBadge, setOpenBadge] = useState(false)
  const [badgeDefs, setBadgeDefs] = useState([])
  const [nouveauBadge, setNouveauBadge] = useState(false)
  const [badgeForm, setBadgeForm] = useState({ badge: '', raison: '', nom: '', categorie: 'special', description: '' })
  const [savingBadge, setSavingBadge] = useState(false)
  const [badgeMsg, setBadgeMsg] = useState('')

  // --- Carte de membre : infos éditables par l'admin ---
  const [carteForm, setCarteForm] = useState({ numero_carte: '', date_naissance: '', date_delivrance_carte: '' })
  const [savingCarte, setSavingCarte] = useState(false)

  // --- Badges de mission (événement/mission, distincts des badges de récompense) ---
  const [badgesMission, setBadgesMission] = useState([])
  const [openBadgeMission, setOpenBadgeMission] = useState(false)
  const [editingBadgeMissionId, setEditingBadgeMissionId] = useState(null)
  const [badgeMissionForm, setBadgeMissionForm] = useState({ evenement: '', mission: '', date_evenement: '', description: '' })
  const [savingBadgeMission, setSavingBadgeMission] = useState(false)
  const [deleteBadgeMissionTarget, setDeleteBadgeMissionTarget] = useState(null)

  const loadBadges = () => api.get(`/auth/users/${id}/badges/`).then(({ data }) => setBadges(data)).catch(() => setBadges([]))
  const loadBadgesMission = () => api.get('/auth/badges-mission/', { params: { membre: id } }).then(({ data }) => setBadgesMission(data.results || data)).catch(() => setBadgesMission([]))

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/auth/users/${id}/`).then(({ data }) => {
        setMembre(data)
        setCarteForm({
          numero_carte: data.numero_carte || '',
          date_naissance: data.date_naissance ? data.date_naissance.slice(0, 10) : '',
          date_delivrance_carte: data.date_delivrance_carte ? data.date_delivrance_carte.slice(0, 10) : '',
        })
      }).catch(() => setMembre(null)),
      api.get('/finance/cotisations/', { params: { membre: id } }).then(({ data }) => setCotisations(data.results || data)).catch(() => setCotisations([])),
      api.get('/finance/transactions/', { params: { membre: id } }).then(({ data }) => setTransactions(data.results || data)).catch(() => setTransactions([])),
      api.get('/culturelle/jukkis/', { params: { membre: id } }).then(({ data }) => setJukkis(data.results || data)).catch(() => setJukkis([])),
      api.get('/culturelle/versements-kamil/', { params: { membre: id } }).then(({ data }) => setVersements(data.results || data)).catch(() => setVersements([])),
      api.get('/conservatoire/presences/', { params: { membre: id } }).then(({ data }) => setPresences(data.results || data)).catch(() => setPresences([])),
      loadBadges(),
      loadBadgesMission(),
    ]).finally(() => setLoading(false))
  }, [id])

  const handleSaveCarte = async () => {
    setSavingCarte(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = { numero_carte: carteForm.numero_carte }
      if (carteForm.date_naissance) payload.date_naissance = carteForm.date_naissance
      if (carteForm.date_delivrance_carte) payload.date_delivrance_carte = carteForm.date_delivrance_carte
      const { data } = await api.patch(`/auth/users/${id}/`, payload)
      setMembre(data)
      setMessage({ type: 'success', text: 'Informations de la carte mises à jour.' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour.' })
    } finally {
      setSavingCarte(false)
    }
  }

  const handleOpenAjoutBadgeMission = () => {
    setEditingBadgeMissionId(null)
    setBadgeMissionForm({ evenement: '', mission: '', date_evenement: '', description: '' })
    setOpenBadgeMission(true)
  }

  const handleOpenEditBadgeMission = (b) => {
    setEditingBadgeMissionId(b.id)
    setBadgeMissionForm({ evenement: b.evenement, mission: b.mission, date_evenement: b.date_evenement, description: b.description || '' })
    setOpenBadgeMission(true)
  }

  const handleSaveBadgeMission = async () => {
    if (!badgeMissionForm.evenement.trim() || !badgeMissionForm.mission.trim() || !badgeMissionForm.date_evenement) {
      setMessage({ type: 'error', text: 'Événement, mission et date sont requis.' })
      return
    }
    setSavingBadgeMission(true)
    try {
      if (editingBadgeMissionId) {
        await api.patch(`/auth/badges-mission/${editingBadgeMissionId}/`, badgeMissionForm)
      } else {
        await api.post('/auth/badges-mission/', { ...badgeMissionForm, membre: id })
      }
      setOpenBadgeMission(false)
      loadBadgesMission()
      setMessage({ type: 'success', text: 'Badge de mission enregistré.' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de l\'enregistrement du badge.' })
    } finally {
      setSavingBadgeMission(false)
    }
  }

  const handleDeleteBadgeMission = async () => {
    if (!deleteBadgeMissionTarget) return
    try {
      await api.delete(`/auth/badges-mission/${deleteBadgeMissionTarget}/`)
      setBadgesMission((prev) => prev.filter((b) => b.id !== deleteBadgeMissionTarget))
      setDeleteBadgeMissionTarget(null)
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression.' })
    }
  }

  const handleOpenBadge = () => {
    setBadgeForm({ badge: '', raison: '', nom: '', categorie: 'special', description: '' })
    setNouveauBadge(false)
    setBadgeMsg('')
    setOpenBadge(true)
    if (badgeDefs.length === 0) api.get('/auth/badges/').then(({ data }) => setBadgeDefs(data.results || data)).catch(() => setBadgeDefs([]))
  }

  const handleAttribuerBadge = async () => {
    setSavingBadge(true)
    setBadgeMsg('')
    try {
      let badgeId = badgeForm.badge
      if (nouveauBadge) {
        if (!badgeForm.nom.trim()) { setBadgeMsg('Nom du badge requis.'); setSavingBadge(false); return }
        const { data } = await api.post('/auth/badges/', {
          nom: badgeForm.nom.trim(), categorie: badgeForm.categorie,
          description: badgeForm.description || '', critere: badgeForm.description || '',
        })
        badgeId = data.id
        setBadgeDefs((prev) => [...prev, data])
      }
      if (!badgeId) { setBadgeMsg('Choisissez un badge.'); setSavingBadge(false); return }
      await api.post(`/auth/users/${id}/badges/`, { badge: badgeId, raison: badgeForm.raison })
      setOpenBadge(false)
      loadBadges()
    } catch (err) {
      setBadgeMsg(err.response?.data?.detail || 'Erreur lors de l\'attribution.')
    } finally {
      setSavingBadge(false)
    }
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const { data } = await api.patch(`/auth/users/${id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMembre(data)
      setMessage({ type: 'success', text: 'Photo mise à jour.' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors du changement de photo.' })
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleRetirerBadge = async (attributionId) => {
    try {
      await api.delete(`/auth/badges-attribution/${attributionId}/`)
      setBadges((prev) => prev.filter((b) => b.id !== attributionId))
    } catch (_) {}
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: C.vert }} /></Box>
  if (!membre) return <Typography color="text.secondary">Membre introuvable.</Typography>

  const totalCotisations = cotisations.length
  const cotisationsPayees = cotisations.filter(c => c.statut === 'payee').length
  const montantPaye = cotisations.filter(c => c.statut === 'payee').reduce((s, c) => s + Number(c.montant || 0), 0)
  const montantTotal = cotisations.reduce((s, c) => s + Number(c.montant || 0), 0)

  const mensualites = cotisations.filter(c => c.type_cotisation === 'mensualite')
  const mensualitesPayees = mensualites.filter(c => c.statut === 'payee').length
  const montantPayeMensualites = mensualites.filter(c => c.statut === 'payee').reduce((s, c) => s + Number(c.montant || 0), 0)
  const montantTotalMensualites = mensualites.reduce((s, c) => s + Number(c.montant || 0), 0)

  const jukkisValides = jukkis.filter(j => j.est_valide).length
  const montantVerseKamil = versements.filter(v => v.statut === 'valide').reduce((s, v) => s + Number(v.montant || 0), 0)

  const nbPresent = presences.filter(p => p.statut === 'present').length
  const nbAbsent = presences.length - nbPresent

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/admin/membres')} sx={{ bgcolor: `${C.vert}12` }}>
          <ArrowBack sx={{ color: C.vert }} />
        </IconButton>
        <Typography variant="h5" sx={{ color: C.vert, fontWeight: 700, flex: 1 }}>Dossier du membre</Typography>
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.or}30`, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              variant="rounded"
              src={getMediaUrl(membre.photo, membre.photo_updated_at ? `v=${membre.photo_updated_at}` : '')}
              sx={{ width: 140, height: 140, fontSize: '3rem', bgcolor: C.vert, borderRadius: 2 }}
            >
              {membre.first_name?.[0]}{membre.last_name?.[0]}
            </Avatar>
            <IconButton
              component="label"
              disabled={uploadingPhoto}
              sx={{ position: 'absolute', bottom: -4, right: -4, bgcolor: C.vert, color: '#fff', '&:hover': { bgcolor: C.vertFonce } }}
              size="small"
            >
              {uploadingPhoto ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <PhotoCamera fontSize="small" />}
              <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: C.vertFonce }}>
              {membre.sexe === 'M' ? 'Señ ' : membre.sexe === 'F' ? 'Soxna ' : ''}{membre.first_name} {membre.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">{membre.email} · {membre.telephone || 'Pas de téléphone'}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <Chip label={membre.role_display || membre.role} size="small" sx={{ bgcolor: `${C.or}25`, color: C.vertFonce, fontWeight: 600 }} />
              <Chip label={membre.est_actif ? 'Actif' : 'Inactif'} size="small" color={membre.est_actif ? 'success' : 'default'} />
              {membre.cellule && <Chip label={CELLULES[membre.cellule] || membre.cellule} size="small" />}
              {membre.groupe_sanguin && <Chip label={`GS ${membre.groupe_sanguin}`} size="small" />}
            </Box>
          </Box>
          <Grid container spacing={2} sx={{ maxWidth: 360 }}>
            {[
              ['Profession', membre.profession],
              ['Catégorie', membre.categorie],
              ['Niveau Al-Quran', NIVEAUX[membre.niveau_alquran]],
              ['Niveau Majalis', NIVEAUX[membre.niveau_majalis]],
              ['N° carte', membre.numero_carte],
              ['Adresse', membre.adresse],
              ['Inscrit le', membre.date_inscription ? new Date(membre.date_inscription).toLocaleDateString('fr-FR') : ''],
            ].filter(([, v]) => v).map(([label, value]) => (
              <Grid item xs={6} key={label}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="subtitle2" sx={{ color: C.vertFonce, fontWeight: 700, mr: 1 }}>Badges</Typography>
          {badges.length === 0 && <Typography variant="body2" color="text.secondary">Aucun badge pour l'instant.</Typography>}
          {badges.map((b) => (
            <Chip
              key={b.id}
              icon={<EmojiEvents sx={{ fontSize: 16 }} />}
              label={b.badge.nom}
              title={b.badge.description || ''}
              onDelete={() => handleRetirerBadge(b.id)}
              deleteIcon={<Close sx={{ fontSize: 14 }} />}
              size="small"
              sx={{ bgcolor: `${C.or}25`, color: C.vertFonce, fontWeight: 600 }}
            />
          ))}
          <Chip
            icon={<Add sx={{ fontSize: 16 }} />}
            label="Attribuer un badge"
            size="small"
            variant="outlined"
            onClick={handleOpenBadge}
            sx={{ borderColor: C.vert, color: C.vert }}
          />
        </Box>
      </Paper>

      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        sx={{
          mb: 2, borderBottom: `1px solid ${C.or}30`,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${C.vert} !important` },
          '& .MuiTabs-indicator': { bgcolor: C.vert },
        }}
      >
        <Tab label="Finance" value="finance" />
        <Tab label="Culturelle (Kamil)" value="culturelle" />
        <Tab label="Conservatoire" value="conservatoire" />
        <Tab label="Carte" value="carte" />
      </Tabs>

      {tab === 'finance' && (
        <>
          <SectionCard title="Résumé des cotisations">
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Cotisations</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: C.vert }}>{cotisationsPayees}/{totalCotisations}</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Montant payé</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: '#2E7D32' }}>{montantPaye.toLocaleString('fr-FR')} FCFA</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Montant total assigné</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: C.vertFonce }}>{montantTotal.toLocaleString('fr-FR')} FCFA</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Reste</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828' }}>{(montantTotal - montantPaye).toLocaleString('fr-FR')} FCFA</Typography></Grid>
            </Grid>
          </SectionCard>
          <SectionCard title="Bilan des mensualités">
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Mensualités</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: C.vert }}>{mensualitesPayees}/{mensualites.length}</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Montant payé</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: '#2E7D32' }}>{montantPayeMensualites.toLocaleString('fr-FR')} FCFA</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Montant total dû</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: C.vertFonce }}>{montantTotalMensualites.toLocaleString('fr-FR')} FCFA</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Reste</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828' }}>{(montantTotalMensualites - montantPayeMensualites).toLocaleString('fr-FR')} FCFA</Typography></Grid>
            </Grid>
          </SectionCard>
          <SectionCard title="Historique des cotisations">
            {cotisations.length === 0 ? <Typography color="text.secondary">Aucune cotisation.</Typography> : (
              <TableContainer><Table size="small">
                <TableHead><TableRow><TableCell>Type</TableCell><TableCell>Période</TableCell><TableCell align="right">Montant</TableCell><TableCell>Statut</TableCell></TableRow></TableHead>
                <TableBody>
                  {cotisations.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>{c.type_cotisation === 'assignation' ? (c.objet_assignation || 'Assignation') : 'Mensualité'}</TableCell>
                      <TableCell>{c.mois}/{c.annee}</TableCell>
                      <TableCell align="right">{Number(c.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell><Chip size="small" label={c.statut_display || c.statut} color={c.statut === 'payee' ? 'success' : 'default'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></TableContainer>
            )}
          </SectionCard>
          <SectionCard title="Samayy SASS">
            {transactions.length === 0 ? <Typography color="text.secondary">Aucune transaction.</Typography> : (
              <TableContainer><Table size="small">
                <TableHead><TableRow><TableCell>Type</TableCell><TableCell align="right">Montant</TableCell><TableCell>Statut</TableCell><TableCell>Date</TableCell></TableRow></TableHead>
                <TableBody>
                  {transactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{t.type_display || t.type_transaction}</TableCell>
                      <TableCell align="right">{Number(t.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell><Chip size="small" label={t.statut_display || t.statut} color={t.statut === 'validee' ? 'success' : 'default'} /></TableCell>
                      <TableCell>{new Date(t.date_transaction).toLocaleDateString('fr-FR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></TableContainer>
            )}
          </SectionCard>
        </>
      )}

      <Dialog open={openBadge} onClose={() => setOpenBadge(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Attribuer un badge</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {badgeMsg && <Alert severity="error">{badgeMsg}</Alert>}
            {!nouveauBadge ? (
              <>
                <TextField
                  select fullWidth label="Badge" value={badgeForm.badge}
                  onChange={(e) => setBadgeForm((f) => ({ ...f, badge: e.target.value }))}
                >
                  {badgeDefs.map((b) => <MenuItem key={b.id} value={b.id}>{b.nom}</MenuItem>)}
                </TextField>
                <Button size="small" startIcon={<Add />} onClick={() => setNouveauBadge(true)} sx={{ alignSelf: 'flex-start', color: C.vert }}>
                  Créer un nouveau badge
                </Button>
              </>
            ) : (
              <>
                <TextField fullWidth label="Nom du badge" value={badgeForm.nom} onChange={(e) => setBadgeForm((f) => ({ ...f, nom: e.target.value }))} required />
                <TextField select fullWidth label="Catégorie" value={badgeForm.categorie} onChange={(e) => setBadgeForm((f) => ({ ...f, categorie: e.target.value }))}>
                  {CATEGORIES_BADGE.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                </TextField>
                <TextField fullWidth label="Description (optionnel)" value={badgeForm.description} onChange={(e) => setBadgeForm((f) => ({ ...f, description: e.target.value }))} multiline rows={2} />
                <Button size="small" onClick={() => setNouveauBadge(false)} sx={{ alignSelf: 'flex-start' }}>
                  ← Choisir un badge existant
                </Button>
              </>
            )}
            <TextField fullWidth label="Raison (optionnel)" value={badgeForm.raison} onChange={(e) => setBadgeForm((f) => ({ ...f, raison: e.target.value }))} multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBadge(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleAttribuerBadge} disabled={savingBadge} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            {savingBadge ? <CircularProgress size={20} color="inherit" /> : 'Attribuer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openBadgeMission} onClose={() => setOpenBadgeMission(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingBadgeMissionId ? 'Modifier le badge de mission' : 'Nouveau badge de mission'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth label="Événement" placeholder="Ex : Magal 2026, Gamou, Ziarra..."
              value={badgeMissionForm.evenement}
              onChange={(e) => setBadgeMissionForm((f) => ({ ...f, evenement: e.target.value }))}
              required
            />
            <TextField
              fullWidth label="Mission / Rôle" placeholder="Ex : Sécurité, Accueil, Logistique..."
              value={badgeMissionForm.mission}
              onChange={(e) => setBadgeMissionForm((f) => ({ ...f, mission: e.target.value }))}
              required
            />
            <TextField
              fullWidth label="Date de l'événement" type="date"
              value={badgeMissionForm.date_evenement}
              onChange={(e) => setBadgeMissionForm((f) => ({ ...f, date_evenement: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth label="Description (optionnel)" multiline rows={2}
              value={badgeMissionForm.description}
              onChange={(e) => setBadgeMissionForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBadgeMission(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveBadgeMission} disabled={savingBadgeMission} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            {savingBadgeMission ? <CircularProgress size={20} color="inherit" /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteBadgeMissionTarget} onClose={() => setDeleteBadgeMissionTarget(null)}>
        <DialogTitle>Supprimer ce badge de mission ?</DialogTitle>
        <DialogContent><Typography>Cette action est irréversible.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteBadgeMissionTarget(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDeleteBadgeMission}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      {tab === 'culturelle' && (
        <>
          <SectionCard title="Programme Kamil">
            <Grid container spacing={2} sx={{ mb: jukkis.length ? 2 : 0 }}>
              <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">JUKKI assignés</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: C.vert }}>{jukkis.length}</Typography></Grid>
              <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">JUKKI validés</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: '#2E7D32' }}>{jukkisValides}</Typography></Grid>
              <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Versé (Kamil)</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: C.vertFonce }}>{montantVerseKamil.toLocaleString('fr-FR')} FCFA</Typography></Grid>
            </Grid>
            {jukkis.length === 0 ? <Typography color="text.secondary">Aucun JUKKI assigné.</Typography> : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {jukkis.map(j => (
                  <Chip key={j.id} label={`JUKKI ${j.numero}`} size="small" color={j.est_valide ? 'success' : 'default'} variant={j.est_valide ? 'filled' : 'outlined'} />
                ))}
              </Box>
            )}
          </SectionCard>
        </>
      )}

      {tab === 'conservatoire' && (
        <SectionCard title="Présences aux répétitions/prestations">
          {presences.length === 0 ? (
            <Typography color="text.secondary">Ce membre ne fait partie d'aucun kourel, ou n'a aucune présence enregistrée.</Typography>
          ) : (
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Présences</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: '#2E7D32' }}>{nbPresent}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Absences</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828' }}>{nbAbsent}</Typography></Grid>
              </Grid>
              <TableContainer><Table size="small">
                <TableHead><TableRow><TableCell>Séance</TableCell><TableCell>Statut</TableCell></TableRow></TableHead>
                <TableBody>
                  {presences.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.seance_titre || `#${p.seance}`}</TableCell>
                      <TableCell><Chip size="small" label={p.statut_display || p.statut} color={p.statut === 'present' ? 'success' : 'error'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></TableContainer>
            </>
          )}
        </SectionCard>
      )}

      {tab === 'carte' && (
        <>
          <SectionCard title="Informations de la carte">
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Numéro de carte"
                  value={carteForm.numero_carte}
                  onChange={(e) => setCarteForm((f) => ({ ...f, numero_carte: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Date de naissance" type="date"
                  value={carteForm.date_naissance}
                  onChange={(e) => setCarteForm((f) => ({ ...f, date_naissance: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Date de délivrance de la carte" type="date"
                  value={carteForm.date_delivrance_carte}
                  onChange={(e) => setCarteForm((f) => ({ ...f, date_delivrance_carte: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <Button
              variant="contained" startIcon={savingCarte ? <CircularProgress size={16} color="inherit" /> : <Save />}
              onClick={handleSaveCarte} disabled={savingCarte}
              sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}
            >
              Enregistrer
            </Button>
          </SectionCard>

          <SectionCard title="Carte de membre">
            <CarteMembre membre={membre} />
          </SectionCard>

          <SectionCard title="Badges de mission">
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button size="small" startIcon={<Add />} onClick={handleOpenAjoutBadgeMission} sx={{ color: C.vert }}>
                Nouveau badge de mission
              </Button>
            </Box>
            {badgesMission.length === 0 ? (
              <Typography color="text.secondary">Aucun badge de mission pour l'instant.</Typography>
            ) : (
              <Grid container spacing={2}>
                {badgesMission.map((b) => (
                  <Grid item xs={12} sm={6} md={4} key={b.id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <BadgeMissionCard membre={membre} badge={b} />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => handleOpenEditBadgeMission(b)} sx={{ color: C.vert }}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteBadgeMissionTarget(b.id)}><Delete fontSize="small" /></IconButton>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </SectionCard>
        </>
      )}
    </Box>
  )
}
