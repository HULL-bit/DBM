import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Button, IconButton, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Chip, Checkbox, Paper, Tooltip,
} from '@mui/material'
import { ArrowBack, Add, Edit, Delete, Groups, Star, Person, Close, ArrowForward, KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

const ROLE_COLORS = {
  maitre: C.or,
  responsable: C.vert,
  suivi: '#00695C',
  jewrine: '#6A1B9A',
}

function initials(u) {
  if (!u) return '?'
  return `${(u.first_name || '')[0] || ''}${(u.last_name || '')[0] || ''}`.toUpperCase() || '?'
}
function initialsFromName(nom) {
  if (!nom) return '?'
  const parts = nom.trim().split(' ')
  if (parts.length === 1) return (parts[0][0] || '?').toUpperCase()
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase() || '?'
}
function fullName(u) {
  if (!u) return '—'
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || `#${u.id}`
}

// Encadrement chip shown in CircularMembersView
function EncadrementChip({ nom, label, color }) {
  if (!nom) return null
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, minWidth: 64 }}>
      <Avatar sx={{ width: 40, height: 40, bgcolor: color, color: 'white', fontSize: '0.75rem', fontWeight: 700, border: `2px solid white`, boxShadow: `0 2px 8px ${color}50` }}>
        {initialsFromName(nom)}
      </Avatar>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.62rem', lineHeight: 1.2, textAlign: 'center', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ color: C.vertFonce, fontSize: '0.65rem', lineHeight: 1.2, textAlign: 'center', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {nom}
      </Typography>
    </Box>
  )
}

