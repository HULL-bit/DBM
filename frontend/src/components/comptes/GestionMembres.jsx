import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material'
import { Add, Edit, Delete } from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }
const ROLES = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'membre', label: 'Membre' },
  { value: 'jewrine_conservatoire', label: 'Jewrine Conservatoire' },
  { value: 'jewrine_finance', label: 'Jewrine Finance' },
  { value: 'jewrine_culturelle', label: 'Jewrine Culturelle' },
  { value: 'jewrine_sociale', label: 'Jewrine Sociale' },
  { value: 'jewrine_communication', label: 'Jewrine Communication' },
  { value: 'jewrine_organisation', label: 'Jewrine Organisation' },
]

const initialForm = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  role: 'membre',
  telephone: '',
  adresse: '',
  numero_wave: '',
  sexe: '',
  profession: '',
  categorie: 'professionnel', // Par défaut
  numero_carte: '',
  est_actif: true,
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
  const [search, setSearch] = useState('')
  const [sexeFilter, setSexeFilter] = useState('')
  const [categorieFilter, setCategorieFilter] = useState('')
  const [professionFilter, setProfessionFilter] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const loadList = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/auth/users/')
      const users = data.results || data
      console.log('Liste rechargée, catégories:', users.map(u => ({ id: u.id, nom: u.first_name, categorie: u.categorie })))
      setList(users)
    } catch (err) {
      console.error('Erreur lors du chargement:', err)
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadList() }, [])

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm(initialForm)
    setOpenForm(true)
  }

  const handleOpenEdit = (u) => {
    setEditingId(u.id)
    // Normaliser la catégorie depuis le backend
    const normaliseCategorie = (cat) => {
      if (!cat) return 'professionnel' // Par défaut si vide
      const raw = cat.toString().trim().toLowerCase()
      if (raw === 'eleve') return 'eleve'
      if (raw === 'etudiant') return 'etudiant'
      if (raw === 'professionnel' || raw === 'professionel') return 'professionnel'
      return 'professionnel' // Par défaut si valeur inconnue
    }
    
    setForm({
      username: u.username,
      email: u.email || '',
      password: '',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      role: u.role || 'membre',
      telephone: u.telephone || '',
      adresse: u.adresse || '',
      numero_wave: u.numero_wave || '',
      sexe: u.sexe || '',
      profession: u.profession || '',
      categorie: normaliseCategorie(u.categorie),
      numero_carte: u.numero_carte || '',
      est_actif: u.est_actif ?? true,
    })
    setFieldErrors({})
    setOpenForm(true)
  }

  const handleCloseForm = () => {
    setOpenForm(false)
    setEditingId(null)
    setForm(initialForm)
    setFieldErrors({})
  }

  const handleSave = async () => {
    const errors = {}
    if (!form.username) errors.username = 'Identifiant requis.'
    if (!form.email) errors.email = 'Email requis.'
    if (!editingId && !form.password) errors.password = 'Mot de passe requis pour un nouveau membre.'
    if (form.password && form.password.length < 8) errors.password = 'Le mot de passe doit faire au moins 8 caractères.'

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      // Normaliser la catégorie : utiliser la valeur du formulaire directement si valide
      let categorieValide = form.categorie && form.categorie.trim() 
        ? form.categorie.trim().toLowerCase() 
        : 'professionnel'
      
      // S'assurer que la valeur correspond aux choix valides
      if (!['eleve', 'etudiant', 'professionnel'].includes(categorieValide)) {
        categorieValide = 'professionnel'
      }

      if (editingId) {
        const payload = { ...form, categorie: categorieValide }
        if (!payload.password) delete payload.password
        console.log('Envoi PATCH avec categorie:', categorieValide, 'payload complet:', payload)
        const response = await api.patch(`/auth/users/${editingId}/`, payload)
        console.log('Réponse backend - categorie retournée:', response.data?.categorie)
        
        // Mettre à jour directement dans la liste si la réponse contient les données
        if (response.data) {
          setList(prevList => 
            prevList.map(u => u.id === editingId ? { ...u, ...response.data } : u)
          )
        }
        
        setMessage({ type: 'success', text: 'Membre modifié.' })
        // Attendre un peu avant de recharger pour être sûr
        await new Promise(resolve => setTimeout(resolve, 300))
      } else {
        const payload = { ...form, categorie: categorieValide }
        await api.post('/auth/register/', payload)
        setMessage({ type: 'success', text: 'Membre créé.' })
      }
      // Recharger la liste pour voir les changements
      await loadList()
      handleCloseForm()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const apiFieldErrors = {}
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            apiFieldErrors[key] = String(value[0])
          } else if (typeof value === 'string') {
            apiFieldErrors[key] = value
          }
        })
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }))
        setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      } else {
        const detail = err.response?.data?.detail || data
        setMessage({ type: 'error', text: typeof detail === 'object' ? JSON.stringify(detail) : (detail || 'Erreur') })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!openDelete) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.delete(`/auth/users/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Membre supprimé.' })
      loadList()
      setOpenDelete(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur lors de la suppression.' })
    } finally {
      setSaving(false)
    }
  }

  const filteredList = list.filter((u) => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q
      || (u.first_name && u.first_name.toLowerCase().includes(q))
      || (u.last_name && u.last_name.toLowerCase().includes(q))
      || (u.username && u.username.toLowerCase().includes(q))
      || (u.email && u.email.toLowerCase().includes(q))
      || (u.telephone && u.telephone.toLowerCase().includes(q))
      || (u.numero_carte && u.numero_carte.toLowerCase().includes(q))

    const matchesSexe = !sexeFilter || u.sexe === sexeFilter

    // Normaliser la catégorie pour le filtre
    const rawCat = (u.categorie || '').toString().trim().toLowerCase()
    let normalisedCat = rawCat
    if (rawCat === 'professionel') normalisedCat = 'professionnel'
    if (!normalisedCat || !['eleve', 'etudiant', 'professionnel'].includes(normalisedCat)) {
      normalisedCat = 'professionnel' // Par défaut si vide ou invalide
    }
    const matchesCategorie = !categorieFilter || normalisedCat === categorieFilter.toLowerCase()

    const matchesProfession =
      !professionFilter ||
      (u.profession && u.profession.toLowerCase().includes(professionFilter.trim().toLowerCase()))

    return matchesSearch && matchesSexe && matchesCategorie && matchesProfession
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Gestion des membres</Typography>
            <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>Ajouter, modifier ou supprimer des membres</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenAdd}
            sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
          >
            Ajouter un membre
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            label="Rechercher (nom, email, téléphone, carte)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ minWidth: 220 }}
          />
          <TextField
            select
            label="Sexe"
            value={sexeFilter}
            onChange={(e) => setSexeFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="M">Masculin</MenuItem>
            <MenuItem value="F">Féminin</MenuItem>
          </TextField>
          <TextField
            select
            label="Catégorie"
            value={categorieFilter}
            onChange={(e) => setCategorieFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Toutes</MenuItem>
            <MenuItem value="eleve">Élève</MenuItem>
            <MenuItem value="etudiant">Étudiant</MenuItem>
            <MenuItem value="professionnel">Professionnel</MenuItem>
          </TextField>
          <TextField
            label="Filtrer par profession"
            value={professionFilter}
            onChange={(e) => setProfessionFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />
        </Box>
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${COLORS.or}` }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: `${COLORS.vert}12` }}>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Sexe</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Téléphone</TableCell>
                  <TableCell>Catégorie</TableCell>
                <TableCell>Profession</TableCell>
                <TableCell>Numéro carte</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center">Aucun membre</TableCell></TableRow>
              ) : (
                filteredList.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          src={getMediaUrl(u.photo, u.photo_updated_at ? `v=${u.photo_updated_at}` : '')}
                          sx={{ width: 32, height: 32, bgcolor: COLORS.or, color: COLORS.vert }}
                        >
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </Avatar>
                        {`${u.sexe === 'M' ? 'Señ ' : u.sexe === 'F' ? 'Soxna ' : ''}${u.first_name || ''} ${u.last_name || ''}`.trim()}
                      </Box>
                    </TableCell>
                    <TableCell>{u.sexe === 'M' ? 'Masculin' : u.sexe === 'F' ? 'Féminin' : '—'}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Chip label={u.role_display || u.role} size="small" sx={{ bgcolor: `${COLORS.or}30` }} /></TableCell>
                    <TableCell>{u.telephone || '—'}</TableCell>
                    <TableCell>
                      {(() => {
                        const rawCat = (u.categorie || '').toString().trim().toLowerCase()
                        // Normaliser les variations
                        let cat = rawCat
                        if (rawCat === 'professionel') cat = 'professionnel'
                        if (!cat || !['eleve', 'etudiant', 'professionnel'].includes(cat)) {
                          cat = 'professionnel' // Par défaut si vide ou invalide
                        }
                        if (cat === 'eleve') return 'Élève'
                        if (cat === 'etudiant') return 'Étudiant'
                        if (cat === 'professionnel') return 'Professionnel'
                        return 'Professionnel' // Fallback
                      })()}
                    </TableCell>
                    <TableCell>{u.profession || '—'}</TableCell>
                    <TableCell>{u.numero_carte || '—'}</TableCell>
                    <TableCell><Chip label={u.est_actif ? 'Actif' : 'Inactif'} color={u.est_actif ? 'success' : 'default'} size="small" /></TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenEdit(u)} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                      <IconButton size="small" onClick={() => setOpenDelete(u)} sx={{ color: 'error.main' }}><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Modifier le membre' : 'Ajouter un membre'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Identifiant (username)"
              value={form.username}
              onChange={(e) => {
                setForm((f) => ({ ...f, username: e.target.value }))
                setFieldErrors((fe) => ({ ...fe, username: undefined }))
              }}
              required
              disabled={!!editingId}
              fullWidth
              error={!!fieldErrors.username}
              helperText={fieldErrors.username || ''}
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm((f) => ({ ...f, email: e.target.value }))
                setFieldErrors((fe) => ({ ...fe, email: undefined }))
              }}
              required
              fullWidth
              error={!!fieldErrors.email}
              helperText={fieldErrors.email || ''}
            />
            <TextField
              label={editingId ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
              type="password"
              value={form.password}
              onChange={(e) => {
                setForm((f) => ({ ...f, password: e.target.value }))
                setFieldErrors((fe) => ({ ...fe, password: undefined }))
              }}
              required={!editingId}
              fullWidth
              error={!!fieldErrors.password}
              helperText={fieldErrors.password || (!editingId ? 'Minimum 8 caractères' : '')}
            />
            <TextField label="Prénom" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} fullWidth />
            <TextField label="Nom" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} fullWidth />
            <TextField
              select
              label="Sexe"
              value={form.sexe}
              onChange={(e) => setForm((f) => ({ ...f, sexe: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">Non renseigné</MenuItem>
              <MenuItem value="M">Masculin</MenuItem>
              <MenuItem value="F">Féminin</MenuItem>
            </TextField>
            <TextField select label="Rôle" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} fullWidth>
              {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
            <TextField label="Téléphone" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} fullWidth />
            <TextField
              select
              label="Catégorie"
              value={form.categorie || 'professionnel'}
              onChange={(e) => {
                const newValue = e.target.value || 'professionnel'
                console.log('Catégorie changée:', newValue)
                setForm((f) => ({ ...f, categorie: newValue }))
              }}
              fullWidth
              required
            >
              <MenuItem value="eleve">Élève</MenuItem>
              <MenuItem value="etudiant">Étudiant</MenuItem>
              <MenuItem value="professionnel">Professionnel</MenuItem>
            </TextField>
            <TextField label="Profession" value={form.profession} onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))} fullWidth />
            <TextField label="Numéro de carte" value={form.numero_carte} onChange={(e) => setForm((f) => ({ ...f, numero_carte: e.target.value }))} fullWidth />
            <TextField label="Numéro Wave" value={form.numero_wave} onChange={(e) => setForm((f) => ({ ...f, numero_wave: e.target.value }))} fullWidth />
            <TextField label="Adresse" value={form.adresse} onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))} multiline rows={2} fullWidth />
            <TextField
              select
              label="Statut du compte"
              value={form.est_actif ? 'actif' : 'inactif'}
              onChange={(e) => setForm((f) => ({ ...f, est_actif: e.target.value === 'actif' }))}
              fullWidth
            >
              <MenuItem value="actif">Actif</MenuItem>
              <MenuItem value="inactif">Inactif</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {saving ? <CircularProgress size={24} /> : (editingId ? 'Enregistrer' : 'Créer')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
        <DialogTitle>Supprimer ce membre ?</DialogTitle>
        <DialogContent>
          {openDelete && (
            <Typography>Êtes-vous sûr de vouloir supprimer {openDelete.first_name} {openDelete.last_name} ({openDelete.email}) ?</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>{saving ? <CircularProgress size={24} /> : 'Supprimer'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
