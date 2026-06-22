import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Chip, Divider, Paper,
} from '@mui/material'
import {
  ArrowBack, Add, Edit, Delete, Event, HowToReg, GetApp, AccessTime,
  LocationOn, MusicNote, Group, ExpandMore, ExpandLess,
} from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

const TYPE_CHIP = {
  repetition: { label: 'Répétition', color: '#1565C0', bg: '#E3F2FD' },
  prestation: { label: 'Prestation', color: '#6A1B9A', bg: '#F3E5F5' },
}

function SeanceCard({ s, kourels, isAdmin, onEdit, onDelete, onPresences }) {
  const [expanded, setExpanded] = useState(false)
  const type = TYPE_CHIP[s.type_seance] || { label: s.type_seance, color: C.vert, bg: `${C.vert}15` }
  const presences = s.presences || []
  const nbPresents = presences.filter(p => p.statut === 'present').length
  const nbAbsents = presences.filter(p => p.statut !== 'present').length

  return (
    <Card sx={{ borderRadius: 2.5, border: `1px solid ${C.or}30`, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}>
      <Box sx={{ height: 4, bgcolor: type.color }} />
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip label={type.label} size="small" sx={{ bgcolor: type.bg, color: type.color, fontWeight: 600, fontSize: '0.7rem' }} />
              {presences.length > 0 && (
                <>
                  <Chip label={`${nbPresents} présents`} size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                  {nbAbsents > 0 && <Chip label={`${nbAbsents} absents`} size="small" color="error" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
                </>
              )}
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: C.vert }}>{s.titre}</Typography>
          </Box>
          {isAdmin && (
            <Box sx={{ display: 'flex', gap: 0.25, ml: 1 }}>
              <IconButton size="small" onClick={() => onEdit(s)} sx={{ color: C.vert }}><Edit fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => onDelete(s.id)}><Delete fontSize="small" /></IconButton>
            </Box>
          )}
        </Box>

        <Grid container spacing={1} sx={{ mb: 1.5 }}>
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

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {isAdmin && (
            <Button size="small" variant="outlined" startIcon={<HowToReg />} onClick={() => onPresences(s)}
              sx={{ borderColor: C.vert, color: C.vert, borderRadius: 1.5, fontSize: '0.75rem' }}>
              Présences
            </Button>
          )}
          {presences.length > 0 && (
            <Button size="small" variant="text" onClick={() => setExpanded(!expanded)}
              endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
              sx={{ color: C.vertFonce, fontSize: '0.75rem' }}>
              Détail présences
            </Button>
          )}
        </Box>

        {expanded && presences.length > 0 && (
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: `${C.or}10`, borderRadius: 1.5 }}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main', display: 'block', mb: 0.5 }}>
                  Présents ({nbPresents})
                </Typography>
                {presences.filter(p => p.statut === 'present').map(p => (
                  <Typography key={p.id || p.membre} variant="caption" display="block" color="text.secondary">
                    • {p.membre_nom || `#${p.membre}`}
                  </Typography>
                ))}
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main', display: 'block', mb: 0.5 }}>
                  Absents ({nbAbsents})
                </Typography>
                {presences.filter(p => p.statut !== 'present').map(p => (
                  <Typography key={p.id || p.membre} variant="caption" display="block" color="text.secondary">
                    • {p.membre_nom || `#${p.membre}`} ({p.statut_display || p.statut})
                  </Typography>
                ))}
              </Grid>
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default function SeancesPage({ onBack }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [seances, setSeances] = useState([])
  const [kourels, setKourels] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterKourel, setFilterKourel] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({
    kourel: '', type_seance: 'repetition', titre: '', description: '',
    date_heure: '', heure_fin: '', lieu: '', khassidas: [],
  })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [openPresences, setOpenPresences] = useState(null)
  const [presencesForm, setPresencesForm] = useState({})
  const [savingPresences, setSavingPresences] = useState(false)
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
    if (!form.kourel || !form.titre || !form.date_heure) { setMsg({ type: 'error', text: 'Kourel, titre et date requis.' }); return }
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      const payload = { kourel: form.kourel, type_seance: form.type_seance, titre: form.titre, description: form.description || '', date_heure: form.date_heure, heure_fin: form.heure_fin || null, lieu: form.lieu || '' }
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

  const filtered = seances.filter(s =>
    (!filterType || s.type_seance === filterType) &&
    (!filterKourel || s.kourel === Number(filterKourel))
  ).sort((a, b) => new Date(b.date_heure) - new Date(a.date_heure))

  const getUserName = (id) => {
    const u = allUsers.find(u => u.id === Number(id))
    return u ? `${u.first_name} ${u.last_name}`.trim() : `Membre #${id}`
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
          {isAdmin && (
            <Button variant="outlined" startIcon={<GetApp />} onClick={() => setOpenExport(true)}
              sx={{ borderColor: C.vert, color: C.vert, borderRadius: 2 }}>
              Exporter
            </Button>
          )}
          {isAdmin && (
            <Button variant="contained" startIcon={<Add />} onClick={openAdd} disabled={kourels.length === 0}
              sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2 }}>
              Nouvelle séance
            </Button>
          )}
        </Box>
      </Box>

      {msg.text && <Alert severity={msg.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMsg({ type: '', text: '' })}>{msg.text}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField select size="small" label="Type" value={filterType} onChange={e => setFilterType(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">Tous types</MenuItem>
          <MenuItem value="repetition">Répétitions</MenuItem>
          <MenuItem value="prestation">Prestations</MenuItem>
        </TextField>
        <TextField select size="small" label="Kourel" value={filterKourel} onChange={e => setFilterKourel(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">Tous les kourels</MenuItem>
          {kourels.map(k => <MenuItem key={k.id} value={k.id}>{k.nom}</MenuItem>)}
        </TextField>
        {(filterType || filterKourel) && (
          <Button size="small" onClick={() => { setFilterType(''); setFilterKourel('') }} sx={{ color: C.vert }}>
            Réinitialiser
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: C.vert }} /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Event sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="h6">{seances.length === 0 ? 'Aucune séance' : 'Aucun résultat'}</Typography>
          {isAdmin && kourels.length === 0 && <Typography color="text.secondary" variant="body2">Créez d'abord un Kourel.</Typography>}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(s => (
            <Grid item xs={12} md={6} key={s.id}>
              <SeanceCard s={s} kourels={kourels} isAdmin={isAdmin} onEdit={openEdit} onDelete={setDeleteTarget} onPresences={handleOpenPresences} />
            </Grid>
          ))}
        </Grid>
      )}

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
              <TextField fullWidth label="Titre *" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
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
          {Object.keys(presencesForm).length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>Aucun membre dans ce Kourel.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              {Object.entries(presencesForm).map(([membreId, v]) => (
                <Box key={membreId} sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 1.5, bgcolor: v.statut === 'present' ? '#E8F5E9' : v.statut === 'absent_justifie' ? '#FFF3E0' : '#FFEBEE', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ minWidth: 140, fontWeight: 500 }}>{getUserName(membreId)}</Typography>
                  <TextField select size="small" value={v.statut} onChange={e => setPresencesForm(p => ({ ...p, [membreId]: { ...p[membreId], statut: e.target.value } }))} sx={{ minWidth: 190 }}>
                    <MenuItem value="present">Présent</MenuItem>
                    <MenuItem value="absent_justifie">Absent justifié</MenuItem>
                    <MenuItem value="absent_non_justifie">Absent non justifié</MenuItem>
                  </TextField>
                  {v.statut !== 'present' && (
                    <TextField size="small" placeholder="Justification..." value={v.remarque} onChange={e => setPresencesForm(p => ({ ...p, [membreId]: { ...p[membreId], remarque: e.target.value } }))} sx={{ flex: 1 }} />
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPresences(null)}>Fermer</Button>
          <Button variant="contained" onClick={handleSavePresences} disabled={savingPresences || Object.keys(presencesForm).length === 0} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            {savingPresences ? <CircularProgress size={20} /> : 'Enregistrer les présences'}
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
