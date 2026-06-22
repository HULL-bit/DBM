import { useState, useEffect } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, LinearProgress, Tooltip,
} from '@mui/material'
import { Add, Edit, Delete, Inventory2, ArrowBack, CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029', vertClair: '#3d7a52' }

const MODULES = [
  { value: 'conservatoire', label: 'Conservatoire', color: C.vert },
  { value: 'culturelle', label: 'Culturelle', color: '#1565C0' },
  { value: 'organisation', label: 'Organisation', color: '#6A1B9A' },
  { value: 'generale', label: 'Générale', color: '#555' },
]

const initialForm = {
  nom: '', description: '', categorie: '', module: 'generale',
  quantite_totale: 0, quantite_disponible: 0, quantite_defectueuse: 0,
  lieu_stockage: '', date_acquisition: '', notes: '',
}

function StatBadge({ value, label, color, icon: Icon }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
        {Icon && <Icon sx={{ fontSize: 14, color }} />}
        <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#888' }}>{label}</Typography>
    </Box>
  )
}

function MaterielCard({ item, isAdmin, onEdit, onDelete, moduleColor }) {
  const pct = item.quantite_totale > 0 ? Math.round((item.quantite_disponible / item.quantite_totale) * 100) : 0
  const hasDefect = item.quantite_defectueuse > 0
  return (
    <Card sx={{
      borderRadius: 2.5, height: '100%', border: `1px solid ${moduleColor}20`,
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      transition: 'all 0.2s', '&:hover': { boxShadow: `0 6px 20px ${moduleColor}25`, transform: 'translateY(-2px)' },
    }}>
      <Box sx={{ height: 4, bgcolor: moduleColor, borderRadius: '8px 8px 0 0' }} />
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: C.vertFonce, lineHeight: 1.2 }}>{item.nom}</Typography>
            {item.categorie && (
              <Chip label={item.categorie} size="small" sx={{ mt: 0.5, bgcolor: `${moduleColor}15`, color: moduleColor, fontWeight: 600, fontSize: '0.68rem', border: 'none' }} />
            )}
          </Box>
          {isAdmin && (
            <Box display="flex" gap={0.5} ml={1}>
              <Tooltip title="Modifier" arrow>
                <IconButton size="small" onClick={onEdit} sx={{ color: C.vert, '&:hover': { bgcolor: `${C.vert}15` } }}>
                  <Edit sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Supprimer" arrow>
                <IconButton size="small" onClick={onDelete} sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(211,47,47,0.1)' } }}>
                  <Delete sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {item.description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, lineHeight: 1.4 }}>
            {item.description}
          </Typography>
        )}

        <Grid container spacing={1} mb={1.5}>
          <Grid item xs={4}><StatBadge value={item.quantite_totale} label="Total" color={C.vertFonce} icon={Inventory2} /></Grid>
          <Grid item xs={4}><StatBadge value={item.quantite_disponible} label="Dispo" color="#2E7D32" icon={CheckCircle} /></Grid>
          <Grid item xs={4}><StatBadge value={item.quantite_defectueuse} label="Défect." color={hasDefect ? '#C62828' : '#999'} icon={hasDefect ? ErrorIcon : Warning} /></Grid>
        </Grid>

        <Box mb={1}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">Disponibilité</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: pct > 70 ? '#2E7D32' : pct > 30 ? C.or : '#C62828' }}>{pct}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 5, borderRadius: 3,
              bgcolor: `${moduleColor}15`,
              '& .MuiLinearProgress-bar': { bgcolor: pct > 70 ? '#2E7D32' : pct > 30 ? C.or : '#C62828', borderRadius: 3 },
            }}
          />
        </Box>

        {item.lieu_stockage && (
          <Typography variant="caption" color="text.secondary">Lieu : {item.lieu_stockage}</Typography>
        )}
        {item.date_acquisition && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Acquis le : {new Date(item.date_acquisition).toLocaleDateString('fr-FR')}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default function MaterielsPage({ module: moduleProp, onBack }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role?.startsWith('jewrine_')
  const [list, setList] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(null)
  const [form, setForm] = useState({ ...initialForm, module: moduleProp || 'generale' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [moduleFilter, setModuleFilter] = useState(moduleProp || '')

  const moduleInfo = MODULES.find(m => m.value === (moduleFilter || 'generale')) || MODULES[3]

  const loadData = async () => {
    setLoading(true)
    const params = moduleFilter ? `?module=${moduleFilter}` : ''
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get(`/organisation/materiels/${params}`),
        api.get(`/organisation/materiels/stats/${params ? `?module=${moduleFilter}` : ''}`),
      ])
      setList(listRes.data.results || listRes.data)
      setStats(statsRes.data)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [moduleFilter])

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({ ...initialForm, module: moduleFilter || 'generale' })
    setOpenForm(true)
  }

  const handleOpenEdit = (item) => {
    setEditingId(item.id)
    setForm({
      nom: item.nom || '', description: item.description || '',
      categorie: item.categorie || '', module: item.module || 'generale',
      quantite_totale: item.quantite_totale || 0,
      quantite_disponible: item.quantite_disponible || 0,
      quantite_defectueuse: item.quantite_defectueuse || 0,
      lieu_stockage: item.lieu_stockage || '',
      date_acquisition: item.date_acquisition || '',
      notes: item.notes || '',
    })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.nom) { setMessage({ type: 'error', text: 'Le nom est requis.' }); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        quantite_totale: Number(form.quantite_totale),
        quantite_disponible: Number(form.quantite_disponible),
        quantite_defectueuse: Number(form.quantite_defectueuse),
        date_acquisition: form.date_acquisition || null,
      }
      if (editingId) {
        await api.patch(`/organisation/materiels/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Matériel modifié.' })
      } else {
        await api.post('/organisation/materiels/', payload)
        setMessage({ type: 'success', text: 'Matériel ajouté.' })
      }
      await loadData()
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
      await api.delete(`/organisation/materiels/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Matériel supprimé.' })
      await loadData()
      setOpenDelete(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  const setF = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          {onBack && (
            <IconButton onClick={onBack} sx={{ color: C.vert }}>
              <ArrowBack />
            </IconButton>
          )}
          <Box>
            <Typography variant="h5" sx={{ color: C.vert, fontWeight: 700, fontFamily: '"Cormorant Garamond", serif' }}>
              Gestion des Matériels
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>Inventaire et disponibilité du matériel</Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
          {!moduleProp && (
            <TextField select label="Module" value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} size="small" sx={{ minWidth: 150 }}>
              <MenuItem value="">Tous les modules</MenuItem>
              {MODULES.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
          )}
          {isAdmin && (
            <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}
              sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, fontWeight: 700 }}>
              Ajouter
            </Button>
          )}
        </Box>
      </Box>

      {/* Stats summary */}
      {stats && (
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${C.vert}18` }}>
          <CardContent sx={{ py: 2 }}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={6} sm={3}><StatBadge value={stats.total_types} label="Types de matériels" color={C.vert} /></Grid>
              <Grid item xs={6} sm={3}><StatBadge value={stats.total_quantite} label="Quantité totale" color={C.vertFonce} /></Grid>
              <Grid item xs={6} sm={3}><StatBadge value={stats.total_disponible} label="Disponibles" color="#2E7D32" icon={CheckCircle} /></Grid>
              <Grid item xs={6} sm={3}><StatBadge value={stats.total_defectueuse} label="Défectueux" color={stats.total_defectueuse > 0 ? '#C62828' : '#999'} icon={stats.total_defectueuse > 0 ? ErrorIcon : Warning} /></Grid>
            </Grid>
            {stats.total_quantite > 0 && (
              <Box mt={2} px={1}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">Taux de disponibilité global</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: C.vert }}>{stats.pourcentage_disponible}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={stats.pourcentage_disponible}
                  sx={{ height: 7, borderRadius: 4, bgcolor: `${C.vert}15`, '& .MuiLinearProgress-bar': { bgcolor: C.vert, borderRadius: 4 } }} />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress sx={{ color: C.vert }} /></Box>
      ) : list.length === 0 ? (
        <Box textAlign="center" py={6}>
          <Inventory2 sx={{ fontSize: 56, color: '#DDD', mb: 1 }} />
          <Typography color="text.secondary">Aucun matériel enregistré</Typography>
          {isAdmin && <Button startIcon={<Add />} onClick={handleOpenAdd} sx={{ mt: 2, color: C.vert }}>Ajouter le premier matériel</Button>}
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {list.map(item => {
            const mi = MODULES.find(m => m.value === item.module) || MODULES[3]
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                <MaterielCard
                  item={item}
                  isAdmin={isAdmin}
                  onEdit={() => handleOpenEdit(item)}
                  onDelete={() => setOpenDelete(item)}
                  moduleColor={mi.color}
                />
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Form dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: `${C.vert}08`, borderBottom: `1px solid ${C.vert}1A`, fontWeight: 700, color: C.vertFonce }}>
          {editingId ? 'Modifier le matériel' : 'Ajouter un matériel'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Nom *" value={form.nom} onChange={setF('nom')} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" multiline rows={2} value={form.description} onChange={setF('description')} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Catégorie" value={form.categorie} onChange={setF('categorie')} placeholder="Ex: Sono, Micro, Bâche…" /></Grid>
            <Grid item xs={6}>
              <TextField select fullWidth label="Module" value={form.module} onChange={setF('module')}>
                {MODULES.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={4}><TextField fullWidth type="number" label="Qté totale" value={form.quantite_totale} onChange={setF('quantite_totale')} inputProps={{ min: 0 }} /></Grid>
            <Grid item xs={4}><TextField fullWidth type="number" label="Qté dispo" value={form.quantite_disponible} onChange={setF('quantite_disponible')} inputProps={{ min: 0 }} /></Grid>
            <Grid item xs={4}><TextField fullWidth type="number" label="Qté défect." value={form.quantite_defectueuse} onChange={setF('quantite_defectueuse')} inputProps={{ min: 0 }} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Lieu de stockage" value={form.lieu_stockage} onChange={setF('lieu_stockage')} /></Grid>
            <Grid item xs={6}><TextField fullWidth type="date" label="Date d'acquisition" value={form.date_acquisition} onChange={setF('date_acquisition')} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Notes" multiline rows={2} value={form.notes} onChange={setF('notes')} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenForm(false)} sx={{ color: '#666' }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, fontWeight: 700, px: 3 }}>
            {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : (editingId ? 'Enregistrer' : 'Ajouter')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)} maxWidth="xs">
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>Supprimer ce matériel ?</DialogTitle>
        <DialogContent>
          {openDelete && <Typography>Supprimer <strong>{openDelete.nom}</strong> ?</Typography>}
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
