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

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }
const ROLES = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'membre', label: 'Membre' },
  { value: 'jewrin', label: 'Jewrin' },
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

  const loadList = () => {
    setLoading(true)
    api.get('/auth/users/').then(({ data }) => setList(data.results || data)).catch(() => setList([])).finally(() => setLoading(false))
  }

  useEffect(() => { loadList() }, [])

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm(initialForm)
    setOpenForm(true)
  }

  const handleOpenEdit = (u) => {
    setEditingId(u.id)
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
    })
    setOpenForm(true)
  }

  const handleCloseForm = () => {
    setOpenForm(false)
    setEditingId(null)
    setForm(initialForm)
  }

  const handleSave = async () => {
    if (!form.username || !form.email) {
      setMessage({ type: 'error', text: 'Identifiant et email requis.' })
      return
    }
    if (!editingId && !form.password) {
      setMessage({ type: 'error', text: 'Mot de passe requis pour un nouveau membre.' })
      return
    }
    if (form.password && form.password.length < 8) {
      setMessage({ type: 'error', text: 'Le mot de passe doit faire au moins 8 caractères.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      if (editingId) {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        await api.patch(`/auth/users/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Membre modifié.' })
      } else {
        await api.post('/auth/register/', form)
        setMessage({ type: 'success', text: 'Membre créé.' })
      }
      loadList()
      handleCloseForm()
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof detail === 'object' ? JSON.stringify(detail) : (detail || 'Erreur') })
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
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
                <TableCell>Email</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">Aucun membre</TableCell></TableRow>
              ) : (
                list.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: COLORS.or, color: COLORS.vert }}>{u.first_name?.[0]}{u.last_name?.[0]}</Avatar>
                        {u.first_name} {u.last_name}
                      </Box>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Chip label={u.role_display || u.role} size="small" sx={{ bgcolor: `${COLORS.or}30` }} /></TableCell>
                    <TableCell>{u.telephone || '—'}</TableCell>
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
            <TextField label="Identifiant (username)" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required disabled={!!editingId} fullWidth />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required fullWidth />
            <TextField label={editingId ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required={!editingId} fullWidth />
            <TextField label="Prénom" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} fullWidth />
            <TextField label="Nom" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} fullWidth />
            <TextField select label="Rôle" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} fullWidth>
              {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
            <TextField label="Téléphone" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} fullWidth />
            <TextField label="Numéro Wave" value={form.numero_wave} onChange={(e) => setForm((f) => ({ ...f, numero_wave: e.target.value }))} fullWidth />
            <TextField label="Adresse" value={form.adresse} onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))} multiline rows={2} fullWidth />
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
