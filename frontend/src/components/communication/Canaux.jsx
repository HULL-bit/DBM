import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  Typography,
  Paper,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Autocomplete,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Tooltip,
  Checkbox,
  Menu,
  MenuItem,
} from '@mui/material'
import {
  Add,
  Send,
  AttachFile,
  Mic,
  Stop,
  Videocam,
  CallEnd,
  Groups,
  PersonAdd,
  Close,
  Delete,
  InsertDriveFile,
  Download,
  MoreVert,
} from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

function initials(nom) {
  if (!nom) return '?'
  const parts = nom.trim().split(' ')
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : (parts[0]?.[0] || '?').toUpperCase()
}

function detecterTypeMessage(file) {
  if (!file) return 'texte'
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'document'
}

function Bulle({ msg, estMoi, peutSupprimerPourTous, onSupprimerPourMoi, onSupprimerPourTous }) {
  const url = msg.fichier ? getMediaUrl(msg.fichier) : null
  const photoUrl = msg.expediteur_photo ? getMediaUrl(msg.expediteur_photo) : null
  const [menuAnchor, setMenuAnchor] = useState(null)
  return (
    <Box
      className="bulle-canal"
      sx={{ display: 'flex', justifyContent: estMoi ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 1, mb: 1.5, '&:hover .bulle-actions': { opacity: 1 } }}
    >
      {!estMoi && (
        <Avatar src={photoUrl} sx={{ width: 30, height: 30, bgcolor: COLORS.vert, fontSize: '0.7rem', flexShrink: 0 }}>
          {initials(msg.expediteur_nom)}
        </Avatar>
      )}
      {estMoi && (
        <IconButton
          size="small"
          className="bulle-actions"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{ opacity: 0, transition: 'opacity 0.2s', order: -1 }}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      )}
      <Box sx={{ maxWidth: '75%' }}>
        {!estMoi && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: COLORS.vert, fontWeight: 700, ml: 1 }}>
              {msg.expediteur_nom}
            </Typography>
            <IconButton size="small" className="bulle-actions" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ opacity: 0, transition: 'opacity 0.2s', p: 0.25 }}>
              <MoreVert sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        )}
        <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
          <MenuItem onClick={() => { setMenuAnchor(null); onSupprimerPourMoi(msg) }}>Supprimer pour moi</MenuItem>
          {peutSupprimerPourTous && (
            <MenuItem onClick={() => { setMenuAnchor(null); onSupprimerPourTous(msg) }} sx={{ color: 'error.main' }}>
              Supprimer pour tout le monde
            </MenuItem>
          )}
        </Menu>
        <Paper
          sx={{
            p: 1.25,
            borderRadius: 2.5,
            bgcolor: estMoi ? COLORS.vert : '#fff',
            color: estMoi ? '#fff' : COLORS.noir,
            border: estMoi ? 'none' : `1px solid ${COLORS.or}30`,
          }}
        >
          {msg.type_message === 'image' && url && (
            <Box component="img" src={url} alt="image" sx={{ maxWidth: '100%', maxHeight: 260, borderRadius: 1.5, display: 'block', mb: msg.contenu ? 1 : 0 }} />
          )}
          {msg.type_message === 'video' && url && (
            <Box component="video" src={url} controls sx={{ maxWidth: '100%', maxHeight: 260, borderRadius: 1.5, display: 'block', mb: msg.contenu ? 1 : 0 }} />
          )}
          {msg.type_message === 'audio' && url && (
            <Box component="audio" src={url} controls sx={{ display: 'block', mb: msg.contenu ? 1 : 0, maxWidth: 240 }} />
          )}
          {msg.type_message === 'document' && url && (
            <Box
              component="a"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'inherit', textDecoration: 'none', mb: msg.contenu ? 1 : 0 }}
            >
              <InsertDriveFile fontSize="small" />
              <Typography variant="body2" sx={{ textDecoration: 'underline' }}>Document</Typography>
              <Download fontSize="small" />
            </Box>
          )}
          {msg.contenu && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.contenu}</Typography>}
        </Paper>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: estMoi ? 'right' : 'left', mt: 0.25 }}>
          {new Date(msg.date_envoi).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Typography>
      </Box>
    </Box>
  )
}

