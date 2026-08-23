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
  Tabs,
  Tab,
} from '@mui/material'
import { Add, Delete, CheckCircle, Cancel, TableChart, PictureAsPdf, AttachFile } from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

const CATEGORIES = [
  { value: 'MAGAL', label: 'Magal' },
  { value: 'GAMOU', label: 'Gamou' },
  { value: 'KAZU RAJABB', label: 'Kazu Rajabb' },
  { value: 'KOOR', label: 'Koor' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'XELCOM', label: 'Xelcom' },
  { value: 'MENSUALITE', label: 'Mensualités' },
  { value: 'AUTRES', label: 'Autres' },
]

const statutColor = (s) => (s === 'validee' ? 'success' : s === 'refusee' ? 'error' : 'default')

export default function GestionDepenses() {
  const [tab, setTab] = useState('bilan')
  const [message, setMessage] = useState({ type: '', text: '' })

  // --- Bilan ---
  const [bilan, setBilan] = useState([])
  const [loadingBilan, setLoadingBilan] = useState(true)
  const [annee, setAnnee] = useState('')
  const [exporting, setExporting] = useState(false)

  const loadBilan = () => {
    setLoadingBilan(true)
    api.get('/finance/bilan/', { params: { annee: annee || undefined } })
      .then(({ data }) => setBilan(data))
      .catch(() => setBilan([]))
      .finally(() => setLoadingBilan(false))
  }
  useEffect(() => { loadBilan() }, [annee])

  const handleExportBilan = async (format) => {
    setExporting(true)
    try {
      const { data } = await api.get('/finance/bilan/export/', { params: { format, annee: annee || undefined }, responseType: 'blob' })
      const ext = format === 'pdf' ? 'pdf' : 'xlsx'
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `bilan_financier.${ext}`)
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setMessage({ type: 'error', text: "Erreur lors de l'export du bilan." })
    } finally {
      setExporting(false)
    }
  }

  // --- Dépenses ---
  const [depenses, setDepenses] = useState([])
  const [loadingDepenses, setLoadingDepenses] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ motif: '', categorie: 'AUTRES', montant: '', date_depense: '', notes: '', justificatif: null })

  const loadDepenses = () => {
    setLoadingDepenses(true)
    api.get('/finance/depenses/').then(({ data }) => setDepenses(data.results || data)).catch(() => setDepenses([])).finally(() => setLoadingDepenses(false))
  }
  useEffect(() => { loadDepenses() }, [])

  const handleOpenAdd = () => {
    setForm({ motif: '', categorie: 'AUTRES', montant: '', date_depense: new Date().toISOString().slice(0, 10), notes: '', justificatif: null })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.motif.trim() || !form.montant || !form.date_depense) {
      setMessage({ type: 'error', text: 'Motif, montant et date sont requis.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = new FormData()
      payload.append('motif', form.motif.trim())
      payload.append('categorie', form.categorie)
      payload.append('montant', form.montant)
      payload.append('date_depense', form.date_depense)
      payload.append('notes', form.notes || '')
      if (form.justificatif) payload.append('justificatif', form.justificatif)
      await api.post('/finance/depenses/', payload)
      setMessage({ type: 'success', text: 'Dépense enregistrée, en attente de validation.' })
      setOpenForm(false)
      loadDepenses()
    } catch (err) {
      setMessage({ type: 'error', text: "Erreur lors de l'enregistrement." })
    } finally {
      setSaving(false)
    }
  }

  const handleValider = async (id) => {
    try {
      await api.post(`/finance/depenses/${id}/valider/`)
      loadDepenses()
      loadBilan()
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la validation.' })
    }
  }

  const handleRefuser = async (id) => {
    try {
      await api.post(`/finance/depenses/${id}/refuser/`)
      loadDepenses()
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors du refus.' })
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/finance/depenses/${id}/`)
      loadDepenses()
      loadBilan()
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression.' })
    }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600, mb: 0.5 }}>Dépenses & Bilan</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Suivi des charges par type (Magal, Gamou, ...) : collecté, dépenses, reste.
      </Typography>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        sx={{
          mb: 2, borderBottom: `1px solid ${COLORS.or}30`,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${COLORS.vert} !important` },
          '& .MuiTabs-indicator': { bgcolor: COLORS.vert },
        }}
      >
        <Tab label="Bilan par catégorie" value="bilan" />
        <Tab label="Dépenses" value="depenses" />
      </Tabs>

      {tab === 'bilan' && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small" label="Année (optionnel)" type="number" value={annee}
              onChange={(e) => setAnnee(e.target.value)} sx={{ width: 160 }}
            />
            <Button size="small" variant="outlined" startIcon={<TableChart />} disabled={exporting} onClick={() => handleExportBilan('excel')} sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
              Export Excel
            </Button>
            <Button size="small" variant="outlined" startIcon={<PictureAsPdf />} disabled={exporting} onClick={() => handleExportBilan('pdf')} sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
              Export PDF
            </Button>
          </Box>

          {loadingBilan ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${COLORS.or}30` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, color: COLORS.vertFonce, bgcolor: `${COLORS.vert}08` } }}>
                    <TableCell>Catégorie</TableCell>
                    <TableCell align="right">Montant collecté</TableCell>
                    <TableCell align="right">Dépenses</TableCell>
                    <TableCell align="right">Reste</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bilan.map((l) => {
                    const estTotal = l.categorie === 'TOTAL'
                    return (
                      <TableRow key={l.categorie} hover sx={estTotal ? { '& td': { fontWeight: 700, bgcolor: `${COLORS.or}10` } } : {}}>
                        <TableCell>{l.categorie_display}</TableCell>
                        <TableCell align="right">{Number(l.montant_collecte).toLocaleString('fr-FR')} FCFA</TableCell>
                        <TableCell align="right">{Number(l.montant_depense).toLocaleString('fr-FR')} FCFA</TableCell>
                        <TableCell align="right" sx={{ color: l.reste < 0 ? '#c62828' : '#2E7D32' }}>
                          {Number(l.reste).toLocaleString('fr-FR')} FCFA
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {tab === 'depenses' && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
              Ajouter une dépense
            </Button>
          </Box>

          {loadingDepenses ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : depenses.length === 0 ? (
            <Typography color="text.secondary">Aucune dépense enregistrée.</Typography>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${COLORS.or}30` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, color: COLORS.vertFonce, bgcolor: `${COLORS.vert}08` } }}>
                    <TableCell>Motif</TableCell>
                    <TableCell>Catégorie</TableCell>
                    <TableCell align="right">Montant</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Créée par</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {depenses.map((d) => (
                    <TableRow key={d.id} hover>
                      <TableCell>
                        {d.motif}
                        {d.justificatif && (
                          <IconButton size="small" href={getMediaUrl(d.justificatif)} target="_blank" rel="noopener noreferrer" sx={{ ml: 0.5, color: COLORS.vert }}>
                            <AttachFile fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                      <TableCell>{d.categorie_display}</TableCell>
                      <TableCell align="right">{Number(d.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell>{new Date(d.date_depense).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{d.cree_par_nom}</TableCell>
                      <TableCell><Chip size="small" label={d.statut_display} color={statutColor(d.statut)} /></TableCell>
                      <TableCell align="right">
                        {d.statut === 'en_attente' && (
                          <>
                            <IconButton size="small" color="success" onClick={() => handleValider(d.id)}><CheckCircle fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => handleRefuser(d.id)}><Cancel fontSize="small" /></IconButton>
                          </>
                        )}
                        <IconButton size="small" color="error" onClick={() => handleDelete(d.id)}><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter une dépense</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Motif" value={form.motif} onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))} fullWidth required />
            <TextField select label="Catégorie" value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))} fullWidth>
              {CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>
            <TextField label="Montant (FCFA)" type="number" value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))} fullWidth required />
            <TextField label="Date" type="date" value={form.date_depense} onChange={(e) => setForm((f) => ({ ...f, date_depense: e.target.value }))} fullWidth required InputLabelProps={{ shrink: true }} />
            <TextField label="Notes (optionnel)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} fullWidth multiline rows={2} />
            <Button component="label" variant="outlined" startIcon={<AttachFile />} sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
              {form.justificatif ? form.justificatif.name : 'Joindre un justificatif (optionnel)'}
              <input type="file" hidden onChange={(e) => setForm((f) => ({ ...f, justificatif: e.target.files?.[0] || null }))} />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
