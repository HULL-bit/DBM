import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Button, IconButton, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Chip, Checkbox, Paper, Tooltip,
} from '@mui/material'
import { ArrowBack, Add, Edit, Delete, Groups, Star, Person, Close, ArrowForward } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

function initials(u) {
  if (!u) return '?'
  return `${(u.first_name || '')[0] || ''}${(u.last_name || '')[0] || ''}`.toUpperCase() || '?'
}
function fullName(u) {
  if (!u) return '—'
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || `#${u.id}`
}

function CircularMembersView({ kourel, allUsers }) {
  const SIZE = 320
  const CENTER = SIZE / 2
  const RADIUS_OUTER = 125
  const RADIUS_INNER = 55

  const maitreId = kourel.maitre_de_coeur
  const maitre = allUsers.find(u => u.id === maitreId)

  const memberIds = Array.isArray(kourel.membres) ? kourel.membres : []
  const members = memberIds
    .map(id => allUsers.find(u => u.id === (typeof id === 'object' ? id?.id : id)))
    .filter(Boolean)

  const nonMaitre = members.filter(m => m.id !== maitreId)

  return (
    <Box sx={{ position: 'relative', width: SIZE, height: SIZE, mx: 'auto', userSelect: 'none' }}>
      {/* Outer dashed circle */}
      <Box sx={{
        position: 'absolute', inset: 0,
        border: `2px dashed ${C.or}50`, borderRadius: '50%',
      }} />
      {/* Inner circle */}
      <Box sx={{
        position: 'absolute',
        left: CENTER - RADIUS_INNER, top: CENTER - RADIUS_INNER,
        width: RADIUS_INNER * 2, height: RADIUS_INNER * 2,
        border: `1.5px solid ${C.vert}30`, borderRadius: '50%',
      }} />

      {/* Lines from center to members */}
      <svg style={{ position: 'absolute', inset: 0, width: SIZE, height: SIZE, overflow: 'visible', pointerEvents: 'none' }}>
        {nonMaitre.map((_, i) => {
          const angle = (2 * Math.PI * i) / Math.max(nonMaitre.length, 1) - Math.PI / 2
          const x2 = CENTER + RADIUS_OUTER * Math.cos(angle)
          const y2 = CENTER + RADIUS_OUTER * Math.sin(angle)
          return (
            <line key={i} x1={CENTER} y1={CENTER} x2={x2} y2={y2}
              stroke={`${C.or}40`} strokeWidth={1.5} strokeDasharray="4 4" />
          )
        })}
      </svg>

      {/* Maître — center */}
      <Box sx={{ position: 'absolute', left: CENTER - 36, top: CENTER - 44, zIndex: 3, textAlign: 'center' }}>
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <Avatar sx={{
            width: 72, height: 72, bgcolor: C.or, color: 'white', fontSize: '1.1rem', fontWeight: 700,
            border: `4px solid ${C.vert}`, boxShadow: `0 4px 16px ${C.vert}40`,
          }}>
            {initials(maitre)}
          </Avatar>
          <Star sx={{
            position: 'absolute', top: -8, right: -8, fontSize: 20, color: C.or,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
          }} />
        </Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: C.vert, fontWeight: 700, lineHeight: 1.2, fontSize: '0.7rem', maxWidth: 80 }}>
          {maitre ? fullName(maitre) : '—'}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', color: C.or, fontSize: '0.65rem' }}>Maître</Typography>
      </Box>

      {/* Members around the circle */}
      {nonMaitre.map((m, i) => {
        const angle = (2 * Math.PI * i) / Math.max(nonMaitre.length, 1) - Math.PI / 2
        const x = CENTER + RADIUS_OUTER * Math.cos(angle) - 24
        const y = CENTER + RADIUS_OUTER * Math.sin(angle) - 32
        return (
          <Tooltip key={m.id} title={fullName(m)} placement="top" arrow>
            <Box sx={{ position: 'absolute', left: x, top: y, zIndex: 2, textAlign: 'center', width: 48 }}>
              <Avatar sx={{
                width: 44, height: 44, bgcolor: C.vert, color: 'white', fontSize: '0.75rem', fontWeight: 600,
                border: `2.5px solid white`, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                mx: 'auto',
              }}>
                {initials(m)}
              </Avatar>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: C.vertFonce, fontSize: '0.6rem', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 48 }}>
                {m.first_name || ''}
              </Typography>
            </Box>
          </Tooltip>
        )
      })}

      {nonMaitre.length === 0 && !maitre && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>Aucun membre</Typography>
        </Box>
      )}
    </Box>
  )
}

