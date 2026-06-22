import { useState, useEffect } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Collapse, Tooltip,
} from '@mui/material'
import {
  Add, Edit, Delete, ArrowBack, ExpandMore, ExpandLess,
  Schedule, Star, EventNote, CalendarMonth, ArrowForward, PictureAsPdf,
  HourglassEmpty, CheckCircle, Cancel,
} from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029', vertClair: '#3d7a52' }

const TYPE_EVENT = [
  { value: 'magal', label: 'Magal', color: '#C9A961' },
  { value: 'gamou', label: 'Gamou', color: '#6A1B9A' },
  { value: 'ziarra', label: 'Ziarra', color: '#1565C0' },
  { value: 'conference', label: 'Conférence', color: '#2E7D32' },
  { value: 'autre', label: 'Autre', color: '#555' },
]

const STATUTS = [
  { value: 'en_attente', label: 'En attente', color: '#E65100', bgcolor: '#FEF3E7', icon: HourglassEmpty },
  { value: 'valide', label: 'Validé', color: '#2E7D32', bgcolor: '#E8F5E9', icon: CheckCircle },
  { value: 'desiste', label: 'Désisté', color: '#B71C1C', bgcolor: '#FFEBEE', icon: Cancel },
]

function typeInfo(type) { return TYPE_EVENT.find(t => t.value === type) || TYPE_EVENT[4] }
function statutInfo(s) { return STATUTS.find(x => x.value === s) || STATUTS[0] }

function StatutChip({ statut }) {
  const s = statutInfo(statut)
  const Icon = s.icon
  return (
    <Chip
      icon={<Icon sx={{ fontSize: 13 }} />}
      label={s.label}
      size="small"
      sx={{ bgcolor: s.bgcolor, color: s.color, fontWeight: 700, fontSize: '0.68rem', border: 'none' }}
    />
  )
}

