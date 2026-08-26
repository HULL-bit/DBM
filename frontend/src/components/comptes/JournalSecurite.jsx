import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  MenuItem,
  CircularProgress,
  Pagination,
  Autocomplete,
  Tooltip,
  Button,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material'
import { History, Download, DeleteSweep } from '@mui/icons-material'
import api from '../../services/api'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

const ACTIONS = [
  { value: '', label: 'Toutes les actions' },
  { value: 'connexion', label: 'Connexion' },
  { value: 'echec_connexion', label: 'Échec de connexion' },
  { value: 'creation', label: 'Création' },
  { value: 'modification', label: 'Modification' },
  { value: 'suppression', label: 'Suppression' },
  { value: 'validation_paiement', label: 'Validation de paiement' },
  { value: 'changement_role', label: 'Changement de rôle' },
  { value: 'changement_permission', label: 'Changement de permission' },
  { value: 'reset_mot_de_passe', label: 'Réinitialisation de mot de passe' },
  { value: 'autre', label: 'Autre' },
]

const RUBRIQUES = [
  { value: '', label: 'Toutes les rubriques' },
  { value: 'conservatoire', label: 'Conservatoire' },
  { value: 'culturelle', label: 'Culturelle' },
  { value: 'finance', label: 'Finance' },
  { value: 'sociale', label: 'Sociale' },
  { value: 'communication', label: 'Communication' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'scientifique', label: 'Scientifique' },
  { value: 'bibliotheque', label: 'Bibliothèque' },
  { value: 'informations', label: 'Informations' },
  { value: 'comptes', label: 'Comptes / Membres' },
]

const actionColor = (action) => {
  if (action === 'echec_connexion') return 'error'
  if (action === 'connexion') return 'success'
  if (['changement_role', 'changement_permission'].includes(action)) return 'warning'
  return 'default'
}

export default function JournalSecurite() {
  const [entries, setEntries] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [rubriqueFilter, setRubriqueFilter] = useState('')
  const [membreFilter, setMembreFilter] = useState(null)
  const [membres, setMembres] = useState([])
  const [exportAnchor, setExportAnchor] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [confirmPurge, setConfirmPurge] = useState(false)
  const [purging, setPurging] = useState(false)
  const [message, setMessage] = useState('')

  const currentParams = () => ({
    action: actionFilter || undefined,
    rubrique: rubriqueFilter || undefined,
    utilisateur: membreFilter?.id || undefined,
  })

  const handleExport = async (format) => {
    setExportAnchor(null)
    setExporting(true)
    try {
      const { data } = await api.get('/auth/audit/export/', {
        params: { ...currentParams(), export_format: format },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `journal_securite.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (_) {
      setMessage('Erreur lors de l\'export.')
    } finally {
      setExporting(false)
    }
  }

  const handlePurge = async () => {
    setPurging(true)
    try {
      const { data } = await api.delete('/auth/audit/', { params: currentParams() })
      setMessage(data?.detail || 'Entrées supprimées.')
      setConfirmPurge(false)
      setPage(1)
      load()
    } catch (_) {
      setMessage('Erreur lors de la suppression.')
    } finally {
      setPurging(false)
    }
  }

  useEffect(() => {
    api.get('/auth/users/').then(({ data }) => setMembres(data.results || data)).catch(() => setMembres([]))
  }, [])

  const load = () => {
    setLoading(true)
    api.get('/auth/audit/', { params: { page, ...currentParams() } })
      .then(({ data }) => { setEntries(data.results || []); setCount(data.count || 0) })
      .catch(() => { setEntries([]); setCount(0) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [page, actionFilter, rubriqueFilter, membreFilter])

  const totalPages = Math.max(1, Math.ceil(count / 50))

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <History sx={{ color: COLORS.vert, fontSize: 32 }} />
          <Box>
            <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }}>Journal de sécurité</Typography>
            <Typography variant="body2" color="text.secondary">
              Traçabilité des actions sensibles : connexions, changements de rôle/permission, validations de paiement...
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small" variant="outlined" startIcon={exporting ? <CircularProgress size={16} /> : <Download />}
            onClick={(e) => setExportAnchor(e.currentTarget)} disabled={exporting}
            sx={{ borderColor: COLORS.vert, color: COLORS.vert }}
          >
            Exporter
          </Button>
          <Menu anchorEl={exportAnchor} open={!!exportAnchor} onClose={() => setExportAnchor(null)}>
            <MenuItem onClick={() => handleExport('excel')}>Excel (.xlsx)</MenuItem>
            <MenuItem onClick={() => handleExport('pdf')}>PDF</MenuItem>
          </Menu>
          <Button
            size="small" variant="outlined" color="error" startIcon={<DeleteSweep />}
            onClick={() => setConfirmPurge(true)}
          >
            Supprimer
          </Button>
        </Box>
      </Box>

      {message && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

      <Box sx={{ my: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <TextField
          select
          size="small"
          label="Filtrer par action"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
          sx={{ minWidth: 240 }}
        >
          {ACTIONS.map((a) => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          label="Filtrer par rubrique"
          value={rubriqueFilter}
          onChange={(e) => { setRubriqueFilter(e.target.value); setPage(1) }}
          sx={{ minWidth: 220 }}
        >
          {RUBRIQUES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
        </TextField>
        <Autocomplete
          size="small"
          options={membres}
          getOptionLabel={(m) => `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username}
          value={membreFilter}
          onChange={(e, val) => { setMembreFilter(val); setPage(1) }}
          renderInput={(params) => <TextField {...params} label="Filtrer par membre" />}
          sx={{ minWidth: 260 }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : entries.length === 0 ? (
        <Typography color="text.secondary">Aucune entrée dans le journal.</Typography>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${COLORS.or}30`, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, color: COLORS.vertFonce, bgcolor: `${COLORS.vert}08`, whiteSpace: 'nowrap' } }}>
                  <TableCell>Date</TableCell>
                  <TableCell>Utilisateur</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Rubrique</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Adresse IP</TableCell>
                  <TableCell>Système</TableCell>
                  <TableCell align="center">Résultat</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(e.date).toLocaleString('fr-FR')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{e.utilisateur_nom || '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={e.action_display} color={actionColor(e.action)} />
                    </TableCell>
                    <TableCell>{e.rubrique || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>{e.description || e.objet_repr || '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{e.adresse_ip || '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title={e.user_agent || ''} arrow>
                        <span>{e.systeme_exploitation || '—'}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={e.succes ? 'OK' : 'Échec'} color={e.succes ? 'success' : 'error'} variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" />
            </Box>
          )}
        </>
      )}

      <Dialog open={confirmPurge} onClose={() => setConfirmPurge(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>Supprimer ces entrées ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Cette action supprime définitivement les entrées correspondant aux filtres actuellement
            appliqués ({count} entrée(s)). Pensez à exporter le journal avant si vous voulez en garder une trace.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPurge(false)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handlePurge} disabled={purging}>
            {purging ? <CircularProgress size={20} color="inherit" /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
