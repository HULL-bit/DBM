import { useState, useEffect } from 'react'
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Avatar, Button, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Alert, CircularProgress, Grid, Card, CardContent,
  Collapse, Tooltip, LinearProgress,
} from '@mui/material'
import {
  Add, Edit, Delete, FilterList, FilterListOff, People, PersonOff,
  Search, ExpandMore, ExpandLess, Close,
} from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029', vertClair: '#3d7a52' }

const ROLES = [
  { value: 'admin', label: 'Administrateur', color: '#6A1B9A' },
  { value: 'membre', label: 'Membre', color: C.vert },
  { value: 'jewrine_conservatoire', label: 'Jewrine Conservatoire', color: '#00695C' },
  { value: 'jewrine_finance', label: 'Jewrine Finance', color: '#E65100' },
  { value: 'jewrine_culturelle', label: 'Jewrine Culturelle', color: '#1565C0' },
  { value: 'jewrine_sociale', label: 'Jewrine Sociale', color: '#2E7D32' },
  { value: 'jewrine_communication', label: 'Jewrine Communication', color: '#AD1457' },
  { value: 'jewrine_organisation', label: 'Jewrine Organisation', color: '#F57F17' },
]
const CELLULES = [
  { value: '', label: 'Non renseigné' },
  { value: 'dakar', label: 'Dakar' },
  { value: 'touba_mbacke', label: 'Touba / Mbacké' },
  { value: 'diaspora', label: 'Diaspora' },
]
const GROUPES_SANGUINS = [
  { value: '', label: 'Non renseigné' },
  ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v })),
]
const NIVEAUX = [
  { value: '', label: 'Non renseigné' },
  { value: 'faible', label: 'Faible' },
  { value: 'debutant', label: 'Débutant' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
]

const initialForm = {
  username: '', email: '', password: '', first_name: '', last_name: '',
  role: 'membre', telephone: '', adresse: '', sexe: '', profession: '',
  categorie: 'professionnel', cellule: '', groupe_sanguin: '',
  niveau_alquran: '', niveau_majalis: '', numero_carte: '', est_actif: true,
}

const normCat = (cat) => {
  const raw = (cat || '').toString().trim().toLowerCase()
  if (raw === 'eleve') return 'eleve'
  if (raw === 'etudiant') return 'etudiant'
  return 'professionnel'
}

const catLabel = (cat) => {
  const c = normCat(cat)
  if (c === 'eleve') return 'Élève'
  if (c === 'etudiant') return 'Étudiant'
  return 'Professionnel'
}

const roleInfo = (role) => ROLES.find(r => r.value === role) || { label: role, color: C.vert }

function StatBar({ label, value, color }) {
  return (
    <Box sx={{ textAlign: 'center', px: { xs: 1.5, md: 2.5 } }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color, fontFamily: '"Cormorant Garamond", serif', lineHeight: 1 }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: '#777', fontWeight: 500 }}>{label}</Typography>
    </Box>
  )
}

