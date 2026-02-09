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
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
} from '@mui/material'
import { CheckCircle, Replay, Edit } from '@mui/icons-material'
import api from '../../services/api'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

export default function ValidationsKamil() {
  const [jukkis, setJukkis] = useState([])
  const [kamils, setKamils] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterKamil, setFilterKamil] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [recommencerId, setRecommencerId] = useState(null)
  const [openStatusDialog, setOpenStatusDialog] = useState(null)
  const [statusForm, setStatusForm] = useState({ est_valide: false })
  const [saving, setSaving] = useState(false)

  const loadJukkis = () => {
    setLoading(true)
    api.get('/culturelle/jukkis/')
      .then(({ data }) => {
        const list = data.results || data
        setJukkis(list)
      })
      .catch(() => setJukkis([]))
      .finally(() => setLoading(false))
  }
  const loadKamils = () => api.get('/culturelle/kamil/').then(({ data }) => setKamils(data.results || data)).catch(() => setKamils([]))

  useEffect(() => { loadJukkis(); loadKamils() }, [])

  const handleRecommencer = async (kamilId) => {
    setRecommencerId(kamilId)
    setMessage({ type: '', text: '' })
    try {
      await api.post(`/culturelle/kamil/${kamilId}/recommencer/`)
      setMessage({ type: 'success', text: 'Kamil réinitialisé. Chaque membre devra revalider ses JUKKI.' })
      loadJukkis()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setRecommencerId(null)
    }
  }

  const handleOpenStatusDialog = (jukki) => {
    setOpenStatusDialog(jukki)
    setStatusForm({ est_valide: jukki.est_valide || false })
  }

  const handleChangeStatus = async () => {
    if (!openStatusDialog) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.patch(`/culturelle/jukkis/${openStatusDialog.id}/changer_statut/`, {
        est_valide: statusForm.est_valide,
      })
      setMessage({ type: 'success', text: 'Statut du JUKKI modifié.' })
      setOpenStatusDialog(null)
      loadJukkis()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  const filtered = filterKamil
    ? jukkis.filter((j) => Number(j.kamil) === Number(filterKamil))
    : jukkis
  const byKamil = {}
  filtered.forEach((j) => {
    const k = j.kamil_titre || j.kamil || 'Programme'
    if (!byKamil[k]) byKamil[k] = []
    byKamil[k].push(j)
  })
  Object.keys(byKamil).forEach((k) => byKamil[k].sort((a, b) => a.numero - b.numero))
  
  // Pour chaque Kamil filtré, s'assurer qu'on affiche tous les 30 JUKKI
  // Si un Kamil est filtré, on vérifie qu'on a bien les 30 JUKKI
  const kamilsToShow = filterKamil 
    ? kamils.filter((k) => Number(k.id) === Number(filterKamil))
    : kamils
  
  kamilsToShow.forEach((kamil) => {
    const kamilId = kamil.id
    const kamilTitre = kamil.titre
    if (!byKamil[kamilTitre]) {
      byKamil[kamilTitre] = []
    }
    // Vérifier qu'on a bien les 30 JUKKI (ils devraient tous exister car créés à la création du Kamil)
    const existingNumbers = new Set(byKamil[kamilTitre].map((j) => j.numero))
    // Si certains JUKKI manquent dans la réponse API, on les ajoute comme non assignés
    for (let num = 1; num <= 30; num++) {
      if (!existingNumbers.has(num)) {
        byKamil[kamilTitre].push({
          id: `missing-${kamilId}-${num}`,
          kamil: kamilId,
          kamil_titre: kamilTitre,
          numero: num,
          membre: null,
          membre_nom: null,
          est_valide: false,
          date_validation: null,
        })
      }
    }
    byKamil[kamilTitre].sort((a, b) => a.numero - b.numero)
  })

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>
        Vue admin des JUKKI
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.vertFonce, mb: 3 }}>
        Tous les JUKKI, le membre assigné et le statut de validation (lu/validé).
      </Typography>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <TextField
        select
        size="small"
        label="Filtrer par programme"
        value={filterKamil}
        onChange={(e) => setFilterKamil(e.target.value)}
        sx={{ mb: 2, minWidth: 220 }}
      >
        <MenuItem value="">Tous les programmes</MenuItem>
        {kamils.map((k) => (
          <MenuItem key={k.id} value={k.id}>{k.titre}</MenuItem>
        ))}
      </TextField>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info">Aucun JUKKI à afficher.</Alert>
      ) : (
        Object.entries(byKamil).map(([kamilTitre, list]) => {
          const kamilId = list[0]?.kamil
          return (
          <Box key={kamilTitre} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" sx={{ color: COLORS.vert }}>{kamilTitre}</Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={recommencerId === kamilId ? <CircularProgress size={16} /> : <Replay />}
                onClick={() => handleRecommencer(kamilId)}
                disabled={!!recommencerId}
                sx={{ borderColor: COLORS.vert, color: COLORS.vert, '&:hover': { borderColor: COLORS.vertFonce, bgcolor: `${COLORS.vert}15` } }}
              >
                Recommencer
              </Button>
            </Box>
            <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${COLORS.or}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: `${COLORS.vert}12` }}>
                    <TableCell><strong>JUKKI</strong></TableCell>
                    <TableCell><strong>Membre assigné</strong></TableCell>
                    <TableCell><strong>Statut</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell><strong>JUKKI {j.numero}</strong></TableCell>
                      <TableCell>{j.membre_nom || '—'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {j.est_valide ? (
                            <Chip label="Validé" color="success" size="small" icon={<CheckCircle />} />
                          ) : (
                            <Chip label="Non validé" color="default" size="small" />
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handleOpenStatusDialog(j)}
                            sx={{ color: COLORS.vert }}
                            disabled={j.id?.toString().startsWith('missing-')}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          )
        })
      )}

      <Dialog open={!!openStatusDialog} onClose={() => setOpenStatusDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier le statut du JUKKI {openStatusDialog?.numero}</DialogTitle>
        <DialogContent>
          {openStatusDialog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Programme : {openStatusDialog.kamil_titre}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Membre assigné : {openStatusDialog.membre_nom || 'Aucun'}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={statusForm.est_valide}
                    onChange={(e) => setStatusForm({ est_valide: e.target.checked })}
                    color="primary"
                  />
                }
                label={statusForm.est_valide ? 'Validé' : 'Non validé'}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStatusDialog(null)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleChangeStatus}
            disabled={saving}
            sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
          >
            {saving ? <CircularProgress size={24} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
