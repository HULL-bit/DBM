import { useState, useEffect, useRef } from 'react'
import {
  Box, Typography, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Chip, Paper,
} from '@mui/material'
import { Add, Visibility, QuestionAnswer, Mic, Stop, Delete } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { getMediaUrl } from '../../services/media'
import usePagination from '../../hooks/usePagination'
import TablePaginationFr from '../ui/TablePaginationFr'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

function ChampVocal({ label, audioFile, onAudioChange, setMessage }) {
  const [enregistrement, setEnregistrement] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const demarrer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onAudioChange(new File([blob], `laaj_${Date.now()}.webm`, { type: 'audio/webm' }))
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setEnregistrement(true)
    } catch {
      setMessage({ type: 'error', text: "Impossible d'accéder au microphone." })
    }
  }
  const arreter = () => {
    mediaRecorderRef.current?.stop()
    setEnregistrement(false)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {!enregistrement ? (
          <Button size="small" variant="outlined" startIcon={<Mic />} onClick={demarrer} sx={{ borderColor: C.vert, color: C.vert }}>
            Enregistrer {label}
          </Button>
        ) : (
          <Button size="small" variant="contained" color="error" startIcon={<Stop />} onClick={arreter}>Arrêter</Button>
        )}
        <Button size="small" component="label" sx={{ color: C.vertFonce }}>
          ou choisir un fichier audio
          <input type="file" hidden accept="audio/*" onChange={(e) => onAudioChange(e.target.files?.[0] || null)} />
        </Button>
        {audioFile && (
          <Chip label={audioFile.name} size="small" onDelete={() => onAudioChange(null)} deleteIcon={<Delete fontSize="small" />} />
        )}
      </Box>
      {audioFile && <audio controls src={URL.createObjectURL(audioFile)} style={{ width: '100%', height: 36 }} />}
    </Box>
  )
}

