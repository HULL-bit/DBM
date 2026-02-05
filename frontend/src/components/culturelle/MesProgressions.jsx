import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
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
  Alert,
  CircularProgress,
  LinearProgress,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material'
import { MenuBook, Payment, ExpandMore, ExpandLess, CheckCircle, HourglassEmpty, Cancel, AccountBalanceWallet } from '@mui/icons-material'
import api from '../../services/api'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029', beige: '#F4EAD5' }

const statutColor = (s) => (s === 'valide' ? 'success' : s === 'refuse' ? 'error' : s === 'lu' ? 'info' : 'default')
const versementStatutColor = (s) => (s === 'valide' ? 'success' : s === 'refuse' ? 'error' : 'warning')

const METHODES = [
  { value: 'wave', label: 'Wave' },
  { value: 'om', label: 'Orange Money' },
  { value: 'espece', label: 'Espèces' },
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'autre', label: 'Autre' },
]

function StatCard({ title, value, subtitle, icon, color }) {
  return (
    <Card sx={{ borderLeft: `4px solid ${color}`, borderRadius: 2, height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ bgcolor: `${color}20`, p: 1.5, borderRadius: 2 }}>{icon}</Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color }}>{value}</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
      </CardContent>
    </Card>
  )
}

export default function MesProgressions() {
  const [list, setList] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openVersement, setOpenVersement] = useState(false)
  const [selectedProg, setSelectedProg] = useState(null)
  const [versementForm, setVersementForm] = useState({ montant: '', methode_paiement: 'wave', numero_transaction: '', commentaire: '' })
  const [saving, setSaving] = useState(false)
  const [expandedProg, setExpandedProg] = useState({})

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.get('/culturelle/progressions/'),
      api.get('/culturelle/versements-kamil/mes_stats/'),
    ]).then(([progRes, statsRes]) => {
      setList(progRes.data.results || progRes.data)
      setStats(statsRes.data)
    }).catch(() => {
      setList([])
      setStats(null)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const byKamil = {}
  list.forEach((p) => {
    const k = p.kamil_titre || p.kamil || 'Programme'
    if (!byKamil[k]) byKamil[k] = []
    byKamil[k].push(p)
  })
  Object.keys(byKamil).forEach((k) => byKamil[k].sort((a, b) => (a.chapitre_numero || 0) - (b.chapitre_numero || 0)))

  const handleOpenVersement = (prog) => {
    setSelectedProg(prog)
    setVersementForm({ montant: '', methode_paiement: 'wave', numero_transaction: '', commentaire: '' })
    setOpenVersement(true)
  }

  const handleVersement = async () => {
    if (!versementForm.montant || Number(versementForm.montant) <= 0) {
      setMessage({ type: 'error', text: 'Veuillez saisir un montant valide.' })
      return
    }
    if (Number(versementForm.montant) > selectedProg.reste_a_payer) {
      setMessage({ type: 'error', text: `Le montant ne peut pas dépasser ${selectedProg.reste_a_payer} FCFA.` })
      return
    }
    if (versementForm.methode_paiement === 'wave' && !versementForm.numero_transaction) {
      setMessage({ type: 'error', text: 'Veuillez saisir le numéro de transaction Wave.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.post('/culturelle/versements-kamil/', {
        progression: selectedProg.id,
        montant: Number(versementForm.montant),
        methode_paiement: versementForm.methode_paiement,
        numero_transaction: versementForm.numero_transaction,
        commentaire: versementForm.commentaire,
      })
      setMessage({ type: 'success', text: 'Versement enregistré. En attente de validation.' })
      setOpenVersement(false)
      loadData()
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally {
      setSaving(false)
    }
  }

  const toggleExpand = (progId) => {
    setExpandedProg((prev) => ({ ...prev, [progId]: !prev[progId] }))
  }

  // Filtrer les assignations avec montant assigné > 0
  const assignationsAvecMontant = list.filter((p) => p.montant_assigne && p.montant_assigne > 0)

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>
        Mes assignations Kamil (juzz)
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.vertFonce, mb: 3 }}>
        Vos juzz attribués, progression de lecture et versements financiers.
      </Typography>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* Statistiques globales */}
          {stats && assignationsAvecMontant.length > 0 && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total assigné"
                  value={`${stats.total_assigne?.toLocaleString('fr-FR') || 0} FCFA`}
                  icon={<AccountBalanceWallet sx={{ color: COLORS.vert }} />}
                  color={COLORS.vert}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total versé"
                  value={`${stats.total_verse?.toLocaleString('fr-FR') || 0} FCFA`}
                  subtitle={`${stats.pourcentage_global || 0}% complété`}
                  icon={<CheckCircle sx={{ color: COLORS.or }} />}
                  color={COLORS.or}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Reste à payer"
                  value={`${stats.reste_global?.toLocaleString('fr-FR') || 0} FCFA`}
                  icon={<HourglassEmpty sx={{ color: '#e65100' }} />}
                  color="#e65100"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Versements"
                  value={stats.nb_versements || 0}
                  subtitle={`${stats.nb_en_attente || 0} en attente`}
                  icon={<Payment sx={{ color: COLORS.vertFonce }} />}
                  color={COLORS.vertFonce}
                />
              </Grid>
            </Grid>
          )}

          {/* Barre de progression globale */}
          {stats && stats.pourcentage_global !== undefined && assignationsAvecMontant.length > 0 && (
            <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2, mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: COLORS.vert, mb: 1 }}>
                  Progression globale des versements
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={stats.pourcentage_global || 0}
                      sx={{
                        height: 16,
                        borderRadius: 2,
                        bgcolor: `${COLORS.or}30`,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: stats.pourcentage_global >= 100 ? COLORS.vert : COLORS.or,
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: stats.pourcentage_global >= 100 ? COLORS.vert : COLORS.or, minWidth: 60 }}>
                    {stats.pourcentage_global || 0}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {list.length === 0 ? (
            <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
              <CardContent>
                <Typography color="text.secondary">Aucune assignation (juzz) pour le moment. L'administrateur peut vous attribuer un ou plusieurs juzz dans le programme Kamil.</Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {Object.entries(byKamil).map(([kamilTitre, progressions]) => (
                <Grid item xs={12} key={kamilTitre}>
                  <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: COLORS.vert, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MenuBook /> {kamilTitre}
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: `${COLORS.or}15` }}>
                              <TableCell><strong>Juzz / Chapitre</strong></TableCell>
                              <TableCell><strong>Statut lecture</strong></TableCell>
                              <TableCell><strong>Montant assigné</strong></TableCell>
                              <TableCell><strong>Progression paiement</strong></TableCell>
                              <TableCell><strong>Actions</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {progressions.map((p) => (
                              <>
                                <TableRow key={p.id} sx={{ bgcolor: p.pourcentage_versement >= 100 ? `${COLORS.vert}10` : 'inherit' }}>
                                  <TableCell>{p.chapitre_titre || `Juzz ${p.chapitre_numero ?? p.chapitre}`}</TableCell>
                                  <TableCell>
                                    <Chip label={p.statut_display || p.statut} color={statutColor(p.statut)} size="small" />
                                  </TableCell>
                                  <TableCell>
                                    {p.montant_assigne > 0 ? `${Number(p.montant_assigne).toLocaleString('fr-FR')} FCFA` : '—'}
                                  </TableCell>
                                  <TableCell>
                                    {p.montant_assigne > 0 ? (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <LinearProgress
                                          variant="determinate"
                                          value={p.pourcentage_versement || 0}
                                          sx={{
                                            width: 80,
                                            height: 8,
                                            borderRadius: 1,
                                            bgcolor: `${COLORS.or}30`,
                                            '& .MuiLinearProgress-bar': {
                                              bgcolor: p.pourcentage_versement >= 100 ? COLORS.vert : COLORS.or,
                                            },
                                          }}
                                        />
                                        <Typography variant="caption" sx={{ fontWeight: 600, color: p.pourcentage_versement >= 100 ? COLORS.vert : COLORS.vertFonce }}>
                                          {p.pourcentage_versement || 0}%
                                        </Typography>
                                      </Box>
                                    ) : '—'}
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                      {p.montant_assigne > 0 && p.reste_a_payer > 0 && (
                                        <Button
                                          size="small"
                                          variant="contained"
                                          startIcon={<Payment />}
                                          onClick={() => handleOpenVersement(p)}
                                          sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce }, fontSize: '0.75rem' }}
                                        >
                                          Verser
                                        </Button>
                                      )}
                                      {p.montant_assigne > 0 && p.pourcentage_versement >= 100 && (
                                        <Chip label="Payé" color="success" size="small" icon={<CheckCircle />} />
                                      )}
                                      {p.versements && p.versements.length > 0 && (
                                        <IconButton size="small" onClick={() => toggleExpand(p.id)}>
                                          {expandedProg[p.id] ? <ExpandLess /> : <ExpandMore />}
                                        </IconButton>
                                      )}
                                    </Box>
                                  </TableCell>
                                </TableRow>
                                {p.versements && p.versements.length > 0 && (
                                  <TableRow key={`${p.id}-details`}>
                                    <TableCell colSpan={5} sx={{ p: 0 }}>
                                      <Collapse in={expandedProg[p.id]} timeout="auto" unmountOnExit>
                                        <Box sx={{ p: 2, bgcolor: `${COLORS.beige}50` }}>
                                          <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce, mb: 1 }}>
                                            Historique des versements
                                          </Typography>
                                          <Table size="small">
                                            <TableHead>
                                              <TableRow>
                                                <TableCell>Date</TableCell>
                                                <TableCell>Montant</TableCell>
                                                <TableCell>Méthode</TableCell>
                                                <TableCell>N° Transaction</TableCell>
                                                <TableCell>Statut</TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {p.versements.map((v) => (
                                                <TableRow key={v.id}>
                                                  <TableCell>{new Date(v.date_versement).toLocaleDateString('fr-FR')}</TableCell>
                                                  <TableCell>{Number(v.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                                                  <TableCell>{v.methode_display || v.methode_paiement}</TableCell>
                                                  <TableCell>{v.numero_transaction || '—'}</TableCell>
                                                  <TableCell>
                                                    <Chip
                                                      label={v.statut_display || v.statut}
                                                      color={versementStatutColor(v.statut)}
                                                      size="small"
                                                      icon={v.statut === 'valide' ? <CheckCircle /> : v.statut === 'refuse' ? <Cancel /> : <HourglassEmpty />}
                                                    />
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </Box>
                                      </Collapse>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Dialog versement */}
      <Dialog open={openVersement} onClose={() => setOpenVersement(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.vert, color: 'white' }}>
          Effectuer un versement
        </DialogTitle>
        <DialogContent>
          {selectedProg && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>{selectedProg.chapitre_titre || `Juzz ${selectedProg.chapitre_numero}`}</strong><br />
                Montant assigné : <strong>{Number(selectedProg.montant_assigne).toLocaleString('fr-FR')} FCFA</strong><br />
                Déjà versé : <strong>{Number(selectedProg.montant_verse).toLocaleString('fr-FR')} FCFA</strong> ({selectedProg.pourcentage_versement}%)<br />
                Reste à payer : <strong>{Number(selectedProg.reste_a_payer).toLocaleString('fr-FR')} FCFA</strong>
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Montant à verser (FCFA)"
                    value={versementForm.montant}
                    onChange={(e) => setVersementForm((f) => ({ ...f, montant: e.target.value }))}
                    helperText={`Maximum : ${Number(selectedProg.reste_a_payer).toLocaleString('fr-FR')} FCFA`}
                    inputProps={{ min: 1, max: selectedProg.reste_a_payer }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Méthode de paiement"
                    value={versementForm.methode_paiement}
                    onChange={(e) => setVersementForm((f) => ({ ...f, methode_paiement: e.target.value }))}
                  >
                    {METHODES.map((m) => (
                      <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                {(versementForm.methode_paiement === 'wave' || versementForm.methode_paiement === 'om') && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={`Numéro de transaction ${versementForm.methode_paiement === 'wave' ? 'Wave' : 'Orange Money'}`}
                      value={versementForm.numero_transaction}
                      onChange={(e) => setVersementForm((f) => ({ ...f, numero_transaction: e.target.value }))}
                      helperText="Saisissez le numéro de confirmation reçu par SMS"
                    />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Commentaire (optionnel)"
                    value={versementForm.commentaire}
                    onChange={(e) => setVersementForm((f) => ({ ...f, commentaire: e.target.value }))}
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVersement(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleVersement}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Payment />}
            sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
          >
            Confirmer le versement
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
