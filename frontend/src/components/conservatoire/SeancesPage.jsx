import React, { useState, useEffect, useRef } from 'react'
import {
  Box, Typography, Grid, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Chip, Divider, Paper, Tabs, Tab, Card, CardContent,
} from '@mui/material'
import {
  ArrowBack, Add, Edit, Delete, Event, HowToReg, GetApp, AccessTime,
  LocationOn, MusicNote, Group, Visibility, Image as ImageIcon, CalendarMonth,
} from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import usePagination from '../../hooks/usePagination'
import TablePaginationFr from '../ui/TablePaginationFr'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

const TYPE_CHIP = {
  repetition: { label: 'Répétition', color: '#1565C0', bg: '#E3F2FD' },
  prestation: { label: 'Prestation', color: '#6A1B9A', bg: '#F3E5F5' },
}

const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function StatCard({ label, value, color, icon }) {
  return (
    <Card sx={{ borderRadius: 2.5, borderTop: `4px solid ${color}`, height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {React.cloneElement(icon, { sx: { color, fontSize: 20 } })}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color, lineHeight: 1.1 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

// present_hors_kourel = membre DU kourel présent mais qui n'a pas presté (sanction, etc.).
// present_invite = membre d'un AUTRE kourel venu assister (concept différent, voir plus bas).
const STATUTS_PRESENT = ['present', 'present_retard', 'present_hors_kourel', 'present_invite']
const STATUT_BG = {
  present: '#E8F5E9',
  present_retard: '#FFF8E1',
  present_hors_kourel: '#EDE7F6',
  absent_justifie: '#FFF3E0',
  absent_non_justifie: '#FFEBEE',
}

function seanceCounts(s) {
  const presences = s.presences || []
  return {
    presences,
    nbPresents: presences.filter(p => STATUTS_PRESENT.includes(p.statut)).length,
    nbAbsents: presences.filter(p => !STATUTS_PRESENT.includes(p.statut)).length,
  }
}

function SeanceDetailDialog({ s, canManage, onClose, onEdit, onDelete, onPresences, setMsg }) {
  const captureRef = useRef(null)
  const [exporting, setExporting] = useState(false)
  if (!s) return null
  const type = TYPE_CHIP[s.type_seance] || { label: s.type_seance, color: C.vert, bg: `${C.vert}15` }
  const { presences, nbPresents, nbAbsents } = seanceCounts(s)

  const handleExportPng = async () => {
    if (!captureRef.current) return
    setExporting(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const nomFichier = `seance_${(s.titre || 'seance').toLowerCase().replace(/[^a-z0-9]+/gi, '_')}.png`
      const link = document.createElement('a')
      link.download = nomFichier
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      setMsg?.({ type: 'error', text: "Erreur lors de l'export en image." })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={!!s} onClose={onClose} maxWidth="sm" fullWidth>
      <Box ref={captureRef} sx={{ bgcolor: '#fff' }}>
      <DialogTitle sx={{ color: C.vert }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip label={type.label} size="small" sx={{ bgcolor: type.bg, color: type.color, fontWeight: 600, fontSize: '0.7rem' }} />
          {presences.length > 0 && (
            <>
              <Chip label={`${nbPresents} présents`} size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem' }} />
              {nbAbsents > 0 && <Chip label={`${nbAbsents} absents`} size="small" color="error" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
            </>
          )}
        </Box>
        {s.titre}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={1} sx={{ mb: 1.5, mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <AccessTime sx={{ fontSize: 16, color: C.or }} />
              <Typography variant="caption" color="text.secondary">
                {s.date_heure ? new Date(s.date_heure).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                {s.heure_fin ? ` → ${s.heure_fin}` : ''}
              </Typography>
            </Box>
          </Grid>
          {s.lieu && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <LocationOn sx={{ fontSize: 16, color: C.or }} />
                <Typography variant="caption" color="text.secondary">{s.lieu}</Typography>
              </Box>
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Group sx={{ fontSize: 16, color: C.or }} />
              <Typography variant="caption" color="text.secondary">{s.kourel_nom || '—'}</Typography>
            </Box>
          </Grid>
        </Grid>

        {s.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{s.description}</Typography>
        )}

        {(s.khassidas || []).length > 0 && (
          <Box sx={{ mb: 1.5, p: 1.25, bgcolor: `${C.vert}06`, borderRadius: 1.5, borderLeft: `3px solid ${C.or}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <MusicNote sx={{ fontSize: 14, color: C.or }} />
              <Typography variant="caption" sx={{ color: C.vertFonce, fontWeight: 600 }}>Khassidas</Typography>
            </Box>
            {s.khassidas.map((k, i) => (
              <Typography key={i} variant="caption" display="block" color="text.secondary">
                • {k.nom_khassida} ({k.dathie}){k.khassida_portion ? ` — ${k.khassida_portion}` : ''}
              </Typography>
            ))}
          </Box>
        )}

        {presences.length > 0 && (
          <Box sx={{ p: 1.5, bgcolor: `${C.or}10`, borderRadius: 1.5 }}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main', display: 'block', mb: 0.5 }}>
                  Présents ({presences.filter(p => p.statut === 'present' || p.statut === 'present_retard' || p.statut === 'present_hors_kourel').length})
                </Typography>
                {presences.filter(p => p.statut === 'present' || p.statut === 'present_retard' || p.statut === 'present_hors_kourel').map(p => (
                  <Typography key={p.id || p.membre} variant="caption" display="block" color="text.secondary">
                    • {p.membre_nom || `#${p.membre}`}
                    {p.statut === 'present_retard' ? ' (retard)' : ''}
                    {p.statut === 'present_hors_kourel' ? ' (hors kourel — n\'a pas presté)' : ''}
                  </Typography>
                ))}
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main', display: 'block', mb: 0.5 }}>
                  Absents ({presences.filter(p => p.statut === 'absent_justifie' || p.statut === 'absent_non_justifie').length})
                </Typography>
                {presences.filter(p => p.statut === 'absent_justifie' || p.statut === 'absent_non_justifie').map(p => (
                  <Typography key={p.id || p.membre} variant="caption" display="block" color="text.secondary">
                    • {p.membre_nom || `#${p.membre}`} ({p.statut_display || p.statut}){p.remarque ? ` — ${p.remarque}` : ''}
                  </Typography>
                ))}
              </Grid>
              {presences.some(p => p.statut === 'present_invite') && (
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#1565C0', display: 'block', mb: 0.5, mt: 0.5 }}>
                    Invités d'un autre kourel ({presences.filter(p => p.statut === 'present_invite').length})
                  </Typography>
                  {presences.filter(p => p.statut === 'present_invite').map(p => (
                    <Typography key={p.id || p.membre} variant="caption" display="block" color="text.secondary">
                      • {p.membre_nom || `#${p.membre}`}
                    </Typography>
                  ))}
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </DialogContent>
      </Box>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5 }}>
        <Button startIcon={exporting ? <CircularProgress size={16} /> : <ImageIcon />} onClick={handleExportPng} disabled={exporting} sx={{ color: C.vertFonce }}>
          Exporter en image
        </Button>
        {canManage && (
          <Button startIcon={<HowToReg />} onClick={() => onPresences(s)} sx={{ color: C.vert }}>
            Présences
          </Button>
        )}
        {canManage && (
          <IconButton onClick={() => onEdit(s)} sx={{ color: C.vert }}><Edit fontSize="small" /></IconButton>
        )}
        {canManage && (
          <IconButton color="error" onClick={() => onDelete(s.id)}><Delete fontSize="small" /></IconButton>
        )}
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  )
}

export default function SeancesPage({ onBack }) {
  const { user, peut } = useAuth()
  const isAdmin = user?.role === 'admin'
  // Le chargé du conservatoire (jewrine_conservatoire), le jewrin général, ou une exception
  // accordée par l'admin via Rôles & Permissions ont les mêmes droits que l'admin ici.
  const canManage = isAdmin || user?.role === 'jewrin' || user?.role === 'jewrine_conservatoire' || peut('conservatoire', 'gerer')
  const [seances, setSeances] = useState([])
  const [kourels, setKourels] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterKourel, setFilterKourel] = useState('')
  const [filterAnnee, setFilterAnnee] = useState('')
  const [filterMois, setFilterMois] = useState('')
  const [filterDateDebut, setFilterDateDebut] = useState('')
  const [filterDateFin, setFilterDateFin] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({
    kourel: '', type_seance: 'repetition', titre: '', description: '',
    date_heure: '', heure_fin: '', lieu: '', khassidas: [],
  })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [detailSeance, setDetailSeance] = useState(null)
  const [openPresences, setOpenPresences] = useState(null)
  const [presencesForm, setPresencesForm] = useState({})
  const [savingPresences, setSavingPresences] = useState(false)
  const [openAjoutExterne, setOpenAjoutExterne] = useState(false)
  const [externeKourel, setExterneKourel] = useState('')
  const [externeMembre, setExterneMembre] = useState('')
  const [openExport, setOpenExport] = useState(false)
  const [exportFmt, setExportFmt] = useState('excel')
  const [exporting, setExporting] = useState(false)

  const load = () => Promise.all([
    api.get('/conservatoire/seances/').then(({ data }) => setSeances(data.results || data)).catch(() => {}),
    api.get('/conservatoire/kourels/').then(({ data }) => setKourels(data.results || data)).catch(() => {}),
    api.get('/auth/users/').then(({ data }) => setAllUsers(data.results || data || [])).catch(() => {}),
  ]).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditId(null)
    const dt = new Date(); dt.setMinutes(0)
    setForm({ kourel: kourels[0]?.id || '', type_seance: 'repetition', titre: '', description: '', date_heure: dt.toISOString().slice(0, 16), heure_fin: '', lieu: '', khassidas: [] })
    setOpenForm(true)
  }
  const openEdit = (s) => {
    setEditId(s.id)
    const d = s.date_heure ? new Date(s.date_heure) : null
    const dtLocal = d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
    setForm({ kourel: s.kourel, type_seance: s.type_seance, titre: s.titre, description: s.description || '', date_heure: dtLocal, heure_fin: s.heure_fin || '', lieu: s.lieu || '', khassidas: (s.khassidas || []).map(k => ({ nom_khassida: k.nom_khassida || '', dathie: k.dathie || '', khassida_portion: k.khassida_portion || '' })) })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.kourel || !form.date_heure) { setMsg({ type: 'error', text: 'Kourel et date requis.' }); return }
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      const kourelNom = kourels.find(k => k.id === form.kourel)?.nom || ''
      const titreAuto = form.titre?.trim() || `${form.type_seance === 'prestation' ? 'Prestation' : 'Répétition'} — ${kourelNom}`
      const payload = { kourel: form.kourel, type_seance: form.type_seance, titre: titreAuto, description: form.description || '', date_heure: form.date_heure, heure_fin: form.heure_fin || null, lieu: form.lieu || '' }
      let seanceId = editId
      if (editId) {
        await api.patch(`/conservatoire/seances/${editId}/`, payload)
        setMsg({ type: 'success', text: 'Séance modifiée.' })
      } else {
        const { data } = await api.post('/conservatoire/seances/', payload)
        seanceId = data.id
        setMsg({ type: 'success', text: 'Séance créée.' })
      }
      const khassidas = form.khassidas.filter(k => k.nom_khassida?.trim() && k.dathie?.trim())
      if (khassidas.length && seanceId) {
        await api.post(`/conservatoire/seances/${seanceId}/khassidas/`, {
          khassidas: khassidas.map((k, i) => ({ ...k, ordre: i })),
        })
      }
      load(); setOpenForm(false)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMsg({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await api.delete(`/conservatoire/seances/${deleteTarget}/`)
      setMsg({ type: 'success', text: 'Séance supprimée.' })
      setSeances(prev => prev.filter(s => s.id !== deleteTarget)); setDeleteTarget(null)
    } catch { setMsg({ type: 'error', text: 'Erreur.' }) }
    finally { setSaving(false) }
  }

  const handleOpenPresences = async (s) => {
    let memberIds = []
    const k = kourels.find(k => k.id === s.kourel)
    if (k?.membres?.length) {
      memberIds = k.membres.map(x => (typeof x === 'object' ? x?.id : x)).filter(Boolean)
    } else {
      try { const { data } = await api.get(`/conservatoire/kourels/${s.kourel}/`); memberIds = (data.membres || []).map(x => typeof x === 'object' ? x?.id : x).filter(Boolean) } catch { }
    }
    const existing = (s.presences || []).reduce((acc, p) => { acc[p.membre] = { statut: p.statut, remarque: p.remarque || '' }; return acc }, {})
    const init = {}
    memberIds.forEach(id => { init[id] = existing[id] || { statut: 'present', remarque: '' } })
    setPresencesForm(init)
    setOpenPresences(s)
  }

  const handleSavePresences = async () => {
    if (!openPresences) return
    setSavingPresences(true)
    try {
      await api.post(`/conservatoire/seances/${openPresences.id}/presences/`, {
        presences: Object.entries(presencesForm).map(([m, v]) => ({ membre: Number(m), statut: v.statut, remarque: v.remarque || '' })),
      })
      setMsg({ type: 'success', text: 'Présences enregistrées.' })
      load(); setOpenPresences(null)
    } catch { setMsg({ type: 'error', text: 'Erreur enregistrement présences.' }) }
    finally { setSavingPresences(false) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data } = await api.get('/conservatoire/seances/rapport-export/', { params: { format: exportFmt }, responseType: 'blob' })
      const ext = exportFmt === 'pdf' ? 'pdf' : exportFmt === 'csv' ? 'csv' : 'xlsx'
      const url = window.URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a'); a.href = url; a.download = `rapport_seances.${ext}`; a.click()
      window.URL.revokeObjectURL(url)
      setMsg({ type: 'success', text: 'Rapport exporté.' }); setOpenExport(false)
    } catch { setMsg({ type: 'error', text: 'Erreur export.' }) }
    finally { setExporting(false) }
  }

  const addKhassida = () => setForm(f => ({ ...f, khassidas: [...f.khassidas, { nom_khassida: '', dathie: '', khassida_portion: '' }] }))
  const removeKhassida = (i) => setForm(f => ({ ...f, khassidas: f.khassidas.filter((_, j) => j !== i) }))
  const updateKhassida = (i, field, val) => setForm(f => {
    const k = [...f.khassidas]; k[i] = { ...k[i], [field]: val }; return { ...f, khassidas: k }
  })

  const anneesDisponibles = [...new Set(
    seances.filter(s => s.date_heure).map(s => new Date(s.date_heure).getFullYear())
  )].sort((a, b) => b - a)

  const filtered = seances.filter(s => {
    if (filterType && s.type_seance !== filterType) return false
    if (filterKourel && s.kourel !== Number(filterKourel)) return false
    if (filterAnnee || filterMois || filterDateDebut || filterDateFin) {
      if (!s.date_heure) return false
      const jourStr = s.date_heure.slice(0, 10)
      const d = new Date(s.date_heure)
      if (filterAnnee && d.getFullYear() !== Number(filterAnnee)) return false
      if (filterMois && (d.getMonth() + 1) !== Number(filterMois)) return false
      if (filterDateDebut && jourStr < filterDateDebut) return false
      if (filterDateFin && jourStr > filterDateFin) return false
    }
    return true
  }).sort((a, b) => new Date(b.date_heure) - new Date(a.date_heure))

  const { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate } = usePagination(filtered.length)

  const nbRepetitions = seances.filter(s => s.type_seance === 'repetition').length
  const nbPrestations = seances.filter(s => s.type_seance === 'prestation').length
  const nbAVenir = seances.filter(s => s.date_heure && new Date(s.date_heure) >= new Date()).length

  const filtresActifs = filterType || filterKourel || filterAnnee || filterMois || filterDateDebut || filterDateFin
  const resetFiltres = () => {
    setFilterType(''); setFilterKourel(''); setFilterAnnee(''); setFilterMois('')
    setFilterDateDebut(''); setFilterDateFin('')
  }

  const getUserName = (id) => {
    const u = allUsers.find(u => u.id === Number(id))
    return u ? `${u.first_name} ${u.last_name}`.trim() : `Membre #${id}`
  }

  const getKourelMemberIds = (kourelId) => {
    const k = kourels.find(x => x.id === Number(kourelId))
    if (!k?.membres) return []
    return k.membres.map(x => (typeof x === 'object' ? x?.id : x)).filter(Boolean)
  }

  const handleAjouterExterne = () => {
    if (!externeMembre) return
    setPresencesForm(p => ({ ...p, [externeMembre]: { statut: 'present_invite', remarque: '' } }))
    setOpenAjoutExterne(false); setExterneKourel(''); setExterneMembre('')
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={onBack} sx={{ bgcolor: `${C.vert}12`, '&:hover': { bgcolor: `${C.vert}22` } }}>
          <ArrowBack sx={{ color: C.vert }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ color: C.vert, fontWeight: 700 }}>Séances</Typography>
          <Typography variant="body2" color="text.secondary">{seances.length} séance(s) enregistrée(s)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canManage && (
            <Button variant="outlined" startIcon={<GetApp />} onClick={() => setOpenExport(true)}
              sx={{ borderColor: C.vert, color: C.vert, borderRadius: 2 }}>
              Exporter
            </Button>
          )}
          {canManage && (
            <Button variant="contained" startIcon={<Add />} onClick={openAdd} disabled={kourels.length === 0}
              sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2 }}>
              Nouvelle séance
            </Button>
          )}
        </Box>
      </Box>

      {msg.text && <Alert severity={msg.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMsg({ type: '', text: '' })}>{msg.text}</Alert>}

      {/* Stats résumé */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard label="Séances au total" value={seances.length} color={C.vert} icon={<Event />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Répétitions" value={nbRepetitions} color="#1565C0" icon={<MusicNote />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Prestations" value={nbPrestations} color="#6A1B9A" icon={<HowToReg />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="À venir" value={nbAVenir} color={C.or} icon={<AccessTime />} />
        </Grid>
      </Grid>

      {/* Filtre par kourel — vu le rythme hebdomadaire des répétitions, les séances s'accumulent vite */}
      <Tabs
        value={filterKourel}
        onChange={(e, v) => setFilterKourel(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2, borderBottom: `1px solid ${C.or}30`,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 40 },
          '& .Mui-selected': { color: `${C.vert} !important` },
          '& .MuiTabs-indicator': { bgcolor: C.vert },
        }}
      >
        <Tab label="Tous les kourels" value="" />
        {kourels.map(k => <Tab key={k.id} label={k.nom} value={k.id} />)}
      </Tabs>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, borderColor: `${C.or}40`, bgcolor: `${C.or}06` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          <CalendarMonth sx={{ fontSize: 18, color: C.vert }} />
          <Typography variant="subtitle2" sx={{ color: C.vertFonce, fontWeight: 700 }}>Filtrer par période</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField select size="small" label="Type" value={filterType} onChange={e => setFilterType(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">Tous types</MenuItem>
            <MenuItem value="repetition">Répétitions</MenuItem>
            <MenuItem value="prestation">Prestations</MenuItem>
          </TextField>
          <TextField select size="small" label="Année" value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)} sx={{ minWidth: 120 }}>
            <MenuItem value="">Toutes</MenuItem>
            {anneesDisponibles.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Mois" value={filterMois} onChange={e => setFilterMois(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">Tous</MenuItem>
            {MOIS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
          </TextField>
          <TextField size="small" type="date" label="Du" value={filterDateDebut} onChange={e => setFilterDateDebut(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
          <TextField size="small" type="date" label="Au" value={filterDateFin} onChange={e => setFilterDateFin(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
          {filtresActifs && (
            <Button size="small" onClick={resetFiltres} sx={{ color: C.vert }}>
              Réinitialiser
            </Button>
          )}
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: C.vert }} /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Event sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="h6">{seances.length === 0 ? 'Aucune séance' : 'Aucun résultat pour ces filtres'}</Typography>
          {canManage && kourels.length === 0 && <Typography color="text.secondary" variant="body2">Créez d'abord un Kourel.</Typography>}
          {seances.length > 0 && filtresActifs && (
            <Button size="small" onClick={resetFiltres} sx={{ color: C.vert, mt: 1 }}>Réinitialiser les filtres</Button>
          )}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${C.or}30`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, color: C.vertFonce, bgcolor: `${C.vert}0D`, whiteSpace: 'nowrap', borderBottom: `2px solid ${C.or}40`, py: 1.25 } }}>
                <TableCell>Type</TableCell>
                <TableCell>Titre</TableCell>
                <TableCell>Kourel</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Lieu</TableCell>
                <TableCell align="center">Présences</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginate(filtered).map((s, idx) => {
                const type = TYPE_CHIP[s.type_seance] || { label: s.type_seance, color: C.vert, bg: `${C.vert}15` }
                const { presences, nbPresents, nbAbsents } = seanceCounts(s)
                const pct = presences.length > 0 ? Math.round(nbPresents / presences.length * 100) : null
                const pctColor = pct === null ? C.vert : pct >= 80 ? '#2E7D32' : pct >= 50 ? '#EF6C00' : '#C62828'
                const estPassee = s.date_heure && new Date(s.date_heure) < new Date()
                return (
                  <TableRow
                    key={s.id} hover onClick={() => setDetailSeance(s)}
                    sx={{ cursor: 'pointer', bgcolor: idx % 2 === 1 ? `${C.or}05` : 'transparent' }}
                  >
                    <TableCell>
                      <Chip label={type.label} size="small" sx={{ bgcolor: type.bg, color: type.color, fontWeight: 600, fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: C.vert }}>{s.titre}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Chip label={s.kourel_nom || '—'} size="small" variant="outlined" sx={{ borderColor: `${C.or}60`, fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', opacity: estPassee ? 0.7 : 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                        {s.date_heure ? new Date(s.date_heure).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {s.lieu ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
                          {s.lieu}
                        </Box>
                      ) : '—'}
                    </TableCell>
                    <TableCell align="center">
                      {presences.length > 0 ? (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Chip label={`${pct}%`} size="small" sx={{ bgcolor: `${pctColor}18`, color: pctColor, fontWeight: 700, fontSize: '0.68rem', minWidth: 44 }} />
                          <Chip label={nbPresents} size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', minWidth: 30 }} />
                          {nbAbsents > 0 && <Chip label={nbAbsents} size="small" color="error" variant="outlined" sx={{ fontSize: '0.65rem', minWidth: 30 }} />}
                        </Box>
                      ) : <Typography variant="caption" color="text.secondary">Non renseigné</Typography>}
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
                        <IconButton size="small" onClick={() => setDetailSeance(s)} sx={{ color: C.vertFonce }}><Visibility fontSize="small" /></IconButton>
                        {canManage && (
                          <>
                            <IconButton size="small" onClick={() => openEdit(s)} sx={{ color: C.vert }}><Edit fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(s.id)}><Delete fontSize="small" /></IconButton>
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
            count={filtered.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      )}

      <SeanceDetailDialog
        s={detailSeance}
        canManage={canManage}
        onClose={() => setDetailSeance(null)}
        onEdit={(s) => { setDetailSeance(null); openEdit(s) }}
        onDelete={(id) => { setDetailSeance(null); setDeleteTarget(id) }}
        onPresences={(s) => { setDetailSeance(null); handleOpenPresences(s) }}
        setMsg={setMsg}
      />

      {/* Seance form */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: C.vert }}>{editId ? 'Modifier la séance' : 'Nouvelle séance'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Kourel *" value={form.kourel} onChange={e => setForm(f => ({ ...f, kourel: Number(e.target.value) }))}>
                {kourels.map(k => <MenuItem key={k.id} value={k.id}>{k.nom}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Type de séance" value={form.type_seance} onChange={e => setForm(f => ({ ...f, type_seance: e.target.value }))}>
                <MenuItem value="repetition">Répétition</MenuItem>
                <MenuItem value="prestation">Prestation</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Titre (optionnel — généré automatiquement sinon)" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="datetime-local" label="Date et heure de début *" value={form.date_heure} onChange={e => setForm(f => ({ ...f, date_heure: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="time" label="Heure de fin" value={form.heure_fin} onChange={e => setForm(f => ({ ...f, heure_fin: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Lieu" value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))} />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }}>
                <Chip label="Khassidas répétées" size="small" sx={{ bgcolor: `${C.or}20`, color: C.vertFonce }} />
              </Divider>
            </Grid>

            {form.khassidas.map((k, i) => (
              <Grid item xs={12} key={i}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', p: 1.5, bgcolor: `${C.vert}05`, borderRadius: 2, border: `1px solid ${C.or}30` }}>
                  <MusicNote sx={{ color: C.or, fontSize: 20, flexShrink: 0 }} />
                  <TextField size="small" placeholder="Nom khassida *" value={k.nom_khassida} onChange={e => updateKhassida(i, 'nom_khassida', e.target.value)} sx={{ flex: 2 }} />
                  <TextField size="small" placeholder="Dathie (auteur)" value={k.dathie} onChange={e => updateKhassida(i, 'dathie', e.target.value)} sx={{ flex: 2 }} />
                  <TextField size="small" placeholder="Portion" value={k.khassida_portion} onChange={e => updateKhassida(i, 'khassida_portion', e.target.value)} sx={{ flex: 1 }} />
                  <IconButton size="small" color="error" onClick={() => removeKhassida(i)}><Delete fontSize="small" /></IconButton>
                </Box>
              </Grid>
            ))}

            <Grid item xs={12}>
              <Button size="small" variant="outlined" startIcon={<Add />} onClick={addKhassida}
                sx={{ borderColor: C.vert, color: C.vert, borderRadius: 1.5 }}>
                Ajouter une khassida
              </Button>
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth label="Description" multiline rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            {saving ? <CircularProgress size={20} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Presences dialog */}
      <Dialog open={!!openPresences} onClose={() => setOpenPresences(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: C.vert }}>
          Présences — {openPresences?.titre}
          <Typography variant="caption" display="block" color="text.secondary">{openPresences?.kourel_nom}</Typography>
        </DialogTitle>
        <DialogContent>
          {(() => {
            const kourelMemberIds = new Set(getKourelMemberIds(openPresences?.kourel))
            const entries = Object.entries(presencesForm)
            const propres = entries.filter(([id]) => kourelMemberIds.has(Number(id)))
            const externes = entries.filter(([id]) => !kourelMemberIds.has(Number(id)))
            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
                {propres.length === 0 ? (
                  <Typography color="text.secondary">Aucun membre dans ce Kourel.</Typography>
                ) : propres.map(([membreId, v]) => (
                  <Box key={membreId} sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 1.5, bgcolor: STATUT_BG[v.statut] || '#FFEBEE', borderRadius: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ minWidth: 140, fontWeight: 500 }}>{getUserName(membreId)}</Typography>
                    <TextField select size="small" value={v.statut} onChange={e => setPresencesForm(p => ({ ...p, [membreId]: { ...p[membreId], statut: e.target.value } }))} sx={{ minWidth: 190 }}>
                      <MenuItem value="present">Présent</MenuItem>
                      <MenuItem value="present_retard">Présent (retard)</MenuItem>
                      <MenuItem value="present_hors_kourel">Présent (hors kourel)</MenuItem>
                      <MenuItem value="absent_justifie">Absent justifié</MenuItem>
                      <MenuItem value="absent_non_justifie">Absent non justifié</MenuItem>
                    </TextField>
                    {(v.statut === 'absent_justifie' || v.statut === 'absent_non_justifie') && (
                      <TextField
                        size="small"
                        placeholder={v.statut === 'absent_justifie' ? 'Justification (facultatif)' : 'Remarque (facultatif)'}
                        value={v.remarque}
                        onChange={e => setPresencesForm(p => ({ ...p, [membreId]: { ...p[membreId], remarque: e.target.value } }))}
                        sx={{ flex: 1, minWidth: 180 }}
                      />
                    )}
                  </Box>
                ))}

                {externes.length > 0 && (
                  <>
                    <Divider sx={{ mt: 1 }}><Chip label="Membres hors kourel" size="small" /></Divider>
                    {externes.map(([membreId]) => (
                      <Box key={membreId} sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 1.5, bgcolor: '#E3F2FD', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{getUserName(membreId)}</Typography>
                        <Chip label="Invité d'un autre kourel" size="small" sx={{ bgcolor: '#BBDEFB', color: '#0D47A1', fontWeight: 600 }} />
                        <IconButton size="small" onClick={() => setPresencesForm(p => { const n = { ...p }; delete n[membreId]; return n })}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </>
                )}

                <Button
                  size="small" startIcon={<Add />} onClick={() => setOpenAjoutExterne(true)}
                  sx={{ alignSelf: 'flex-start', mt: 1, color: C.vert }}
                >
                  Membres hors kourel
                </Button>
              </Box>
            )
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPresences(null)}>Fermer</Button>
          <Button variant="contained" onClick={handleSavePresences} disabled={savingPresences || Object.keys(presencesForm).length === 0} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            {savingPresences ? <CircularProgress size={20} /> : 'Enregistrer les présences'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ajouter un membre hors kourel */}
      <Dialog open={openAjoutExterne} onClose={() => setOpenAjoutExterne(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: C.vert }}>Ajouter un membre hors kourel</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Un membre d'un autre kourel venu assister à cette répétition. Sa présence comptera
            en surplus dans ses statistiques, sans affecter son taux de présence sur son propre kourel.
          </Typography>
          <TextField
            select fullWidth size="small" label="Kourel d'origine" value={externeKourel}
            onChange={e => { setExterneKourel(e.target.value); setExterneMembre('') }} sx={{ mb: 2 }}
          >
            {kourels.filter(k => k.id !== openPresences?.kourel).map(k => (
              <MenuItem key={k.id} value={k.id}>{k.nom}</MenuItem>
            ))}
          </TextField>
          <TextField
            select fullWidth size="small" label="Membre" value={externeMembre}
            onChange={e => setExterneMembre(e.target.value)} disabled={!externeKourel}
          >
            {getKourelMemberIds(externeKourel).filter(id => !presencesForm[id]).map(id => (
              <MenuItem key={id} value={id}>{getUserName(id)}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAjoutExterne(false)}>Annuler</Button>
          <Button variant="contained" disabled={!externeMembre} onClick={handleAjouterExterne} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export dialog */}
      <Dialog open={openExport} onClose={() => setOpenExport(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: C.vert }}>Exporter le rapport</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Exporte toutes les séances avec présences, khassidas et statistiques.
          </Typography>
          <TextField select fullWidth label="Format" value={exportFmt} onChange={e => setExportFmt(e.target.value)}>
            <MenuItem value="excel">Excel (.xlsx)</MenuItem>
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="csv">CSV</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExport(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleExport} disabled={exporting} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            {exporting ? <CircularProgress size={20} /> : 'Télécharger'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Supprimer cette séance ?</DialogTitle>
        <DialogContent><Typography>Les présences associées seront supprimées.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
