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
  Button,
  Alert,
  CircularProgress,
} from '@mui/material'
import { CheckCircle, Cancel } from '@mui/icons-material'
import api from '../../services/api'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

export default function ValidationsKamil() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [actioning, setActioning] = useState(null)

  const loadList = () => {
    setLoading(true)
    api.get('/culturelle/progressions/?statut=lu').then(({ data }) => setList(data.results || data)).catch(() => setList([])).finally(() => setLoading(false))
  }
  useEffect(() => { loadList() }, [])

  const handleValider = async (progId) => {
    setActioning(progId)
    setMessage({ type: '', text: '' })
    try {
      await api.post(`/culturelle/progressions/${progId}/valider/`, {})
      setMessage({ type: 'success', text: 'Progression validée.' })
      loadList()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setActioning(null)
    }
  }

  const handleRefuser = async (progId) => {
    setActioning(progId)
    setMessage({ type: '', text: '' })
    try {
      await api.post(`/culturelle/progressions/${progId}/refuser/`, {})
      setMessage({ type: 'success', text: 'Progression refusée.' })
      loadList()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setActioning(null)
    }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Validations Kamil</Typography>
      <Typography variant="body2" sx={{ color: COLORS.vertFonce, mb: 3 }}>Demandes en attente de validation (Jewrin / Admin)</Typography>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${COLORS.or}` }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: `${COLORS.vert}12` }}>
                <TableCell>Membre</TableCell>
                <TableCell>Programme</TableCell>
                <TableCell>Chapitre / Juzz</TableCell>
                <TableCell>Date lecture</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">Aucune demande en attente</TableCell></TableRow>
              ) : (
                list.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.membre_nom || `#${p.membre}`}</TableCell>
                    <TableCell>{p.kamil_titre || p.kamil}</TableCell>
                    <TableCell>{p.chapitre_titre || `Chapitre ${p.chapitre_numero ?? p.chapitre}`}</TableCell>
                    <TableCell>{p.date_lecture ? new Date(p.date_lecture).toLocaleDateString('fr-FR') : '—'}</TableCell>
                    <TableCell align="right">
                      <Button size="small" color="success" startIcon={actioning === p.id ? <CircularProgress size={16} /> : <CheckCircle />} disabled={!!actioning} onClick={() => handleValider(p.id)} sx={{ mr: 1 }}>Valider</Button>
                      <Button size="small" color="error" startIcon={<Cancel />} disabled={!!actioning} onClick={() => handleRefuser(p.id)}>Refuser</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
