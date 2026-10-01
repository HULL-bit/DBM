import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
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
  Tabs,
  Tab,
  Checkbox,
  Autocomplete,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Add, Edit, Delete, Payment, TableChart } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import TablePaginationFr from '../ui/TablePaginationFr'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }
const WAVE_PAYMENT_URL = 'https://pay.wave.com/m/M_sn_A4og8Zu7m589/c/sn/'
// Suggestions courantes pour l'objet d'une assignation — la liste n'est pas fermée : on peut
// toujours taper un nom différent (ex. "Tabaski", "Waxtaan"), qui devient alors son propre
// type au lieu d'être fondu dans "AUTRES".
const OBJETS_ASSIGNATION_COURANTS = ['MAGAL', 'GAMOU', 'KAZU RAJABB', 'KOOR', 'SOCIAL', 'XELCOM']
// Trie avec les objets courants dans leur ordre habituel, "AUTRES" en dernier, et tout objet
// personnalisé entre les deux par ordre alphabétique.
function ordonnerObjetsAssignation(valeurs) {
  const ordreConnu = [...OBJETS_ASSIGNATION_COURANTS, 'AUTRES']
  return [...valeurs].sort((a, b) => {
    const ia = ordreConnu.indexOf(a)
    const ib = ordreConnu.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
}
const STATUTS = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'declare', label: 'Déclaré' },
  { value: 'payee', label: 'Payée' },
  { value: 'retard', label: 'En retard' },
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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { user, peut } = useAuth()
  // Admin global, jewrin général, chargé de finance (jewrine_finance), ou exception accordée
  // par l'admin via Rôles & Permissions — pas seulement un rôle codé en dur.
  const isAdmin = user?.role === 'admin' || user?.role === 'jewrin' || user?.role === 'jewrine_finance' || peut('finance', 'gerer')
  // Seule la page courante est chargée : filtres et pagination sont appliqués par le
  // serveur, et les totaux viennent de /resume/ (calculés en base).
  const [list, setList] = useState([])
  const [count, setCount] = useState(0)
  const [resume, setResume] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(null)
  const [openPayer, setOpenPayer] = useState(null)
  const [payerForm, setPayerForm] = useState({ reference_wave: '', mode_paiement: 'wave' })
  const [form, setForm] = useState({
    membre: '',
    membres_selectionnes: [], // Pour la sélection multiple
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
  // Validation groupée : ids sélectionnés (conservés d'une page à l'autre du même filtre).
  const [selection, setSelection] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [openRapportExport, setOpenRapportExport] = useState(false)
  const [rapportExport, setRapportExport] = useState({ format: 'excel', annee: '', mois: '' })
  const [exportingRapport, setExportingRapport] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [typeFilter, setTypeFilter] = useState('')
  const [objetAssignationFilter, setObjetAssignationFilter] = useState('')
  // Par défaut : le mois en cours seulement, pour ne pas charger tout l'historique.
  const [moisFilter, setMoisFilter] = useState(new Date().getMonth() + 1)
  const [anneeFilter, setAnneeFilter] = useState(new Date().getFullYear())
  const [membreFilter, setMembreFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState('')

  const filtres = useMemo(() => {
    const params = {}
    if (typeFilter) params.type_cotisation = typeFilter
    if (objetAssignationFilter) params.objet_assignation = objetAssignationFilter
    if (moisFilter) params.mois = moisFilter
    if (anneeFilter && String(anneeFilter).length === 4) params.annee = anneeFilter
    if (membreFilter) params.membre = membreFilter
    if (statutFilter) params.statut = statutFilter
    return params
  }, [typeFilter, objetAssignationFilter, moisFilter, anneeFilter, membreFilter, statutFilter])

  // Nouveau filtre → retour à la première page et sélection vidée.
  useEffect(() => { setPage(0); setSelection([]) }, [filtres])

  // `silencieux` : rechargement après une action, sans remplacer le tableau par un spinner.
  const loadList = useCallback((silencieux = false) => {
    if (!silencieux) setLoading(true)
    const pageReq = api
      .get('/finance/cotisations/', { params: { ...filtres, page: page + 1, page_size: rowsPerPage } })
      .then(({ data }) => {
        setList(data?.results || [])
        setCount(data?.count || 0)
      })
      .catch((err) => {
        // Page devenue vide (ex : dernière ligne supprimée) → revenir à la précédente.
        if (err.response?.status === 404 && page > 0) setPage((p) => p - 1)
        else if (!silencieux) { setList([]); setCount(0) }
      })
    const resumeReq = api
      .get('/finance/cotisations/resume/', { params: filtres })
      .then(({ data }) => setResume(data))
      .catch(() => { if (!silencieux) setResume(null) })
    return Promise.all([pageReq, resumeReq]).finally(() => setLoading(false))
  }, [filtres, page, rowsPerPage])

  // Petit délai pour ne pas lancer une requête à chaque frappe (champ Année, etc.).
  useEffect(() => {
    const t = setTimeout(() => loadList(), 250)
    return () => clearTimeout(t)
  }, [loadList])

  const handleChangePage = (_e, p) => setPage(p)
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }
  useEffect(() => {
    if (isAdmin) api.get('/auth/users/').then(({ data }) => setUsers(data.results || data)).catch(() => setUsers([]))
  }, [isAdmin])

  const handleOpenAdd = () => {
    setEditingId(null)
    const now = new Date()
    setForm({
      membre: '',
      membres_selectionnes: [],
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
    setMessage({ type: '', text: '' })
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
    setMessage({ type: '', text: '' })
    setOpenForm(true)
  }

  const handleSave = async () => {
    const errors = {}
    const isMultiple = form.membres_selectionnes && form.membres_selectionnes.length > 0
    
    // Validation pour création multiple
    if (isMultiple) {
      if (!form.mois) errors.mois = 'Mois requis.'
      if (!form.annee) errors.annee = 'Année requise.'
      if (!form.date_echeance) errors.date_echeance = 'Date d\'échéance requise.'
      if (form.type_cotisation === 'assignation' && !String(form.objet_assignation || '').trim()) {
        errors.objet_assignation = 'Objet de l\'assignation requis (ex : Magal, Gamou, …).'
      }
    } else {
      // Validation pour création unitaire
      if (!form.membre && !editingId) errors.membre = 'Sélectionnez un membre.'
      if (!form.mois) errors.mois = 'Mois requis.'
      if (!form.annee) errors.annee = 'Année requise.'
      if (!form.date_echeance) errors.date_echeance = 'Date d\'échéance requise.'
      if (form.type_cotisation === 'assignation' && !String(form.objet_assignation || '').trim()) {
        errors.objet_assignation = 'Objet de l\'assignation requis (ex : Magal, Gamou, …).'
      }
    }
    
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setMessage({ type: 'error', text: 'Veuillez corriger les champs en rouge.' })
      return
    }
    
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const isMultipleCreation = form.membres_selectionnes && form.membres_selectionnes.length > 0
      
      if (isMultipleCreation) {
        // Création multiple pour plusieurs membres
        const cotisationData = {
          montant: Number(form.montant),
          mois: Number(form.mois),
          annee: Number(form.annee),
          date_echeance: form.date_echeance,
          statut: form.statut,
          type_cotisation: form.type_cotisation,
          objet_assignation: form.type_cotisation === 'assignation' ? String(form.objet_assignation || '').trim().toUpperCase() : '',
          mode_paiement: form.mode_paiement,
          notes: form.notes || '',
        }
        
        const payload = {
          membres: form.membres_selectionnes,
          cotisation: cotisationData,
        }
        
        const { data: responseData } = await api.post('/finance/cotisations/create-multiple/', payload)

        // Gérer la réponse avec les cotisations créées et ignorées
        const created = responseData.created_count || 0
        const skipped = responseData.skipped_count || 0
        const total = responseData.total_processed || form.membres_selectionnes.length
        
        let successMessage = `${created} cotisation(s) créée(s) avec succès.`
        if (skipped > 0) {
          successMessage += ` ${skipped} ignorée(s) (déjà existante(s)).`
        }
        setMessage({ type: 'success', text: successMessage })
      } else {
        // Création unitaire classique
        const payload = {
          membre: form.membre || (list.find((c) => c.id === editingId)?.membre),
          montant: Number(form.montant),
          mois: Number(form.mois),
          annee: Number(form.annee),
          date_echeance: form.date_echeance,
          statut: form.statut,
          type_cotisation: form.type_cotisation,
          objet_assignation: form.type_cotisation === 'assignation' ? String(form.objet_assignation || '').trim().toUpperCase() : '',
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
      }
      
      loadList(true)
      setOpenForm(false)
      setEditingId(null)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const apiErrors = {}
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            apiErrors[key] = String(value[0])
          } else if (typeof value === 'string') {
            apiErrors[key] = value
          }
        })
        setFormErrors((prev) => ({ ...prev, ...apiErrors }))
        const firstMsg = Object.values(apiErrors)[0] || 'Veuillez corriger les champs.'
        setMessage({ type: 'error', text: firstMsg })
      } else {
        const detail = data?.detail || data
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
      await api.delete(`/finance/cotisations/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Cotisation supprimée.' })
      const idSupprime = openDelete.id
      setSelection((prev) => prev.filter((id) => id !== idSupprime))
      loadList(true)
      setOpenDelete(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenPayer = (c) => {
    setOpenPayer(c)
  }

  const handlePayer = async () => {
    if (!openPayer) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.post(`/finance/cotisations/${openPayer.id}/payer/`, { mode_paiement: 'liquide' })
      setMessage({ type: 'success', text: 'Paiement déclaré. Il est en attente de confirmation par le chargé de finance.' })
      setOpenPayer(null)
      loadList(true)
    } catch (err) {
      const d = err.response?.data?.detail || 'Erreur'
      setMessage({ type: 'error', text: typeof d === 'string' ? d : 'Erreur lors de l\'enregistrement du paiement.' })
    } finally {
      setSaving(false)
    }
  }

  // --- Validation groupée par l'admin / le chargé de finance ---
  // Un membre peut être marqué payé même s'il n'a rien déclaré : seules les cotisations
  // déjà payées ou annulées ne sont plus proposées à la validation.
  const selectionSet = useMemo(() => new Set(selection), [selection])

  const toggleSelection = useCallback((id) => {
    setSelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  // Une seule requête pour toute la sélection (au lieu d'un PATCH par cotisation, qui
  // saturait le navigateur et le serveur avec des centaines de lignes), puis mise à jour
  // locale de la liste sans tout recharger.
  const handleConfirmerSelection = async () => {
    if (selection.length === 0) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const { data } = await api.post('/finance/cotisations/valider-multiple/', { ids: selection })
      setMessage({ type: 'success', text: `${data?.validees ?? selection.length} paiement(s) validé(s).` })
      setSelection([])
      loadList(true)
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de la validation groupée.' })
    } finally {
      setSaving(false)
    }
  }

  const statutColor = (s) => {
    const statutLower = String(s || '').toLowerCase()
    if (statutLower === 'payee') return 'success'
    if (statutLower === 'declare') return 'warning'
    if (statutLower === 'retard') return 'error'
    return 'default'
  }

  const canPayCotisation = (c) => String(c.statut || '').toLowerCase() === 'en_attente'

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

  const r = resume || {}
  const totalMontant = r.montant_total || 0
  const totalMensualites = r.mensualites_total || 0
  const totalMensualitesPayees = r.mensualites_payees || 0
  const pourcentageMensualites = totalMensualites > 0 ? Math.round((totalMensualitesPayees / totalMensualites) * 100) : 0
  const totalAssignationsMontant = r.assignations_total || 0
  const totalAssignationsPayees = r.assignations_payees || 0
  const pourcentageAssignationsMontant =
    totalAssignationsMontant > 0 ? Math.round((totalAssignationsPayees / totalAssignationsMontant) * 100) : 0

  // Options du filtre "Assignation" : suggestions courantes + objets déjà utilisés.
  const objetsAssignationDisponibles = useMemo(
    () => ordonnerObjetsAssignation(Array.from(new Set([...OBJETS_ASSIGNATION_COURANTS, 'AUTRES', ...(resume?.objets_disponibles || [])]))),
    [resume],
  )

  // Détail par objet (MAGAL, GAMOU, ..., AUTRES) et mensualités par mois, pour le filtre courant.
  const assignationSums = useMemo(
    () => Object.fromEntries((resume?.par_objet || []).map((o) => [o.objet, o.total])),
    [resume],
  )
  const labelsAssignations = useMemo(() => ordonnerObjetsAssignation(Object.keys(assignationSums)), [assignationSums])
  const nbAssignationsFiltrees = labelsAssignations.length
  const mensualitesParMois = resume?.par_mois || []

  const confirmablesPage = useMemo(
    () => list.filter((c) => c.statut !== 'payee' && c.statut !== 'annulee'),
    [list],
  )
  const tousPageSelectionnes = confirmablesPage.length > 0 && confirmablesPage.every((c) => selectionSet.has(c.id))
  const certainsPageSelectionnes = confirmablesPage.some((c) => selectionSet.has(c.id))
  const toggleSelectionPage = (coche) => {
    const idsPage = confirmablesPage.map((c) => c.id)
    setSelection((prev) => (coche
      ? Array.from(new Set([...prev, ...idsPage]))
      : prev.filter((id) => !idsPage.includes(id))))
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600, fontSize: { xs: '1.5rem', sm: '2.125rem' } }} gutterBottom>SAAS YI</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{isAdmin ? 'Gérer les cotisations mensuelles (assignations par membre)' : 'Mes cotisations (assignations créées par l\'admin)'}</Typography>
        </Box>
        {isAdmin && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
            <Button fullWidth={isMobile} size={isMobile ? 'small' : 'medium'} variant="outlined" startIcon={<TableChart />} onClick={() => { setRapportExport({ format: 'excel' }); setOpenRapportExport(true) }} sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
              Exporter rapport
            </Button>
            <Button fullWidth={isMobile} size={isMobile ? 'small' : 'medium'} variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
              Créer une cotisation
            </Button>
          </Box>
        )}
      </Box>

      {(
        <>
          <Box sx={{ mb: 2 }}>
            <Tabs
              value={typeFilter}
              onChange={(e, v) => { setTypeFilter(v); setObjetAssignationFilter('') }}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: 40,
                borderBottom: `1px solid ${COLORS.or}30`,
                '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600 },
                '& .Mui-selected': { color: `${COLORS.vert} !important` },
                '& .MuiTabs-indicator': { bgcolor: COLORS.vert },
              }}
            >
              <Tab label="Toutes" value="" />
              <Tab label="Mensualités" value="mensualite" />
              <Tab label="Assignations" value="assignation" />
            </Tabs>
            {typeFilter === 'assignation' && (
              <TextField
                select
                size="small"
                label="Assignation (Magal, Gamou, ...)"
                value={objetAssignationFilter}
                onChange={(e) => setObjetAssignationFilter(e.target.value)}
                sx={{ minWidth: 220, mt: 1.5 }}
              >
                <MenuItem value="">Toutes</MenuItem>
                {objetsAssignationDisponibles.map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </TextField>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField select size="small" label="Mois" value={moisFilter} onChange={(e) => setMoisFilter(e.target.value)} sx={{ minWidth: 130 }}>
              <MenuItem value="">Tous</MenuItem>
              {MOIS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Année" type="number" value={anneeFilter} onChange={(e) => setAnneeFilter(e.target.value)} sx={{ width: 130 }} />
            <TextField select size="small" label="Statut" value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="">Tous</MenuItem>
              {STATUTS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
            {isAdmin && (
              <Autocomplete
                size="small"
                options={users}
                value={users.find((u) => String(u.id) === String(membreFilter)) || null}
                onChange={(e, val) => setMembreFilter(val ? val.id : '')}
                getOptionLabel={(u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || ''}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label="Rechercher un membre (nom, prénom)" />}
                sx={{ minWidth: 260 }}
              />
            )}
            {(Number(moisFilter) !== new Date().getMonth() + 1 || Number(anneeFilter) !== new Date().getFullYear() || membreFilter || statutFilter) && (
              <Button size="small" onClick={() => { setMoisFilter(new Date().getMonth() + 1); setAnneeFilter(new Date().getFullYear()); setMembreFilter(''); setStatutFilter('') }} sx={{ color: COLORS.vert }}>
                Mois en cours
              </Button>
            )}
          </Box>
          <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
            <Paper sx={{ p: 2, borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce }}>Montant total (filtre actuel)</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.vert }}>
                {totalMontant.toLocaleString('fr-FR')} FCFA
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(resume?.nb ?? count)} cotisation(s) — filtre actuel
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
              {nbAssignationsFiltrees === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Aucune assignation pour ce filtre.
                </Typography>
              ) : (
                // On affiche tous les objets réellement présents dans les données filtrées
                // (y compris un nom personnalisé), dans un ordre lisible (courants... AUTRES)
                labelsAssignations
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
      ) : list.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Payment sx={{ fontSize: 56, color: 'action.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="h6">Aucune cotisation pour ce filtre</Typography>
          <Typography color="text.secondary" variant="body2">Changez le mois, l'année ou le membre ci-dessus.</Typography>
        </Box>
      ) : (
        <>
          {isAdmin && (confirmablesPage.length > 0 || selection.length > 0) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
              <Button
                size="small"
                variant="contained"
                disabled={selection.length === 0 || saving}
                onClick={handleConfirmerSelection}
                sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
              >
                Valider les paiements sélectionnés ({selection.length})
              </Button>
              {selection.length > 0 && (
                <Button size="small" onClick={() => setSelection([])}>Désélectionner</Button>
              )}
            </Box>
          )}
        <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${COLORS.or}30` }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, color: COLORS.vertFonce, bgcolor: `${COLORS.vert}08`, whiteSpace: 'nowrap' } }}>
                {isAdmin && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      indeterminate={certainsPageSelectionnes && !tousPageSelectionnes}
                      checked={tousPageSelectionnes}
                      disabled={confirmablesPage.length === 0}
                      onChange={(e) => toggleSelectionPage(e.target.checked)}
                    />
                  </TableCell>
                )}
                {isAdmin && <TableCell>Membre</TableCell>}
                <TableCell>Type</TableCell>
                <TableCell>Période</TableCell>
                <TableCell align="right">Montant</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Paiement</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((c) => {
                const isAssignation = c.type_cotisation === 'assignation'
                const isPaid = String(c.statut || '').toLowerCase() === 'payee'
                const canPay = canPayCotisation(c)
                const dejaDeclare = c.statut === 'declare'
                const isMine = Number(c.membre) === Number(user?.id)
                const estConfirmable = c.statut !== 'payee' && c.statut !== 'annulee'
                return (
                  <TableRow key={c.id} hover selected={selectionSet.has(c.id)}>
                    {isAdmin && (
                      <TableCell padding="checkbox">
                        {estConfirmable && (
                          <Checkbox size="small" checked={selectionSet.has(c.id)} onChange={() => toggleSelection(c.id)} />
                        )}
                      </TableCell>
                    )}
                    {isAdmin && (
                      <TableCell sx={{ fontWeight: 600, color: COLORS.vert, whiteSpace: 'nowrap' }}>
                        {c.membre_nom || `#${c.membre}`}
                      </TableCell>
                    )}
                    <TableCell>
                      <Chip
                        label={isAssignation ? (c.objet_assignation || 'Assignation') : 'Mensualité'}
                        size="small"
                        sx={{ bgcolor: isAssignation ? '#FBE9E7' : `${COLORS.or}25`, color: isAssignation ? '#E65100' : COLORS.vertFonce, fontWeight: 700, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{MOIS_LABELS[c.mois]} {c.annee}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: isPaid ? '#2E7D32' : COLORS.vertFonce, whiteSpace: 'nowrap' }}>
                      {Number(c.montant || 0).toLocaleString('fr-FR')} FCFA
                    </TableCell>
                    <TableCell>
                      <Chip label={c.statut_display || c.statut} color={statutColor(c.statut)} size="small" />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {isPaid && c.date_paiement ? (
                        <Typography variant="caption" sx={{ color: '#2E7D32' }}>
                          {new Date(c.date_paiement).toLocaleDateString('fr-FR')}
                          {c.mode_paiement === 'wave' ? ' · Wave' : c.mode_paiement === 'liquide' ? ' · Espèces' : ' · Autre'}
                        </Typography>
                      ) : c.date_echeance ? (
                        <Typography variant="caption" color="text.secondary">
                          Échéance : {new Date(c.date_echeance).toLocaleDateString('fr-FR')}
                        </Typography>
                      ) : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        {(isMine || !isAdmin) && (canPay || dejaDeclare) && (
                          dejaDeclare ? (
                            <Chip size="small" label="En attente de confirmation" sx={{ bgcolor: `${COLORS.or}25`, color: COLORS.vertFonce, fontWeight: 600 }} />
                          ) : (
                            <Button
                              size="small" variant="contained" startIcon={<Payment />}
                              onClick={() => handleOpenPayer(c)}
                              sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce }, borderRadius: 1.5, whiteSpace: 'nowrap' }}
                            >
                              Payer
                            </Button>
                          )
                        )}
                        {isAdmin && (
                          <>
                            <IconButton size="small" onClick={() => handleOpenEdit(c)} sx={{ color: COLORS.vert }}><Edit fontSize="small" /></IconButton>
                            <IconButton size="small" onClick={() => setOpenDelete(c)} color="error"><Delete fontSize="small" /></IconButton>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <TablePaginationFr
            count={count}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
        </>
      )}

      <Dialog open={openForm} onClose={() => { setOpenForm(false); setEditingId(null) }} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? 'Modifier la cotisation' : 'Créer une cotisation'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {!editingId && (
              <Box key="member-selection" sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: COLORS.vert }}>Mode de création</Typography>
                <TextField
                  select
                  label="Type de création"
                  value={form.membres_selectionnes?.length > 0 ? 'multiple' : 'single'}
                  onChange={(e) => {
                    if (e.target.value === 'multiple') {
                      setForm((f) => ({ ...f, membres_selectionnes: users.map(u => u.id), membre: '' }))
                    } else {
                      setForm((f) => ({ ...f, membres_selectionnes: [], membre: '' }))
                    }
                  }}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="single">Un seul membre</MenuItem>
                  <MenuItem value="multiple">Plusieurs membres (tous ou sélection)</MenuItem>
                </TextField>
                
                {form.membres_selectionnes?.length > 0 ? (
                  <Box key="multiple-mode">
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                      Membres sélectionnés ({form.membres_selectionnes.length} / {users.length})
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setForm((f) => ({ ...f, membres_selectionnes: users.map(u => u.id) }))}
                        sx={{ borderColor: COLORS.vert, color: COLORS.vert }}
                      >
                        Tout sélectionner
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setForm((f) => ({ ...f, membres_selectionnes: [] }))
                          setFormErrors((fe) => ({ ...fe, membre: undefined }))
                        }}
                        sx={{ borderColor: 'error.main', color: 'error.main' }}
                      >
                        Tout désélectionner
                      </Button>
                    </Box>
                    <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1, p: 1 }}>
                      {users.map((u) => (
                        <Box
                          key={u.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            p: 1,
                            borderRadius: 1,
                            bgcolor: form.membres_selectionnes.includes(u.id) ? `${COLORS.vert}15` : 'transparent',
                            '&:hover': { bgcolor: `${COLORS.vert}08` },
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={form.membres_selectionnes.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm((f) => ({ ...f, membres_selectionnes: [...f.membres_selectionnes, u.id] }))
                              } else {
                                setForm((f) => ({
                                  ...f,
                                  membres_selectionnes: f.membres_selectionnes.filter((id) => id !== u.id),
                                }))
                              }
                            }}
                            style={{ accentColor: COLORS.vert }}
                          />
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {u.first_name} {u.last_name} - {u.email}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <TextField
                    key="single-mode"
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
              </Box>
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
              <Autocomplete
                freeSolo
                options={objetsAssignationDisponibles}
                value={form.objet_assignation}
                onInputChange={(e, value) => {
                  setForm((f) => ({ ...f, objet_assignation: value }))
                  setFormErrors((fe) => ({ ...fe, objet_assignation: undefined }))
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Objet de l'assignation"
                    fullWidth
                    error={!!formErrors.objet_assignation}
                    helperText={
                      formErrors.objet_assignation ||
                      'Choisissez un objet courant (MAGAL, GAMOU, …) ou tapez-en un nouveau (ex : Tabaski)'
                    }
                  />
                )}
              />
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
        <DialogTitle sx={{ bgcolor: COLORS.vert, color: 'white' }}>Déclarer mon paiement</DialogTitle>
        <DialogContent>
          {openPayer && (
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info">
                Cotisation <strong>{openPayer.mois}/{openPayer.annee}</strong> — Montant : <strong>{openPayer.montant} FCFA</strong>
              </Alert>
              <Typography variant="body2" color="text.secondary">
                En confirmant, votre cotisation passera en <strong>attente de confirmation</strong>. Le chargé de
                finance vérifiera votre paiement et le validera prochainement.
              </Typography>
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
