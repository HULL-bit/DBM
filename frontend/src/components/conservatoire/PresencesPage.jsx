import React, { useState, useEffect, useMemo } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Button, IconButton,
  TextField, MenuItem, Alert, CircularProgress, Chip, LinearProgress,
  Avatar, Paper, InputAdornment, Tabs, Tab,
} from '@mui/material'
import { ArrowBack, GetApp, Person, Event, Search, FilterList, CheckCircle, Cancel, Schedule } from '@mui/icons-material'
import api from '../../services/api'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

function StatCard({ label, value, color, icon }) {
  return (
    <Card sx={{ borderRadius: 2.5, borderTop: `4px solid ${color}` }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {React.cloneElement(icon, { sx: { color, fontSize: 22 } })}
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color, lineHeight: 1 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

function PresenceBadge({ pct }) {
  const color = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error'
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography variant="caption" color="text.secondary">Présence</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: `${color}.main` }}>{pct}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 6, borderRadius: 3 }} />
    </Box>
  )
}

export default function PresencesPage({ onBack }) {
  const [seances, setSeances] = useState([])
  const [statsMembres, setStatsMembres] = useState([])
  const [kourels, setKourels] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState('')
  const [filterKourel, setFilterKourel] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDateDebut, setFilterDateDebut] = useState('')
  const [filterDateFin, setFilterDateFin] = useState('')
  const [expandedSeance, setExpandedSeance] = useState(null)
  const [openExport, setOpenExport] = useState(false)
  const [exportFmt, setExportFmt] = useState('excel')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/conservatoire/seances/').then(({ data }) => setSeances(data.results || data)).catch(() => {}),
      api.get('/conservatoire/presences/stats_membres/').then(({ data }) => setStatsMembres(Array.isArray(data) ? data : data?.results || [])).catch(() => {}),
      api.get('/conservatoire/kourels/').then(({ data }) => setKourels(data.results || data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const enrichedStats = useMemo(() => {
    const byId = {}
    statsMembres.forEach(m => {
      byId[m.membre_id] = { ...m, rep_presents: 0, rep_total: 0, prest_presents: 0, prest_total: 0 }
    })
    seances.forEach(s => {
      const type = s.type_seance
      ;(s.presences || []).forEach(p => {
        if (!byId[p.membre]) byId[p.membre] = { membre_id: p.membre, membre_nom: p.membre_nom || `#${p.membre}`, nb_presents: 0, nb_absents: 0, nb_total: 0, pourcentage: 0, rep_presents: 0, rep_total: 0, prest_presents: 0, prest_total: 0 }
        const e = byId[p.membre]
        const present = p.statut === 'present'
        const absent = p.statut === 'absent_non_justifie' || p.statut === 'absent_justifie'
        if (present) e.nb_presents += 1
        if (absent) e.nb_absents += 1
        if (present || absent) e.nb_total += 1
        if (type === 'repetition') { if (present) e.rep_presents += 1; if (present || absent) e.rep_total += 1 }
        else if (type === 'prestation') { if (present) e.prest_presents += 1; if (present || absent) e.prest_total += 1 }
      })
    })
    return Object.values(byId).map(m => ({
      ...m,
      pourcentage: m.nb_total > 0 ? Math.round(m.nb_presents / m.nb_total * 100) : (m.pourcentage || 0),
      rep_pct: m.rep_total > 0 ? Math.round(m.rep_presents / m.rep_total * 100) : 0,
      prest_pct: m.prest_total > 0 ? Math.round(m.prest_presents / m.prest_total * 100) : 0,
    })).sort((a, b) => b.pourcentage - a.pourcentage)
  }, [statsMembres, seances])

  const filteredSeances = useMemo(() => seances.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.titre?.toLowerCase().includes(q) || s.kourel_nom?.toLowerCase().includes(q) || (s.presences || []).some(p => p.membre_nom?.toLowerCase().includes(q))
    const matchKourel = !filterKourel || s.kourel === Number(filterKourel)
    const matchType = !filterType || s.type_seance === filterType
    const matchDebut = !filterDateDebut || (s.date_heure && s.date_heure.slice(0, 10) >= filterDateDebut)
    const matchFin = !filterDateFin || (s.date_heure && s.date_heure.slice(0, 10) <= filterDateFin)
    return matchSearch && matchKourel && matchType && matchDebut && matchFin
  }).sort((a, b) => new Date(b.date_heure) - new Date(a.date_heure)), [seances, search, filterKourel, filterType, filterDateDebut, filterDateFin])

  const filteredStats = useMemo(() => {
    const q = search.toLowerCase()
    return enrichedStats.filter(m => !q || m.membre_nom?.toLowerCase().includes(q))
  }, [enrichedStats, search])

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data } = await api.get('/conservatoire/seances/rapport-export/', { params: { format: exportFmt }, responseType: 'blob' })
      const ext = exportFmt === 'pdf' ? 'pdf' : exportFmt === 'csv' ? 'csv' : 'xlsx'
      const url = window.URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a'); a.href = url; a.download = `rapport_presences.${ext}`; a.click()
      window.URL.revokeObjectURL(url)
      setMsg({ type: 'success', text: 'Rapport exporté.' }); setOpenExport(false)
    } catch { setMsg({ type: 'error', text: 'Erreur export.' }) }
    finally { setExporting(false) }
  }

  const totalPresents = seances.reduce((acc, s) => acc + (s.presences || []).filter(p => p.statut === 'present').length, 0)
  const totalAbsents = seances.reduce((acc, s) => acc + (s.presences || []).filter(p => p.statut !== 'present').length, 0)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={onBack} sx={{ bgcolor: `${C.vert}12`, '&:hover': { bgcolor: `${C.vert}22` } }}>
          <ArrowBack sx={{ color: C.vert }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ color: C.vert, fontWeight: 700 }}>Présences</Typography>
          <Typography variant="body2" color="text.secondary">Suivi des présences et statistiques</Typography>
        </Box>
        <Button variant="contained" startIcon={<GetApp />} onClick={() => setOpenExport(true)}
          sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2 }}>
          Exporter rapport
        </Button>
      </Box>

      {msg.text && <Alert severity={msg.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMsg({ type: '', text: '' })}>{msg.text}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: C.vert }} /></Box>
      ) : (
        <>
          {/* Stats overview */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <StatCard label="Séances" value={seances.length} color={C.vert} icon={<Event />} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard label="Membres suivis" value={enrichedStats.length} color="#1565C0" icon={<Person />} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard label="Présences totales" value={totalPresents} color="#2E7D32" icon={<CheckCircle />} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard label="Absences totales" value={totalAbsents} color="#C62828" icon={<Cancel />} />
            </Grid>
          </Grid>

          {/* Tabs */}
          <Paper sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${C.or}30` }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: `1px solid ${C.or}30`, px: 2 }}>
              <Tab label="Par séance" icon={<Event />} iconPosition="start" />
              <Tab label="Par membre" icon={<Person />} iconPosition="start" />
            </Tabs>

            {/* Filters */}
            <Box sx={{ p: 2, bgcolor: `${C.or}08`, borderBottom: `1px solid ${C.or}20` }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField size="small" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: C.vert }} /></InputAdornment> }}
                  sx={{ minWidth: 220 }} />
                {tab === 0 && (
                  <>
                    <TextField select size="small" label="Kourel" value={filterKourel} onChange={e => setFilterKourel(e.target.value)} sx={{ minWidth: 160 }}>
                      <MenuItem value="">Tous</MenuItem>
                      {kourels.map(k => <MenuItem key={k.id} value={k.id}>{k.nom}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Type" value={filterType} onChange={e => setFilterType(e.target.value)} sx={{ minWidth: 140 }}>
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="repetition">Répétitions</MenuItem>
                      <MenuItem value="prestation">Prestations</MenuItem>
                    </TextField>
                    <TextField size="small" type="date" label="Du" value={filterDateDebut} onChange={e => setFilterDateDebut(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
                    <TextField size="small" type="date" label="Au" value={filterDateFin} onChange={e => setFilterDateFin(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
                  </>
                )}
                {(search || filterKourel || filterType || filterDateDebut || filterDateFin) && (
                  <Button size="small" onClick={() => { setSearch(''); setFilterKourel(''); setFilterType(''); setFilterDateDebut(''); setFilterDateFin('') }}
                    sx={{ color: C.vert }}>Réinitialiser</Button>
                )}
              </Box>
            </Box>

            <Box sx={{ p: 2 }}>
              {tab === 0 ? (
                /* Par séance */
                filteredSeances.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    {seances.length === 0 ? 'Aucune séance.' : 'Aucun résultat.'}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {filteredSeances.map(s => {
                      const presences = s.presences || []
                      const nbP = presences.filter(p => p.statut === 'present').length
                      const nbA = presences.filter(p => p.statut !== 'present').length
                      const pct = presences.length > 0 ? Math.round(nbP / presences.length * 100) : null
                      const isExpanded = expandedSeance === s.id
                      return (
                        <Card key={s.id} sx={{ borderRadius: 2, border: `1px solid ${C.or}25` }}>
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box
                              sx={{ display: 'flex', gap: 2, alignItems: 'center', cursor: presences.length > 0 ? 'pointer' : 'default', flexWrap: 'wrap' }}
                              onClick={() => presences.length > 0 && setExpandedSeance(isExpanded ? null : s.id)}
                            >
                              <Box sx={{ flex: 1, minWidth: 200 }}>
                                <Box sx={{ display: 'flex', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                  <Chip label={s.type_seance === 'prestation' ? 'Prestation' : 'Répétition'} size="small"
                                    sx={{ bgcolor: s.type_seance === 'prestation' ? '#F3E5F5' : '#E3F2FD', color: s.type_seance === 'prestation' ? '#6A1B9A' : '#1565C0', fontSize: '0.65rem' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {s.date_heure ? new Date(s.date_heure).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) : '—'}
                                  </Typography>
                                </Box>
                                <Typography variant="subtitle2" sx={{ color: C.vert, fontWeight: 600 }}>{s.titre}</Typography>
                                <Typography variant="caption" color="text.secondary">{s.kourel_nom || '—'}</Typography>
                              </Box>

                              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexShrink: 0 }}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} />
                                  <Typography variant="caption" display="block" sx={{ fontWeight: 700, color: 'success.main' }}>{nbP}</Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Cancel sx={{ fontSize: 18, color: 'error.main' }} />
                                  <Typography variant="caption" display="block" sx={{ fontWeight: 700, color: 'error.main' }}>{nbA}</Typography>
                                </Box>
                                {pct !== null && (
                                  <Box sx={{ minWidth: 80 }}>
                                    <LinearProgress variant="determinate" value={pct} color={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error'} sx={{ height: 8, borderRadius: 4 }} />
                                    <Typography variant="caption" display="block" sx={{ textAlign: 'right', fontWeight: 700, color: `${pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error'}.main` }}>
                                      {pct}%
                                    </Typography>
                                  </Box>
                                )}
                                {presences.length === 0 && (
                                  <Typography variant="caption" color="text.secondary">Non renseigné</Typography>
                                )}
                              </Box>
                            </Box>

                            {isExpanded && (
                              <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${C.or}30` }}>
                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                      <CheckCircle sx={{ fontSize: 14 }} /> Présents ({nbP})
                                    </Typography>
                                    {presences.filter(p => p.statut === 'present').map(p => (
                                      <Box key={p.id || p.membre} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.25 }}>
                                        <Avatar sx={{ width: 22, height: 22, fontSize: '0.6rem', bgcolor: C.vert }}>{(p.membre_nom || '?')[0]}</Avatar>
                                        <Typography variant="caption">{p.membre_nom || `#${p.membre}`}</Typography>
                                      </Box>
                                    ))}
                                    {nbP === 0 && <Typography variant="caption" color="text.secondary">—</Typography>}
                                  </Grid>
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                      <Cancel sx={{ fontSize: 14 }} /> Absents ({nbA})
                                    </Typography>
                                    {presences.filter(p => p.statut !== 'present').map(p => (
                                      <Box key={p.id || p.membre} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.25 }}>
                                        <Avatar sx={{ width: 22, height: 22, fontSize: '0.6rem', bgcolor: p.statut === 'absent_justifie' ? '#EF6C00' : '#C62828' }}>{(p.membre_nom || '?')[0]}</Avatar>
                                        <Box>
                                          <Typography variant="caption">{p.membre_nom || `#${p.membre}`}</Typography>
                                          <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                                            {p.statut === 'absent_justifie' ? 'Justifié' : 'Non justifié'}{p.remarque ? ` — ${p.remarque}` : ''}
                                          </Typography>
                                        </Box>
                                      </Box>
                                    ))}
                                    {nbA === 0 && <Typography variant="caption" color="text.secondary">—</Typography>}
                                  </Grid>
                                </Grid>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </Box>
                )
              ) : (
                /* Par membre */
                filteredStats.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Aucune donnée.</Typography>
                ) : (
                  <Grid container spacing={2}>
                    {filteredStats.map(m => (
                      <Grid item xs={12} sm={6} md={4} key={m.membre_id}>
                        <Card sx={{ borderRadius: 2, border: `1px solid ${C.or}25`, height: '100%' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                              <Avatar sx={{ width: 40, height: 40, bgcolor: m.pourcentage >= 80 ? C.vert : m.pourcentage >= 50 ? '#EF6C00' : '#C62828', fontWeight: 700 }}>
                                {(m.membre_nom || '?')[0].toUpperCase()}
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.vertFonce, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {m.membre_nom || `#${m.membre_id}`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">{m.nb_total} séance(s)</Typography>
                              </Box>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box>
                                <PresenceBadge pct={m.pourcentage} />
                                <Typography variant="caption" color="text.secondary">
                                  Global : {m.nb_presents} présent(s) / {m.nb_absents} absent(s)
                                </Typography>
                              </Box>

                              {m.rep_total > 0 && (
                                <Box sx={{ pl: 1, borderLeft: `3px solid #1565C0` }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">Répétitions</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#1565C0' }}>{m.rep_pct}%</Typography>
                                  </Box>
                                  <LinearProgress variant="determinate" value={m.rep_pct} sx={{ height: 4, borderRadius: 2, bgcolor: '#E3F2FD', '& .MuiLinearProgress-bar': { bgcolor: '#1565C0' } }} />
                                </Box>
                              )}
                              {m.prest_total > 0 && (
                                <Box sx={{ pl: 1, borderLeft: `3px solid #6A1B9A` }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">Prestations</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#6A1B9A' }}>{m.prest_pct}%</Typography>
                                  </Box>
                                  <LinearProgress variant="determinate" value={m.prest_pct} sx={{ height: 4, borderRadius: 2, bgcolor: '#F3E5F5', '& .MuiLinearProgress-bar': { bgcolor: '#6A1B9A' } }} />
                                </Box>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )
              )}
            </Box>
          </Paper>
        </>
      )}

      {/* Export dialog */}
      {openExport && (
        <Box sx={{
          position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', zIndex: 1300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setOpenExport(false)}>
          <Card sx={{ width: 380, borderRadius: 3, p: 3 }} onClick={e => e.stopPropagation()}>
            <Typography variant="h6" sx={{ color: C.vert, mb: 0.5 }}>Exporter le rapport</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Inclut séances, présences, khassidas et statistiques.
            </Typography>
            <TextField select fullWidth label="Format" value={exportFmt} onChange={e => setExportFmt(e.target.value)} sx={{ mb: 2 }}>
              <MenuItem value="excel">Excel (.xlsx)</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
            </TextField>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => setOpenExport(false)}>Annuler</Button>
              <Button variant="contained" onClick={handleExport} disabled={exporting} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
                {exporting ? <CircularProgress size={20} /> : 'Télécharger'}
              </Button>
            </Box>
          </Card>
        </Box>
      )}
    </Box>
  )
}
