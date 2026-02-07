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
} from '@mui/material'
import { CheckCircle, Replay } from '@mui/icons-material'
import api from '../../services/api'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

export default function ValidationsKamil() {
  const [jukkis, setJukkis] = useState([])
  const [kamils, setKamils] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterKamil, setFilterKamil] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [recommencerId, setRecommencerId] = useState(null)

  const loadJukkis = () => {
    setLoading(true)
    api.get('/culturelle/jukkis/')
      .then(({ data }) => setJukkis(data.results || data))
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
                        {j.est_valide ? (
                          <Chip label="Validé" color="success" size="small" icon={<CheckCircle />} />
                        ) : (
                          <Chip label="Non validé" color="default" size="small" />
                        )}
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
    </Box>
  )
}
