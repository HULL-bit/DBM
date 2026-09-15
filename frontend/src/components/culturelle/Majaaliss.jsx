import { useState, useEffect, useRef } from 'react'
import {
  Box, Typography, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Chip, Paper, Autocomplete, Divider,
} from '@mui/material'
import { Add, CheckCircle, RestartAlt, Mic, Stop, Delete, MenuBook, Visibility, PictureAsPdf, Download, Close } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { getMediaUrl } from '../../services/media'
import usePagination from '../../hooks/usePagination'
import TablePaginationFr from '../ui/TablePaginationFr'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }
const TERE_COURANTS = ['KUN KAATIMAN', 'TAZA WUDU SIXAAR', 'JAWXARATUN NAFIIS', 'NAXJU']

export default function Majaaliss() {
  const { user, peut } = useAuth()
  const canManage = user?.role === 'admin' || user?.role === 'jewrin' || user?.role === 'jewrine_culturelle' || peut('culturelle', 'gerer')
  const [list, setList] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [statutFilter, setStatutFilter] = useState('')

  const [openAssign, setOpenAssign] = useState(false)
  const [assignForm, setAssignForm] = useState({ membres: [], nom_tere: '', fichier_pdf: null })
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState(null)
  const [bindForm, setBindForm] = useState({ page: '', notes: '', audio: null })
  const [savingBind, setSavingBind] = useState(false)
  const [enregistrement, setEnregistrement] = useState(false)
  const [savingPdf, setSavingPdf] = useState(false)
  const [pdfViewer, setPdfViewer] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const loadList = () => {
    setLoading(true)
    api.get('/culturelle/assignations-tere/', { params: { page_size: 500 } })
      .then(({ data }) => setList(data.results || data))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadList() }, [])
  useEffect(() => {
    if (canManage) api.get('/auth/users/').then(({ data }) => setUsers(data.results || data)).catch(() => setUsers([]))
  }, [canManage])

  const filtered = list.filter((a) => !statutFilter || a.statut === statutFilter)
  const { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate } = usePagination(filtered.length)

  const handleOpenAssign = () => {
    setAssignForm({ membres: [], nom_tere: '', fichier_pdf: null })
    setMessage({ type: '', text: '' })
    setOpenAssign(true)
  }

  const handleAssign = async () => {
    if (assignForm.membres.length === 0 || !assignForm.nom_tere.trim()) {
      setMessage({ type: 'error', text: 'Sélectionnez au moins un membre et un TERE.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = new FormData()
      payload.append('membres', JSON.stringify(assignForm.membres))
      payload.append('nom_tere', assignForm.nom_tere.trim().toUpperCase())
      if (assignForm.fichier_pdf) payload.append('fichier_pdf', assignForm.fichier_pdf)
      const { data } = await api.post('/culturelle/assignations-tere/assigner-multiple/', payload)
      let text = `${data.created_count} assignation(s) créée(s).`
      if (data.skipped_count > 0) text += ` ${data.skipped_count} ignorée(s) (déjà en cours sur ce TERE).`
      setMessage({ type: 'success', text })
      setOpenAssign(false)
      loadList()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur lors de l\'assignation.' })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenDetail = (a) => {
    setDetail(a)
    setBindForm({ page: '', notes: '', audio: null })
  }

  const updateDetailAndList = (data) => {
    setList((prev) => prev.map((x) => (x.id === data.id ? data : x)))
    setDetail((d) => (d && d.id === data.id ? data : d))
  }

  const handleTerminer = async (a) => {
    setSaving(true)
    try {
      const { data } = await api.post(`/culturelle/assignations-tere/${a.id}/terminer/`)
      setMessage({ type: 'success', text: 'TERE marqué terminé.' })
      updateDetailAndList(data)
    } catch {
      setMessage({ type: 'error', text: 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  const handleReprendre = async (a) => {
    setSaving(true)
    try {
      const { data } = await api.post(`/culturelle/assignations-tere/${a.id}/reprendre/`)
      setMessage({ type: 'success', text: 'TERE réouvert.' })
      updateDetailAndList(data)
    } catch {
      setMessage({ type: 'error', text: 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePdf = async (file) => {
    if (!file || !detail) return
    setSavingPdf(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = new FormData()
      payload.append('fichier_pdf', file)
      const { data } = await api.patch(`/culturelle/assignations-tere/${detail.id}/`, payload)
      setMessage({ type: 'success', text: 'PDF du TERE mis à jour.' })
      updateDetailAndList(data)
    } catch {
      setMessage({ type: 'error', text: "Erreur lors de l'envoi du PDF." })
    } finally {
      setSavingPdf(false)
    }
  }

  const demarrerEnregistrement = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `bind_${Date.now()}.webm`, { type: 'audio/webm' })
        setBindForm((f) => ({ ...f, audio: file }))
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setEnregistrement(true)
    } catch {
      setMessage({ type: 'error', text: "Impossible d'accéder au microphone." })
    }
  }
  const arreterEnregistrement = () => {
    mediaRecorderRef.current?.stop()
    setEnregistrement(false)
  }

  const handleAddBind = async () => {
    if (!bindForm.audio) {
      setMessage({ type: 'error', text: 'Le vocal (transcription) est requis pour créer un BIND.' })
      return
    }
    setSavingBind(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = new FormData()
      payload.append('assignation', detail.id)
      if (bindForm.page) payload.append('page', bindForm.page)
      payload.append('notes', bindForm.notes || '')
      payload.append('audio', bindForm.audio)
      const { data } = await api.post('/culturelle/binds/', payload)
      setMessage({ type: 'success', text: `BIND ${data.numero} créé.` })
      const updatedDetail = { ...detail, binds: [...(detail.binds || []), data], nb_binds: (detail.nb_binds || 0) + 1 }
      setDetail(updatedDetail)
      setList((prev) => prev.map((x) => (x.id === detail.id ? updatedDetail : x)))
      setBindForm({ page: '', notes: '', audio: null })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur lors de la création du BIND.' })
    } finally {
      setSavingBind(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: C.vert, fontWeight: 600, fontSize: { xs: '1.5rem', sm: '2.125rem' } }} gutterBottom>Majaaliss</Typography>
          <Typography variant="body2" sx={{ color: C.vertFonce }}>
            {canManage ? 'Assignation des TERE et suivi des BIND par membre' : 'Mes TERE et BIND'}
          </Typography>
        </Box>
        {canManage && (
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenAssign} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            Assigner un TERE
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField select size="small" label="Statut" value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">Tous</MenuItem>
          <MenuItem value="en_cours">En cours</MenuItem>
          <MenuItem value="termine">Terminé</MenuItem>
        </TextField>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <MenuBook sx={{ fontSize: 56, color: 'action.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="h6">Aucun TERE assigné</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${C.or}30` }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, color: C.vertFonce, bgcolor: `${C.vert}08`, whiteSpace: 'nowrap' } }}>
                {canManage && <TableCell>Membre</TableCell>}
                <TableCell>TERE</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="center">BINDs</TableCell>
                <TableCell>Assigné le</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginate(filtered).map((a) => (
                <TableRow key={a.id} hover onClick={() => handleOpenDetail(a)} sx={{ cursor: 'pointer' }}>
                  {canManage && <TableCell sx={{ fontWeight: 600, color: C.vert }}>{a.membre_nom || `#${a.membre}`}</TableCell>}
                  <TableCell>{a.nom_tere}</TableCell>
                  <TableCell>
                    <Chip label={a.statut_display} size="small" color={a.statut === 'termine' ? 'success' : 'warning'} variant={a.statut === 'termine' ? 'filled' : 'outlined'} />
                  </TableCell>
                  <TableCell align="center">{a.nb_binds ?? (a.binds || []).length}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{a.date_assignation ? new Date(a.date_assignation).toLocaleDateString('fr-FR') : '—'}</TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={() => handleOpenDetail(a)} sx={{ color: C.vertFonce }}><Visibility fontSize="small" /></IconButton>
                    {canManage && (
                      a.statut === 'en_cours' ? (
                        <IconButton size="small" onClick={() => handleTerminer(a)} sx={{ color: 'success.main' }} title="Marquer terminé">
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      ) : (
                        <IconButton size="small" onClick={() => handleReprendre(a)} sx={{ color: C.or }} title="Reprendre (rouvrir)">
                          <RestartAlt fontSize="small" />
                        </IconButton>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
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

      {/* Assigner un TERE */}
      <Dialog open={openAssign} onClose={() => setOpenAssign(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: C.vert }}>Assigner un TERE</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Autocomplete
              multiple
              options={users}
              value={users.filter((u) => assignForm.membres.includes(u.id))}
              onChange={(e, vals) => setAssignForm((f) => ({ ...f, membres: vals.map((v) => v.id) }))}
              getOptionLabel={(u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || ''}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => <TextField {...params} label="Membre(s)" placeholder="Rechercher..." />}
            />
            <Autocomplete
              freeSolo
              options={TERE_COURANTS}
              value={assignForm.nom_tere}
              onInputChange={(e, value) => setAssignForm((f) => ({ ...f, nom_tere: value }))}
              renderInput={(params) => (
                <TextField {...params} label="TERE (livre)" helperText="Choisissez un TERE courant ou tapez-en un autre." />
              )}
            />
            <Button component="label" variant="outlined" startIcon={<PictureAsPdf />} sx={{ borderColor: C.vert, color: C.vert, alignSelf: 'flex-start' }}>
              {assignForm.fichier_pdf ? assignForm.fichier_pdf.name : 'Joindre le PDF du livre (optionnel)'}
              <input type="file" hidden accept="application/pdf" onChange={(e) => setAssignForm((f) => ({ ...f, fichier_pdf: e.target.files?.[0] || null }))} />
            </Button>
            <Typography variant="caption" color="text.secondary">
              Un seul PDF pour tout le TERE (le livre) — pas besoin d'en joindre un par BIND.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssign(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleAssign} disabled={saving} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            {saving ? <CircularProgress size={20} /> : 'Assigner'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Détail assignation + BINDs */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        {detail && (
          <>
            <DialogTitle sx={{ color: C.vert }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {detail.nom_tere}
                <Chip label={detail.statut_display} size="small" color={detail.statut === 'termine' ? 'success' : 'warning'} />
              </Box>
              {canManage && (
                <Typography variant="caption" display="block" color="text.secondary">{detail.membre_nom}</Typography>
              )}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                {detail.fichier_pdf ? (
                  <>
                    <Button startIcon={<PictureAsPdf />} onClick={() => setPdfViewer(detail)} sx={{ color: C.vert }}>
                      Lire le livre
                    </Button>
                    <Button
                      startIcon={<Download />}
                      href={getMediaUrl(detail.fichier_pdf)}
                      download={`${detail.nom_tere}.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: C.vertFonce }}
                    >
                      Télécharger
                    </Button>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary">Aucun PDF du livre pour ce TERE.</Typography>
                )}
                {canManage && (
                  <Button size="small" component="label" variant="text" disabled={savingPdf} sx={{ color: C.vertFonce }}>
                    {savingPdf ? <CircularProgress size={16} /> : (detail.fichier_pdf ? 'Remplacer le PDF' : 'Joindre le PDF')}
                    <input type="file" hidden accept="application/pdf" onChange={(e) => handleUpdatePdf(e.target.files?.[0] || null)} />
                  </Button>
                )}
              </Box>

              {(detail.binds || []).length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>Aucun BIND pour l'instant.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                  {(detail.binds || []).map((b) => (
                    <Paper key={b.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: C.vert }}>BIND {b.numero}</Typography>
                        {b.page != null && b.page !== '' && <Chip label={`Page ${b.page}`} size="small" sx={{ bgcolor: `${C.or}20`, color: C.vertFonce }} />}
                      </Box>
                      {b.audio && (
                        <audio controls src={getMediaUrl(b.audio)} style={{ width: '100%', height: 36 }} />
                      )}
                      {b.notes && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{b.notes}</Typography>}
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        {b.cree_par_nom} · {new Date(b.date_creation).toLocaleDateString('fr-FR')}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              )}

              {canManage && (
                <>
                  <Divider sx={{ my: 2 }}>
                    <Chip label={`Nouveau BIND ${(detail.binds || []).length + 1}`} size="small" sx={{ bgcolor: `${C.vert}15`, color: C.vert }} />
                  </Divider>
                  {detail.statut === 'termine' && (
                    <Alert severity="info" sx={{ mb: 1.5 }}>
                      Ce TERE est marqué terminé — vous pouvez quand même ajouter un BIND (ou cliquez sur « Reprendre » pour le remettre en cours).
                    </Alert>
                  )}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField
                      size="small" type="number" label="Page du TERE (optionnel)"
                      value={bindForm.page}
                      onChange={(e) => setBindForm((f) => ({ ...f, page: e.target.value }))}
                      inputProps={{ min: 1, step: 1 }}
                      sx={{ maxWidth: 200 }}
                    />
                    <TextField size="small" label="Notes (optionnel)" value={bindForm.notes} onChange={(e) => setBindForm((f) => ({ ...f, notes: e.target.value }))} multiline rows={2} />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      {!enregistrement ? (
                        <Button size="small" variant="outlined" startIcon={<Mic />} onClick={demarrerEnregistrement} sx={{ borderColor: C.vert, color: C.vert }}>
                          Enregistrer le vocal
                        </Button>
                      ) : (
                        <Button size="small" variant="contained" color="error" startIcon={<Stop />} onClick={arreterEnregistrement}>
                          Arrêter
                        </Button>
                      )}
                      <Button size="small" component="label" variant="text" sx={{ color: C.vertFonce }}>
                        ou choisir un fichier audio
                        <input type="file" hidden accept="audio/*" onChange={(e) => setBindForm((f) => ({ ...f, audio: e.target.files?.[0] || null }))} />
                      </Button>
                      {bindForm.audio && (
                        <Chip
                          label={bindForm.audio.name}
                          size="small"
                          onDelete={() => setBindForm((f) => ({ ...f, audio: null }))}
                          deleteIcon={<Delete fontSize="small" />}
                        />
                      )}
                    </Box>
                    {bindForm.audio && (
                      <audio controls src={URL.createObjectURL(bindForm.audio)} style={{ width: '100%', height: 36 }} />
                    )}
                    <Button variant="contained" onClick={handleAddBind} disabled={savingBind} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce }, alignSelf: 'flex-start' }}>
                      {savingBind ? <CircularProgress size={20} color="inherit" /> : 'Ajouter ce BIND'}
                    </Button>
                  </Box>
                </>
              )}
            </DialogContent>
            <DialogActions>
              {canManage && (
                detail.statut === 'en_cours' ? (
                  <Button startIcon={<CheckCircle />} onClick={() => handleTerminer(detail)} disabled={saving} sx={{ color: 'success.main' }}>
                    Marquer le TERE terminé
                  </Button>
                ) : (
                  <Button startIcon={<RestartAlt />} onClick={() => handleReprendre(detail)} disabled={saving} sx={{ color: C.or }}>
                    Reprendre ce TERE
                  </Button>
                )
              )}
              <Button onClick={() => setDetail(null)}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Lecture du PDF intégrée à la plateforme */}
      <Dialog open={!!pdfViewer} onClose={() => setPdfViewer(null)} maxWidth="md" fullWidth>
        {pdfViewer && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: C.vert }}>
              {pdfViewer.nom_tere}
              <IconButton onClick={() => setPdfViewer(null)}><Close /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0, height: '75vh' }}>
              <iframe
                src={getMediaUrl(pdfViewer.fichier_pdf)}
                title={`Livre — ${pdfViewer.nom_tere}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </DialogContent>
            <DialogActions>
              <Button
                startIcon={<Download />}
                href={getMediaUrl(pdfViewer.fichier_pdf)}
                download={`${pdfViewer.nom_tere}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: C.vert }}
              >
                Télécharger
              </Button>
              <Button onClick={() => setPdfViewer(null)}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}