export default function GestionMembres() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const [search, setSearch] = useState('')
  const [sexeFilter, setSexeFilter] = useState('')
  const [categorieFilter, setCategorieFilter] = useState('')
  const [professionFilter, setProfessionFilter] = useState('')
  const [celluleFilter, setCelluleFilter] = useState('')
  const [groupeSanguinFilter, setGroupeSanguinFilter] = useState('')
  const [niveauAlquranFilter, setNiveauAlquranFilter] = useState('')
  const [niveauMajalisFilter, setNiveauMajalisFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const activeFilterCount = [search, sexeFilter, categorieFilter, professionFilter, celluleFilter,
    groupeSanguinFilter, niveauAlquranFilter, niveauMajalisFilter, statutFilter, roleFilter].filter(Boolean).length

  const resetFilters = () => {
    setSearch(''); setSexeFilter(''); setCategorieFilter(''); setProfessionFilter('')
    setCelluleFilter(''); setGroupeSanguinFilter(''); setNiveauAlquranFilter('')
    setNiveauMajalisFilter(''); setStatutFilter(''); setRoleFilter('')
  }

  const loadList = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/auth/users/')
      setList(data.results || data)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadList() }, [])

  const handleOpenAdd = () => {
    setEditingId(null); setForm(initialForm); setFieldErrors({}); setOpenForm(true)
  }

  const handleOpenEdit = (u) => {
    setEditingId(u.id)
    setForm({
      username: u.username, email: u.email || '', password: '',
      first_name: u.first_name || '', last_name: u.last_name || '',
      role: u.role || 'membre', telephone: u.telephone || '',
      adresse: u.adresse || '', sexe: u.sexe || '', profession: u.profession || '',
      categorie: normCat(u.categorie), cellule: u.cellule || '',
      groupe_sanguin: u.groupe_sanguin || '', niveau_alquran: u.niveau_alquran || '',
      niveau_majalis: u.niveau_majalis || '', numero_carte: u.numero_carte || '',
      est_actif: u.est_actif ?? true,
    })
    setFieldErrors({}); setOpenForm(true)
  }

  const handleCloseForm = () => { setOpenForm(false); setEditingId(null); setForm(initialForm); setFieldErrors({}) }

  const setF = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setFieldErrors(fe => ({ ...fe, [field]: undefined }))
  }

  const handleSave = async () => {
    const errors = {}
    if (!form.username) errors.username = 'Identifiant requis.'
    if (!form.email) errors.email = 'Email requis.'
    if (!editingId && !form.password) errors.password = 'Mot de passe requis pour un nouveau membre.'
    if (form.password && form.password.length < 8) errors.password = 'Minimum 8 caractères.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) { setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' }); return }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const catValide = normCat(form.categorie)
      if (editingId) {
        const payload = { ...form, categorie: catValide }
        if (!payload.password) delete payload.password
        const res = await api.patch(`/auth/users/${editingId}/`, payload)
        if (res.data) setList(prev => prev.map(u => u.id === editingId ? { ...u, ...res.data } : u))
        setMessage({ type: 'success', text: 'Membre modifié.' })
        await new Promise(r => setTimeout(r, 300))
      } else {
        await api.post('/auth/register/', { ...form, categorie: catValide })
        setMessage({ type: 'success', text: 'Membre créé.' })
      }
      await loadList()
      handleCloseForm()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const apiErrors = {}
        Object.entries(data).forEach(([k, v]) => { apiErrors[k] = Array.isArray(v) ? String(v[0]) : v })
        setFieldErrors(prev => ({ ...prev, ...apiErrors }))
        setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      } else {
        const d = err.response?.data?.detail || data
        setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!openDelete) return
    setSaving(true)
    try {
      await api.delete(`/auth/users/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Membre supprimé.' })
      loadList(); setOpenDelete(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur lors de la suppression.' })
    } finally {
      setSaving(false)
    }
  }

  const filteredList = list.filter(u => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q || [u.first_name, u.last_name, u.username, u.email, u.telephone, u.numero_carte]
      .some(v => v && v.toLowerCase().includes(q))
    const matchSexe = !sexeFilter || u.sexe === sexeFilter
    const matchCat = !categorieFilter || normCat(u.categorie) === categorieFilter
    const matchProf = !professionFilter || (u.profession || '').toLowerCase().includes(professionFilter.trim().toLowerCase())
    const matchCellule = !celluleFilter || (u.cellule || '') === celluleFilter
    const matchGS = !groupeSanguinFilter || (u.groupe_sanguin || '') === groupeSanguinFilter
    const matchNQ = !niveauAlquranFilter || (u.niveau_alquran || '') === niveauAlquranFilter
    const matchNM = !niveauMajalisFilter || (u.niveau_majalis || '') === niveauMajalisFilter
    const matchStatut = !statutFilter || (statutFilter === 'actif' ? u.est_actif : !u.est_actif)
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchSexe && matchCat && matchProf && matchCellule && matchGS && matchNQ && matchNM && matchStatut && matchRole
  })

  const totalActifs = list.filter(u => u.est_actif).length
  const totalInactifs = list.length - totalActifs
  const tauxActifs = list.length ? Math.round((totalActifs / list.length) * 100) : 0

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: C.vert, fontWeight: 700, fontFamily: '"Cormorant Garamond", serif' }}>
            Gestion des membres
          </Typography>
          <Typography variant="body2" sx={{ color: C.vertFonce, mt: 0.5 }}>
            {list.length} membre{list.length > 1 ? 's' : ''} · {filteredList.length} affiché{filteredList.length > 1 ? 's' : ''}
            {activeFilterCount > 0 && ` (${activeFilterCount} filtre${activeFilterCount > 1 ? 's' : ''} actif${activeFilterCount > 1 ? 's' : ''})`}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenAdd}
          sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, fontWeight: 700 }}
        >
          Ajouter un membre
        </Button>
      </Box>

      {/* Stats bar */}
      {!loading && (
        <Card sx={{ mb: 2.5, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${C.vert}18` }}>
          <CardContent sx={{ py: 1.5, px: 3 }}>
            <Box display="flex" flexWrap="wrap" gap={0} alignItems="center">
              <StatBar label="Total membres" value={list.length} color={C.vert} />
              <Box sx={{ width: 1, height: 36, bgcolor: '#E0E0E0', mx: 1 }} />
              <StatBar label="Actifs" value={totalActifs} color={C.vertClair} />
              <Box sx={{ width: 1, height: 36, bgcolor: '#E0E0E0', mx: 1 }} />
              <StatBar label="Inactifs" value={totalInactifs} color="#999" />
              <Box sx={{ flex: 1, minWidth: 140, ml: 3 }}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" sx={{ color: '#666' }}>Taux d'activité</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: C.vert }}>{tauxActifs}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={tauxActifs}
                  sx={{ height: 7, borderRadius: 4, bgcolor: `${C.vert}18`, '& .MuiLinearProgress-bar': { bgcolor: C.vert, borderRadius: 4 } }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Search + filter toggle */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Rechercher nom, email, téléphone, carte…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, minWidth: 220 }}
          InputProps={{
            startAdornment: <Search sx={{ color: '#aaa', mr: 1, fontSize: 20 }} />,
            endAdornment: search ? (
              <IconButton size="small" onClick={() => setSearch('')}><Close sx={{ fontSize: 16 }} /></IconButton>
            ) : null,
          }}
        />
        <Button
          variant={showFilters ? 'contained' : 'outlined'}
          startIcon={showFilters ? <FilterListOff /> : <FilterList />}
          endIcon={activeFilterCount > 0 ? (
            <Chip label={activeFilterCount} size="small" sx={{ bgcolor: showFilters ? 'rgba(255,255,255,0.3)' : C.or, color: showFilters ? '#fff' : C.vertFonce, height: 18, fontWeight: 700, minWidth: 0 }} />
          ) : null}
          onClick={() => setShowFilters(v => !v)}
          sx={{
            borderRadius: 2, fontWeight: 600,
            ...(showFilters
              ? { bgcolor: C.vert, color: '#fff', '&:hover': { bgcolor: C.vertFonce } }
              : { borderColor: `${C.vert}50`, color: C.vert }),
          }}
        >
          Filtres {showFilters ? <ExpandLess sx={{ ml: 0.5, fontSize: 18 }} /> : <ExpandMore sx={{ ml: 0.5, fontSize: 18 }} />}
        </Button>
        {activeFilterCount > 0 && (
          <Button size="small" onClick={resetFilters} sx={{ color: '#999', fontSize: '0.75rem', textDecoration: 'underline' }}>
            Tout effacer
          </Button>
        )}
      </Box>

      {/* Active filter chips (when panel closed) */}
      {activeFilterCount > 0 && !showFilters && (
        <Box display="flex" flexWrap="wrap" gap={0.75} mb={1.5}>
          {search && <Chip label={`"${search}"`} size="small" onDelete={() => setSearch('')} sx={{ bgcolor: `${C.vert}12` }} />}
          {sexeFilter && <Chip label={sexeFilter === 'M' ? 'Masculin' : 'Féminin'} size="small" onDelete={() => setSexeFilter('')} sx={{ bgcolor: `${C.vert}12` }} />}
          {statutFilter && <Chip label={statutFilter === 'actif' ? 'Actif' : 'Inactif'} size="small" onDelete={() => setStatutFilter('')} sx={{ bgcolor: `${C.vert}12` }} />}
          {categorieFilter && <Chip label={catLabel(categorieFilter)} size="small" onDelete={() => setCategorieFilter('')} sx={{ bgcolor: `${C.vert}12` }} />}
          {roleFilter && <Chip label={roleInfo(roleFilter).label} size="small" onDelete={() => setRoleFilter('')} sx={{ bgcolor: `${C.vert}12` }} />}
          {celluleFilter && <Chip label={CELLULES.find(c => c.value === celluleFilter)?.label || celluleFilter} size="small" onDelete={() => setCelluleFilter('')} sx={{ bgcolor: `${C.vert}12` }} />}
          {professionFilter && <Chip label={`Métier: ${professionFilter}`} size="small" onDelete={() => setProfessionFilter('')} sx={{ bgcolor: `${C.vert}12` }} />}
          {groupeSanguinFilter && <Chip label={`GS: ${groupeSanguinFilter}`} size="small" onDelete={() => setGroupeSanguinFilter('')} sx={{ bgcolor: `${C.vert}12` }} />}
          {niveauAlquranFilter && <Chip label={`Quran: ${niveauAlquranFilter}`} size="small" onDelete={() => setNiveauAlquranFilter('')} sx={{ bgcolor: `${C.vert}12` }} />}
          {niveauMajalisFilter && <Chip label={`Majalis: ${niveauMajalisFilter}`} size="small" onDelete={() => setNiveauMajalisFilter('')} sx={{ bgcolor: `${C.vert}12` }} />}
        </Box>
      )}

      {/* Filtres avancés */}
      <Collapse in={showFilters}>
        <Card sx={{ mb: 2, borderRadius: 3, bgcolor: `${C.vert}04`, border: `1px solid ${C.vert}1A` }}>
          <CardContent sx={{ py: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={6} sm={4} md={2}>
                <TextField select label="Sexe" value={sexeFilter} onChange={e => setSexeFilter(e.target.value)} size="small" fullWidth>
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="M">Masculin</MenuItem>
                  <MenuItem value="F">Féminin</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField select label="Statut" value={statutFilter} onChange={e => setStatutFilter(e.target.value)} size="small" fullWidth>
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="actif">Actif</MenuItem>
                  <MenuItem value="inactif">Inactif</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField select label="Catégorie" value={categorieFilter} onChange={e => setCategorieFilter(e.target.value)} size="small" fullWidth>
                  <MenuItem value="">Toutes</MenuItem>
                  <MenuItem value="eleve">Élève</MenuItem>
                  <MenuItem value="etudiant">Étudiant</MenuItem>
                  <MenuItem value="professionnel">Professionnel</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField select label="Rôle" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} size="small" fullWidth>
                  <MenuItem value="">Tous</MenuItem>
                  {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField select label="Cellule" value={celluleFilter} onChange={e => setCelluleFilter(e.target.value)} size="small" fullWidth>
                  {CELLULES.map(c => <MenuItem key={c.value || 'none'} value={c.value}>{c.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField select label="Groupe sanguin" value={groupeSanguinFilter} onChange={e => setGroupeSanguinFilter(e.target.value)} size="small" fullWidth>
                  {GROUPES_SANGUINS.map(g => <MenuItem key={g.value || 'none'} value={g.value}>{g.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField select label="Niveau Al-Quran" value={niveauAlquranFilter} onChange={e => setNiveauAlquranFilter(e.target.value)} size="small" fullWidth>
                  {NIVEAUX.map(n => <MenuItem key={n.value || 'none'} value={n.value}>{n.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField select label="Niveau Majalis" value={niveauMajalisFilter} onChange={e => setNiveauMajalisFilter(e.target.value)} size="small" fullWidth>
                  {NIVEAUX.map(n => <MenuItem key={n.value || 'none'} value={n.value}>{n.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={8} md={4}>
                <TextField label="Filtrer par profession" value={professionFilter} onChange={e => setProfessionFilter(e.target.value)} size="small" fullWidth />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Collapse>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: C.vert }} /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: `1px solid ${C.vert}18`, overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {['Membre', 'Rôle', 'Catégorie', 'Cellule', 'Téléphone', 'Niv. Quran', 'Niv. Majalis', 'N° carte', 'Statut', ''].map((col, i) => (
                  <TableCell key={i} align={i === 9 ? 'right' : 'left'} sx={{
                    bgcolor: `${C.vert}0D`, color: C.vertFonce, fontWeight: 700, fontSize: '0.78rem',
                    borderBottom: `2px solid ${C.vert}25`, whiteSpace: 'nowrap', py: 1.5,
                  }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <People sx={{ fontSize: 44, color: '#DDD', display: 'block', mx: 'auto', mb: 1 }} />
                    <Typography sx={{ color: '#AAA' }}>Aucun membre correspondant aux filtres</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((u, idx) => {
                  const ri = roleInfo(u.role)
                  return (
                    <TableRow key={u.id} sx={{
                      bgcolor: idx % 2 === 0 ? '#fff' : `${C.vert}04`,
                      '&:hover': { bgcolor: `${C.or}14` },
                      opacity: u.est_actif ? 1 : 0.6,
                      transition: 'background 0.15s',
                    }}>
                      <TableCell sx={{ py: 1, minWidth: 180 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={getMediaUrl(u.photo, u.photo_updated_at ? `v=${u.photo_updated_at}` : '')}
                            sx={{ width: 34, height: 34, bgcolor: ri.color, color: '#fff', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}
                          >
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1A1A2E', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                              {u.sexe === 'M' ? 'Señ ' : u.sexe === 'F' ? 'Soxna ' : ''}{u.first_name || ''} {u.last_name || ''}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#888' }}>{u.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip
                          label={u.role_display || ri.label}
                          size="small"
                          sx={{ bgcolor: `${ri.color}18`, color: ri.color, fontWeight: 600, fontSize: '0.7rem', border: 'none', maxWidth: 140 }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: '0.8rem', color: '#555', whiteSpace: 'nowrap' }}>{catLabel(u.categorie)}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: '0.8rem', color: '#555', whiteSpace: 'nowrap' }}>
                        {CELLULES.find(c => c.value === u.cellule)?.label || (u.cellule || '—')}
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: '0.8rem', color: '#555', whiteSpace: 'nowrap' }}>{u.telephone || '—'}</TableCell>
                      <TableCell sx={{ py: 1, fontSize: '0.8rem', color: '#555', whiteSpace: 'nowrap' }}>
                        {NIVEAUX.find(n => n.value === u.niveau_alquran)?.label || (u.niveau_alquran || '—')}
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: '0.8rem', color: '#555', whiteSpace: 'nowrap' }}>
                        {NIVEAUX.find(n => n.value === u.niveau_majalis)?.label || (u.niveau_majalis || '—')}
                      </TableCell>
                      <TableCell sx={{ py: 1, fontSize: '0.8rem', color: '#555' }}>{u.numero_carte || '—'}</TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip
                          label={u.est_actif ? 'Actif' : 'Inactif'}
                          size="small"
                          icon={u.est_actif ? undefined : <PersonOff sx={{ fontSize: 13 }} />}
                          sx={{
                            bgcolor: u.est_actif ? '#E8F5E9' : '#F5F5F5',
                            color: u.est_actif ? '#2E7D32' : '#757575',
                            fontWeight: 700, fontSize: '0.7rem', border: 'none',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1, whiteSpace: 'nowrap' }}>
                        <Tooltip title="Modifier" arrow>
                          <IconButton size="small" onClick={() => handleOpenEdit(u)} sx={{ color: C.vert, '&:hover': { bgcolor: `${C.vert}15` } }}>
                            <Edit sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer" arrow>
                          <IconButton size="small" onClick={() => setOpenDelete(u)} sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(211,47,47,0.1)' } }}>
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Form dialog */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: `${C.vert}08`, borderBottom: `1px solid ${C.vert}1A`, fontWeight: 700, color: C.vertFonce }}>
          {editingId ? 'Modifier le membre' : 'Ajouter un membre'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Identifiant (username)" value={form.username} onChange={setF('username')} required disabled={!!editingId} fullWidth error={!!fieldErrors.username} helperText={fieldErrors.username || ''} />
            <TextField label="Email" type="email" value={form.email} onChange={setF('email')} required fullWidth error={!!fieldErrors.email} helperText={fieldErrors.email || ''} />
            <TextField
              label={editingId ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
              type="password" value={form.password} onChange={setF('password')} required={!editingId} fullWidth
              error={!!fieldErrors.password} helperText={fieldErrors.password || (!editingId ? 'Minimum 8 caractères' : '')}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="Prénom" value={form.first_name} onChange={setF('first_name')} fullWidth /></Grid>
              <Grid item xs={6}><TextField label="Nom" value={form.last_name} onChange={setF('last_name')} fullWidth /></Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField select label="Sexe" value={form.sexe} onChange={setF('sexe')} fullWidth>
                  <MenuItem value="">Non renseigné</MenuItem>
                  <MenuItem value="M">Masculin</MenuItem>
                  <MenuItem value="F">Féminin</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Rôle" value={form.role} onChange={setF('role')} fullWidth>
                  {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
            <TextField label="Téléphone" value={form.telephone} onChange={setF('telephone')} fullWidth />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField select label="Catégorie" value={form.categorie || 'professionnel'} onChange={e => setForm(f => ({ ...f, categorie: e.target.value || 'professionnel' }))} fullWidth required>
                  <MenuItem value="eleve">Élève</MenuItem>
                  <MenuItem value="etudiant">Étudiant</MenuItem>
                  <MenuItem value="professionnel">Professionnel</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Cellule" value={form.cellule || ''} onChange={e => { setForm(f => ({ ...f, cellule: e.target.value })); setFieldErrors(fe => ({ ...fe, cellule: undefined })) }} fullWidth error={!!fieldErrors.cellule} helperText={fieldErrors.cellule || ''}>
                  {CELLULES.map(c => <MenuItem key={c.value || 'none'} value={c.value}>{c.label}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField select label="Niveau Al-Quran" value={form.niveau_alquran || ''} onChange={setF('niveau_alquran')} fullWidth>
                  {NIVEAUX.map(n => <MenuItem key={n.value || 'none'} value={n.value}>{n.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Niveau Majalis" value={form.niveau_majalis || ''} onChange={setF('niveau_majalis')} fullWidth>
                  {NIVEAUX.map(n => <MenuItem key={n.value || 'none'} value={n.value}>{n.label}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField select label="Groupe sanguin" value={form.groupe_sanguin || ''} onChange={setF('groupe_sanguin')} fullWidth>
                  {GROUPES_SANGUINS.map(g => <MenuItem key={g.value || 'none'} value={g.value}>{g.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Numéro de carte" value={form.numero_carte} onChange={setF('numero_carte')} fullWidth />
              </Grid>
            </Grid>
            <TextField label="Profession" value={form.profession} onChange={setF('profession')} fullWidth />
            <TextField label="Adresse" value={form.adresse} onChange={setF('adresse')} multiline rows={2} fullWidth />
            <TextField select label="Statut du compte" value={form.est_actif ? 'actif' : 'inactif'} onChange={e => setForm(f => ({ ...f, est_actif: e.target.value === 'actif' }))} fullWidth>
              <MenuItem value="actif">Actif</MenuItem>
              <MenuItem value="inactif">Inactif</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseForm} sx={{ color: '#666' }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, fontWeight: 700, px: 3 }}>
            {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : (editingId ? 'Enregistrer' : 'Créer')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)} maxWidth="xs">
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>Supprimer ce membre ?</DialogTitle>
        <DialogContent>
          {openDelete && (
            <Typography>
              Êtes-vous sûr de vouloir supprimer <strong>{openDelete.first_name} {openDelete.last_name}</strong> ({openDelete.email}) ?
              Cette action est irréversible.
            </Typography>
          )}
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