export default function Canaux() {
  const { user } = useAuth()
  const [canaux, setCanaux] = useState([])
  const [loadingCanaux, setLoadingCanaux] = useState(true)
  const [canalSelectionne, setCanalSelectionne] = useState(null)
  const [messages, setMessages] = useState([])
  const [texte, setTexte] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  const [openCreation, setOpenCreation] = useState(false)
  const [nomCanal, setNomCanal] = useState('')
  const [descCanal, setDescCanal] = useState('')
  const [membresChoisis, setMembresChoisis] = useState([])
  const [tousMembres, setTousMembres] = useState([])
  const [saving, setSaving] = useState(false)

  const [openGestionMembres, setOpenGestionMembres] = useState(false)
  const [nouveauMembre, setNouveauMembre] = useState(null)

  const [enregistrement, setEnregistrement] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const fileInputRef = useRef(null)
  const derniereMajRef = useRef(0)
  const messagesEndRef = useRef(null)

  const loadCanaux = useCallback(() => {
    api.get('/communication/canaux/').then(({ data }) => setCanaux(data.results || data)).catch(() => setCanaux([])).finally(() => setLoadingCanaux(false))
  }, [])

  useEffect(() => {
    loadCanaux()
    api.get('/auth/users/').then(({ data }) => setTousMembres((data.results || data).filter((u) => u.id !== user?.id))).catch(() => setTousMembres([]))
    const t = setInterval(loadCanaux, 60000)
    return () => clearInterval(t)
  }, [loadCanaux, user?.id])

  const loadMessages = useCallback((canalId, incremental = false) => {
    const params = { canal: canalId }
    if (incremental && derniereMajRef.current) params.apres = derniereMajRef.current
    api.get('/communication/messages-canaux/', { params }).then(({ data }) => {
      const nouveaux = data.results || data
      if (nouveaux.length > 0) {
        derniereMajRef.current = nouveaux[nouveaux.length - 1].id
        setMessages((prev) => (incremental ? [...prev, ...nouveaux] : nouveaux))
      } else if (!incremental) {
        setMessages([])
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!canalSelectionne) return
    derniereMajRef.current = 0
    loadMessages(canalSelectionne.id, false)
    const t = setInterval(() => loadMessages(canalSelectionne.id, true), 6000)
    return () => clearInterval(t)
  }, [canalSelectionne, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleCreerCanal = async () => {
    if (!nomCanal.trim()) return
    setSaving(true)
    try {
      const { data } = await api.post('/communication/canaux/', {
        nom: nomCanal.trim(),
        description: descCanal.trim(),
        membres: membresChoisis.map((m) => m.id),
      })
      setOpenCreation(false)
      setNomCanal(''); setDescCanal(''); setMembresChoisis([])
      loadCanaux()
      setCanalSelectionne(data)
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de la création du canal.' })
    } finally {
      setSaving(false)
    }
  }

  const envoyerMessage = async ({ contenu = '', file = null, typeMessage = 'texte', duree = null }) => {
    if (!canalSelectionne) return
    setEnvoiEnCours(true)
    try {
      let payload
      let config = {}
      if (file) {
        payload = new FormData()
        payload.append('canal', canalSelectionne.id)
        payload.append('type_message', typeMessage)
        payload.append('contenu', contenu)
        payload.append('fichier', file)
        if (duree) payload.append('duree', Math.round(duree))
      } else {
        payload = { canal: canalSelectionne.id, type_message: 'texte', contenu }
      }
      await api.post('/communication/messages-canaux/', payload, config)
      setTexte('')
      loadMessages(canalSelectionne.id, true)
    } catch (err) {
      setMessage({ type: 'error', text: "Erreur lors de l'envoi du message." })
    } finally {
      setEnvoiEnCours(false)
    }
  }

  const handleEnvoyerTexte = () => {
    if (!texte.trim()) return
    envoyerMessage({ contenu: texte.trim() })
  }

  const handleFichier = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    envoyerMessage({ file, typeMessage: detecterTypeMessage(file) })
    e.target.value = ''
  }

  const demarrerEnregistrement = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      const debut = Date.now()
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const duree = (Date.now() - debut) / 1000
        const file = new File([blob], `vocal_${Date.now()}.webm`, { type: 'audio/webm' })
        envoyerMessage({ file, typeMessage: 'audio', duree })
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setEnregistrement(true)
    } catch (err) {
      setMessage({ type: 'error', text: "Impossible d'accéder au microphone." })
    }
  }

  const arreterEnregistrement = () => {
    mediaRecorderRef.current?.stop()
    setEnregistrement(false)
  }

  const handleDemarrerReunion = async () => {
    if (!canalSelectionne) return
    try {
      const { data } = await api.post(`/communication/canaux/${canalSelectionne.id}/demarrer-reunion/`)
      setCanalSelectionne(data)
      setCanaux((prev) => prev.map((c) => (c.id === data.id ? data : c)))
      window.open(data.lien_reunion, '_blank', 'noopener,noreferrer')
      loadMessages(canalSelectionne.id, true)
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors du démarrage de la réunion.' })
    }
  }

  const handleTerminerReunion = async () => {
    if (!canalSelectionne) return
    try {
      const { data } = await api.post(`/communication/canaux/${canalSelectionne.id}/terminer-reunion/`)
      setCanalSelectionne(data)
      setCanaux((prev) => prev.map((c) => (c.id === data.id ? data : c)))
    } catch {
      setMessage({ type: 'error', text: 'Erreur.' })
    }
  }

  const handleSupprimerPourMoi = async (msg) => {
    try {
      await api.post(`/communication/messages-canaux/${msg.id}/masquer/`)
      setMessages((prev) => prev.filter((m) => m.id !== msg.id))
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression.' })
    }
  }

  const handleSupprimerPourTous = async (msg) => {
    try {
      await api.delete(`/communication/messages-canaux/${msg.id}/`)
      setMessages((prev) => prev.filter((m) => m.id !== msg.id))
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression.' })
    }
  }

  const handleAjouterMembre = async () => {
    if (!nouveauMembre || !canalSelectionne) return
    try {
      const { data } = await api.post(`/communication/canaux/${canalSelectionne.id}/ajouter-membres/`, { membres: [nouveauMembre.id] })
      setCanalSelectionne(data)
      setCanaux((prev) => prev.map((c) => (c.id === data.id ? data : c)))
      setNouveauMembre(null)
    } catch {
      setMessage({ type: 'error', text: "Erreur lors de l'ajout du membre." })
    }
  }

  const handleRetirerMembre = async (membreId) => {
    if (!canalSelectionne) return
    try {
      const { data } = await api.post(`/communication/canaux/${canalSelectionne.id}/retirer-membre/`, { membre: membreId })
      setCanalSelectionne(data)
      setCanaux((prev) => prev.map((c) => (c.id === data.id ? data : c)))
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors du retrait du membre.' })
    }
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 180px)', minHeight: 500 }}>
      {/* Liste des canaux */}
      <Paper sx={{ width: 300, flexShrink: 0, borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.or}30` }}>
          <Typography variant="h6" sx={{ color: COLORS.vert, fontWeight: 700 }}>Canaux</Typography>
          <Tooltip title="Nouveau canal">
            <IconButton size="small" onClick={() => setOpenCreation(true)} sx={{ color: COLORS.vert }}><Add /></IconButton>
          </Tooltip>
        </Box>
        {loadingCanaux ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
        ) : canaux.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Groups sx={{ fontSize: 40, color: 'action.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">Aucun canal. Créez-en un pour commencer.</Typography>
          </Box>
        ) : (
          <List sx={{ overflowY: 'auto', flex: 1 }}>
            {canaux.map((c) => (
              <ListItemButton key={c.id} selected={canalSelectionne?.id === c.id} onClick={() => setCanalSelectionne(c)}>
                <ListItemAvatar>
                  <Badge color="success" variant="dot" invisible={!c.lien_reunion}>
                    <Avatar sx={{ bgcolor: COLORS.vert }}>{initials(c.nom)}</Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={c.nom}
                  secondary={`${c.nb_membres} membre(s)${c.lien_reunion ? ' · Réunion en cours' : ''}`}
                  primaryTypographyProps={{ fontWeight: 600, color: COLORS.vertFonce }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Paper>

      {/* Fenêtre du canal sélectionné */}
      <Paper sx={{ flex: 1, borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!canalSelectionne ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">Sélectionnez un canal pour discuter.</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ p: 2, borderBottom: `1px solid ${COLORS.or}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ color: COLORS.vert, fontWeight: 700 }}>{canalSelectionne.nom}</Typography>
                <Typography variant="caption" color="text.secondary">{canalSelectionne.nb_membres} membre(s)</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {canalSelectionne.lien_reunion ? (
                  <>
                    <Button size="small" variant="contained" startIcon={<Videocam />} href={canalSelectionne.lien_reunion} target="_blank" rel="noopener noreferrer"
                      sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
                      Rejoindre
                    </Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<CallEnd />} onClick={handleTerminerReunion}>
                      Terminer
                    </Button>
                  </>
                ) : (
                  <Button size="small" variant="outlined" startIcon={<Videocam />} onClick={handleDemarrerReunion}
                    sx={{ borderColor: COLORS.vert, color: COLORS.vert }}>
                    Démarrer une réunion
                  </Button>
                )}
                {canalSelectionne.est_admin_canal && (
                  <Tooltip title="Gérer les membres">
                    <IconButton size="small" onClick={() => setOpenGestionMembres(true)} sx={{ color: COLORS.vert }}><Groups /></IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>

            {message.text && (
              <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ m: 1 }} onClose={() => setMessage({ type: '', text: '' })}>
                {message.text}
              </Alert>
            )}

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: `${COLORS.or}06` }}>
              {messages.map((m) => (
                <Bulle
                  key={m.id}
                  msg={m}
                  estMoi={m.expediteur === user?.id}
                  peutSupprimerPourTous={m.expediteur === user?.id || canalSelectionne?.est_admin_canal}
                  onSupprimerPourMoi={handleSupprimerPourMoi}
                  onSupprimerPourTous={handleSupprimerPourTous}
                />
              ))}
              <div ref={messagesEndRef} />
            </Box>

            <Box sx={{ p: 1.5, borderTop: `1px solid ${COLORS.or}30`, display: 'flex', gap: 1, alignItems: 'center' }}>
              <input ref={fileInputRef} type="file" hidden onChange={handleFichier} />
              <Tooltip title="Joindre un fichier">
                <IconButton onClick={() => fileInputRef.current?.click()} sx={{ color: COLORS.vert }}><AttachFile /></IconButton>
              </Tooltip>
              <TextField
                fullWidth
                size="small"
                placeholder="Écrire un message..."
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnvoyerTexte() } }}
                disabled={envoiEnCours}
              />
              <Tooltip title={enregistrement ? 'Arrêter et envoyer' : 'Message vocal'}>
                <IconButton onClick={enregistrement ? arreterEnregistrement : demarrerEnregistrement} sx={{ color: enregistrement ? '#c62828' : COLORS.vert }}>
                  {enregistrement ? <Stop /> : <Mic />}
                </IconButton>
              </Tooltip>
              <IconButton onClick={handleEnvoyerTexte} disabled={!texte.trim() || envoiEnCours} sx={{ color: COLORS.vert }}>
                <Send />
              </IconButton>
            </Box>
          </>
        )}
      </Paper>

      {/* Dialog création canal */}
      <Dialog open={openCreation} onClose={() => setOpenCreation(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau canal</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Nom du canal" value={nomCanal} onChange={(e) => setNomCanal(e.target.value)} fullWidth required />
            <TextField label="Description (optionnel)" value={descCanal} onChange={(e) => setDescCanal(e.target.value)} fullWidth multiline rows={2} />
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce }}>
                  Membres du canal ({membresChoisis.length} / {tousMembres.length})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" onClick={() => setMembresChoisis(tousMembres)} sx={{ color: COLORS.vert }}>Tout sélectionner</Button>
                  <Button size="small" color="error" onClick={() => setMembresChoisis([])}>Tout désélectionner</Button>
                </Box>
              </Box>
              <Paper variant="outlined" sx={{ maxHeight: 260, overflow: 'auto', borderRadius: 2 }}>
                {tousMembres.map((m) => {
                  const checked = membresChoisis.some((x) => x.id === m.id)
                  return (
                    <Box
                      key={m.id}
                      onClick={() => setMembresChoisis((prev) => (checked ? prev.filter((x) => x.id !== m.id) : [...prev, m]))}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, cursor: 'pointer',
                        bgcolor: checked ? `${COLORS.vert}10` : 'transparent',
                        '&:hover': { bgcolor: `${COLORS.or}10` },
                      }}
                    >
                      <Checkbox size="small" checked={checked} sx={{ color: COLORS.vert, '&.Mui-checked': { color: COLORS.vert }, p: 0 }} onChange={() => {}} />
                      <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', bgcolor: checked ? COLORS.vert : `${COLORS.vert}40` }}>{initials(`${m.first_name} ${m.last_name}`)}</Avatar>
                      <Typography variant="body2">{`${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username}</Typography>
                    </Box>
                  )
                })}
              </Paper>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreation(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreerCanal} disabled={saving || !nomCanal.trim()} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog gestion des membres */}
      <Dialog open={openGestionMembres} onClose={() => setOpenGestionMembres(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Membres du canal
          <IconButton onClick={() => setOpenGestionMembres(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Autocomplete
              options={tousMembres.filter((m) => !canalSelectionne?.membres?.some((mc) => mc.user === m.id))}
              getOptionLabel={(m) => `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username}
              value={nouveauMembre}
              onChange={(e, val) => setNouveauMembre(val)}
              renderInput={(params) => <TextField {...params} label="Ajouter un membre" size="small" />}
              sx={{ flex: 1 }}
            />
            <Button variant="contained" startIcon={<PersonAdd />} onClick={handleAjouterMembre} disabled={!nouveauMembre}
              sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
              Ajouter
            </Button>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <List dense>
            {(canalSelectionne?.membres || []).map((m) => (
              <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: COLORS.vert, fontSize: '0.7rem' }}>{initials(m.membre_nom)}</Avatar>
                  <Typography variant="body2">{m.membre_nom}</Typography>
                  {m.est_admin_canal && <Chip label="Admin" size="small" sx={{ bgcolor: `${COLORS.or}30`, fontSize: '0.65rem' }} />}
                </Box>
                {m.user !== canalSelectionne.cree_par && (
                  <IconButton size="small" color="error" onClick={() => handleRetirerMembre(m.user)}><Delete fontSize="small" /></IconButton>
                )}
              </Box>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  )
}