function CircularMembersView({ kourel, allUsers }) {
  const SIZE = 320
  const CENTER = SIZE / 2
  const RADIUS = 130

  const maitreId = kourel.maitre_de_coeur

  const memberIds = Array.isArray(kourel.membres) ? kourel.membres : []
  // ALL members on the circle, in their array order (which determines position)
  const members = memberIds
    .map(id => allUsers.find(u => u.id === (typeof id === 'object' ? id?.id : id)))
    .filter(Boolean)

  const N = Math.max(members.length, 1)

  const encadrementRoles = [
    { nom: kourel.responsable_nom, label: 'Responsable', color: ROLE_COLORS.responsable },
    { nom: kourel.maitre_de_coeur_2_nom, label: 'Maître 2 / Suivi', color: ROLE_COLORS.suivi },
    { nom: kourel.jewrine_nom, label: 'Jewrine', color: ROLE_COLORS.jewrine },
  ].filter(r => !!r.nom)

  return (
    <Box>
      {/* Circle */}
      <Box sx={{ position: 'relative', width: SIZE, height: SIZE, mx: 'auto', userSelect: 'none' }}>
        {/* Outer circle */}
        <Box sx={{ position: 'absolute', inset: 0, border: `2px dashed ${C.or}50`, borderRadius: '50%' }} />

        {/* Kourel name at center */}
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <Typography sx={{ color: `${C.vert}60`, fontSize: '0.7rem', fontWeight: 700, textAlign: 'center', maxWidth: 80, lineHeight: 1.2, fontFamily: '"Cormorant Garamond", serif' }}>
            {kourel.nom}
          </Typography>
        </Box>

        {/* Lines from center to each member */}
        <svg style={{ position: 'absolute', inset: 0, width: SIZE, height: SIZE, overflow: 'visible', pointerEvents: 'none' }}>
          {members.map((_, i) => {
            const angle = (2 * Math.PI * i) / N - Math.PI / 2
            const x2 = CENTER + RADIUS * Math.cos(angle)
            const y2 = CENTER + RADIUS * Math.sin(angle)
            return (
              <line key={i} x1={CENTER} y1={CENTER} x2={x2} y2={y2}
                stroke={`${C.or}35`} strokeWidth={1.5} strokeDasharray="4 4" />
            )
          })}
        </svg>

        {/* All members on circle */}
        {members.map((m, i) => {
          const isMaitre = m.id === maitreId
          const angle = (2 * Math.PI * i) / N - Math.PI / 2
          const x = CENTER + RADIUS * Math.cos(angle) - (isMaitre ? 26 : 22)
          const y = CENTER + RADIUS * Math.sin(angle) - (isMaitre ? 34 : 30)
          return (
            <Tooltip key={m.id} title={`${fullName(m)}${isMaitre ? ' — Maître de cœur' : ''}`} placement="top" arrow>
              <Box sx={{ position: 'absolute', left: x, top: y, zIndex: 2, textAlign: 'center', width: isMaitre ? 52 : 44 }}>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar sx={{
                    width: isMaitre ? 48 : 40, height: isMaitre ? 48 : 40,
                    bgcolor: isMaitre ? C.or : `${C.vert}CC`,
                    color: isMaitre ? C.vertFonce : '#fff',
                    fontSize: isMaitre ? '0.85rem' : '0.72rem', fontWeight: 700,
                    border: isMaitre ? `3px solid ${C.or}` : '2px solid #fff',
                    boxShadow: isMaitre ? `0 3px 14px ${C.or}55` : '0 2px 6px rgba(0,0,0,0.12)',
                    mx: 'auto',
                  }}>
                    {initials(m)}
                  </Avatar>
                  {isMaitre && (
                    <Star sx={{
                      position: 'absolute', top: -5, right: -3, fontSize: 14,
                      color: C.or, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
                    }} />
                  )}
                </Box>
                {isMaitre && (
                  <Typography sx={{ display: 'block', mt: 0.25, color: C.or, fontSize: '0.58rem', lineHeight: 1, fontWeight: 700 }}>
                    Maître
                  </Typography>
                )}
                <Typography sx={{ display: 'block', mt: isMaitre ? 0 : 0.25, color: C.vertFonce, fontSize: '0.6rem', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMaitre ? 52 : 44, fontWeight: isMaitre ? 600 : 400 }}>
                  {m.first_name || ''}
                </Typography>
              </Box>
            </Tooltip>
          )
        })}

        {members.length === 0 && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">Aucun membre</Typography>
          </Box>
        )}
      </Box>

      {/* Encadrement row */}
      {encadrementRoles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5, mb: 1.5, textTransform: 'uppercase', fontSize: '0.65rem' }}>
            Encadrement
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {encadrementRoles.map((r, i) => (
              <EncadrementChip key={i} nom={r.nom} label={r.label} color={r.color} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}

function KourelCard({ k, isSelected, allUsers, isAdmin, onSelect, onEdit, onDelete }) {
  const members = (() => {
    const ids = Array.isArray(k.membres) ? k.membres.map(x => (typeof x === 'object' ? x?.id : x)).filter(Boolean) : []
    return ids.map(id => allUsers.find(u => u.id === id)).filter(Boolean)
  })()
  const maitre = allUsers.find(u => u.id === k.maitre_de_coeur)

  // Small badges for encadrement
  const encadrementBadges = [
    { nom: k.responsable_nom, color: ROLE_COLORS.responsable, label: 'Resp.' },
    { nom: k.maitre_de_coeur_2_nom, color: ROLE_COLORS.suivi, label: 'Suivi' },
    { nom: k.jewrine_nom, color: ROLE_COLORS.jewrine, label: 'Jew.' },
  ].filter(b => !!b.nom)

  return (
    <Card
      onClick={onSelect}
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
                <IconButton size="small" onClick={e => { e.stopPropagation(); onEdit() }} sx={{ color: C.vert }}><Edit fontSize="small" /></IconButton>
                <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); onDelete() }}><Delete fontSize="small" /></IconButton>
              </>
            )}
          </Box>
        </Box>

        {/* Maitre */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Star sx={{ fontSize: 14, color: C.or }} />
          <Typography variant="caption" color="text.secondary">
            Maître : <strong>{maitre ? fullName(maitre) : (k.maitre_de_coeur_nom || '—')}</strong>
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

        {/* Encadrement badges */}
        {encadrementBadges.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
            {encadrementBadges.map((b, i) => (
              <Chip
                key={i}
                label={`${b.label} ${b.nom}`}
                size="small"
                sx={{
                  bgcolor: `${b.color}18`,
                  color: b.color,
                  fontSize: '0.6rem',
                  height: 20,
                  fontWeight: 600,
                  border: `1px solid ${b.color}40`,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
          <Chip label="Voir le cercle" size="small" icon={<ArrowForward sx={{ fontSize: '14px !important' }} />}
            sx={{ bgcolor: `${C.vert}10`, color: C.vert, fontSize: '0.7rem', cursor: 'pointer' }} />
        </Box>
      </CardContent>
    </Card>
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
  const [form, setForm] = useState({
    nom: '', description: '', membres: [],
    maitre_de_coeur: '', responsable: '', maitre_de_coeur_2: '', jewrine: '',
  })
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
    setEditId(null)
    setForm({ nom: '', description: '', membres: [], maitre_de_coeur: '', responsable: '', maitre_de_coeur_2: '', jewrine: '' })
    setOpenForm(true)
  }

  const openEdit = async (k) => {
    setEditId(k.id)
    let membres = Array.isArray(k.membres) ? k.membres.map(x => (typeof x === 'object' ? x?.id : x)).filter(Boolean) : []
    let fullData = k
    if (!membres.length) {
      const { data } = await api.get(`/conservatoire/kourels/${k.id}/`).catch(() => ({ data: k }))
      fullData = data
      membres = (data.membres || []).map(x => (typeof x === 'object' ? x?.id : x)).filter(Boolean)
    }
    setForm({
      nom: fullData.nom,
      description: fullData.description || '',
      membres,
      maitre_de_coeur: fullData.maitre_de_coeur || '',
      responsable: fullData.responsable || '',
      maitre_de_coeur_2: fullData.maitre_de_coeur_2 || '',
      jewrine: fullData.jewrine || '',
    })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.nom) { setMsg({ type: 'error', text: 'Nom requis.' }); return }
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      const payload = {
        nom: form.nom,
        description: form.description,
        membres: form.membres,
        maitre_de_coeur: form.maitre_de_coeur || null,
        responsable: form.responsable || null,
        maitre_de_coeur_2: form.maitre_de_coeur_2 || null,
        jewrine: form.jewrine || null,
      }
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
                {kourels.map(k => (
                  <Grid item xs={12} sm={selected ? 12 : 6} md={selected ? 12 : 4} key={k.id}>
                    <KourelCard
                      k={k}
                      isSelected={selected?.id === k.id}
                      allUsers={allUsers}
                      isAdmin={isAdmin}
                      onSelect={() => { setSelected(null); setTimeout(() => loadDetail(k.id), 50) }}
                      onEdit={() => openEdit(k)}
                      onDelete={() => setDeleteTarget(k.id)}
                    />
                  </Grid>
                ))}
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
                      {/* Circular view + Encadrement row */}
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
              <TextField select fullWidth label="Responsable" value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value ? Number(e.target.value) : '' }))}>
                <MenuItem value="">— Aucun —</MenuItem>
                {allUsers.map(u => <MenuItem key={u.id} value={u.id}>{fullName(u)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField select fullWidth label="Maître 2 / Suivi" value={form.maitre_de_coeur_2} onChange={e => setForm(f => ({ ...f, maitre_de_coeur_2: e.target.value ? Number(e.target.value) : '' }))}>
                <MenuItem value="">— Aucun —</MenuItem>
                {allUsers.map(u => <MenuItem key={u.id} value={u.id}>{fullName(u)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField select fullWidth label="Jewrine" value={form.jewrine} onChange={e => setForm(f => ({ ...f, jewrine: e.target.value ? Number(e.target.value) : '' }))}>
                <MenuItem value="">— Aucun —</MenuItem>
                {allUsers.map(u => <MenuItem key={u.id} value={u.id}>{fullName(u)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: C.vertFonce }}>
                Membres du Kourel ({form.membres.length} sélectionné(s))
              </Typography>
              <Paper variant="outlined" sx={{ maxHeight: 220, overflow: 'auto', borderRadius: 2 }}>
                {allUsers.map(u => (
                  <Box key={u.id} onClick={() => toggleMembre(u.id)} sx={{
                    display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, cursor: 'pointer',
                    bgcolor: form.membres.includes(u.id) ? `${C.vert}10` : 'transparent',
                    '&:hover': { bgcolor: `${C.or}10` }, transition: 'background 0.15s',
                  }}>
                    <Checkbox size="small" checked={form.membres.includes(u.id)} sx={{ color: C.vert, '&.Mui-checked': { color: C.vert }, p: 0 }} onChange={() => {}} />
                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', bgcolor: form.membres.includes(u.id) ? C.vert : `${C.vert}40` }}>{initials(u)}</Avatar>
                    <Typography variant="body2">{fullName(u)}</Typography>
                    {u.id === form.maitre_de_coeur && <Chip label="Maître" size="small" sx={{ ml: 'auto', bgcolor: `${C.or}25`, color: C.or, fontWeight: 700, fontSize: '0.65rem' }} />}
                  </Box>
                ))}
              </Paper>
            </Grid>
            {form.membres.length > 1 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: C.vertFonce }}>
                  Ordre sur le cercle
                  <Typography component="span" variant="caption" sx={{ ml: 1, color: '#999' }}>— position 1 = haut du cercle</Typography>
                </Typography>
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  {form.membres.map((membId, idx) => {
                    const u = allUsers.find(x => x.id === membId)
                    if (!u) return null
                    const isMaitre = u.id === form.maitre_de_coeur
                    return (
                      <Box key={membId} sx={{
                        display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75,
                        bgcolor: idx % 2 === 0 ? '#fff' : `${C.vert}04`,
                        borderBottom: '1px solid #F0F0F0',
                      }}>
                        <Typography variant="caption" sx={{ width: 22, color: '#999', fontWeight: 700, textAlign: 'center' }}>{idx + 1}</Typography>
                        <Avatar sx={{ width: 26, height: 26, fontSize: '0.6rem', bgcolor: isMaitre ? C.or : `${C.vert}80` }}>{initials(u)}</Avatar>
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: isMaitre ? 700 : 400 }}>{fullName(u)}</Typography>
                        {isMaitre && <Star sx={{ fontSize: 14, color: C.or }} />}
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <IconButton size="small" disabled={idx === 0} onClick={() => {
                            setForm(f => {
                              const arr = [...f.membres]
                              ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
                              return { ...f, membres: arr }
                            })
                          }} sx={{ p: 0.25, color: C.vert }}>
                            <KeyboardArrowUp sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton size="small" disabled={idx === form.membres.length - 1} onClick={() => {
                            setForm(f => {
                              const arr = [...f.membres]
                              ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
                              return { ...f, membres: arr }
                            })
                          }} sx={{ p: 0.25, color: C.vert }}>
                            <KeyboardArrowDown sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    )
                  })}
                </Paper>
              </Grid>
            )}
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