export default function KourelsPage({ onBack }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const canManage = isAdmin || user?.role === 'jewrin' || user?.role === 'jewrine_conservatoire'
  const [kourels, setKourels] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ nom: '', description: '', membres: [], maitre_de_coeur: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const load = () => Promise.all([
    api.get('/conservatoire/kourels/').then(({ data }) => setKourels(data.results || data)).catch(() => {}),
    api.get('/auth/users/').then(({ data }) => setAllUsers(data.results || data || [])).catch(() => {}),
  ]).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const loadDetail = async (id) => {
    setLoadingDetail(true)
    try {
      const { data } = await api.get(`/conservatoire/kourels/${id}/`)
      setSelected(data)
      setKourels(prev => prev.map(k => k.id === id ? data : k))
    } catch { }
    finally { setLoadingDetail(false) }
  }

  const openAdd = () => {
    setEditId(null); setForm({ nom: '', description: '', membres: [], maitre_de_coeur: '' }); setOpenForm(true)
  }
  const openEdit = async (k) => {
    setEditId(k.id)
    let membres = Array.isArray(k.membres) ? k.membres.map(x => (typeof x === 'object' ? x?.id : x)).filter(Boolean) : []
    if (!membres.length) {
      const { data } = await api.get(`/conservatoire/kourels/${k.id}/`).catch(() => ({ data: k }))
      membres = (data.membres || []).map(x => (typeof x === 'object' ? x?.id : x)).filter(Boolean)
    }
    setForm({ nom: k.nom, description: k.description || '', membres, maitre_de_coeur: k.maitre_de_coeur || '' })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.nom) { setMsg({ type: 'error', text: 'Nom requis.' }); return }
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      const payload = { nom: form.nom, description: form.description, membres: form.membres, maitre_de_coeur: form.maitre_de_coeur || null }
      if (editId) {
        await api.patch(`/conservatoire/kourels/${editId}/`, payload)
        setMsg({ type: 'success', text: 'Kourel modifié.' })
      } else {
        await api.post('/conservatoire/kourels/', payload)
        setMsg({ type: 'success', text: 'Kourel créé.' })
      }
      await load()
      if (selected && editId === selected.id) await loadDetail(editId)
      setOpenForm(false)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMsg({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await api.delete(`/conservatoire/kourels/${deleteTarget}/`)
      setMsg({ type: 'success', text: 'Kourel supprimé.' })
      setKourels(prev => prev.filter(k => k.id !== deleteTarget))
      if (selected?.id === deleteTarget) setSelected(null)
      setDeleteTarget(null)
    } catch { setMsg({ type: 'error', text: 'Erreur.' }) }
    finally { setSaving(false) }
  }

  const toggleMembre = (id) => {
    setForm(f => ({
      ...f,
      membres: f.membres.includes(id) ? f.membres.filter(x => x !== id) : [...f.membres, id],
    }))
  }

  // Resolve member IDs for display
  const resolveMembers = (k) => {
    const ids = Array.isArray(k.membres) ? k.membres.map(x => (typeof x === 'object' ? x?.id : x)).filter(Boolean) : []
    return ids.map(id => allUsers.find(u => u.id === id)).filter(Boolean)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={onBack} sx={{ bgcolor: `${C.vert}12`, '&:hover': { bgcolor: `${C.vert}22` } }}>
          <ArrowBack sx={{ color: C.vert }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ color: C.vert, fontWeight: 700 }}>Kourels</Typography>
          <Typography variant="body2" color="text.secondary">{kourels.length} groupe(s) de chant</Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}
            sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, borderRadius: 2 }}>
            Nouveau Kourel
          </Button>
        )}
      </Box>

      {msg.text && <Alert severity={msg.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMsg({ type: '', text: '' })}>{msg.text}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: C.vert }} /></Box>
      ) : (
        <Grid container spacing={3}>
          {/* Left: Kourel list */}
          <Grid item xs={12} md={selected ? 4 : 12}>
            {kourels.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Groups sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
                <Typography color="text.secondary" variant="h6">Aucun Kourel</Typography>
                {isAdmin && <Typography color="text.secondary" variant="body2">Créez votre premier groupe de chant.</Typography>}
              </Box>
            ) : (
              <Grid container spacing={2}>
                {kourels.map(k => {
                  const members = resolveMembers(k)
                  const maitre = allUsers.find(u => u.id === k.maitre_de_coeur)
                  const isSelected = selected?.id === k.id
                  return (
                    <Grid item xs={12} sm={selected ? 12 : 6} md={selected ? 12 : 4} key={k.id}>
                      <Card
                        onClick={() => { setSelected(null); setTimeout(() => loadDetail(k.id), 50) }}
                        sx={{
                          cursor: 'pointer', borderRadius: 2.5,
                          border: `2px solid ${isSelected ? C.or : 'transparent'}`,
                          boxShadow: isSelected ? `0 0 0 2px ${C.or}40` : 1,
                          transition: 'all 0.2s',
                          '&:hover': { border: `2px solid ${C.or}`, transform: 'translateY(-2px)', boxShadow: 3 },
                        }}
                      >
                        <Box sx={{ height: 4, bgcolor: isSelected ? C.or : `${C.vert}60` }} />
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: C.vert }}>{k.nom}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {isAdmin && (
                                <>
                                  <IconButton size="small" onClick={e => { e.stopPropagation(); openEdit(k) }} sx={{ color: C.vert }}><Edit fontSize="small" /></IconButton>
                                  <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); setDeleteTarget(k.id) }}><Delete fontSize="small" /></IconButton>
                                </>
                              )}
                            </Box>
                          </Box>

                          {/* Maitre */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Star sx={{ fontSize: 14, color: C.or }} />
                            <Typography variant="caption" color="text.secondary">
                              Maître : <strong>{maitre ? fullName(maitre) : '—'}</strong>
                            </Typography>
                          </Box>

                          {/* Member avatars preview */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            {members.slice(0, 6).map(m => (
                              <Tooltip key={m.id} title={fullName(m)} arrow>
                                <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', bgcolor: C.vert, border: '2px solid white' }}>
                                  {initials(m)}
                                </Avatar>
                              </Tooltip>
                            ))}
                            {members.length > 6 && (
                              <Avatar sx={{ width: 28, height: 28, fontSize: '0.6rem', bgcolor: `${C.or}80`, color: C.vertFonce }}>
                                +{members.length - 6}
                              </Avatar>
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                              {k.nb_membres ?? members.length} membre(s)
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                            <Chip label="Voir le cercle" size="small" icon={<ArrowForward sx={{ fontSize: '14px !important' }} />}
                              sx={{ bgcolor: `${C.vert}10`, color: C.vert, fontSize: '0.7rem', cursor: 'pointer' }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            )}
          </Grid>

          {/* Right: Circular detail view */}
          {selected && (
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: 3, border: `2px solid ${C.or}40` }}>
                <Box sx={{ height: 5, background: `linear-gradient(90deg, ${C.vert}, ${C.or})` }} />
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" sx={{ color: C.vert, fontWeight: 700 }}>{selected.nom}</Typography>
                      {selected.description && (
                        <Typography variant="body2" color="text.secondary">{selected.description}</Typography>
                      )}
                    </Box>
                    <IconButton size="small" onClick={() => setSelected(null)}><Close /></IconButton>
                  </Box>

                  {loadingDetail ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: C.vert }} /></Box>
                  ) : (
                    <>
                      {/* Circular view */}
                      <Box sx={{ py: 2 }}>
                        <CircularMembersView kourel={selected} allUsers={allUsers} />
                      </Box>

                      {/* Legend */}
                      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: C.or, fontSize: '0.6rem' }}>M</Avatar>
                          <Typography variant="caption" color="text.secondary">Maître de cœur</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: C.vert, fontSize: '0.6rem' }}>M</Avatar>
                          <Typography variant="caption" color="text.secondary">Membres</Typography>
                        </Box>
                      </Box>

                      {/* Members list */}
                      <Box sx={{ borderTop: `1px solid ${C.or}30`, pt: 2 }}>
                        <Typography variant="subtitle2" sx={{ color: C.vertFonce, mb: 1.5, fontWeight: 600 }}>
                          Liste des membres ({resolveMembers(selected).length})
                        </Typography>
                        <Grid container spacing={1}>
                          {resolveMembers(selected).map(m => (
                            <Grid item xs={6} sm={4} key={m.id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, borderRadius: 1.5, bgcolor: m.id === selected.maitre_de_coeur ? `${C.or}15` : `${C.vert}08` }}>
                                <Avatar sx={{ width: 30, height: 30, bgcolor: m.id === selected.maitre_de_coeur ? C.or : C.vert, fontSize: '0.7rem' }}>
                                  {initials(m)}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="caption" sx={{ fontWeight: m.id === selected.maitre_de_coeur ? 700 : 400, color: C.vertFonce, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {fullName(m)}
                                  </Typography>
                                  {m.id === selected.maitre_de_coeur && (
                                    <Typography variant="caption" sx={{ color: C.or, fontSize: '0.6rem' }}>Maître</Typography>
                                  )}
                                </Box>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Form dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: C.vert }}>{editId ? 'Modifier le Kourel' : 'Nouveau Kourel'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nom du Kourel *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" multiline rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField select fullWidth label="Maître de cœur" value={form.maitre_de_coeur} onChange={e => setForm(f => ({ ...f, maitre_de_coeur: e.target.value ? Number(e.target.value) : '' }))}>
                <MenuItem value="">— Aucun —</MenuItem>
                {allUsers.map(u => <MenuItem key={u.id} value={u.id}>{fullName(u)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: C.vertFonce }}>
                Membres du Kourel ({form.membres.length} sélectionné(s))
              </Typography>
              <Paper variant="outlined" sx={{ maxHeight: 240, overflow: 'auto', borderRadius: 2 }}>
                {allUsers.map(u => (
                  <Box key={u.id} onClick={() => toggleMembre(u.id)} sx={{
                    display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, cursor: 'pointer',
                    bgcolor: form.membres.includes(u.id) ? `${C.vert}10` : 'transparent',
                    '&:hover': { bgcolor: `${C.or}10` },
                    transition: 'background 0.15s',
                  }}>
                    <Checkbox
                      size="small" checked={form.membres.includes(u.id)}
                      sx={{ color: C.vert, '&.Mui-checked': { color: C.vert }, p: 0 }}
                      onChange={() => {}}
                    />
                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', bgcolor: form.membres.includes(u.id) ? C.vert : `${C.vert}40` }}>
                      {initials(u)}
                    </Avatar>
                    <Typography variant="body2">{fullName(u)}</Typography>
                  </Box>
                ))}
              </Paper>
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

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Supprimer ce Kourel ?</DialogTitle>
        <DialogContent><Typography>Cette action supprimera également les séances associées.</Typography></DialogContent>
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
