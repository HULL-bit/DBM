import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Grid,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material'
import { Add, Edit, Delete, Payment } from '@mui/icons-material'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }
const STATUTS = [
  { value: 'active', label: 'Active' },
  { value: 'terminee', label: 'Terminée' },
  { value: 'annulee', label: 'Annulée' },
]

export default function LeveesFonds() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openForm, setOpenForm] = useState(false)
  const [openDelete, setOpenDelete] = useState(null)
  const [openParticipate, setOpenParticipate] = useState(null)
  const [openConfirmPayment, setOpenConfirmPayment] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [participateForm, setParticipateForm] = useState({ montant: '', reference_wave: '', description: '' })
  const [confirmForm, setConfirmForm] = useState({ reference_interne: '', reference_wave: '' })
  const [pendingTransaction, setPendingTransaction] = useState(null)
  const [form, setForm] = useState({
    titre: '',
    description: '',
    objectif: '',
    montant_objectif: '',
    date_debut: '',
    date_fin: '',
    statut: 'active',
    lien_paiement_wave: '',
  })

  const loadList = () => {
    setLoading(true)
    api.get('/finance/levees-fonds/').then(({ data }) => setList(data.results || data)).catch(() => setList([])).finally(() => setLoading(false))
  }
  useEffect(() => { loadList() }, [])

  const handleOpenAdd = () => {
    setEditingId(null)
    const now = new Date()
    setForm({
      titre: '',
      description: '',
      objectif: '',
      montant_objectif: '',
      date_debut: now.toISOString().slice(0, 10),
      date_fin: '',
      statut: 'active',
      lien_paiement_wave: '',
    })
    setOpenForm(true)
  }

  const handleOpenEdit = (lf) => {
    setEditingId(lf.id)
    setForm({
      titre: lf.titre || '',
      description: lf.description || '',
      objectif: lf.objectif || '',
      montant_objectif: lf.montant_objectif || '',
      date_debut: lf.date_debut ? lf.date_debut.slice(0, 10) : '',
      date_fin: lf.date_fin ? lf.date_fin.slice(0, 10) : '',
      statut: lf.statut || 'active',
      lien_paiement_wave: lf.lien_paiement_wave || '',
    })
    setOpenForm(true)
  }

  const handleSave = async () => {
    if (!form.titre || !form.montant_objectif || !form.date_debut || !form.date_fin) {
      setMessage({ type: 'error', text: 'Titre, montant objectif et dates requis.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const payload = {
        titre: form.titre,
        description: form.description || '',
        objectif: form.objectif || form.titre,
        montant_objectif: Number(form.montant_objectif),
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        statut: form.statut,
        lien_paiement_wave: form.lien_paiement_wave || '',
      }
      if (editingId) {
        await api.patch(`/finance/levees-fonds/${editingId}/`, payload)
        setMessage({ type: 'success', text: 'Levée de fonds modifiée.' })
      } else {
        await api.post('/finance/levees-fonds/', payload)
        setMessage({ type: 'success', text: 'Levée de fonds créée.' })
      }
      loadList()
      setOpenForm(false)
      setEditingId(null)
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!openDelete) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.delete(`/finance/levees-fonds/${openDelete.id}/`)
      setMessage({ type: 'success', text: 'Levée de fonds supprimée.' })
      loadList()
      setOpenDelete(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  const handleBarkelou = async (lf) => {
    if (!lf.lien_paiement_wave) {
      setMessage({ type: 'error', text: 'Lien de paiement Wave non configuré pour cette levée de fonds.' })
      return
    }
    // Ouvrir le dialog pour entrer le montant avant d'ouvrir Wave
    setOpenParticipate(lf)
    setParticipateForm({ montant: '', description: '' })
    setPendingTransaction(null)
  }

  const handleOpenParticipate = (lf) => {
    setOpenParticipate(lf)
    setParticipateForm({ montant: '', description: '' })
    setPendingTransaction(null)
  }

  const handleParticipate = async () => {
    if (!openParticipate || !participateForm.montant) {
      setMessage({ type: 'error', text: 'Montant requis.' })
      return
    }
    if (!openParticipate.lien_paiement_wave) {
      setMessage({ type: 'error', text: 'Lien de paiement Wave non configuré pour cette levée de fonds.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const { data } = await api.post(`/finance/levees-fonds/${openParticipate.id}/participer/`, {
        montant: Number(participateForm.montant),
        description: participateForm.description || `Participation à ${openParticipate.titre}`,
      })
      // Sauvegarder la transaction en attente
      setPendingTransaction({
        reference_interne: data.reference_transaction,
        levee_fonds_id: openParticipate.id,
        montant: participateForm.montant,
      })
      // Ouvrir Wave dans un nouvel onglet
      window.open(data.lien_wave, '_blank', 'noopener,noreferrer')
      // Fermer le dialog de participation et ouvrir celui de confirmation
      setOpenParticipate(null)
      setOpenConfirmPayment(openParticipate)
      setConfirmForm({ reference_interne: data.reference_transaction, reference_wave: '' })
      setMessage({ type: 'info', text: 'Transaction créée. Veuillez effectuer le paiement sur Wave, puis confirmez avec votre référence Wave.' })
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur') })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenConfirmPayment = (lf) => {
    setOpenConfirmPayment(lf)
    setConfirmForm({ reference_interne: '', reference_wave: '' })
  }

  const handleConfirmPayment = async () => {
    if (!openConfirmPayment || !confirmForm.reference_wave) {
      setMessage({ type: 'error', text: 'Référence Wave requise pour confirmer le paiement.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api.post(`/finance/levees-fonds/${openConfirmPayment.id}/confirmer_paiement/`, {
        reference_interne: confirmForm.reference_interne,
        reference_wave: confirmForm.reference_wave.trim(),
      })
      setMessage({ type: 'success', text: 'Paiement confirmé ! Votre participation a été enregistrée.' })
      setOpenConfirmPayment(null)
      setConfirmForm({ reference_interne: '', reference_wave: '' })
      setPendingTransaction(null)
      loadList()
    } catch (err) {
      const d = err.response?.data?.detail || err.response?.data
      setMessage({ type: 'error', text: typeof d === 'object' ? JSON.stringify(d) : (d || 'Erreur lors de la confirmation du paiement.') })
    } finally {
      setSaving(false)
    }
  }

  // Statistiques globales des levées de fonds
  const totalObjectif = list.reduce((sum, lf) => sum + Number(lf.montant_objectif || 0), 0)
  const totalCollecte = list.reduce((sum, lf) => sum + Number(lf.montant_collecte || 0), 0)
  const pourcentageGlobal = totalObjectif > 0 ? Math.round((totalCollecte / totalObjectif) * 100) : 0
  const nbActives = list.filter((lf) => lf.statut === 'active').length
  const nbTerminees = list.filter((lf) => lf.statut === 'terminee').length

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>Levées de fonds</Typography>
          <Typography variant="body2" sx={{ color: COLORS.vertFonce }}>Campagnes en cours et participation</Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>
            Ajouter une levée de fonds
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert 
          severity={message.type === 'error' ? 'error' : message.type === 'info' ? 'info' : 'success'} 
          sx={{ mb: 2 }} 
          onClose={() => setMessage({ type: '', text: '' })}
        >
          {message.text}
        </Alert>
      )}

      {!loading && list.length > 0 && (
        <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
          <Paper sx={{ p: 2, borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce }}>Objectif global</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.vert }}>
              {totalObjectif.toLocaleString('fr-FR')} FCFA
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {list.length} campagne(s)
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce }}>Montant collecté</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.or }}>
              {totalCollecte.toLocaleString('fr-FR')} FCFA
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {pourcentageGlobal}% de l'objectif global
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, borderLeft: '4px solid #1565c0', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ color: COLORS.vertFonce }}>États des campagnes</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1565c0' }}>
              {nbActives} active(s) · {nbTerminees} terminée(s)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Statut global des levées de fonds
            </Typography>
          </Paper>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : isAdmin ? (
        <Grid container spacing={2}>
          {list.length === 0 ? (
            <Grid item xs={12}><Typography color="text.secondary">Aucune levée de fonds</Typography></Grid>
          ) : (
            list.map((lf) => (
              <Grid item xs={12} md={6} key={lf.id}>
                <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>{lf.titre}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{lf.description}</Typography>
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {Number(lf.montant_collecte || 0).toLocaleString('fr-FR')} / {Number(lf.montant_objectif).toLocaleString('fr-FR')} FCFA
                      </Typography>
                      <LinearProgress variant="determinate" value={lf.pourcentage_atteint || 0} sx={{ mt: 1, height: 8, borderRadius: 1 }} color="primary" />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {Math.round(lf.pourcentage_atteint || 0)}% atteint
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 2 }}>
                      <Chip size="small" label={lf.statut_display || lf.statut} color={lf.statut === 'active' ? 'success' : 'default'} />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                        {lf.date_debut?.slice(0, 10)} — {lf.date_fin?.slice(0, 10)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                      {lf.lien_paiement_wave ? (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Payment />}
                          onClick={() => handleBarkelou(lf)}
                          sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
                        >
                          BARKELOU
                        </Button>
                      ) : null}
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleOpenConfirmPayment(lf)}
                        sx={{ borderColor: COLORS.or, color: COLORS.or, '&:hover': { borderColor: COLORS.or, bgcolor: `${COLORS.or}15` } }}
                      >
                        Confirmer paiement
                      </Button>
                      <IconButton size="small" onClick={() => handleOpenEdit(lf)} sx={{ color: COLORS.vert }}><Edit /></IconButton>
                      <IconButton size="small" onClick={() => setOpenDelete(lf)} color="error"><Delete /></IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {list.length === 0 ? (
            <Grid item xs={12}><Typography color="text.secondary">Aucune levée de fonds active.</Typography></Grid>
          ) : (
            list.filter((lf) => lf.statut === 'active').map((lf) => (
              <Grid item xs={12} md={6} key={lf.id}>
                <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>{lf.titre}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{lf.description}</Typography>
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {Number(lf.montant_collecte || 0).toLocaleString('fr-FR')} / {Number(lf.montant_objectif).toLocaleString('fr-FR')} FCFA
                      </Typography>
                      <LinearProgress variant="determinate" value={lf.pourcentage_atteint || 0} sx={{ mt: 1, height: 8, borderRadius: 1 }} color="primary" />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {Math.round(lf.pourcentage_atteint || 0)}% atteint
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 2 }}>
                      <Chip size="small" label={lf.statut_display || lf.statut} color="success" />
                      {lf.lien_paiement_wave ? (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Payment />}
                          onClick={() => handleBarkelou(lf)}
                          sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
                        >
                          BARKELOU
                        </Button>
                      ) : null}
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleOpenConfirmPayment(lf)}
                        sx={{ borderColor: COLORS.or, color: COLORS.or, '&:hover': { borderColor: COLORS.or, bgcolor: `${COLORS.or}15` } }}
                      >
                        Confirmer paiement
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      <Dialog open={openForm} onClose={() => { setOpenForm(false); setEditingId(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Modifier la levée de fonds' : 'Ajouter une levée de fonds'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Titre" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} required /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} multiline rows={2} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Objectif (texte)" value={form.objectif} onChange={(e) => setForm((f) => ({ ...f, objectif: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth type="number" label="Montant objectif (FCFA)" value={form.montant_objectif} onChange={(e) => setForm((f) => ({ ...f, montant_objectif: e.target.value }))} inputProps={{ min: 0 }} required /></Grid>
            <Grid item xs={6}><TextField fullWidth type="date" label="Date début" value={form.date_debut} onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))} InputLabelProps={{ shrink: true }} required /></Grid>
            <Grid item xs={6}><TextField fullWidth type="date" label="Date fin" value={form.date_fin} onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))} InputLabelProps={{ shrink: true }} required /></Grid>
            <Grid item xs={12}><TextField select fullWidth label="Statut" value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}>{STATUTS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12}><TextField fullWidth label="Lien paiement Wave" value={form.lien_paiement_wave} onChange={(e) => setForm((f) => ({ ...f, lien_paiement_wave: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenForm(false); setEditingId(null) }}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}>{saving ? <CircularProgress size={24} /> : 'Enregistrer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
        <DialogTitle>Supprimer cette levée de fonds ?</DialogTitle>
        <DialogContent>{openDelete && <Typography>Supprimer « {openDelete.titre} » ?</Typography>}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>{saving ? <CircularProgress size={24} /> : 'Supprimer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openParticipate} onClose={() => setOpenParticipate(null)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { mx: { xs: 1, sm: 2 } } }}>
        <DialogTitle>BARKELOU</DialogTitle>
        <DialogContent>
          {openParticipate && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {openParticipate.titre}
              </Typography>
              {!openParticipate.lien_paiement_wave && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Le lien de paiement Wave n'est pas configuré pour cette levée de fonds.
                </Alert>
              )}
              <TextField
                fullWidth
                type="number"
                label="Montant (FCFA)"
                value={participateForm.montant}
                onChange={(e) => setParticipateForm((f) => ({ ...f, montant: e.target.value }))}
                inputProps={{ min: 1 }}
                required
              />
              <TextField
                fullWidth
                label="Description (optionnel)"
                value={participateForm.description}
                onChange={(e) => setParticipateForm((f) => ({ ...f, description: e.target.value }))}
                multiline
                rows={2}
              />
              <Alert severity="info" sx={{ mt: 1 }}>
                Après avoir cliqué sur "BARKELOU", une transaction sera créée et vous serez redirigé vers Wave pour effectuer le paiement. 
                Revenez ensuite ici et cliquez sur "Confirmer paiement" pour entrer votre référence Wave.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenParticipate(null)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleParticipate}
            disabled={saving || !participateForm.montant || !openParticipate?.lien_paiement_wave}
            sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
          >
            {saving ? <CircularProgress size={24} /> : 'BARKELOU'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!openConfirmPayment} onClose={() => { setOpenConfirmPayment(null); setConfirmForm({ reference_interne: '', reference_wave: '' }) }} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { mx: { xs: 1, sm: 2 } } }}>
        <DialogTitle>Confirmer votre paiement</DialogTitle>
        <DialogContent>
          {openConfirmPayment && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {openConfirmPayment.titre}
              </Typography>
              {pendingTransaction && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Montant : {Number(pendingTransaction.montant).toLocaleString('fr-FR')} FCFA
                  <br />
                  Référence transaction : <strong>{pendingTransaction.reference_interne}</strong>
                </Alert>
              )}
              {!pendingTransaction && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Si vous avez déjà effectué un paiement sur Wave, entrez votre référence de transaction Wave pour confirmer.
                </Alert>
              )}
              {pendingTransaction && (
                <TextField
                  fullWidth
                  label="Référence transaction (auto-rempli)"
                  value={confirmForm.reference_interne}
                  disabled
                  sx={{ mt: 1 }}
                />
              )}
              <TextField
                fullWidth
                label="Référence Wave *"
                value={confirmForm.reference_wave}
                onChange={(e) => setConfirmForm((f) => ({ ...f, reference_wave: e.target.value }))}
                placeholder="Entrez la référence de votre transaction Wave"
                required
                helperText="Cette référence vous a été fournie par Wave après le paiement"
              />
              {!pendingTransaction && (
                <TextField
                  fullWidth
                  label="Référence transaction (optionnel)"
                  value={confirmForm.reference_interne}
                  onChange={(e) => setConfirmForm((f) => ({ ...f, reference_interne: e.target.value }))}
                  placeholder="Si vous avez la référence de transaction"
                  helperText="Si vous ne l'avez pas, laissez vide"
                />
              )}
              <Alert severity="warning" sx={{ mt: 1 }}>
                ⚠️ Votre participation ne sera comptabilisée qu'après confirmation avec la référence Wave.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenConfirmPayment(null); setConfirmForm({ reference_interne: '', reference_wave: '' }); setPendingTransaction(null) }}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleConfirmPayment}
            disabled={saving || !confirmForm.reference_wave}
            sx={{ bgcolor: COLORS.vert, '&:hover': { bgcolor: COLORS.vertFonce } }}
          >
            {saving ? <CircularProgress size={24} /> : 'Confirmer le paiement'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