// ─── Export PDF d'un événement ────────────────────────────────────────────────
async function exportEventPdf(evenement, journeesData) {
  const [{ default: jsPDF }] = await Promise.all([import('jspdf')])
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = pdf.internal.pageSize.getWidth()
  const PH = pdf.internal.pageSize.getHeight()

  // ── Essaie de charger le logo ──────────────────────────────────────────
  let logoData = null
  try {
    const resp = await fetch('/logo.png')
    if (resp.ok) {
      const blob = await resp.blob()
      logoData = await new Promise(res => {
        const r = new FileReader()
        r.onload = () => res(r.result)
        r.readAsDataURL(blob)
      })
    }
  } catch { /* logo optionnel */ }

  const VERT = [45, 95, 63]
  const OR = [201, 169, 97]
  const VERT_FONCE = [30, 64, 41]
  const GRIS = [100, 100, 100]

  let y = 0

  // ── En-tête coloré ────────────────────────────────────────────────────
  pdf.setFillColor(...VERT_FONCE)
  pdf.rect(0, 0, PW, 38, 'F')
  pdf.setFillColor(...OR)
  pdf.rect(0, 35, PW, 3, 'F')

  if (logoData) {
    try { pdf.addImage(logoData, 'PNG', 8, 5, 24, 24) } catch { /* skip */ }
  }

  pdf.setFontSize(18)
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Daara Barakatul Mahiahidi', logoData ? 38 : 15, 16)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...OR)
  pdf.text('Organisation des Événements', logoData ? 38 : 15, 23)
  pdf.setFontSize(8)
  pdf.setTextColor(200, 220, 200)
  pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, PW - 15, 30, { align: 'right' })

  y = 48

  // ── Titre événement ───────────────────────────────────────────────────
  const ti = typeInfo(evenement.type_evenement)
  pdf.setFillColor(245, 250, 247)
  pdf.setDrawColor(...VERT)
  pdf.roundedRect(12, y - 4, PW - 24, 24, 3, 3, 'FD')
  pdf.setFontSize(16)
  pdf.setTextColor(...VERT_FONCE)
  pdf.setFont('helvetica', 'bold')
  pdf.text(evenement.nom, 18, y + 5)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...GRIS)
  const meta = [ti.label, evenement.annee, evenement.lieu].filter(Boolean).join('  •  ')
  pdf.text(meta, 18, y + 12)
  if (evenement.description) {
    pdf.setFontSize(8)
    pdf.setTextColor(...GRIS)
    const descLines = pdf.splitTextToSize(evenement.description, PW - 36)
    pdf.text(descLines.slice(0, 2), 18, y + 18)
  }

  y += 32

  // ── Journées ──────────────────────────────────────────────────────────
  for (const journee of journeesData) {
    if (y > PH - 50) { pdf.addPage(); y = 20 }

    // En-tête journée
    pdf.setFillColor(...VERT)
    pdf.rect(12, y, PW - 24, 8, 'F')
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255)
    const dateStr = journee.date
      ? new Date(journee.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : ''
    pdf.text(`${journee.nom}${dateStr ? '  —  ' + dateStr : ''}`, 16, y + 5.5)
    y += 12

    if (!journee.kourels_invites || journee.kourels_invites.length === 0) {
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'italic')
      pdf.setTextColor(...GRIS)
      pdf.text('Aucun kourel invité', 18, y + 4)
      y += 12
      continue
    }

    // En-tête du tableau
    const cols = { n: 14, nom: 22, heure: 80, duree: 102, statut: 122, note: 155, fin: PW - 12 }
    pdf.setFillColor(...OR)
    pdf.rect(12, y, PW - 24, 7, 'F')
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255)
    pdf.text('N°', cols.n, y + 5)
    pdf.text('Nom du Kourel', cols.nom, y + 5)
    pdf.text('Heure', cols.heure, y + 5)
    pdf.text('Durée', cols.duree, y + 5)
    pdf.text('Statut', cols.statut, y + 5)
    pdf.text('Note', cols.note, y + 5)
    y += 9

    // Lignes du tableau
    journee.kourels_invites.forEach((ki, idx) => {
      if (y > PH - 40) { pdf.addPage(); y = 20 }
      const rowH = 7
      pdf.setFillColor(idx % 2 === 0 ? 250 : 243, idx % 2 === 0 ? 253 : 248, idx % 2 === 0 ? 251 : 246)
      pdf.rect(12, y, PW - 24, rowH, 'F')
      pdf.setDrawColor(220, 220, 220)
      pdf.line(12, y + rowH, PW - 12, y + rowH)

      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(40, 40, 40)
      pdf.text(String(idx + 1), cols.n, y + 5)

      const nomKourel = ki.nom_kourel || ki.kourel_nom || '—'
      pdf.text(pdf.splitTextToSize(nomKourel, 55)[0], cols.nom, y + 5)
      pdf.text(ki.heure_debut ? ki.heure_debut.slice(0, 5) : '—', cols.heure, y + 5)
      pdf.text(ki.duree ? `${ki.duree} min` : '—', cols.duree, y + 5)

      // Statut coloré
      const si = statutInfo(ki.statut_invitation || 'en_attente')
      if (si.value === 'valide') pdf.setTextColor(46, 125, 50)
      else if (si.value === 'desiste') pdf.setTextColor(183, 28, 28)
      else pdf.setTextColor(230, 81, 0)
      pdf.setFont('helvetica', 'bold')
      pdf.text(si.label, cols.statut, y + 5)

      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(40, 40, 40)
      pdf.text(ki.note ? `${ki.note}/20` : '—', cols.note, y + 5)
      y += rowH
    })

    // Programmes / Appréciations
    const withContent = journee.kourels_invites.filter(ki => ki.programme || ki.appreciation)
    if (withContent.length > 0) {
      y += 4
      if (y > PH - 40) { pdf.addPage(); y = 20 }
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...VERT_FONCE)
      pdf.text('Programmes & Appréciations', 14, y)
      y += 5
      withContent.forEach(ki => {
        if (y > PH - 30) { pdf.addPage(); y = 20 }
        const nom = ki.nom_kourel || ki.kourel_nom || '—'
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(...VERT)
        pdf.text(`• ${nom}`, 16, y)
        y += 4
        if (ki.programme) {
          pdf.setFont('helvetica', 'italic')
          pdf.setTextColor(...GRIS)
          const lines = pdf.splitTextToSize(`Programme : ${ki.programme}`, PW - 36)
          lines.slice(0, 4).forEach(l => {
            if (y > PH - 20) { pdf.addPage(); y = 20 }
            pdf.text(l, 20, y)
            y += 4
          })
        }
        if (ki.appreciation) {
          pdf.setFont('helvetica', 'italic')
          pdf.setTextColor(160, 120, 40)
          const lines = pdf.splitTextToSize(`Appréciation : ${ki.appreciation}`, PW - 36)
          lines.slice(0, 4).forEach(l => {
            if (y > PH - 20) { pdf.addPage(); y = 20 }
            pdf.text(l, 20, y)
            y += 4
          })
        }
      })
    }

    y += 8
  }

  // ── Pied de page sur chaque page ──────────────────────────────────────
  const totalPages = pdf.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p)
    pdf.setFillColor(...VERT_FONCE)
    pdf.rect(0, PH - 10, PW, 10, 'F')
    pdf.setFontSize(7)
    pdf.setTextColor(200, 220, 200)
    pdf.text('Daara Barakatul Mahiahidi  —  Document confidentiel', 15, PH - 4)
    pdf.setTextColor(...OR)
    pdf.text(`Page ${p} / ${totalPages}`, PW - 15, PH - 4, { align: 'right' })
  }

  pdf.save(`evenement_${evenement.nom.replace(/\s+/g, '_')}_${evenement.annee}.pdf`)
}