export default function Laaj() {
  const { user, peut } = useAuth()
  const canManage = user?.role === 'admin' || user?.role === 'jewrin' || user?.role === 'jewrine_culturelle' || peut('culturelle', 'gerer')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [statutFilter, setStatutFilter] = useState('')

  const [openAsk, setOpenAsk] = useState(false)
  const [question, setQuestion] = useState('')
  const [questionAudio, setQuestionAudio] = useState(null)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState(null)
  const [reponseTexte, setReponseTexte] = useState('')
  const [reponseAudio, setReponseAudio] = useState(null)
  const [savingReponse, setSavingReponse] = useState(false)

  const loadList = () => {
    setLoading(true)
    api.get('/culturelle/laaj/', { params: { page_size: 500 } })
      .then(({ data }) => setList(data.results || data))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadList() }, [])

  const filtered = list.filter((l) => !statutFilter || l.statut === statutFilter)
  const { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate } = usePagination(filtered.length)

  const handleAsk = async () => {
    if (!question.trim() && !questionAudio) {
      setMessage({ type: 'error', text: 'Écrivez votre question ou joignez un vocal.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = new FormData()
      payload.append('question', question.trim())
      if (questionAudio) payload.append('question_audio', questionAudio)
      await api.post('/culturelle/laaj/', payload)
      setMessage({ type: 'success', text: 'Question envoyée au responsable culturelle.' })
      setOpenAsk(false)
      setQuestion('')
      setQuestionAudio(null)
      loadList()
    } catch (err) {
      const d = err.response?.data?.question || err.response?.data?.detail
      setMessage({ type: 'error', text: Array.isArray(d) ? d[0] : (d || "Erreur lors de l'envoi.") })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenDetail = (l) => {
    setDetail(l)
    setReponseTexte(l.reponse || '')
    setReponseAudio(null)
  }

  const handleRepondre = async () => {
    if (!reponseTexte.trim() && !reponseAudio) {
      setMessage({ type: 'error', text: 'Écrivez une réponse ou joignez un vocal.' })
      return
    }
    setSavingReponse(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = new FormData()
      payload.append('reponse', reponseTexte.trim())
      if (reponseAudio) payload.append('reponse_audio', reponseAudio)
      const { data } = await api.post(`/culturelle/laaj/${detail.id}/repondre/`, payload)
      setMessage({ type: 'success', text: 'Réponse envoyée.' })
      setList((prev) => prev.map((x) => (x.id === data.id ? data : x)))
      setDetail(data)
      setReponseAudio(null)
    } catch {
      setMessage({ type: 'error', text: 'Erreur.' })
    } finally {
      setSavingReponse(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: C.vert, fontWeight: 600, fontSize: { xs: '1.5rem', sm: '2.125rem' } }} gutterBottom>LAAJ</Typography>
          <Typography variant="body2" sx={{ color: C.vertFonce }}>
            {canManage ? 'Questions religieuses des membres et réponses' : 'Posez vos questions religieuses au responsable culturelle, par écrit ou en vocal'}
          </Typography>
        </Box>
        {!canManage && (
          <Button variant="contained" startIcon={<Add />} onClick={() => { setQuestion(''); setQuestionAudio(null); setMessage({ type: '', text: '' }); setOpenAsk(true) }} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            Poser une question
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField select size="small" label="Statut" value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">Tous</MenuItem>
          <MenuItem value="en_attente">En attente de réponse</MenuItem>
          <MenuItem value="repondu">Répondu</MenuItem>
        </TextField>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <QuestionAnswer sx={{ fontSize: 56, color: 'action.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="h6">Aucune question</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${C.or}30` }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, color: C.vertFonce, bgcolor: `${C.vert}08`, whiteSpace: 'nowrap' } }}>
                {canManage && <TableCell>Membre</TableCell>}
                <TableCell>Question</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Posée le</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginate(filtered).map((l) => (
                <TableRow key={l.id} hover onClick={() => handleOpenDetail(l)} sx={{ cursor: 'pointer' }}>
                  {canManage && <TableCell sx={{ fontWeight: 600, color: C.vert, whiteSpace: 'nowrap' }}>{l.membre_nom || `#${l.membre}`}</TableCell>}
                  <TableCell sx={{ maxWidth: 420 }}>
                    {l.question ? (l.question.length > 100 ? `${l.question.slice(0, 100)}…` : l.question) : (
                      <Chip label="🎤 Vocal" size="small" sx={{ bgcolor: `${C.or}20`, color: C.vertFonce }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={l.statut_display} size="small" color={l.statut === 'repondu' ? 'success' : 'warning'} variant={l.statut === 'repondu' ? 'filled' : 'outlined'} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(l.date_question).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={() => handleOpenDetail(l)} sx={{ color: C.vertFonce }}><Visibility fontSize="small" /></IconButton>
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

      {/* Poser une question */}
      <Dialog open={openAsk} onClose={() => setOpenAsk(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: C.vert }}>Poser une question (LAAJ)</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth multiline rows={4}
              label="Votre question (optionnel si vocal joint)"
              placeholder="Posez votre question religieuse au responsable culturelle..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <ChampVocal label="ma question" audioFile={questionAudio} onAudioChange={setQuestionAudio} setMessage={setMessage} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAsk(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleAsk} disabled={saving} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
            {saving ? <CircularProgress size={20} /> : 'Envoyer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Détail question / réponse */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        {detail && (
          <>
            <DialogTitle sx={{ color: C.vert }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                LAAJ
                <Chip label={detail.statut_display} size="small" color={detail.statut === 'repondu' ? 'success' : 'warning'} />
              </Box>
              {canManage && <Typography variant="caption" display="block" color="text.secondary">{detail.membre_nom}</Typography>}
            </DialogTitle>
            <DialogContent>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 2, bgcolor: `${C.vert}05` }}>
                {detail.question && <Typography variant="body2">{detail.question}</Typography>}
                {detail.question_audio && (
                  <audio controls src={getMediaUrl(detail.question_audio)} style={{ width: '100%', height: 36, marginTop: detail.question ? 8 : 0 }} />
                )}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {new Date(detail.date_question).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                </Typography>
              </Paper>

              {detail.statut === 'repondu' && (
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 2, bgcolor: `${C.or}10` }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: C.vertFonce, display: 'block', mb: 0.5 }}>
                    Réponse — {detail.repondu_par_nom}
                  </Typography>
                  {detail.reponse && <Typography variant="body2">{detail.reponse}</Typography>}
                  {detail.reponse_audio && (
                    <audio controls src={getMediaUrl(detail.reponse_audio)} style={{ width: '100%', height: 36, marginTop: detail.reponse ? 8 : 0 }} />
                  )}
                  {detail.date_reponse && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      {new Date(detail.date_reponse).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </Typography>
                  )}
                </Paper>
              )}

              {canManage && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth multiline rows={4}
                    label={detail.statut === 'repondu' ? 'Modifier la réponse (texte)' : 'Répondre par écrit (optionnel si vocal joint)'}
                    value={reponseTexte}
                    onChange={(e) => setReponseTexte(e.target.value)}
                  />
                  <ChampVocal label="ma réponse" audioFile={reponseAudio} onAudioChange={setReponseAudio} setMessage={setMessage} />
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              {canManage && (
                <Button variant="contained" onClick={handleRepondre} disabled={savingReponse} sx={{ bgcolor: C.vert, '&:hover': { bgcolor: C.vertFonce } }}>
                  {savingReponse ? <CircularProgress size={20} color="inherit" /> : 'Envoyer la réponse'}
                </Button>
              )}
              <Button onClick={() => setDetail(null)}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}
