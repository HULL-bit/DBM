import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material'
import { Add, Assignment } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }
const SEMESTRES = [{ value: 1, label: 'Semestre 1' }, { value: 2, label: 'Semestre 2' }]

export default function ProgrammeKamil() {
  const { user } = useAuth()
  const canCreateProgramme = user?.role === 'admin'
  const canAssignJuzz = user?.role === 'admin' || user?.role === 'jewrin'
  const [kamils, setKamils] = useState([])
  const [chapitresByKamil, setChapitresByKamil] = useState({})
  const [progressions, setProgressions] = useState([])
  const [membres, setMembres] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openCreate, setOpenCreate] = useState(false)
  const [openAssign, setOpenAssign] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titre: '',
    description: '',
    objectifs: '',
    semestre: 1,
    annee: new Date().getFullYear(),
    date_debut: '',
    date_fin: '',
    nombre_chapitres: 30,
  })
  const [assignForm, setAssignForm] = useState({}) // { chapitreId: { membre: membreId, montant: number } }
  const [defaultMontant, setDefaultMontant] = useState(10000) // Montant par défaut pour tous les juzz

  const loadKamils = () => api.get('/culturelle/kamil/').then(({ data }) => setKamils(data.results || data)).catch(() => setKamils([]))
  const loadChapitres = () => api.get('/culturelle/chapitres/').then(({ data }) => {
    const list = data.results || data
    const byKamil = {}
    list.forEach((c) => { if (!byKamil[c.kamil]) byKamil[c.kamil] = []; byKamil[c.kamil].push(c) })
    Object.keys(byKamil).forEach((k) => byKamil[k].sort((a, b) => a.numero - b.numero))
    setChapitresByKamil(byKamil)
  }).catch(() => setChapitresByKamil({}))
  const loadProgressions = () => api.get('/culturelle/progressions/').then(({ data }) => setProgressions(data.results || data)).catch(() => setProgressions([]))
  const loadMembres = () => api.get('/auth/users/').then(({ data }) => setMembres((data.results || data).filter((u) => u.role === 'membre' || u.role === 'jewrin'))).catch(() => setMembres([]))

  useEffect(() => {
    setLoading(true)
    Promise.all([loadKamils(), loadChapitres(), loadProgressions()]).finally(() => setLoading(false))
  }, [])
  useEffect(() => { if (canAssignJuzz) loadMembres() }, [canAssignJuzz])

  const handleCreateOpen = () => {
    setForm({
      titre: '',
      description: '',
      objectifs: '',
      semestre: 1,
      annee: new Date().getFullYear(),
      date_debut: '',
      date_fin: '',
      nombre_chapitres: 30,
    })
    setOpenCreate(true)
  }

  const handleCreateSubmit = async () => {
    if (!form.titre || !form.date_debut || !form.date_fin) {
      setMessage({ type: 'error', text: 'Titre, date de début et date de fin requis.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const kamilPayload = {
        titre: form.titre,
        description: form.description || form.titre,
        objectifs: form.objectifs || '',
        semestre: form.semestre,
        annee: form.annee,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        nombre_chapitres: 30,
      }
      const { data: kamil } = await api.post('/culturelle/kamil/', kamilPayload)
      for (let j = 1; j <= 30; j++) {
        await api.post('/culturelle/chapitres/', {
          kamil: kamil.id,
          numero: j,
          titre: `Juzz ${j}`,
          sous_titre: `Partie ${j} du programme`,
          est_publie: true,
        })
      }
      setMessage({ type: 'success', text: 'Programme créé avec 30 juzz.' })
      setOpenCreate(false)
      loadKamils()
      loadChapitres()
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally {
      setSaving(false)
    }
  }

  const handleAssignOpen = (kamil) => {
    setOpenAssign(kamil)
    const chapitres = (chapitresByKamil[kamil.id] || []).sort((a, b) => a.numero - b.numero)
    const initial = {}
    chapitres.forEach((c) => {
      const prog = progressions.find((p) => p.kamil === kamil.id && p.chapitre === c.id)
      if (prog) {
        initial[c.id] = { membre: prog.membre, montant: prog.montant_assigne || defaultMontant }
      }
    })
    setAssignForm(initial)
  }

  const handleAssignChange = (chapitreId, field, value) => {
    setAssignForm((prev) => {
      const current = prev[chapitreId] || { membre: null, montant: defaultMontant }
      if (field === 'membre' && !value) {
        const p = { ...prev }
        delete p[chapitreId]
        return p
      }
      return { ...prev, [chapitreId]: { ...current, [field]: value } }
    })
  }

  const applyDefaultMontant = () => {
    setAssignForm((prev) => {
      const updated = { ...prev }
      Object.keys(updated).forEach((chapitreId) => {
        updated[chapitreId] = { ...updated[chapitreId], montant: defaultMontant }
      })
      return updated
    })
  }

  const handleAssignSubmit = async () => {
    if (!openAssign) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const chapitres = (chapitresByKamil[openAssign.id] || []).sort((a, b) => a.numero - b.numero)
      for (const c of chapitres) {
        const assignment = assignForm[c.id]
        if (!assignment || !assignment.membre) continue
        const existing = progressions.find((p) => p.kamil === openAssign.id && p.chapitre === c.id && p.membre === assignment.membre)
        if (existing) {
          // Mettre à jour le montant si changé
          if (existing.montant_assigne !== assignment.montant) {
            await api.patch(`/culturelle/progressions/${existing.id}/`, {
              montant_assigne: assignment.montant || 0,
            })
          }
          continue
        }
        await api.post('/culturelle/progressions/', {
          kamil: openAssign.id,
          chapitre: c.id,
          membre: assignment.membre,
          statut: 'non_lu',
          montant_assigne: assignment.montant || 0,
        })
      }
      setMessage({ type: 'success', text: 'Assignations et montants enregistrés.' })
      setOpenAssign(null)
      loadProgressions()
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Typography>Chargement...</Typography>

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>
        Programme Kamil
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.vertFonce, mb: 3 }}>
        Programmes de lecture (30 juzz), semestriels. {canCreateProgramme && 'En tant qu’admin vous pouvez créer des programmes et assigner chaque juzz à un membre.'}
        {canAssignJuzz && !canCreateProgramme && ' Vous pouvez assigner les juzz aux membres.'}
      </Typography>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {canCreateProgramme && (
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateOpen}
          sx={{ mb: 2, bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
        >
          Créer un programme (30 juzz)
        </Button>
      )}

      <Grid container spacing={2}>
        {kamils.length === 0 ? (
          <Grid item xs={12}><Typography color="text.secondary">Aucun programme Kamil.</Typography></Grid>
        ) : (
          kamils.map((k) => (
            <Grid item xs={12} md={6} key={k.id}>
              <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: COLORS.vert }}>{k.titre}</Typography>
                  <Typography variant="body2" color="text.secondary">{k.description}</Typography>
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    <Chip size="small" label={k.semestre_display || `S${k.semestre}`} sx={{ bgcolor: `${COLORS.or}30` }} />
                    <Chip size="small" label={`${k.annee}`} />
                    <Chip size="small" label={k.statut_display || k.statut} color={k.statut === 'actif' ? 'success' : 'default'} />
                    <Typography variant="caption" color="text.secondary">— {k.nombre_chapitres} chapitres (juzz)</Typography>
                  </Box>
                  {canAssignJuzz && (chapitresByKamil[k.id]?.length === 30) && (
                    <Button
                      size="small"
                      startIcon={<Assignment />}
                      onClick={() => handleAssignOpen(k)}
                      sx={{ mt: 1, color: COLORS.vert }}
                    >
                      Assigner les juzz aux membres
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Dialog Créer programme */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer un programme Kamil (30 juzz)</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Titre" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} multiline rows={2} />
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth label="Semestre" value={form.semestre} onChange={(e) => setForm((f) => ({ ...f, semestre: Number(e.target.value) }))}>
                {SEMESTRES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Année" value={form.annee} onChange={(e) => setForm((f) => ({ ...f, annee: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="Date de début" value={form.date_debut} onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" label="Date de fin" value={form.date_fin} onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateSubmit} disabled={saving} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Créer le programme et les 30 juzz
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Assigner juzz */}
      <Dialog open={Boolean(openAssign)} onClose={() => setOpenAssign(null)} maxWidth="lg" fullWidth>
        <DialogTitle>Assigner chaque juzz à un membre — {openAssign?.titre}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, mt: 1, p: 2, bgcolor: `${COLORS.or}15`, borderRadius: 1 }}>
            <TextField
              size="small"
              type="number"
              label="Montant par défaut (FCFA)"
              value={defaultMontant}
              onChange={(e) => setDefaultMontant(Number(e.target.value))}
              sx={{ width: 180 }}
            />
            <Button size="small" variant="outlined" onClick={applyDefaultMontant} sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
              Appliquer à tous
            </Button>
            <Typography variant="caption" color="text.secondary">
              Ce montant sera appliqué à toutes les assignations existantes
            </Typography>
          </Box>
          <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: `${COLORS.or}15` }}>
                  <TableCell width="25%"><strong>Juzz</strong></TableCell>
                  <TableCell width="45%"><strong>Membre assigné</strong></TableCell>
                  <TableCell width="30%"><strong>Montant à payer (FCFA)</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(chapitresByKamil[openAssign?.id] || []).sort((a, b) => a.numero - b.numero).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.titre || `Chapitre ${c.numero}`}</TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={assignForm[c.id]?.membre || ''}
                        onChange={(e) => handleAssignChange(c.id, 'membre', e.target.value ? Number(e.target.value) : null)}
                      >
                        <MenuItem value="">— Aucun —</MenuItem>
                        {membres.map((m) => (
                          <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        fullWidth
                        value={assignForm[c.id]?.montant || ''}
                        onChange={(e) => handleAssignChange(c.id, 'montant', Number(e.target.value))}
                        disabled={!assignForm[c.id]?.membre}
                        placeholder={assignForm[c.id]?.membre ? String(defaultMontant) : '—'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssign(null)}>Fermer</Button>
          <Button variant="contained" onClick={handleAssignSubmit} disabled={saving} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Enregistrer les assignations
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