// ─── Kourels invités pour une journée ────────────────────────────────────────
function KourelsInvitesSection({ journee, isAdmin }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nom_kourel: '', heure_debut: '', duree: 60,
    programme: '', appreciation: '', note: '',
    statut_invitation: 'en_attente',
  })

  const loadList = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/organisation/kourels-invites/?journee=${journee.id}`)
      setList(data.results || data)
    } catch { setList([]) } finally { setLoading(false) }
  }

  useEffect(() => { loadList() }, [journee.id])

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({ nom_kourel: '', heure_debut: '', duree: 60, programme: '', appreciation: '', note: '', statut_invitation: 'en_attente' })
    setOpenForm(true)
  }

  const handleOpenEdit = (item) => {
    setEditingId(item.id)
    setForm({
      nom_kourel: item.nom_kourel || item.kourel_nom || '',
      heure_debut: item.heure_debut || '',
      duree: item.duree || 60,
      programme: item.programme || '',
      appreciation: item.appreciation || '',
      note: item.note || '',
      statut_invitation: item.statut_invitation || 'en_attente',
    })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.nom_kourel.trim()) return
    setSaving(true)
    try {
      const payload = {
        journee: journee.id,
        nom_kourel: form.nom_kourel.trim(),
        kourel: null,
        heure_debut: form.heure_debut || null,
        duree: Number(form.duree),
        programme: form.programme,
        appreciation: form.appreciation,
        note: form.note !== '' ? Number(form.note) : null,
        statut_invitation: form.statut_invitation,
      }
      if (editingId) {
        await api.patch(`/organisation/kourels-invites/${editingId}/`, payload)
      } else {
        await api.post('/organisation/kourels-invites/', payload)
      }
      await loadList()
      setOpenForm(false)
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    await api.delete(`/organisation/kourels-invites/${id}/`)
    await loadList()
  }

  const handleStatutChange = async (id, statut) => {
    await api.patch(`/organisation/kourels-invites/${id}/`, { statut_invitation: statut })
    await loadList()
  }

  const setF = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }))

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="subtitle2" sx={{ color: C.vertFonce, fontWeight: 700 }}>
          Kourels invités ({list.length})
        </Typography>
        {isAdmin && (
          <Button size="small" startIcon={<Add />} onClick={handleOpenAdd}
            variant="outlined" sx={{ color: C.vert, borderColor: `${C.vert}50`, borderRadius: 2 }}>
            Ajouter un kourel
          </Button>
        )}
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} sx={{ color: C.vert }} /></Box>
      ) : list.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 2 }}>
          Aucun kourel invité pour cette journée
        </Typography>
      ) : (
        <Box display="flex" flexDirection="column" gap={1.5}>
          {list.map((item, idx) => (
            <Card key={item.id} sx={{ borderRadius: 2, border: `1px solid ${C.or}25`, bgcolor: '#FDFAF5' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box display="flex" alignItems="center" gap={1.5} flex={1}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: C.or, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography sx={{ color: C.vertFonce, fontWeight: 800, fontSize: '0.8rem' }}>{idx + 1}</Typography>
                    </Box>
                    <Box flex={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.vert }}>{item.nom_kourel || item.kourel_nom}</Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.75} mt={0.5}>
                        <StatutChip statut={item.statut_invitation || 'en_attente'} />
                        {item.heure_debut && (
                          <Chip icon={<Schedule sx={{ fontSize: 12 }} />} label={item.heure_debut.slice(0, 5)} size="small" sx={{ bgcolor: `${C.vert}12`, color: C.vert, fontWeight: 600, fontSize: '0.68rem' }} />
                        )}
                        <Chip label={`${item.duree} min`} size="small" sx={{ bgcolor: '#F3E5F5', color: '#6A1B9A', fontWeight: 600, fontSize: '0.68rem' }} />
                        {item.note && (
                          <Chip icon={<Star sx={{ fontSize: 12 }} />} label={`${item.note}/20`} size="small" sx={{ bgcolor: `${C.or}20`, color: '#8B6914', fontWeight: 700, fontSize: '0.68rem' }} />
                        )}
                      </Box>
                    </Box>
                  </Box>
                  <Box display="flex" gap={0.5} ml={1} flexDirection="column" alignItems="flex-end">
                    {isAdmin && (
                      <Box display="flex" gap={0.5}>
                        <IconButton size="small" onClick={() => handleOpenEdit(item)} sx={{ color: C.vert }}><Edit sx={{ fontSize: 15 }} /></IconButton>
                        <IconButton size="small" onClick={() => handleDelete(item.id)} sx={{ color: 'error.main' }}><Delete sx={{ fontSize: 15 }} /></IconButton>
                      </Box>
                    )}
                    {/* Quick statut change */}
                    {isAdmin && (
                      <Box display="flex" gap={0.5} mt={0.5}>
                        {STATUTS.map(s => (
                          <Tooltip key={s.value} title={s.label} arrow>
                            <Box
                              onClick={() => handleStatutChange(item.id, s.value)}
                              sx={{
                                width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
                                bgcolor: (item.statut_invitation || 'en_attente') === s.value ? s.color : `${s.color}40`,
                                border: `1px solid ${s.color}`,
                                transition: 'all 0.15s',
                              }}
                            />
                          </Tooltip>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
                {item.programme && (
                  <Box mt={1.5} p={1.5} sx={{ bgcolor: '#F0F7F2', borderRadius: 1.5, borderLeft: `3px solid ${C.vert}` }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: C.vert, display: 'block', mb: 0.25 }}>Programme</Typography>
                    <Typography variant="caption" color="text.secondary">{item.programme}</Typography>
                  </Box>
                )}
                {item.appreciation && (
                  <Box mt={1} p={1.5} sx={{ bgcolor: '#FFF8EC', borderRadius: 1.5, borderLeft: `3px solid ${C.or}` }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#8B6914', display: 'block', mb: 0.25 }}>Appréciation</Typography>
                    <Typography variant="caption" color="text.secondary">{item.appreciation}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Form */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: C.vertFonce, fontWeight: 700 }}>
          {editingId ? 'Modifier le kourel invité' : 'Ajouter un kourel invité'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nom du kourel *" value={form.nom_kourel} onChange={setF('nom_kourel')}
                placeholder="Ex: Kourel Xusukël Yëggël, DBM Kourel Touba…"
                helperText="Saisissez le nom du kourel (interne ou externe à la daara)" />
            </Grid>
            <Grid item xs={12}>
              <TextField select fullWidth label="Statut de l'invitation" value={form.statut_invitation} onChange={setF('statut_invitation')}>
                {STATUTS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="time" label="Heure de début" value={form.heure_debut} onChange={setF('heure_debut')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Durée (min)" value={form.duree} onChange={setF('duree')} inputProps={{ min: 1 }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Note /20" value={form.note} onChange={setF('note')} inputProps={{ min: 0, max: 20, step: 0.5 }} placeholder="Ex: 17.5" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Programme de prestation" value={form.programme} onChange={setF('programme')} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Appréciation conservatoire" value={form.appreciation} onChange={setF('appreciation')} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setOpenForm(false)} sx={{ color: '#666' }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.nom_kourel.trim()}
            sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, fontWeight: 700 }}>
            {saving ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : (editingId ? 'Enregistrer' : 'Ajouter')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Journées d'un événement ──────────────────────────────────────────────────
function JourneesSection({ evenement, isAdmin }) {
  const [journees, setJournees] = useState([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [form, setForm] = useState({ nom: '', date: '', ordre: 0, notes: '' })

  const loadJournees = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/organisation/journees/?evenement=${evenement.id}`)
      const list = data.results || data
      setJournees(list)
      if (list.length > 0 && !expandedId) setExpandedId(list[0].id)
    } catch { setJournees([]) } finally { setLoading(false) }
  }

  useEffect(() => { loadJournees() }, [evenement.id])

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({ nom: '', date: '', ordre: journees.length, notes: '' })
    setOpenForm(true)
  }

  const handleOpenEdit = (j) => {
    setEditingId(j.id)
    setForm({ nom: j.nom, date: j.date || '', ordre: j.ordre, notes: j.notes || '' })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.nom) return
    setSaving(true)
    try {
      const payload = { ...form, evenement: evenement.id, ordre: Number(form.ordre), date: form.date || null }
      if (editingId) {
        await api.patch(`/organisation/journees/${editingId}/`, payload)
      } else {
        await api.post('/organisation/journees/', payload)
      }
      await loadJournees()
      setOpenForm(false)
    } catch { } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    await api.delete(`/organisation/journees/${id}/`)
    await loadJournees()
  }

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      // Charger toutes les journées avec leurs kourels
      const journeesWithKourels = await Promise.all(
        journees.map(async j => {
          const { data } = await api.get(`/organisation/kourels-invites/?journee=${j.id}`)
          return { ...j, kourels_invites: data.results || data }
        })
      )
      await exportEventPdf(evenement, journeesWithKourels)
    } catch (e) { console.error(e) } finally { setExportingPdf(false) }
  }

  const setF = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }))

  if (loading) return <Box display="flex" justifyContent="center" py={3}><CircularProgress size={28} sx={{ color: C.vert }} /></Box>

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h6" sx={{ color: C.vertFonce, fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}>
          Journées ({journees.length})
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            startIcon={exportingPdf ? <CircularProgress size={15} sx={{ color: C.vert }} /> : <PictureAsPdf />}
            onClick={handleExportPdf}
            disabled={exportingPdf || journees.length === 0}
            variant="outlined" size="small"
            sx={{ borderColor: `${C.vert}50`, color: C.vert, borderRadius: 2, fontWeight: 600 }}
          >
            {exportingPdf ? 'Export…' : 'Exporter PDF'}
          </Button>
          {isAdmin && (
            <Button startIcon={<Add />} variant="outlined" onClick={handleOpenAdd}
              sx={{ borderColor: `${C.vert}50`, color: C.vert, borderRadius: 2, fontWeight: 600 }}>
              Ajouter une journée
            </Button>
          )}
        </Box>
      </Box>

      {journees.length === 0 ? (
        <Box textAlign="center" py={4} sx={{ bgcolor: `${C.vert}05`, borderRadius: 2, border: `1px dashed ${C.vert}30` }}>
          <CalendarMonth sx={{ fontSize: 40, color: '#CCC', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">Aucune journée pour cet événement</Typography>
          {isAdmin && <Button size="small" startIcon={<Add />} onClick={handleOpenAdd} sx={{ mt: 1.5, color: C.vert }}>Ajouter la première journée</Button>}
        </Box>
      ) : (
        journees.map((j, idx) => (
          <Card key={j.id} sx={{ mb: 2, borderRadius: 2.5, border: `1px solid ${C.or}25`, overflow: 'hidden' }}>
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5,
                bgcolor: expandedId === j.id ? `${C.vert}0D` : '#fff',
                cursor: 'pointer', '&:hover': { bgcolor: `${C.or}08` },
                borderBottom: expandedId === j.id ? `1px solid ${C.or}25` : 'none',
              }}
              onClick={() => setExpandedId(expandedId === j.id ? null : j.id)}
            >
              <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: C.or, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Typography sx={{ color: C.vertFonce, fontWeight: 800, fontSize: '0.85rem' }}>{idx + 1}</Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: C.vert }}>{j.nom}</Typography>
                {j.date && (
                  <Typography variant="caption" color="text.secondary">
                    {new Date(j.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </Typography>
                )}
              </Box>
              {isAdmin && (
                <Box display="flex" gap={0.5} onClick={e => e.stopPropagation()}>
                  <IconButton size="small" onClick={() => handleOpenEdit(j)} sx={{ color: C.vert }}><Edit sx={{ fontSize: 16 }} /></IconButton>
                  <IconButton size="small" onClick={() => handleDelete(j.id)} sx={{ color: 'error.main' }}><Delete sx={{ fontSize: 16 }} /></IconButton>
                </Box>
              )}
              {expandedId === j.id ? <ExpandLess sx={{ color: '#999' }} /> : <ExpandMore sx={{ color: '#999' }} />}
            </Box>

            <Collapse in={expandedId === j.id}>
              <Box sx={{ p: 2.5 }}>
                {j.notes && <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>{j.notes}</Typography>}
                <KourelsInvitesSection journee={j} isAdmin={isAdmin} />
              </Box>
            </Collapse>
          </Card>
        ))
      )}

      {/* Form */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: C.vertFonce, fontWeight: 700 }}>{editingId ? 'Modifier la journée' : 'Ajouter une journée'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Nom *" value={form.nom} onChange={setF('nom')} placeholder="Ex: 17 Safar" /></Grid>
            <Grid item xs={6}><TextField fullWidth type="date" label="Date" value={form.date} onChange={setF('date')} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField fullWidth type="number" label="Ordre" value={form.ordre} onChange={setF('ordre')} inputProps={{ min: 0 }} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Notes" value={form.notes} onChange={setF('notes')} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setOpenForm(false)} sx={{ color: '#666' }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.nom}
            sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, fontWeight: 700 }}>
            {saving ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : (editingId ? 'Enregistrer' : 'Ajouter')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function EvenementsOrganisation({ onBack }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role?.startsWith('jewrine_')
  const [evenements, setEvenements] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [openForm, setOpenForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openDelete, setOpenDelete] = useState(null)
  const [form, setForm] = useState({ nom: '', type_evenement: 'autre', annee: new Date().getFullYear(), lieu: '', description: '', notes: '' })

  const loadEvenements = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/organisation/evenements/')
      setEvenements(data.results || data)
    } catch { setEvenements([]) } finally { setLoading(false) }
  }

  useEffect(() => { loadEvenements() }, [])

  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({ nom: '', type_evenement: 'autre', annee: new Date().getFullYear(), lieu: '', description: '', notes: '' })
    setOpenForm(true)
  }

  const handleOpenEdit = (ev) => {
    setEditingId(ev.id)
    setForm({ nom: ev.nom, type_evenement: ev.type_evenement, annee: ev.annee, lieu: ev.lieu || '', description: ev.description || '', notes: ev.notes || '' })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.nom) { setMessage({ type: 'error', text: 'Le nom est requis.' }); return }
    setSaving(true)
    try {
      const payload = { ...form, annee: Number(form.annee) }
      if (editingId) {
        await api.patch(`/organisation/evenements/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Événement modifié.' })
      } else {
        await api.post('/organisation/evenements/', payload)
        setMessage({ type: 'success', text: 'Événement créé.' })
      }
      await loadEvenements()
      setOpenForm(false)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!openDelete) return
    setSaving(true)
    try {
      await api.delete(`/organisation/evenements/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Événement supprimé.' })
      if (selectedEvent?.id === openDelete.id) setSelectedEvent(null)
      await loadEvenements()
      setOpenDelete(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally { setSaving(false) }
  }

  const setF = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }))

  // Vue détail d'un événement
  if (selectedEvent) {
    const ti = typeInfo(selectedEvent.type_evenement)
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={1.5} mb={3} flexWrap="wrap">
          <IconButton onClick={() => setSelectedEvent(null)} sx={{ color: C.vert }}><ArrowBack /></IconButton>
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
              <Chip label={ti.label} size="small" sx={{ bgcolor: `${ti.color}20`, color: ti.color, fontWeight: 700 }} />
              <Typography variant="h5" sx={{ color: C.vert, fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}>
                {selectedEvent.nom}
              </Typography>
              <Chip label={selectedEvent.annee} size="small" sx={{ bgcolor: `${C.vert}15`, color: C.vert, fontWeight: 600 }} />
            </Box>
            {selectedEvent.lieu && <Typography variant="body2" color="text.secondary" mt={0.25}>{selectedEvent.lieu}</Typography>}
          </Box>
          {isAdmin && (
            <Box display="flex" gap={1}>
              <Button size="small" startIcon={<Edit />} variant="outlined" onClick={() => handleOpenEdit(selectedEvent)}
                sx={{ borderColor: `${C.vert}50`, color: C.vert, borderRadius: 2 }}>Modifier</Button>
              <Button size="small" startIcon={<Delete />} color="error" variant="outlined" onClick={() => setOpenDelete(selectedEvent)}
                sx={{ borderRadius: 2 }}>Supprimer</Button>
            </Box>
          )}
        </Box>
        {selectedEvent.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontStyle: 'italic' }}>{selectedEvent.description}</Typography>
        )}
        <JourneesSection evenement={selectedEvent} isAdmin={isAdmin} />
      </Box>
    )
  }

  // Liste des événements
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          {onBack && <IconButton onClick={onBack} sx={{ color: C.vert }}><ArrowBack /></IconButton>}
          <Box>
            <Typography variant="h5" sx={{ color: C.vert, fontWeight: 700, fontFamily: '"Cormorant Garamond", serif' }}>
              Organisation des Événements
            </Typography>
            <Typography variant="body2" color="text.secondary">Magal, Gamou, Ziarra — journées et kourels invités</Typography>
          </Box>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}
            sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, fontWeight: 700 }}>
            Nouvel événement
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress sx={{ color: C.vert }} /></Box>
      ) : evenements.length === 0 ? (
        <Box textAlign="center" py={8} sx={{ bgcolor: `${C.vert}04`, borderRadius: 3, border: `1px dashed ${C.vert}30` }}>
          <EventNote sx={{ fontSize: 60, color: '#CCC', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>Aucun événement organisé</Typography>
          {isAdmin && <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, mt: 1 }}>Créer le premier événement</Button>}
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {evenements.map(ev => {
            const ti = typeInfo(ev.type_evenement)
            return (
              <Grid item xs={12} sm={6} md={4} key={ev.id}>
                <Card sx={{
                  borderRadius: 2.5, height: '100%', cursor: 'pointer',
                  border: `1px solid ${ti.color}25`,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 28px ${ti.color}30` },
                }} onClick={() => setSelectedEvent(ev)}>
                  <Box sx={{ height: 5, background: `linear-gradient(90deg, ${ti.color} 0%, ${ti.color}80 100%)`, borderRadius: '8px 8px 0 0' }} />
                  <CardContent sx={{ p: 2.5 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Chip label={ti.label} size="small" sx={{ bgcolor: `${ti.color}20`, color: ti.color, fontWeight: 700, fontSize: '0.7rem' }} />
                      <Chip label={ev.annee} size="small" sx={{ bgcolor: `${C.vert}12`, color: C.vert, fontWeight: 600, fontSize: '0.7rem' }} />
                    </Box>
                    <Typography variant="h6" sx={{ color: C.vert, fontWeight: 700, fontFamily: '"Cormorant Garamond", serif', mb: 0.5 }}>
                      {ev.nom}
                    </Typography>
                    {ev.lieu && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{ev.lieu}</Typography>}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={1.5}>
                      <Chip icon={<CalendarMonth sx={{ fontSize: 12 }} />} label={`${ev.nb_journees} journée${ev.nb_journees > 1 ? 's' : ''}`} size="small" sx={{ bgcolor: `${C.vert}10`, color: C.vertFonce, fontWeight: 600, fontSize: '0.68rem' }} />
                      <Box display="flex" gap={0.5} onClick={e => e.stopPropagation()}>
                        {isAdmin && (
                          <>
                            <IconButton size="small" onClick={() => handleOpenEdit(ev)} sx={{ color: C.vert }}><Edit sx={{ fontSize: 16 }} /></IconButton>
                            <IconButton size="small" onClick={() => setOpenDelete(ev)} sx={{ color: 'error.main' }}><Delete sx={{ fontSize: 16 }} /></IconButton>
                          </>
                        )}
                        <IconButton size="small" onClick={() => setSelectedEvent(ev)} sx={{ color: C.vert }}><ArrowForward sx={{ fontSize: 16 }} /></IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Form dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: `${C.vert}08`, borderBottom: `1px solid ${C.vert}1A`, fontWeight: 700, color: C.vertFonce }}>
          {editingId ? "Modifier l'événement" : 'Nouvel événement'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Nom *" value={form.nom} onChange={setF('nom')} placeholder="Ex: Magal de Touba 2025" /></Grid>
            <Grid item xs={6}>
              <TextField select fullWidth label="Type" value={form.type_evenement} onChange={setF('type_evenement')}>
                {TYPE_EVENT.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth type="number" label="Année" value={form.annee} onChange={setF('annee')} inputProps={{ min: 2020, max: 2100 }} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Lieu" value={form.lieu} onChange={setF('lieu')} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Description" value={form.description} onChange={setF('description')} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Notes" value={form.notes} onChange={setF('notes')} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenForm(false)} sx={{ color: '#666' }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2, fontWeight: 700, px: 3 }}>
            {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : (editingId ? 'Enregistrer' : 'Créer')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)} maxWidth="xs">
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>Supprimer cet événement ?</DialogTitle>
        <DialogContent>
          {openDelete && <Typography>Supprimer <strong>{openDelete.nom}</strong> ? Toutes les journées et kourels invités seront supprimés.</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setOpenDelete(null)} sx={{ color: '#666' }}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving} sx={{ borderRadius: 2, fontWeight: 700 }}>
            {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
