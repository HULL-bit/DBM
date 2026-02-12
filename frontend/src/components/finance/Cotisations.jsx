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
import { Add, Edit, Delete, Payment, TableChart } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }
const WAVE_PAYMENT_URL = 'https://pay.wave.com/m/M_sn_A4og8Zu7m589/c/sn/'
const STATUTS = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'payee', label: 'Payée' },
  // On affiche "En cours" pour les cotisations en retard / non terminées
  { value: 'retard', label: 'En cours' },
  { value: 'annulee', label: 'Annulée' },
]
const MODES_PAIEMENT = [
  { value: 'wave', label: 'Wave' },
  { value: 'liquide', label: 'Espèces / Liquide' },
  { value: 'autre', label: 'Autre' },
]
const TYPES_COTISATION = [
  { value: 'mensualite', label: 'Mensualité' },
  { value: 'assignation', label: 'Assignation' },
]
const MOIS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'][i] }))
const MOIS_LABELS = MOIS.reduce((acc, m) => {
  acc[m.value] = m.label
  return acc
}, {})

export default function Cotisations() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [list, setList] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(null)
  const [openPayer, setOpenPayer] = useState(null)
  const [payerForm, setPayerForm] = useState({ reference_wave: '', mode_paiement: 'wave' })
  const [form, setForm] = useState({
    membre: '',
    montant: 1000,
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
    date_echeance: '',
    statut: 'en_attente',
    type_cotisation: 'mensualite',
    objet_assignation: '',
    mode_paiement: 'wave',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [openRapportExport, setOpenRapportExport] = useState(false)
  const [rapportExport, setRapportExport] = useState({ format: 'excel', annee: '', mois: '' })
  const [exportingRapport, setExportingRapport] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [typeFilter, setTypeFilter] = useState('')
  const [objetAssignationFilter, setObjetAssignationFilter] = useState('')

  const loadList = () => {
    setLoading(true)
    api.get('/finance/cotisations/').then(({ data }) => setList(data.results || data)).catch(() => setList([])).finally(() => setLoading(false))
  }
  useEffect(() => { loadList() }, [])
  useEffect(() => {
    if (isAdmin) api.get('/auth/users/').then(({ data }) => setUsers(data.results || data)).catch(() => setUsers([]))
  }, [isAdmin])

  const handleOpenAdd = () => {
    setEditingId(null)
    const now = new Date()
    setForm({
      membre: '',
      montant: 1000,
      mois: now.getMonth() + 1,
      annee: now.getFullYear(),
      date_echeance: now.toISOString().slice(0, 10),
      statut: 'en_attente',
      type_cotisation: 'mensualite',
      objet_assignation: '',
      mode_paiement: 'wave',
      notes: '',
    })
    setFormErrors({})
    setOpenForm(true)
  }

  const handleOpenEdit = (c) => {
    setEditingId(c.id)
    setForm({
      membre: c.membre,
      montant: c.montant,
      mois: c.mois,
      annee: c.annee,
      date_echeance: c.date_echeance ? c.date_echeance.slice(0, 10) : '',
      statut: c.statut || 'en_attente',
      type_cotisation: c.type_cotisation || 'mensualite',
      objet_assignation: c.objet_assignation || '',
      mode_paiement: c.mode_paiement || 'wave',
      notes: c.notes || '',
    })
    setFormErrors({})
    setOpenForm(true)
  }

  const handleSave = async () => {
    const errors = {}
    if (!form.membre && !editingId) errors.membre = 'Sélectionnez un membre.'
    if (!form.mois) errors.mois = 'Mois requis.'
    if (!form.annee) errors.annee = 'Année requise.'
    if (!form.date_echeance) errors.date_echeance = 'Date d\'échéance requise.'
    if (form.type_cotisation === 'assignation' && !String(form.objet_assignation || '').trim()) {
      errors.objet_assignation = 'Objet de l\'assignation requis (ex : Magal, Gamou, …).'
    }
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = {
        membre: form.membre || (list.find((c) => c.id === editingId)?.membre),
        montant: Number(form.montant),
        mois: Number(form.mois),
        annee: Number(form.annee),
        date_echeance: form.date_echeance,
        statut: form.statut,
        type_cotisation: form.type_cotisation,
        objet_assignation: form.type_cotisation === 'assignation' ? form.objet_assignation || '' : '',
        mode_paiement: form.mode_paiement,
        notes: form.notes || '',
      }
      if (editingId) {
        await api.patch(`/finance/cotisations/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Cotisation modifiée.' })
      } else {
        await api.post('/finance/cotisations/', payload)
        setMessage({ type: 'success', text: 'Cotisation créée.' })
      }
      loadList()
      setOpenForm(false)
      setEditingId(null)
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
      await api.delete(`/finance/cotisations/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Cotisation supprimée.' })
      loadList()
      setOpenDelete(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenPayer = (c) => {
    setOpenPayer(c)
    setPayerForm({ reference_wave: c.reference_wave || '', mode_paiement: c.mode_paiement || 'wave' })
  }

  const handlePayer = async () => {
    if (!openPayer) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.post(`/finance/cotisations/${openPayer.id}/payer/`, {
        reference_wave: payerForm.reference_wave.trim(),
        mode_paiement: payerForm.mode_paiement,
      })
      setMessage({ type: 'success', text: 'Déclaration enregistrée. L\'administrateur validera le paiement avant de marquer la cotisation comme payée.' })
      setOpenPayer(null)
      loadList()
    } catch (err) {
      const d = err.response?.data?.detail || 'Erreur'
      setMessage({ type: 'error', text: typeof d === 'string' ? d : 'Erreur lors de l\'enregistrement du paiement.' })
    } finally {
      setSaving(false)
    }
  }

  const statutColor = (s) => (s === 'payee' ? 'success' : s === 'retard' ? 'warning' : 'default')

  const handleExportRapport = async () => {
    const { format, annee, mois } = rapportExport
    setExportingRapport(true)
    setMessage({ type: '', text: '' })
    try {
      const params = { format }
      if (annee) params.annee = annee
      if (mois) params.mois = mois
      if (typeFilter) params.type_cotisation = typeFilter
      if (objetAssignationFilter) params.objet_assignation = objetAssignationFilter
      const { data } = await api.get('/finance/export-rapport-cotisations/', {
        params,
        responseType: 'blob',
      })
      const ext = format === 'pdf' ? 'pdf' : 'xlsx'
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `rapport_cotisations.${ext}`)
      link.click()
      window.URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: 'Rapport exporté.' })
      setOpenRapportExport(false)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || "Erreur lors de l'export." })
    } finally {
      setExportingRapport(false)
    }
  }

  // Statistiques globales (admin ou membre)
  const totalMontant = list.reduce((sum, c) => sum + Number(c.montant || 0), 0)
  const totalPayee = list
    .filter((c) => c.statut === 'payee')
    .reduce((sum, c) => sum + Number(c.montant || 0), 0)
  const resteGlobal = totalMontant - totalPayee
  const pourcentageGlobal = totalMontant > 0 ? Math.round((totalPayee / totalMontant) * 100) : 0
  const nbEnAttente = list.filter((c) => c.statut === 'en_attente').length
  const nbRetard = list.filter((c) => c.statut === 'retard').length
  const nbPayees = list.filter((c) => c.statut === 'payee').length
  const pourcentageAssignationsPayees = list.length > 0 ? Math.round((nbPayees / list.length) * 100) : 0

  // Statistiques séparées Mensualités / Assignations
  const mensualites = list.filter((c) => c.type_cotisation === 'mensualite')
  const assignations = list.filter((c) => c.type_cotisation === 'assignation')

  const totalMensualites = mensualites.reduce((sum, c) => sum + Number(c.montant || 0), 0)
  const totalMensualitesPayees = mensualites
    .filter((c) => c.statut === 'payee')
    .reduce((sum, c) => sum + Number(c.montant || 0), 0)
  const pourcentageMensualites = totalMensualites > 0 ? Math.round((totalMensualitesPayees / totalMensualites) * 100) : 0

  const totalAssignationsMontant = assignations.reduce((sum, c) => sum + Number(c.montant || 0), 0)
  const totalAssignationsPayees = assignations
    .filter((c) => c.statut === 'payee')
    .reduce((sum, c) => sum + Number(c.montant || 0), 0)
  const pourcentageAssignationsMontant =
    totalAssignationsMontant > 0 ? Math.round((totalAssignationsPayees / totalAssignationsMontant) * 100) : 0

  const filteredList = list.filter((c) => {
    const typeOk = !typeFilter || c.type_cotisation === typeFilter
    const objetOk =
      !objetAssignationFilter ||
      (c.type_cotisation === 'assignation' &&
        (c.objet_assignation || '').toLowerCase() === objetAssignationFilter.toLowerCase())
    return typeOk && objetOk
  })

  // Détails assignations par objet (MAGAL, GAMOU, etc.) selon les filtres
  const assignationsFiltrees = filteredList.filter((c) => c.type_cotisation === 'assignation')
  const assignationSums = assignationsFiltrees.reduce((acc, c) => {
    const brut = (c.objet_assignation || '').toString().trim().toUpperCase()
    const key =
      brut === 'MAGAL' ||
      brut === 'GAMOU' ||
      brut === 'KAZU RAJABB' ||
      brut === 'KOOR' ||
      brut === 'SOCIAL' ||
      brut === 'XELCOM'
        ? brut
        : 'AUTRES'
    const current = acc[key] || 0
    acc[key] = current + Number(c.montant || 0)
    return acc
  }, {})

  // Détails mensualités par mois (toutes années) selon les filtres
  const mensualitesFiltrees = filteredList.filter((c) => c.type_cotisation === 'mensualite')
  const mensualitesParMois = Object.values(
    mensualitesFiltrees.reduce((acc, c) => {
      const mois = Number(c.mois)
      const annee = Number(c.annee)
      const key = `${annee}-${mois}`
      if (!acc[key]) {
        acc[key] = {
          annee,
          mois,
          total: 0,
        }
      }
      acc[key].total += Number(c.montant || 0)
      return acc
    }, {}),
  ).sort((a, b) => (a.annee === b.annee ? a.mois - b.mois : a.annee - b.annee))

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Cotisations</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>{isAdmin ? 'Gérer les cotisations mensuelles (assignations par membre)' : 'Mes cotisations (assignations créées par l\'admin)'}</Typography>
        </Box>
        {isAdmin && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<TableChart />} onClick={() => { setRapportExport({ format: 'excel' }); setOpenRapportExport(true) }} sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
              Exporter rapport
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
              Créer une cotisation
            </Button>
          </Box>
        )}
      </Box>

      {!loading && list.length > 0 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              select
              size="small"
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="mensualite">Mensualité</MenuItem>
              <MenuItem value="assignation">Assignation</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Assignation (Magal, Gamou, ...)"
              value={objetAssignationFilter}
              onChange={(e) => setObjetAssignationFilter(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">Toutes</MenuItem>
              <MenuItem value="MAGAL">MAGAL</MenuItem>
              <MenuItem value="GAMOU">GAMOU</MenuItem>
              <MenuItem value="KAZU RAJABB">KAZU RAJABB</MenuItem>
              <MenuItem value="KOOR">KOOR</MenuItem>
              <MenuItem value="SOCIAL">SOCIAL</MenuItem>
              <MenuItem value="XELCOM">XELCOM</MenuItem>
              <MenuItem value="AUTRES">AUTRES</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
            <Paper sx={{ p: 2, borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce }}>Montant total (toutes cotisations)</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.vert }}>
                {totalMontant.toLocaleString('fr-FR')} FCFA
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {list.length} cotisation(s)
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce }}>Mensualités</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.or }}>
                {totalMensualitesPayees.toLocaleString('fr-FR')} / {totalMensualites.toLocaleString('fr-FR')} FCFA
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {pourcentageMensualites}% des mensualités payées
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, borderLeft: '4px solid #c62828', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce }}>Assignations</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828' }}>
                {totalAssignationsPayees.toLocaleString('fr-FR')} / {totalAssignationsMontant.toLocaleString('fr-FR')} FCFA
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {pourcentageAssignationsMontant}% des assignations payées
              </Typography>
            </Paper>
          </Box>
          {/* Cartes détaillées basées sur les filtres actuels */}
          <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 3fr' }, gap: 2 }}>
            <Paper sx={{ p: 2, borderRadius: 2, borderLeft: `4px solid ${COLORS.or}` }}>
              <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce, mb: 1 }}>
                Détail des assignations (filtre actuel)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Somme totale par type d’assignation (MAGAL, GAMOU, …) en fonction des filtres ci-dessus.
              </Typography>
              {assignationsFiltrees.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Aucune assignation pour ce filtre.
                </Typography>
              ) : (
                // On affiche uniquement les types réellement présents dans les données filtrées,
                // dans un ordre lisible (MAGAL, GAMOU, ... AUTRES)
                ['MAGAL', 'GAMOU', 'KAZU RAJABB', 'KOOR', 'SOCIAL', 'XELCOM', 'AUTRES']
                  .filter((label) => assignationSums[label] > 0)
                  .map((label) => {
                    const montant = assignationSums[label] || 0
                    return (
                      <Box
                        key={label}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.95rem',
                          py: 0.5,
                          px: 0.5,
                          borderRadius: 1,
                          '&:nth-of-type(odd)': { bgcolor: `${COLORS.vert}05` },
                        }}
                      >
                        <Box sx={{ fontWeight: 700, color: COLORS.vertFonce, letterSpacing: '0.04em' }}>
                          {label}
                        </Box>
                        <Box
                          sx={{
                            fontFamily: '"Cormorant Garamond", serif',
                            fontWeight: 700,
                            fontSize: '1.05rem',
                            color: COLORS.or,
                          }}
                        >
                          {montant.toLocaleString('fr-FR')} FCFA
                        </Box>
                      </Box>
                    )
                  })
              )}
            </Paper>
            <Paper sx={{ p: 2, borderRadius: 2, borderLeft: `4px solid ${COLORS.vert}` }}>
              <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce, mb: 1 }}>
                Mensualités par mois (filtre actuel)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Montant total des mensualités pour chaque mois/année sur les cotisations filtrées.
              </Typography>
              {mensualitesParMois.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Aucune mensualité pour ce filtre.
                </Typography>
              ) : (
                mensualitesParMois.map((m) => (
                  <Box
                    key={`${m.annee}-${m.mois}`}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.9rem',
                      py: 0.25,
                    }}
                  >
                    <Box sx={{ fontWeight: 600, color: COLORS.vertFonce }}>
                      {MOIS_LABELS[m.mois]} {m.annee}
                    </Box>
                    <Box sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 }}>
                      {m.total.toLocaleString('fr-FR')} FCFA
                    </Box>
                  </Box>
                ))
              )}
            </Paper>
          </Box>
        </>
      )}

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, borderLeft: `4px solid ${COLORS.or}` }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: `${COLORS.vert}12` }}>
                {isAdmin && <TableCell>Membre</TableCell>}
                <TableCell>Type</TableCell>
                <TableCell>Objet</TableCell>
                <TableCell>Mois / Année</TableCell>
                <TableCell>Montant (FCFA)</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Date échéance</TableCell>
                <TableCell>Date paiement</TableCell>
                <TableCell>Paiement</TableCell>
                {isAdmin ? <TableCell align="right">Actions</TableCell> : <TableCell align="right">Payer</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin ? 9 : 8} align="center">Aucune cotisation</TableCell></TableRow>
              ) : (
                filteredList.map((c) => (
                  <TableRow key={c.id}>
                    {isAdmin && <TableCell>{c.membre_nom || c.membre || `#${c.membre}`}</TableCell>}
                    <TableCell>{c.type_cotisation === 'assignation' ? 'Assignation' : 'Mensualité'}</TableCell>
                    <TableCell>{c.type_cotisation === 'assignation' ? (c.objet_assignation || '—') : '—'}</TableCell>
                    <TableCell>{c.mois}/{c.annee}</TableCell>
                    <TableCell>{c.montant}</TableCell>
                    <TableCell><Chip label={c.statut_display || c.statut} color={statutColor(c.statut)} size="small" /></TableCell>
                    <TableCell>{c.date_echeance ? new Date(c.date_echeance).toLocaleDateString('fr-FR') : '—'}</TableCell>
                    <TableCell>{c.date_paiement ? new Date(c.date_paiement).toLocaleDateString('fr-FR') : '—'}</TableCell>
                    <TableCell>
                      {c.mode_paiement === 'liquide'
                        ? 'Espèces'
                        : c.mode_paiement === 'autre'
                          ? 'Autre'
                          : 'Wave'}
                      {c.reference_wave ? ` — ${c.reference_wave}` : ''}
                    </TableCell>
                    {isAdmin ? (
                      <TableCell align="right">
                        {/* Si la cotisation concerne l'admin lui-même, afficher le bouton Payer comme pour un membre */}
                        {Number(c.membre) === Number(user?.id) ? (
                          <>
                            {(c.statut === 'en_attente' || c.statut === 'retard') && (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<Payment />}
                                onClick={() => handleOpenPayer(c)}
                                sx={{ mr: 1, bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
                              >
                                Payer
                              </Button>
                            )}
                            {c.statut === 'payee' && <Chip label="Payée" color="success" size="small" sx={{ mr: 1 }} />}
                            <IconButton size="small" onClick={() => handleOpenEdit(c)} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                            <IconButton size="small" onClick={() => setOpenDelete(c)} color="error"><Delete /></IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton size="small" onClick={() => handleOpenEdit(c)} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                            <IconButton size="small" onClick={() => setOpenDelete(c)} color="error"><Delete /></IconButton>
                          </>
                        )}
                      </TableCell>
                    ) : (
                      <TableCell align="right">
                        {(c.statut === 'en_attente' || c.statut === 'retard') && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Payment />}
                            onClick={() => handleOpenPayer(c)}
                            sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
                          >
                            Payer
                          </Button>
                        )}
                        {c.statut === 'payee' && <Chip label="Payée" color="success" size="small" />}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openForm} onClose={() => { setOpenForm(false); setEditingId(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Modifier la cotisation' : 'Créer une cotisation'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {!editingId && (
              <TextField
                select
                label="Membre"
                value={form.membre}
                onChange={(e) => {
                  setForm((f) => ({ ...f, membre: e.target.value }))
                  setFormErrors((fe) => ({ ...fe, membre: undefined }))
                }}
                required
                fullWidth
                error={!!formErrors.membre}
                helperText={formErrors.membre || ''}
              >
                {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</MenuItem>)}
              </TextField>
            )}
            <TextField
              select
              label="Type de cotisation"
              value={form.type_cotisation}
              onChange={(e) => setForm((f) => ({ ...f, type_cotisation: e.target.value }))}
              fullWidth
            >
              {TYPES_COTISATION.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
            {form.type_cotisation === 'assignation' && (
              <TextField
                select
                label="Objet de l'assignation"
                value={form.objet_assignation}
                onChange={(e) => {
                  setForm((f) => ({ ...f, objet_assignation: e.target.value }))
                  setFormErrors((fe) => ({ ...fe, objet_assignation: undefined }))
                }}
                fullWidth
                error={!!formErrors.objet_assignation}
                helperText={formErrors.objet_assignation || 'MAGAL, GAMOU, KAZU RAJABB, KOOR, SOCIAL, XELCOM ou AUTRES'}
              >
                <MenuItem value="MAGAL">MAGAL</MenuItem>
                <MenuItem value="GAMOU">GAMOU</MenuItem>
                <MenuItem value="KAZU RAJABB">KAZU RAJABB</MenuItem>
                <MenuItem value="KOOR">KOOR</MenuItem>
                <MenuItem value="SOCIAL">SOCIAL</MenuItem>
                <MenuItem value="XELCOM">XELCOM</MenuItem>
                <MenuItem value="AUTRES">AUTRES</MenuItem>
              </TextField>
            )}
            <TextField
              select
              label="Mode de paiement"
              value={form.mode_paiement}
              onChange={(e) => setForm((f) => ({ ...f, mode_paiement: e.target.value }))}
              fullWidth
            >
              {MODES_PAIEMENT.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Montant (FCFA)"
              type="number"
              value={form.montant}
              onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
              fullWidth
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Notes (optionnel)"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              select
              label="Mois"
              value={form.mois}
              onChange={(e) => {
                setForm((f) => ({ ...f, mois: Number(e.target.value) }))
                setFormErrors((fe) => ({ ...fe, mois: undefined }))
              }}
              fullWidth
              error={!!formErrors.mois}
              helperText={formErrors.mois || ''}
            >
              {MOIS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
            <TextField
              label="Année"
              type="number"
              value={form.annee}
              onChange={(e) => {
                setForm((f) => ({ ...f, annee: Number(e.target.value) }))
                setFormErrors((fe) => ({ ...fe, annee: undefined }))
              }}
              fullWidth
              inputProps={{ min: 2020, max: 2030 }}
              error={!!formErrors.annee}
              helperText={formErrors.annee || ''}
            />
            <TextField
              label="Date échéance"
              type="date"
              value={form.date_echeance}
              onChange={(e) => {
                setForm((f) => ({ ...f, date_echeance: e.target.value }))
                setFormErrors((fe) => ({ ...fe, date_echeance: undefined }))
              }}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={!!formErrors.date_echeance}
              helperText={formErrors.date_echeance || ''}
            />
            <TextField select label="Statut" value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))} fullWidth>
              {STATUTS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenForm(false); setEditingId(null) }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Enregistrer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
        <DialogTitle>Supprimer cette cotisation ?</DialogTitle>
        <DialogContent>{openDelete && <Typography>Supprimer la cotisation {openDelete.mois}/{openDelete.annee} ?</Typography>}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>{saving ? <CircularProgress size={24} /> : 'Supprimer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openPayer} onClose={() => setOpenPayer(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.vert, color: 'white' }}>Payer ma cotisation</DialogTitle>
        <DialogContent>
          {openPayer && (
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info">
                Cotisation <strong>{openPayer.mois}/{openPayer.annee}</strong> — Montant : <strong>{openPayer.montant} FCFA</strong>
              </Alert>
              <Button
                variant="contained"
                href={WAVE_PAYMENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                fullWidth
                startIcon={<Payment />}
                sx={{ bgcolor: '#00D9A5', color: '#000', py: 1.5, '&:hover': { bgcolor: '#00C496', color: '#000' } }}
              >
                Payer avec Wave
              </Button>
              <Typography variant="body2" color="text.secondary">
                Après avoir payé via le lien Wave ci-dessus, cliquez sur &quot;Déclarer mon paiement&quot; pour enregistrer votre référence. L&apos;administrateur validera le versement avant de marquer la cotisation comme payée.
              </Typography>
              <TextField
                fullWidth
                label="Référence (optionnel)"
                value={payerForm.reference_wave}
                onChange={(e) => setPayerForm((f) => ({ ...f, reference_wave: e.target.value }))}
                placeholder="Ex: 7XX1234567 — utile si vous avez payé par un autre moyen"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPayer(null)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handlePayer}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Payment />}
            sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
          >
            Déclarer mon paiement
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openRapportExport} onClose={() => setOpenRapportExport(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Exporter le rapport des cotisations</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Exporte les cotisations avec statistiques globales, taux par membre, somme totale collectée. Laissez vide pour toutes.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Année (optionnel)"
              type="number"
              value={rapportExport.annee}
              onChange={(e) => setRapportExport((f) => ({ ...f, annee: e.target.value }))}
              fullWidth
              placeholder="Ex: 2026"
              inputProps={{ min: 2020, max: 2030 }}
            />
            <TextField
              select
              label="Mois (optionnel)"
              value={rapportExport.mois}
              onChange={(e) => setRapportExport((f) => ({ ...f, mois: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">Tous</MenuItem>
              {MOIS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
            <TextField
              select
              fullWidth
              label="Format"
              value={rapportExport.format}
              onChange={(e) => setRapportExport((f) => ({ ...f, format: e.target.value }))}
            >
              <MenuItem value="excel">Excel (.xlsx)</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRapportExport(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleExportRapport} disabled={exportingRapport} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {exportingRapport ? <CircularProgress size={24} /> : 'Télécharger'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
