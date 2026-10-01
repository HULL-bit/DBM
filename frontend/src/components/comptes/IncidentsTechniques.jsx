import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Paper, Chip, TextField, MenuItem, CircularProgress, Pagination, Button,
  Alert, Accordion, AccordionSummary, AccordionDetails, Tooltip,
} from '@mui/material'
import { ExpandMore, BugReport, CheckCircle, Replay, DeleteSweep, MailOutline } from '@mui/icons-material'
import api from '../../services/api'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }
const SOURCES = [
  { value: '', label: 'Toutes les sources' },
  { value: 'backend', label: 'Serveur' },
  { value: 'web', label: 'Site web' },
  { value: 'mobile', label: 'Appli mobile' },
  { value: 'surveillance', label: 'Surveillance' },
]
const niveauColor = (n) => (n === 'critique' ? 'error' : n === 'erreur' ? 'warning' : 'default')
const fmtDate = (d) => (d ? new Date(d).toLocaleString('fr-FR') : '')

/** Incidents techniques : erreurs serveur (500), plantages du site ou de l'appli, base de
 * données indisponible... Chaque erreur identique est regroupée avec son nombre
 * d'occurrences ; un email est envoyé à l'administrateur à la première occurrence. */
export default function IncidentsTechniques({ onChange }) {
  const [incidents, setIncidents] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statut, setStatut] = useState('false')
  const [source, setSource] = useState('')
  const [message, setMessage] = useState(null)

  const charger = useCallback(() => {
    setLoading(true)
    const params = { page }
    if (statut) params.resolu = statut
    if (source) params.source = source
    api.get('/monitoring/incidents/', { params })
      .then(({ data }) => {
        setIncidents(data.results || [])
        setCount(data.count || 0)
        onChange?.(data.non_resolus || 0)
      })
      .catch(() => setIncidents([]))
      .finally(() => setLoading(false))
  }, [page, statut, source, onChange])

  useEffect(() => { charger() }, [charger])
  useEffect(() => { setPage(1) }, [statut, source])

  const basculer = async (inc) => {
    await api.post(`/monitoring/incidents/${inc.id}/resoudre/`, { resolu: !inc.resolu })
    charger()
  }

  const purger = async () => {
    const { data } = await api.delete('/monitoring/incidents/')
    setMessage({ type: 'success', text: data.detail })
    charger()
  }

  const testerAlerte = async () => {
    try {
      const { data } = await api.post('/monitoring/tester-alerte/')
      setMessage({ type: 'success', text: data.detail })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || "Échec de l'envoi." })
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <BugReport sx={{ color: COLORS.vert, fontSize: 32 }} />
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h5" sx={{ color: COLORS.vert, fontWeight: 600 }}>Incidents techniques</Typography>
          <Typography variant="body2" color="text.secondary">
            Erreurs du serveur, du site et de l'appli mobile — vous êtes prévenu par email à chaque nouvel incident.
          </Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<MailOutline />} onClick={testerAlerte} sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
          Tester l'email d'alerte
        </Button>
        <Button size="small" color="error" startIcon={<DeleteSweep />} onClick={purger}>
          Supprimer les résolus
        </Button>
      </Box>

      {message && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField select size="small" label="Statut" value={statut} onChange={(e) => setStatut(e.target.value)} sx={{ minWidth: 170 }}>
          <MenuItem value="false">À traiter</MenuItem>
          <MenuItem value="true">Résolus</MenuItem>
          <MenuItem value="">Tous</MenuItem>
        </TextField>
        <TextField select size="small" label="Source" value={source} onChange={(e) => setSource(e.target.value)} sx={{ minWidth: 170 }}>
          {SOURCES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
        </TextField>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : incidents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <CheckCircle sx={{ fontSize: 48, color: '#2E7D32', mb: 1 }} />
          <Typography color="text.secondary">Aucun incident {statut === 'false' ? 'à traiter' : ''}.</Typography>
        </Paper>
      ) : (
        incidents.map((inc) => (
          <Accordion key={inc.id} disableGutters sx={{ mb: 1, borderRadius: 2, '&:before': { display: 'none' }, opacity: inc.resolu ? 0.7 : 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: '100%', pr: 1 }}>
                <Chip size="small" label={inc.niveau_display} color={niveauColor(inc.niveau)} />
                <Chip size="small" label={inc.source_display} variant="outlined" />
                <Typography sx={{ fontWeight: 600, color: COLORS.vertFonce, flex: 1, minWidth: 200, wordBreak: 'break-word' }}>
                  {inc.titre}
                </Typography>
                <Tooltip title="Nombre d'occurrences">
                  <Chip size="small" label={`×${inc.occurrences}`} sx={{ bgcolor: `${COLORS.or}30`, fontWeight: 700 }} />
                </Tooltip>
                <Typography variant="caption" color="text.secondary">{fmtDate(inc.derniere_date)}</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.5, mb: 1.5, fontSize: '0.85rem' }}>
                {inc.chemin && <span><b>Requête :</b> {inc.methode} {inc.chemin}</span>}
                {inc.statut_http && <span><b>Statut HTTP :</b> {inc.statut_http}</span>}
                {inc.utilisateur_nom && <span><b>Utilisateur :</b> {inc.utilisateur_nom}</span>}
                {inc.request_id && <span><b>ID de requête :</b> {inc.request_id}</span>}
                <span><b>Première fois :</b> {fmtDate(inc.premiere_date)}</span>
                <span><b>Email envoyé :</b> {inc.dernier_email ? fmtDate(inc.dernier_email) : 'non'}</span>
              </Box>
              {inc.details && (
                <Box component="pre" sx={{ bgcolor: '#1e1e1e', color: '#eee', p: 1.5, borderRadius: 1, fontSize: '0.75rem', overflow: 'auto', maxHeight: 360, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {inc.details}
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  size="small"
                  variant={inc.resolu ? 'outlined' : 'contained'}
                  startIcon={inc.resolu ? <Replay /> : <CheckCircle />}
                  onClick={() => basculer(inc)}
                  sx={inc.resolu ? {} : { bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
                >
                  {inc.resolu ? 'Rouvrir' : 'Marquer résolu'}
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      )}
      {count > 25 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={Math.ceil(count / 25)} page={page} onChange={(_e, p) => setPage(p)} />
        </Box>
      )}
    </Box>
  )
}
